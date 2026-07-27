// Vercel 서버리스 함수 (api/generate.js)
// 프론트엔드에서 { mood, weatherDesc, temp } 를 POST로 받아
// Gemini API를 호출하고, 아이스크림 추천 결과를 JSON으로 돌려준다.
// API 키는 절대 코드에 직접 쓰지 않고, Vercel 프로젝트의 환경변수 GEMINI_API_KEY 에서 읽는다.

const GEMINI_MODEL = 'gemini-3.5-flash-lite'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST 요청만 허용됩니다.' })
    return
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: '서버에 GEMINI_API_KEY 환경변수가 설정되어 있지 않습니다.' })
    return
  }

  const { mood, weatherDesc, temp } = req.body ?? {}
  if (!mood || typeof mood !== 'string') {
    res.status(400).json({ error: 'mood 값이 필요합니다.' })
    return
  }

  const prompt = `너는 아이스크림 가게의 감성 소믈리에야.
다음 정보를 참고해서 오늘 이 사람에게 어울리는 아이스크림 한 가지를 추천해줘.

- 오늘 날씨: ${weatherDesc ?? '정보 없음'}
- 기온: ${temp != null ? `${temp}도` : '정보 없음'}
- 사용자가 입력한 기분: "${mood}"

날씨와 기온, 기분을 모두 자연스럽게 반영해서 추천 이유를 2~3문장으로 작성해.
반드시 아래 JSON 형식으로만 답해. 다른 설명이나 코드블록 없이 JSON 객체만 출력해.

{
  "flavor": "아이스크림 이름 (예: 초코 민트, 자몽 셔벗)",
  "emoji": "어울리는 이모지 하나",
  "color": "그 맛을 표현하는 CSS 색상 hex 코드 (예: #FF6B81)",
  "reason": "날씨/기온/기분을 반영한 추천 이유 2~3문장"
}`

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.9,
            responseMimeType: 'application/json',
          },
        }),
      }
    )

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      res.status(502).json({ error: 'Gemini API 호출에 실패했습니다.', detail: errText })
      return
    }

    const data = await geminiRes.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      res.status(502).json({ error: 'Gemini 응답에서 결과를 찾지 못했습니다.' })
      return
    }

    let parsed
    try {
      parsed = JSON.parse(text)
    } catch {
      res.status(502).json({ error: 'Gemini 응답을 JSON으로 해석하지 못했습니다.', raw: text })
      return
    }

    res.status(200).json(parsed)
  } catch (err) {
    res.status(500).json({ error: '서버 오류가 발생했습니다.', detail: String(err) })
  }
}
