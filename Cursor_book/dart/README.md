# 재무 데이터 시각화 분석 서비스

Next.js(App Router) 기반으로 아래 기능을 제공합니다.

1. `corp.xml` 기반 회사명 검색(`corp_code` 조회)
2. OpenDART 단일회사 주요계정 API 연동 시각화
3. Gemini 기반 쉬운 해석 텍스트 생성

## 1) 환경변수 설정

`.env.local.example`를 복사해서 `.env.local`을 만들고 값을 입력하세요.

```bash
cp .env.local.example .env.local
```

필수 키:

- `OPENDART_API_KEY`
- `GEMINI_API_KEY`
- `GEMINI_MODEL` (예: `gemini-2.5-flash`, `gemini-3.0-flash`)

## 2) corp.xml 인덱스 생성

루트의 `data/corp.xml`을 읽어 `web/db/corps.json`으로 변환합니다.

```bash
npm run corp:build
```

## 3) 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속 후:

- 회사명 검색
- 사업연도/보고서 선택 후 재무 데이터 조회
- AI 분석 버튼 클릭

## API 경로

- `GET /api/corps?q=삼성`
- `GET /api/dart/fnlttSinglAcnt?corpCode=00126380&bsnsYear=2024&reprtCode=11011`
- `POST /api/ai/explain`

## Vercel 배포 주의사항

- Vercel Project Settings > Environment Variables에 API 키 등록
- 키는 절대 코드에 하드코딩하지 말 것
- `db/corps.json`은 빌드 전 생성해 커밋하거나, CI에서 `npm run corp:build` 실행 후 배포
