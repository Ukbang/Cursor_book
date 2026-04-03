import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  serverTimestamp,
  increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const STUDIES_COL = "studies";
const APPS_COL = "applications";
const MAX_STUDIES_PER_LEADER = 5;

export const CATEGORIES = [
  { id: "all", label: "전체", icon: "🔍" },
  { id: "programming", label: "프로그래밍", icon: "💻" },
  { id: "language", label: "어학", icon: "🌍" },
  { id: "certificate", label: "자격증", icon: "📜" },
  { id: "employment", label: "취업", icon: "💼" },
  { id: "reading", label: "독서", icon: "📚" },
  { id: "etc", label: "기타", icon: "✨" }
];

export function getCategoryLabel(id) {
  const cat = CATEGORIES.find(c => c.id === id);
  return cat ? `${cat.icon} ${cat.label}` : id;
}

export function getCategoryClass(id) {
  const map = {
    programming: "cat-programming",
    language: "cat-language",
    certificate: "cat-certificate",
    employment: "cat-employment",
    reading: "cat-reading",
    etc: "cat-etc"
  };
  return map[id] || "cat-etc";
}

// 모든 스터디 목록 조회 (클라이언트 사이드 필터/정렬로 복합 인덱스 불필요)
export async function getStudies(categoryFilter = "all", keyword = "") {
  let q;
  if (categoryFilter && categoryFilter !== "all") {
    q = query(
      collection(db, STUDIES_COL),
      where("category", "==", categoryFilter)
    );
  } else {
    q = query(collection(db, STUDIES_COL));
  }

  const snapshot = await getDocs(q);
  let studies = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

  if (keyword) {
    const kw = keyword.toLowerCase();
    studies = studies.filter(s =>
      s.title?.toLowerCase().includes(kw) ||
      s.description?.toLowerCase().includes(kw) ||
      s.tags?.some(t => t.toLowerCase().includes(kw))
    );
  }

  // 최신 순 정렬
  studies.sort((a, b) => {
    const ta = a.createdAt?.seconds ?? 0;
    const tb = b.createdAt?.seconds ?? 0;
    return tb - ta;
  });

  return studies;
}

// 단일 스터디 조회
export async function getStudy(studyId) {
  const snap = await getDoc(doc(db, STUDIES_COL, studyId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// 내가 만든 스터디 목록
export async function getMyStudies(userId) {
  const q = query(
    collection(db, STUDIES_COL),
    where("leaderId", "==", userId)
  );
  const snap = await getDocs(q);
  const studies = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  studies.sort((a, b) => {
    const ta = a.createdAt?.seconds ?? 0;
    const tb = b.createdAt?.seconds ?? 0;
    return tb - ta;
  });
  return studies;
}

// 스터디 생성
export async function createStudy(data, userId, userName) {
  const myStudies = await getMyStudies(userId);
  if (myStudies.length >= MAX_STUDIES_PER_LEADER) {
    throw new Error(`스터디는 최대 ${MAX_STUDIES_PER_LEADER}개까지 생성할 수 있습니다.`);
  }

  const docRef = await addDoc(collection(db, STUDIES_COL), {
    ...data,
    leaderId: userId,
    leaderName: userName,
    currentMembers: 0,
    status: "open",
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

// 스터디 신청
export async function applyToStudy(studyId, studyTitle, user, message) {
  const existingQ = query(
    collection(db, APPS_COL),
    where("studyId", "==", studyId),
    where("userId", "==", user.uid)
  );
  const existing = await getDocs(existingQ);
  if (!existing.empty) {
    throw new Error("이미 신청한 스터디입니다.");
  }

  await addDoc(collection(db, APPS_COL), {
    studyId,
    studyTitle,
    userId: user.uid,
    userName: user.displayName || user.email,
    userEmail: user.email,
    message: message || "",
    status: "pending",
    appliedAt: serverTimestamp()
  });
}

// 특정 스터디의 신청 현황 조회
export async function getApplicationsForStudy(studyId) {
  const q = query(
    collection(db, APPS_COL),
    where("studyId", "==", studyId)
  );
  const snap = await getDocs(q);
  const apps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  apps.sort((a, b) => {
    const ta = a.appliedAt?.seconds ?? 0;
    const tb = b.appliedAt?.seconds ?? 0;
    return tb - ta;
  });
  return apps;
}

// 내 신청 상태 조회
export async function getMyApplication(studyId, userId) {
  const q = query(
    collection(db, APPS_COL),
    where("studyId", "==", studyId),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

// 신청 승인/거절
export async function updateApplicationStatus(appId, status, studyId) {
  // 변경 전 현재 상태 확인
  const appSnap = await getDoc(doc(db, APPS_COL, appId));
  const prevStatus = appSnap.exists() ? appSnap.data().status : null;

  await updateDoc(doc(db, APPS_COL, appId), { status });

  if (status === "approved" && prevStatus !== "approved") {
    await updateDoc(doc(db, STUDIES_COL, studyId), {
      currentMembers: increment(1)
    });
  } else if (status !== "approved" && prevStatus === "approved") {
    await updateDoc(doc(db, STUDIES_COL, studyId), {
      currentMembers: increment(-1)
    });
  }
}

// 승인된 참가자 목록 (CSV용)
export async function getApprovedParticipants(studyId) {
  const q = query(
    collection(db, APPS_COL),
    where("studyId", "==", studyId),
    where("status", "==", "approved")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
