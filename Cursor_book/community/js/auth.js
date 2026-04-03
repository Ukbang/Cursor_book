import { auth } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { db } from "./firebase-config.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 인증 상태 확인 후 콜백 실행
export function requireAuth(callback) {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (!user) {
        window.location.href = "index.html";
        resolve(null);
      } else {
        if (callback) callback(user);
        resolve(user);
      }
    });
  });
}

// 로그인 페이지면 이미 로그인된 경우 대시보드로
export function redirectIfLoggedIn() {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    unsubscribe();
    if (user) {
      window.location.href = "dashboard.html";
    }
  });
}

// 현재 사용자 반환 (Promise)
export function getCurrentUser() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

// 회원가입
export async function registerUser(name, email, password) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName: name });
  // Firestore 저장 실패해도 인증은 성공으로 처리 (DB 미생성 시 대비)
  try {
    await setDoc(doc(db, "users", credential.user.uid), {
      displayName: name,
      email: email,
      createdAt: serverTimestamp()
    });
  } catch (e) {
    console.warn("Firestore 프로필 저장 실패 (Firestore 미설정 가능성):", e.message);
  }
  return credential.user;
}

// 로그인
export async function loginUser(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

// 로그아웃
export async function logoutUser() {
  await signOut(auth);
  window.location.href = "index.html";
}

// 공통 네비게이션 렌더링
export function renderNavUser(user) {
  const navUserEl = document.getElementById("nav-user");
  if (!navUserEl || !user) return;
  const initial = (user.displayName || user.email || "U").charAt(0).toUpperCase();
  navUserEl.innerHTML = `
    <div class="nav-user">
      <div class="avatar">${initial}</div>
      <span>${user.displayName || user.email}</span>
    </div>
  `;
}
