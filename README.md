# 오늘의 기분 아이스크림 🍦

날씨와 사용자의 기분을 함께 입력받아, Gemini API가 어울리는 아이스크림을 추천해주는 웹앱입니다.

## 구조

```
icecream-app/
├── src/            # React 프론트엔드
│   ├── App.jsx      # 날씨 조회 + 기분 입력 + 결과 표시
│   ├── App.css
│   ├── index.css
│   └── main.jsx
├── api/
│   └── generate.js  # Gemini API를 호출하는 Vercel 서버리스 함수
├── index.html
├── package.json
├── vite.config.js
└── vercel.json
```

- **날씨**: 브라우저 위치 정보(Geolocation) → Open-Meteo API(무료, 키 불필요)로 현재 기온·날씨를 가져옵니다.
- **기분**: 사용자가 텍스트로 직접 입력합니다.
- **추천**: 프론트엔드가 `/api/generate`로 `{ mood, weatherDesc, temp }`를 보내면, 서버리스 함수가 Gemini API를 호출해 `{ flavor, emoji, color, reason }` 형태의 JSON을 돌려줍니다.

## 로컬에서 실행하기

일반 `npm run dev`(Vite)는 `/api` 서버리스 함수를 실행하지 못합니다. 로컬에서 API까지 함께 테스트하려면 Vercel CLI를 사용하세요.

```bash
npm install
npm install -g vercel   # 최초 1회
vercel dev
```

`vercel dev`를 처음 실행하면 프로젝트 연결 여부를 묻습니다. 이후 `.env.local` 파일을 만들고 아래처럼 키를 넣어두면 로컬에서도 Gemini 호출이 됩니다.

```
GEMINI_API_KEY=발급받은_키
```

## Vercel 배포하기

1. 이 폴더를 GitHub 저장소에 올립니다.
2. Vercel에서 "Add New Project" → 방금 만든 GitHub 저장소를 선택합니다.
3. Framework Preset은 Vite로 자동 인식됩니다 (Build Command: `npm run build`, Output Directory: `dist`).
4. **Project Settings → Environment Variables**에서 다음을 추가합니다.
   - Key: `GEMINI_API_KEY`
   - Value: 발급받은 Gemini API 키
5. Deploy를 누르면 완료됩니다. `api/generate.js`는 자동으로 서버리스 함수로 배포됩니다.

## 참고

- Gemini API 키는 절대 프론트엔드 코드에 넣지 않고, `api/generate.js`(서버 쪽)에서만 `process.env.GEMINI_API_KEY`로 읽습니다.
- 현재 `api/generate.js`는 `gemini-2.5-flash` 모델을 사용합니다. Gemini 모델명은 종종 변경/지원 중단되니, 호출이 실패하면 [Gemini API 문서](https://ai.google.dev/gemini-api/docs/models)에서 최신 모델명을 확인해 `GEMINI_MODEL` 값을 교체하세요.
- 사용자가 위치 정보 제공을 거부하면 날씨 없이도 기분만으로 추천이 진행됩니다.
