import { useEffect, useRef, useState } from 'react'

// WMO 날씨 코드를 한국어 설명 + Material Symbols 아이콘 이름으로 변환
function describeWeather(code) {
  if (code === 0) return { desc: '맑음', icon: 'wb_sunny' }
  if ([1, 2].includes(code)) return { desc: '대체로 맑음', icon: 'wb_sunny' }
  if (code === 3) return { desc: '흐림', icon: 'cloud' }
  if ([45, 48].includes(code)) return { desc: '안개', icon: 'foggy' }
  if ([51, 53, 55, 56, 57].includes(code)) return { desc: '이슬비', icon: 'rainy_light' }
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { desc: '비', icon: 'rainy' }
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { desc: '눈', icon: 'weather_snowy' }
  if ([95, 96, 99].includes(code)) return { desc: '뇌우', icon: 'thunderstorm' }
  return { desc: '알 수 없음', icon: 'help' }
}

const MOOD_CHIPS = [
  { label: '에너제틱', cls: 'bg-tertiary-fixed text-on-tertiary-fixed border-tertiary-fixed-dim/50' },
  { label: '차분한', cls: 'bg-primary-fixed text-on-primary-fixed border-primary-fixed-dim/50' },
  { label: '모험적인', cls: 'bg-secondary-fixed text-on-secondary-fixed border-secondary-fixed-dim/50' },
  { label: '조용한', cls: 'bg-surface-container-high text-on-surface-variant border-outline-variant/30' },
]

