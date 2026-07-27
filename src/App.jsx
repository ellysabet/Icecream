import { useEffect, useState } from 'react'
import './App.css'

// WMO 날씨 코드를 한국어 설명 + 상태로 변환 (Open-Meteo 기준)
function describeWeather(code) {
  if (code === 0) return { desc: '맑음', cond: 'clear' }
  if ([1, 2].includes(code)) return { desc: '대체로 맑음', cond: 'clear' }
  if (code === 3) return { desc: '흐림', cond: 'cloudy' }
  if ([45, 48].includes(code)) return { desc: '안개', cond: 'cloudy' }
  if ([51, 53, 55, 56, 57].includes(code)) return { desc: '이슬비', cond: 'rain' }
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { desc: '비', cond: 'rain' }
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { desc: '눈', cond: 'snow' }
  if ([95, 96, 99].includes(code)) return { desc: '뇌우', cond: 'rain' }
  return { desc: '알 수 없음', cond: 'cloudy' }
}

const CONDITION_BG = {
  clear: 'linear-gradient(180deg, #7ec8e3 0%, #ffe9b8 100%)',
  cloudy: 'linear-gradient(180deg, #9fb3c8 0%, #dfe7ee 100%)',
  rain: 'linear-gradient(180deg, #5b7c99 0%, #a9c0d3 100%)',
  snow: 'linear-gradient(180deg, #a9c6e0 0%, #f2f7fb 100%)',
}

function App() {
  const [weather, setWeather] = useState(null) // { temp, desc, cond }
  const [weatherStatus, setWeatherStatus] = useState('loading') // loading | ok | denied | error
  const [mood, setMood] = useState('')
  const [phase, setPhase] = useState('idle') // idle | loading | done | error
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!navigator.geolocation) {
      setWeatherStatus('error')
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`
          )
          const data = await res.json()
          const { desc, cond } = describeWeather(data.current.weather_code)
          setWeather({ temp: Math.round(data.current.temperature_2m), desc, cond })
          setWeatherStatus('ok')
        } catch {
          setWeatherStatus('error')
        }
      },
      () => setWeatherStatus('denied')
    )
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!mood.trim() || phase === 'loading') return
    setPhase('loading')
    setResult(null)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mood,
          weatherDesc: weather?.desc ?? '정보 없음',
          temp: weather?.temp ?? null,
        }),
      })
      if (!res.ok) throw new Error('요청 실패')
      const data = await res.json()
      setResult(data)
      setPhase('done')
    } catch {
      setPhase('error')
    }
  }

  const bg = CONDITION_BG[weather?.cond ?? 'clear']

  return (
    <div className="page">
      <section className="hero" style={{ background: bg }}>
        <p className="eyebrow">오늘의 날씨</p>
        <h1 className="hero-title">
          {weatherStatus === 'loading' && '날씨를 확인하는 중...'}
          {weatherStatus === 'denied' && '위치 정보를 허용하면 날씨를 반영해요'}
          {weatherStatus === 'error' && '날씨 정보를 가져오지 못했어요'}
          {weatherStatus === 'ok' && weather && (
            <>
              {weather.temp}°C · {weather.desc}
            </>
          )}
        </h1>
        <p className="hero-sub">날씨와 기분을 섞으면, 오늘의 아이스크림이 나와요</p>
      </section>

      <main className="content">
        <form className="mood-card" onSubmit={handleSubmit}>
          <label htmlFor="mood" className="mood-label">
            지금 기분이 어때요?
          </label>
          <textarea
            id="mood"
            className="mood-input"
            placeholder="예: 시험 끝나서 홀가분해, 왠지 나른하고 몽글몽글해..."
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            rows={3}
          />
          <button type="submit" className="submit-btn" disabled={phase === 'loading' || !mood.trim()}>
            {phase === 'loading' ? '만드는 중...' : '아이스크림 추천받기'}
          </button>
        </form>

        <ConeVisual phase={phase} color={result?.color} />

        {phase === 'error' && (
          <p className="error-text">추천을 가져오지 못했어요. 다시 시도해주세요.</p>
        )}

        {phase === 'done' && result && (
          <div className="result-card" style={{ '--flavor-color': result.color ?? '#ffb6c1' }}>
            <p className="result-eyebrow">오늘의 추천</p>
            <h2 className="result-flavor">
              {result.emoji} {result.flavor}
            </h2>
            <p className="result-reason">{result.reason}</p>
          </div>
        )}
      </main>
    </div>
  )
}

function ConeVisual({ phase, color }) {
  const scoopColor = phase === 'done' ? color ?? '#ffb6c1' : '#f2c9a0'
  const isLoading = phase === 'loading'
  return (
    <svg
      className={`cone ${isLoading ? 'cone-loading' : ''}`}
      width="120"
      height="150"
      viewBox="0 0 120 150"
      aria-hidden="true"
    >
      <circle className="scoop scoop-1" cx="60" cy="55" r="34" fill={scoopColor} />
      <circle className="scoop scoop-2" cx="42" cy="38" r="24" fill={scoopColor} opacity="0.9" />
      <circle className="scoop scoop-3" cx="80" cy="40" r="22" fill={scoopColor} opacity="0.9" />
      <path d="M32 70 L60 145 L88 70 Z" fill="#e2a765" stroke="#c98a4a" strokeWidth="2" />
      <path
        d="M32 70 L88 70"
        stroke="#c98a4a"
        strokeWidth="2"
      />
    </svg>
  )
}

export default App
