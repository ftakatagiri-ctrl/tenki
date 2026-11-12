import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import {
  Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow,
  CloudSun, LocateFixed, MapPin, Search, Sun, Umbrella, Wind, Droplets,
  Sunrise, Sunset, RefreshCw, Thermometer, AlertCircle
} from 'lucide-react'

type Place = { name: string; admin1?: string; country?: string; latitude: number; longitude: number; timezone?: string }
type WeatherData = {
  current: {
    temperature_2m: number; relative_humidity_2m: number; apparent_temperature: number;
    is_day: number; precipitation: number; weather_code: number; wind_speed_10m: number
  }
  hourly: {
    time: string[]; temperature_2m: number[]; precipitation_probability: number[];
    weather_code: number[]; relative_humidity_2m: number[]
  }
  daily: {
    time: string[]; weather_code: number[]; temperature_2m_max: number[];
    temperature_2m_min: number[]; precipitation_probability_max: number[];
    sunrise: string[]; sunset: string[]; uv_index_max: number[]
  }
}

const weatherInfo = (code: number) => {
  if (code === 0) return { label: '快晴', Icon: Sun }
  if (code <= 2) return { label: code === 1 ? '晴れ' : '一部くもり', Icon: CloudSun }
  if (code === 3) return { label: 'くもり', Icon: Cloud }
  if ([45, 48].includes(code)) return { label: '霧', Icon: CloudFog }
  if ([51, 53, 55, 56, 57].includes(code)) return { label: '霧雨', Icon: CloudDrizzle }
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: '雨', Icon: CloudRain }
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: '雪', Icon: CloudSnow }
  if ([95, 96, 99].includes(code)) return { label: '雷雨', Icon: CloudLightning }
  return { label: 'くもり', Icon: Cloud }
}
const jpDate = (value: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('ja-JP', options).format(new Date(value))
const hourLabel = (value: string) => `${new Date(value).getHours()}時`
const dayLabel = (value: string, index: number) =>
  index === 0 ? '今日' : index === 1 ? '明日' : jpDate(value, { weekday: 'short' })

async function geocode(city: string): Promise<Place> {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.search = new URLSearchParams({ name: city, count: '1', language: 'ja', format: 'json' }).toString()
  const response = await fetch(url)
  if (!response.ok) throw new Error('都市名を検索できませんでした。')
  const result = await response.json()
  if (!result.results?.length) throw new Error('該当する都市が見つかりませんでした。別の表記でお試しください。')
  return result.results[0]
}
async function fetchWeather(place: Place): Promise<WeatherData> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.search = new URLSearchParams({
    latitude: String(place.latitude), longitude: String(place.longitude),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m',
    hourly: 'temperature_2m,precipitation_probability,weather_code,relative_humidity_2m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max',
    timezone: 'auto', forecast_days: '7', forecast_hours: '24',
    temperature_unit: 'celsius', wind_speed_unit: 'kmh'
  }).toString()
  const response = await fetch(url)
  if (!response.ok) throw new Error('天気データを取得できませんでした。')
  return response.json()
}

