# 교육용 AI 퀴즈 플랫폼 (Next.js + Firebase + Gemini)

## 기능 요약
- 교수자: 주제로 `퀴즈 세션` 생성 (참가용 `세션 ID` 제공)
- 학습자: 세션 ID 입력 후 `Start Attempt`로 Gemini가 사지선다형 퀴즈 생성
- 채점: 답안 제출 시 점수 계산 후 Firestore에 저장
- 리더보드: `completed` 상태의 응시를 기준으로 실시간 상위 랭킹 표시

## 로컬 실행

### 1) 환경변수 설정
프로젝트 루트에 `.env.local`을 만들고 아래 값을 채우세요.

예시는 `.env.local.example`을 참고하세요.

필수:
- `GEMINI_API_KEY`
- `GEMINI_MODEL` (권장: `gemini-2.5-flash` 또는 `gemini-3.0-flash`)

Firebase (클라이언트 전용, `NEXT_PUBLIC_*`):
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### 2) 개발 서버 실행
```bash
npm run dev
```

브라우저:
- 홈: `http://localhost:3000/`
- 교수자 페이지: `http://localhost:3000/teacher`
- 학습자 페이지: `http://localhost:3000/learner`

## Firestore Security Rules 적용(중요)
이 프로젝트는 `firestore.rules` 파일을 사용합니다.

Rules가 배포되기 전에는 클라이언트 읽기/쓰기 요청이 실패할 수 있습니다.

```bash
firebase deploy --only firestore:rules
```

## 참고
- Gemini 호출 및 퀴즈 생성은 서버 API 라우트(`src/app/api/generate-quiz/route.ts`)에서 수행합니다.
- 리더보드는 `src/components/Leaderboard.tsx`에서 Firestore `onSnapshot`으로 실시간 반영합니다.