export default function App() {
  const [weather, setWeather] = useState(null) // { temp, desc, icon, humidity, wind }
  const [weatherStatus, setWeatherStatus] = useState('loading')
  const [mood, setMood] = useState('')
  const [phase, setPhase] = useState('idle') // idle | loading | done | error
  const [result, setResult] = useState(null)
  const blobRef = useRef(null)

  // 날씨 조회
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
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m`
          )
          const data = await res.json()
          const { desc, icon } = describeWeather(data.current.weather_code)
          setWeather({
            temp: Math.round(data.current.temperature_2m),
            desc,
            icon,
            humidity: Math.round(data.current.relative_humidity_2m),
            wind: Math.round(data.current.wind_speed_10m),
          })
          setWeatherStatus('ok')
        } catch {
          setWeatherStatus('error')
        }
      },
      () => setWeatherStatus('denied')
    )
  }, [])

  // 커서를 따라다니는 배경 블롭 (홈 화면 연출)
  useEffect(() => {
    const handleMove = (e) => {
      if (blobRef.current) {
        blobRef.current.style.transform = `translate(${e.clientX - 128}px, ${e.clientY - 128}px)`
      }
    }
    document.addEventListener('mousemove', handleMove)
    return () => document.removeEventListener('mousemove', handleMove)
  }, [])

  // 결과가 나오면 컨페티 이펙트 (Today's Pick 연출)
  useEffect(() => {
    if (phase !== 'done') return
    const colors = ['#f6bac9', '#ffd9e1', '#f2b7c5', '#7ed9d9']
    const pieces = []
    for (let i = 0; i < 20; i++) {
      const el = document.createElement('div')
      el.className = 'confetti'
      el.style.left = Math.random() * 100 + 'vw'
      el.style.top = '-20px'
      el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
      const size = Math.random() * 8 + 4 + 'px'
      el.style.width = size
      el.style.height = size
      el.style.opacity = Math.random()
      document.body.appendChild(el)
      pieces.push(el)
      const anim = el.animate(
        [
          { transform: 'translate(0,0) rotate(0)', opacity: 1 },
          {
            transform: `translate(${(Math.random() - 0.5) * 200}px, 100vh) rotate(${Math.random() * 720}deg)`,
            opacity: 0,
          },
        ],
        { duration: Math.random() * 3000 + 2000, easing: 'cubic-bezier(0,.9,.57,1)', delay: Math.random() * 1000 }
      )
      anim.onfinish = () => el.remove()
    }
    return () => pieces.forEach((el) => el.remove())
  }, [phase])

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

  const reset = () => {
    setPhase('idle')
    setResult(null)
  }

  return phase === 'done' && result ? (
    <TodaysPick result={result} mood={mood} weather={weather} onReset={reset} />
  ) : (
    <Home
      weather={weather}
      weatherStatus={weatherStatus}
      mood={mood}
      setMood={setMood}
      phase={phase}
      onSubmit={handleSubmit}
      blobRef={blobRef}
    />
  )
}

function Home({ weather, weatherStatus, mood, setMood, phase, onSubmit, blobRef }) {
  return (
    <>
      {/* Top App Bar */}
      <header className="fixed top-0 w-full z-50 bg-surface/60 backdrop-blur-xl border-b border-white/20 shadow-[0_20px_40px_rgba(126,217,217,0.15)]">
        <div className="flex items-center justify-between px-margin-mobile h-16 max-w-max-width mx-auto">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-3xl">icecream</span>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary tracking-tight">
              Ice Cream Weather
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-on-surface-variant">account_circle</span>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-32 px-margin-mobile max-w-max-width mx-auto">
        {/* Weather Summary */}
        <section className="flex flex-col items-center justify-center mb-xl">
          <div className="glass-card rounded-xl p-md flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-label-md font-label-md text-secondary uppercase tracking-widest">지금 날씨</span>
              <div className="flex items-center gap-2">
                <span className="font-headline-xl text-headline-xl text-on-surface">
                  {weatherStatus === 'ok' && weather ? `${weather.temp}°C` : '--°C'}
                </span>
                <span
                  className="material-symbols-outlined text-primary text-5xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {weather?.icon ?? 'wb_sunny'}
                </span>
              </div>
              <span className="font-title-md text-title-md text-on-surface-variant">
                {weatherStatus === 'loading' && '날씨 확인 중...'}
                {weatherStatus === 'denied' && '위치 허용 시 날씨 반영'}
                {weatherStatus === 'error' && '날씨 정보 없음'}
                {weatherStatus === 'ok' && weather?.desc}
              </span>
            </div>
            {weatherStatus === 'ok' && weather && (
              <>
                <div className="h-16 w-[1px] bg-outline-variant opacity-30" />
                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-1 text-primary">
                    <span className="material-symbols-outlined text-sm">humidity_low</span>
                    <span className="text-label-sm font-label-sm">{weather.humidity}%</span>
                  </div>
                  <div className="flex items-center gap-1 text-secondary mt-1">
                    <span className="material-symbols-outlined text-sm">air</span>
                    <span className="text-label-sm font-label-sm">{weather.wind}km/h</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Main Interaction Area */}
        <section className="relative flex flex-col items-center text-center max-w-2xl mx-auto">
          <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary-container/30 rounded-full blur-3xl" />
          <h2 className="font-headline-xl text-headline-xl text-on-background mb-base">지금 기분이 어때요?</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant mb-lg px-md">
            기분을 말해주면 오늘 날씨에 어울리는 맛을 골라드릴게요.
          </p>

          <form className="w-full space-y-md" onSubmit={onSubmit}>
            <div className="relative w-full group">
              <textarea
                className="w-full bg-white/80 border-2 border-transparent focus:border-primary focus:ring-0 rounded-lg p-md text-body-md font-body-md shadow-sm transition-all min-h-[140px] resize-none glass-card"
                placeholder="예: 시험 끝나서 홀가분해, 왠지 나른하고 몽글몽글해..."
                value={mood}
                onChange={(e) => setMood(e.target.value)}
              />
              <div className="absolute bottom-4 right-4 flex gap-2">
                <span className="material-symbols-outlined text-primary opacity-40">edit_note</span>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-sm mt-md">
              {MOOD_CHIPS.map((chip) => (
                <button
                  type="button"
                  key={chip.label}
                  onClick={() => setMood(chip.label)}
                  className={`px-4 py-2 rounded-full text-label-md font-label-md squishy-hover border ${chip.cls}`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <div className="mt-xl w-full">
              <button
                type="submit"
                disabled={phase === 'loading' || !mood.trim()}
                className="w-full py-5 bg-tertiary text-on-tertiary font-headline-lg text-headline-lg rounded-xl shadow-[0_15px_30px_rgba(128,81,94,0.3)] squishy-hover flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <span>{phase === 'loading' ? '만드는 중...' : '추천받기'}</span>
                <span className="material-symbols-outlined text-4xl">auto_awesome</span>
              </button>
              {phase === 'error' && <p className="mt-3 text-error text-body-md">추천을 가져오지 못했어요. 다시 시도해주세요.</p>}
            </div>
          </form>
        </section>
      </main>

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 left-0 w-full z-50 bg-surface/60 backdrop-blur-xl border-t border-white/30 shadow-[0_-10px_30px_rgba(126,217,217,0.2)] flex justify-around items-center px-4 py-3 pb-safe rounded-t-xl">
        <button className="flex flex-col items-center justify-center bg-tertiary-container text-on-tertiary-container rounded-full px-5 py-1 active:scale-90 transition-transform">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            mood
          </span>
          <span className="font-label-md text-label-md">Mood</span>
        </button>
        <button className="flex flex-col items-center justify-center text-on-surface-variant hover:bg-primary-container/20 transition-colors active:scale-90">
          <span className="material-symbols-outlined">icecream</span>
          <span className="font-label-md text-label-md">Scoops</span>
        </button>
        <button className="flex flex-col items-center justify-center text-on-surface-variant hover:bg-primary-container/20 transition-colors active:scale-90">
          <span className="material-symbols-outlined">favorite</span>
          <span className="font-label-md text-label-md">Favorites</span>
        </button>
      </nav>

      {/* 커서를 따라다니는 배경 블롭 */}
      <div
        ref={blobRef}
        className="fixed top-0 left-0 w-64 h-64 bg-primary-container/10 rounded-full blur-[100px] pointer-events-none z-0"
      />
    </>
  )
}

function TodaysPick({ result, mood, weather, onReset }) {
  const tags = [mood, weather?.desc].filter(Boolean)
  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-surface/60 backdrop-blur-xl border-b border-white/20 shadow-[0_20px_40px_rgba(126,217,217,0.15)]">
        <div className="flex items-center justify-between px-margin-mobile h-16 max-w-max-width mx-auto">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary font-headline-lg-mobile">icecream</span>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary tracking-tight">
              Ice Cream Weather
            </h1>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-32 px-6 flex flex-col items-center justify-center min-h-screen relative">
        <div className="max-w-md w-full glass-card rounded-xl p-8 flex flex-col items-center text-center shadow-[0_30px_60px_rgba(242,183,197,0.3)] border-t border-white/50">
          <div className="relative w-64 h-64 mb-8 flex items-center justify-center">
            <div
              className="absolute inset-0 rounded-full blur-3xl opacity-30"
              style={{ background: result.color ?? '#f6bac9' }}
            />
            <div className="relative z-10 floating-animation">
              <span className="text-[120px] leading-none">{result.emoji ?? '🍦'}</span>
            </div>
          </div>

          <div className="space-y-4">
            <span className="inline-block px-4 py-1 rounded-full bg-tertiary-container text-on-tertiary-container font-label-md text-label-md uppercase tracking-wider">
              오늘의 추천
            </span>
            <h2 className="font-headline-xl text-headline-xl text-tertiary leading-none">{result.flavor}</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xs mx-auto">{result.reason}</p>
          </div>

          <div className="mt-10 w-full space-y-4">
            <button
              onClick={onReset}
              className="w-full py-4 bg-tertiary text-on-tertiary rounded-full font-title-md text-title-md shadow-lg shadow-tertiary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">refresh</span>
              다시 추천받기
            </button>
            <button
              disabled
              title="곧 추가될 기능이에요"
              className="w-full py-4 glass-card text-tertiary/60 rounded-full font-title-md text-title-md flex items-center justify-center gap-2 cursor-not-allowed"
            >
              <span className="material-symbols-outlined">reviews</span>
              의견 남기기 (준비 중)
            </button>
          </div>
        </div>

        {tags.length > 0 && (
          <div className="mt-8 flex gap-2 flex-wrap justify-center max-w-xs">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-tertiary-container/40 text-on-tertiary-container rounded-full text-label-sm font-label-sm border border-white/30"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-3 pb-safe bg-surface/60 backdrop-blur-xl border-t border-white/30 shadow-[0_-10px_30px_rgba(126,217,217,0.2)]">
        <button
          onClick={onReset}
          className="flex flex-col items-center justify-center text-on-surface-variant hover:bg-primary-container/20 transition-colors rounded-xl px-4 py-2"
        >
          <span className="material-symbols-outlined">mood</span>
          <span className="font-label-md text-label-md">Mood</span>
        </button>
        <button className="flex flex-col items-center justify-center bg-tertiary-container text-on-tertiary-container rounded-full px-5 py-1 transition-all active:scale-90 shadow-sm">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            icecream
          </span>
          <span className="font-label-md text-label-md">Scoops</span>
        </button>
        <button className="flex flex-col items-center justify-center text-on-surface-variant hover:bg-primary-container/20 transition-colors rounded-xl px-4 py-2">
          <span className="material-symbols-outlined">favorite</span>
          <span className="font-label-md text-label-md">Favorites</span>
        </button>
      </nav>
    </>
  )
}