export default function App() {
  const [place, setPlace] = useState<Place>({
    name: '東京', admin1: '東京都', country: '日本', latitude: 35.6812, longitude: 139.7671, timezone: 'Asia/Tokyo'
  })
  const [data, setData] = useState<WeatherData | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState(new Date())
  const [showLocationConsent, setShowLocationConsent] = useState(false)

  const loadWeather = useCallback(async (target: Place) => {
    setLoading(true); setError('')
    try {
      const weather = await fetchWeather(target)
      setPlace(target); setData(weather); setUpdatedAt(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : '読み込みに失敗しました。')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void loadWeather(place) }, []) // 初回は東京の天気を表示

  const searchCity = async (event: FormEvent) => {
    event.preventDefault()
    if (!query.trim()) return
    setLoading(true); setError('')
    try {
      const found = await geocode(query.trim())
      await loadWeather(found)
      setQuery('')
    } catch (e) {
      setLoading(false); setError(e instanceof Error ? e.message : '都市の検索に失敗しました。')
    }
  }
  // 「現在地」ボタンを押しただけでは位置情報を要求せず、先にアプリ内で確認します。
  const useMyLocation = () => {
    setError('')
    setShowLocationConsent(true)
  }

  // ユーザーが「許可する」を選んだ場合に限り、ブラウザへ位置情報を要求します。
  const confirmUseMyLocation = () => {
    setShowLocationConsent(false)
    if (!navigator.geolocation) {
      setError('このブラウザでは位置情報を利用できません。都市名検索をご利用ください。')
      return
    }
    setLoading(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const reverse = await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${coords.latitude}&longitude=${coords.longitude}&language=ja&format=json`)
          const result = await reverse.json()
          const item = result.results?.[0]
          await loadWeather({
            name: item?.name ?? '現在地', admin1: item?.admin1, country: item?.country,
            latitude: coords.latitude, longitude: coords.longitude
          })
        } catch {
          await loadWeather({ name: '現在地', latitude: coords.latitude, longitude: coords.longitude })
        }
      },
      () => {
        setLoading(false)
        setError('位置情報を取得できませんでした。ブラウザの位置情報設定をご確認ください。')
      },
      { enableHighAccuracy: false, timeout: 10000 }
    )
  }

  const current = data?.current
  const condition = current ? weatherInfo(current.weather_code) : weatherInfo(0)
  const CurrentIcon = condition.Icon
  const hourly = useMemo(() => {
    if (!data) return []
    const now = new Date()
    let start = data.hourly.time.findIndex(t => new Date(t).getTime() >= now.getTime() - 60 * 60 * 1000)
    if (start < 0) start = 0
    return data.hourly.time.slice(start, start + 12).map((time, i) => ({
      time, temp: data.hourly.temperature_2m[start + i],
      rain: data.hourly.precipitation_probability[start + i],
      code: data.hourly.weather_code[start + i]
    }))
  }, [data])
  const today = data?.daily
  const locationText = [place.admin1, place.country].filter(Boolean).join(' · ')
  const refresh = () => void loadWeather(place)

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="そらナビ ホーム"><span className="brand-mark"><CloudSun size={22} /></span><span>そらナビ</span></a>
        <span className="top-caption">空模様を、もっと身近に。</span>
        <button className="icon-button refresh-button" onClick={refresh} aria-label="天気を更新"><RefreshCw size={18} /></button>
      </header>

      <section className="search-area">
        <form className="search-form" onSubmit={searchCity}>
          <Search size={19} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="都市名を入力（例：大阪、札幌、那覇）" aria-label="都市名" />
          <button type="submit" disabled={!query.trim() || loading}>検索</button>
        </form>
        <button className="location-button" onClick={useMyLocation}><LocateFixed size={17} />現在地</button>
      </section>

      {error && <div className="error-message"><AlertCircle size={17} />{error}</div>}

      {showLocationConsent && (
        <div className="consent-backdrop" onClick={() => setShowLocationConsent(false)}>
          <section
            className="consent-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="location-consent-title"
            aria-describedby="location-consent-description"
            onClick={event => event.stopPropagation()}
          >
            <div className="consent-icon"><LocateFixed size={26} /></div>
            <h2 id="location-consent-title">現在地の取得について</h2>
            <p id="location-consent-description">
              現在地の天気を表示するため、デバイスの位置情報を取得します。位置情報の取得を許可しますか？
            </p>
            <p className="consent-note">「許可する」を選ぶと、続けてブラウザからも位置情報の利用確認が表示される場合があります。許可しない場合、位置情報は取得しません。</p>
            <div className="consent-actions">
              <button className="consent-deny" onClick={() => setShowLocationConsent(false)}>許可しない</button>
              <button className="consent-allow" onClick={confirmUseMyLocation}>許可する</button>
            </div>
          </section>
        </div>
      )}

      <section className="hero-card">
        <div className="hero-orb orb-one" /><div className="hero-orb orb-two" />
        <div className="hero-content">
          <div className="place-line"><MapPin size={16} /><span>{place.name}</span><small>{locationText}</small></div>
          <p className="today-date">{new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date())}</p>
          {loading && !data ? <div className="loading-state">天気情報を読み込んでいます…</div> : <>
            <div className="current-weather">
              <div className="temperature">{Math.round(current?.temperature_2m ?? 0)}<span>°</span></div>
              <div className="current-description"><CurrentIcon size={58} strokeWidth={1.45} /><div><strong>{condition.label}</strong><span>体感 {Math.round(current?.apparent_temperature ?? 0)}°</span></div></div>
            </div>
            <div className="high-low"><span>今日の最高 <b>{Math.round(today?.temperature_2m_max[0] ?? 0)}°</b></span><i /> <span>最低 <b>{Math.round(today?.temperature_2m_min[0] ?? 0)}°</b></span></div>
          </>}
          <div className="hero-stats">
            <div><Droplets size={18} /><span>湿度</span><b>{current?.relative_humidity_2m ?? '--'}%</b></div>
            <div><Wind size={18} /><span>風速</span><b>{Math.round(current?.wind_speed_10m ?? 0)} km/h</b></div>
            <div><Umbrella size={18} /><span>降水量</span><b>{current?.precipitation ?? '--'} mm</b></div>
          </div>
        </div>
        <div className="hero-art"><div className="sun-halo"><Sun size={78} strokeWidth={1.2} /></div><div className="hero-cloud cloud-a"><Cloud size={105} /></div><div className="hero-cloud cloud-b"><Cloud size={76} /></div></div>
      </section>

      <section className="panel hourly-panel">
        <div className="section-heading"><div><span className="eyebrow">TODAY</span><h2>今日の時間別予報</h2></div><span className="section-note">これから12時間</span></div>
        <div className="hourly-list">
          {hourly.map((item, i) => {
            const { Icon } = weatherInfo(item.code)
            return <div className={`hour-item ${i === 0 ? 'hour-now' : ''}`} key={item.time}>
              <span className="hour-time">{i === 0 ? '現在' : hourLabel(item.time)}</span><Icon className="hour-icon" size={25} strokeWidth={1.6} />
              <b>{Math.round(item.temp)}°</b><span className="rain-chance"><Droplets size={12} />{item.rain}%</span>
            </div>
          })}
          {!data && <div className="empty-state">天気データを読み込んでいます</div>}
        </div>
      </section>

      <section className="panel week-panel">
        <div className="section-heading"><div><span className="eyebrow">7 DAYS</span><h2>週間予報</h2></div><span className="section-note">向こう7日間</span></div>
        <div className="week-list">
          {today?.time.map((date, i) => {
            const { Icon, label } = weatherInfo(today.weather_code[i])
            return <div className="week-row" key={date}>
              <div className="week-day"><b>{dayLabel(date, i)}</b><span>{jpDate(date, { month: 'numeric', day: 'numeric' })}</span></div>
              <div className="week-condition"><Icon size={25} strokeWidth={1.6} /><span>{label}</span></div>
              <div className="week-rain"><Droplets size={13} />{today.precipitation_probability_max[i]}%</div>
              <div className="week-temperatures"><b>{Math.round(today.temperature_2m_max[i])}°</b><span>{Math.round(today.temperature_2m_min[i])}°</span></div>
            </div>
          })}
          {!data && <div className="empty-state">週間予報を読み込んでいます</div>}
        </div>
      </section>

      {today && <section className="sun-times">
        <div><Sunrise size={21} /><span>日の出</span><b>{jpDate(today.sunrise[0], { hour: '2-digit', minute: '2-digit' })}</b></div>
        <div><Sunset size={21} /><span>日の入り</span><b>{jpDate(today.sunset[0], { hour: '2-digit', minute: '2-digit' })}</b></div>
        <div><Thermometer size={21} /><span>UV指数</span><b>{Math.round(today.uv_index_max[0])}</b></div>
      </section>}

      <footer><span>そらナビ</span><span>天気データ：Open-Meteo</span><span>最終更新 {updatedAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span></footer>
    </main>
  )
}