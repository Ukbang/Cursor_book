# GlefAI — Mobile Branding Landing

밝은 톤의 **모바일 중심 개인 브랜딩 랜딩 페이지**입니다. 순수 `HTML/CSS/JS`로 구성되어 있어 빌드 없이 바로 실행할 수 있습니다.

## 파일 구조

- `index.html`: 페이지 마크업(히어로/주제 3개/FAQ/푸터)
- `styles.css`: 밝은 톤 모바일 퍼스트 스타일
- `script.js`: 아코디언(더보기/FAQ), 앵커 스무스 스크롤, 푸터 연도 자동 표시

## 실행 방법

- 가장 간단한 방법: `index.html`을 브라우저로 열기
- 로컬 서버로 실행(선택):

```bash
python3 -m http.server 5173
```

그 다음 브라우저에서 `http://localhost:5173` 로 접속합니다.

## 커피챗 링크

현재 커피챗 버튼은 **구글 폼**으로 연결되어 있습니다(히어로/하단 CTA 2곳).

- 대상 파일: `index.html`
- 링크: `https://docs.google.com/forms/d/e/1FAIpQLSdIDwSZdWMoYJ-mAC8Iu9I5dGSPRTM7CDxX0LsF2P-6CSBorg/viewform?usp=sharing&ouid=113049684249498963920`

## 접근성/UX 메모

- 탭 이동 시 포커스 링이 보이도록 처리되어 있습니다.
- `prefers-reduced-motion` 설정이 켜져 있으면 스무스 스크롤 애니메이션을 최소화합니다.

