// App.jsx
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, Route, Routes } from 'react-router-dom'
import { Dashboard, Transactions, Budgets, Jars } from './pages'
import QuickAdd from './QuickAdd'

const links = [
  ['/', '📊 Tổng quan'],
  ['/transactions', '📑 Giao dịch'],
  ['/budgets', '⚡ Ngân sách'],
  ['/jars', '🏺 Hũ tiết kiệm']
]

const hueNames = [
  'Đỏ', 'Đỏ cam', 'Cam', 'Hổ phách', 'Vàng', 'Vàng chanh',
  'Xanh non', 'Lá mạ', 'Xanh lá', 'Lục ngả lam', 'Lục bảo', 'Ngọc lục',
  'Ngọc lam', 'Cyan', 'Xanh biển', 'Xanh da trời', 'Xanh dương', 'Chàm',
  'Tím xanh', 'Tím', 'Tím hồng', 'Cánh sen', 'Hồng', 'Đỏ hồng'
]

const colorOptions = [
  ...hueNames.map((name, index) => ({ name, value: `hsl(${index * 15} 74% 42%)` })),
  { name: 'Xanh lá FinTrack', value: '#4f8a74' },
  { name: 'Than chì', value: '#374151' },
  { name: 'Xám', value: '#6b7280' },
  { name: 'Bạc', value: '#9ca3af' },
  { name: 'Nâu', value: '#795548' }
]

const effectOptions = [
  { id: 'none', name: 'Tắt hiệu ứng', icon: '○' },
  { id: 'sakura', name: 'Hoa anh đào', icon: '✿' },
  { id: 'snow', name: 'Tuyết rơi', icon: '❄' },
  { id: 'autumn', name: 'Lá thu', icon: '❧' }
]

const defaultEffectSettings = {
  sakura: { opacity: 24, size: 24, density: 18, speed: 24 },
  snow: { opacity: 24, size: 24, density: 18, speed: 24 },
  autumn: { opacity: 24, size: 24, density: 18, speed: 24 },
  custom: { opacity: 18, scale: 100 }
}

const defaultPreferences = { color: '#4f8a74', background: '', effect: 'none', effectName: '', effectSettings: defaultEffectSettings }

function sanitizeEffectSettings(settings = {}) {
  return Object.fromEntries(Object.entries(defaultEffectSettings).map(([effect, defaults]) => {
    const saved = settings?.[effect] || {}
    return [effect, Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => {
      const max = key === 'opacity' ? 50 : key === 'size' ? 48 : key === 'density' ? 36 : key === 'speed' ? 40 : 100
      const min = key === 'opacity' ? 5 : key === 'size' ? 8 : key === 'density' ? 6 : key === 'speed' ? 8 : 35
      const value = Number(saved[key])
      return [key, Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback]
    }))]
  }))
}

function openEffectDatabase() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('Trình duyệt không hỗ trợ lưu trữ hiệu ứng.'))
      return
    }

    const request = window.indexedDB.open('fintrack-personalization', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('effects')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function storeCustomEffect(blob) {
  const database = await openEffectDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('effects', 'readwrite')
    transaction.objectStore('effects').put(blob, 'custom')
    transaction.oncomplete = () => {
      database.close()
      resolve()
    }
    transaction.onerror = () => {
      database.close()
      reject(transaction.error)
    }
  })
}

async function loadCustomEffect() {
  const database = await openEffectDatabase()
  return new Promise((resolve, reject) => {
    const request = database.transaction('effects', 'readonly').objectStore('effects').get('custom')
    request.onsuccess = () => {
      database.close()
      resolve(request.result || null)
    }
    request.onerror = () => {
      database.close()
      reject(request.error)
    }
  })
}

async function deleteCustomEffect() {
  const database = await openEffectDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('effects', 'readwrite')
    transaction.objectStore('effects').delete('custom')
    transaction.oncomplete = () => {
      database.close()
      resolve()
    }
    transaction.onerror = () => {
      database.close()
      reject(transaction.error)
    }
  })
}

function BackgroundEffect({ type, customSrc, settings }) {
  if (type === 'none') return null

  if (type === 'custom') {
    return customSrc ? (
      <div className="ambient-effect-layer ambient-effect-custom" aria-hidden="true" style={{ opacity: settings.opacity / 100 }}>
        <img src={customSrc} alt="" style={{ maxWidth: `${settings.scale}vw`, maxHeight: `${settings.scale}vh` }} />
      </div>
    ) : null
  }

  return (
    <div className={`ambient-effect-layer ambient-effect-${type}`} aria-hidden="true">
      {Array.from({ length: settings.density }, (_, index) => (
        <span
          key={`${type}-${index}`}
          className="ambient-particle"
          style={{
            '--particle-x': `${(index * 47 + 13) % 100}%`,
            '--particle-y': `${(index * 29 + 7) % 90 + 5}%`,
            '--particle-delay': `${-((index * 7) % 24)}s`,
            '--particle-duration': `${settings.speed + ((index * 11) % 8)}s`,
            '--particle-size': `${Math.round(settings.size * (0.75 + ((index * 5) % 6) / 10))}px`,
            '--particle-drift': `${((index * 37) % 120) - 60}px`,
            '--particle-opacity': (settings.opacity / 100) * (0.65 + ((index * 17) % 5) / 10),
          }}
        >
          <svg viewBox="0 0 24 24" focusable="false">
            {type === 'sakura' && <path d="M12 12C9 10 5 10 5 6c0-2 2-3 4-2 2 1 2 5 3 8Zm0 0c-1-3 0-7 3-8 2-1 4 1 3 3-1 3-4 3-6 5Zm0 0c3-1 7 0 8 3 1 2-1 4-3 3-3-1-3-4-5-6Zm0 0c1 3 0 7-3 8-2 1-4-1-3-3 1-3 4-3 6-5Zm0 0c-3 1-7 0-8-3-1-2 1-4 3-3 3 1 3 4 5 6Z" />}
            {type === 'snow' && <path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 2 3-2M9 20l3-2 3 2M4 10l3-1 1-3M20 14l-3 1-1 3M4 14l3 1 1 3M20 10l-3-1-1-3" />}
            {type === 'autumn' && <path d="M20 4C10 4 4 7 4 14c0 3 2 5 5 5 7 0 10-6 11-15ZM5 19l9-9M10 15l-1-4M14 11l4 1" />}
          </svg>
        </span>
      ))}
    </div>
  )
}

function getAccentContrast(color) {
  let channels
  const hslMatch = color.match(/^hsl\((\d+)\s+([\d.]+)%\s+([\d.]+)%\)$/)

  if (hslMatch) {
    const hue = Number(hslMatch[1]) % 360
    const saturation = Number(hslMatch[2]) / 100
    const lightness = Number(hslMatch[3]) / 100
    const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
    const second = chroma * (1 - Math.abs((hue / 60) % 2 - 1))
    const base = lightness - chroma / 2
    const rgb = hue < 60 ? [chroma, second, 0]
      : hue < 120 ? [second, chroma, 0]
        : hue < 180 ? [0, chroma, second]
          : hue < 240 ? [0, second, chroma]
            : hue < 300 ? [second, 0, chroma]
              : [chroma, 0, second]
    channels = rgb.map((channel) => channel + base)
  } else {
    channels = color.match(/[\da-f]{2}/gi).slice(-3).map((channel) => parseInt(channel, 16) / 255)
  }

  const luminance = channels
    .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index], 0)
  return (1.05 / (luminance + 0.05)) >= ((luminance + 0.05) / 0.05) ? '#ffffff' : '#172033'
}

function readPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem('fintrack_personalize') || '{}')
    return {
      color: colorOptions.some((option) => option.value === saved.color) ? saved.color : defaultPreferences.color,
      background: typeof saved.background === 'string' ? saved.background : '',
      effect: [...effectOptions.map((option) => option.id), 'custom'].includes(saved.effect) ? saved.effect : 'none',
      effectName: typeof saved.effectName === 'string' ? saved.effectName : '',
      effectSettings: sanitizeEffectSettings(saved.effectSettings)
    }
  } catch {
    return defaultPreferences
  }
}

export default function App() {
  const [open, setOpen] = useState(false)
  const [showPersonalize, setShowPersonalize] = useState(false)
  const [preferences, setPreferences] = useState(readPreferences)
  const [uploadError, setUploadError] = useState('')
  const [customEffectUrl, setCustomEffectUrl] = useState('')
  const [effectOptionsMenu, setEffectOptionsMenu] = useState(null)

  // State quản lý Dark/Light Mode đồng bộ với localStorage
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('fintrack_theme') === 'dark'
  })

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
      localStorage.setItem('fintrack_theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('fintrack_theme', 'light')
    }
  }, [isDark])

  useEffect(() => {
    let active = true
    if (preferences.effectName) {
      loadCustomEffect()
        .then((blob) => {
          if (active && blob) setCustomEffectUrl(URL.createObjectURL(blob))
        })
        .catch(() => {
          if (active) setUploadError('Không thể tải hiệu ứng đã lưu. Bạn có thể tải tệp lên lại.')
        })
    }
    return () => {
      active = false
    }
  }, [])

  useEffect(() => () => {
    if (customEffectUrl) URL.revokeObjectURL(customEffectUrl)
  }, [customEffectUrl])

  useEffect(() => {
    if (!effectOptionsMenu) return undefined

    const dismissMenu = (event) => {
      if (event.type === 'keydown' && event.key === 'Escape') setEffectOptionsMenu(null)
      if (event.type === 'pointerdown' && !event.target.closest('[data-effect-options]')) setEffectOptionsMenu(null)
    }
    document.addEventListener('pointerdown', dismissMenu)
    document.addEventListener('keydown', dismissMenu)
    return () => {
      document.removeEventListener('pointerdown', dismissMenu)
      document.removeEventListener('keydown', dismissMenu)
    }
  }, [effectOptionsMenu])

  useEffect(() => {
    if (!showPersonalize) setEffectOptionsMenu(null)
  }, [showPersonalize])

  useEffect(() => {
    const root = document.documentElement
    const isPersonalized = preferences.color !== defaultPreferences.color || Boolean(preferences.background) || preferences.effect !== 'none'
    root.dataset.personalized = String(isPersonalized)
    root.dataset.effect = preferences.effect
    root.style.setProperty('--color-sage', preferences.color)
    root.style.setProperty('--theme-accent', preferences.color)
    root.style.setProperty('--theme-accent-contrast', getAccentContrast(preferences.color))
    try {
      localStorage.setItem('fintrack_personalize', JSON.stringify(preferences))
    } catch {
      setUploadError('Không đủ dung lượng lưu giao diện trong trình duyệt.')
    }

    if (preferences.background) {
      const overlay = isDark ? 'rgba(11, 15, 25, 0.78)' : 'rgba(243, 245, 247, 0.78)'
      document.body.style.backgroundImage = `linear-gradient(${overlay}, ${overlay}), url("${preferences.background}")`
      document.body.style.backgroundSize = 'cover'
      document.body.style.backgroundPosition = 'center'
      document.body.style.backgroundAttachment = 'fixed'
    } else {
      document.body.style.backgroundImage = ''
      document.body.style.backgroundSize = ''
      document.body.style.backgroundPosition = ''
      document.body.style.backgroundAttachment = ''
    }
  }, [preferences, isDark])

  const handleBackgroundUpload = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUploadError('')

    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
      setUploadError('Vui lòng chọn ảnh PNG, JPG, WEBP hoặc GIF.')
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('Ảnh gốc cần có dung lượng tối đa 15 MB.')
      return
    }

    try {
      const bitmap = await createImageBitmap(file)
      const scale = Math.min(3840 / bitmap.width, 2160 / bitmap.height, 1)
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))

      const context = canvas.getContext('2d')
      if (!context) throw new Error('Canvas không khả dụng')
      const encodeBackground = () => {
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
        const webp = canvas.toDataURL('image/webp', 0.9)
        if (webp.startsWith('data:image/webp')) return webp
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
        return canvas.toDataURL('image/jpeg', 0.88)
      }

      let background = encodeBackground()
      for (let attempt = 0; background.length > 2 * 1024 * 1024 && attempt < 8; attempt += 1) {
        canvas.width = Math.max(1, Math.round(canvas.width * 0.85))
        canvas.height = Math.max(1, Math.round(canvas.height * 0.85))
        background = encodeBackground()
      }
      bitmap.close()

      setPreferences((current) => ({ ...current, background }))
    } catch {
      setUploadError('Không thể xử lý ảnh này. Vui lòng chọn ảnh khác.')
    }
  }

  const handleEffectUpload = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUploadError('')

    if (!['image/gif', 'image/png', 'image/webp', 'image/jpeg'].includes(file.type)) {
      setUploadError('Hiệu ứng hỗ trợ GIF, PNG, WEBP hoặc JPG.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Tệp hiệu ứng cần có dung lượng tối đa 10 MB.')
      return
    }

    try {
      const bitmap = await createImageBitmap(file)
      const pixelCount = bitmap.width * bitmap.height
      bitmap.close()
      if (pixelCount > 40000000) {
        setUploadError('Kích thước ảnh hiệu ứng tối đa là 40 megapixel.')
        return
      }

      await storeCustomEffect(file)
      const nextUrl = URL.createObjectURL(file)
      setCustomEffectUrl(nextUrl)
      setPreferences((current) => ({ ...current, effect: 'custom', effectName: file.name }))
    } catch {
      setUploadError('Không thể lưu hiệu ứng. Hãy thử tệp nhỏ hơn hoặc bật lưu trữ của trình duyệt.')
    }
  }

  const removeCustomEffect = async () => {
    try {
      await deleteCustomEffect()
    } catch {
      setUploadError('Không thể xóa tệp hiệu ứng đã lưu.')
      return
    }
    setCustomEffectUrl('')
    setPreferences((current) => ({ ...current, effect: 'none', effectName: '' }))
    setUploadError('')
  }

  const resetPersonalization = async () => {
    setPreferences(defaultPreferences)
    setCustomEffectUrl('')
    setUploadError('')
    try {
      await deleteCustomEffect()
    } catch {
      // Preferences still reset even if browser storage is unavailable.
    }
  }

  const openEffectOptions = (event, effectId) => {
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX || rect.left + rect.width / 2
    const y = event.clientY || rect.bottom
    setEffectOptionsMenu({
      id: effectId,
      x: Math.max(8, Math.min(x, window.innerWidth - 280)),
      y: Math.max(8, Math.min(y, window.innerHeight - 310))
    })
  }

  const updateEffectSetting = (effectId, key, value) => {
    setPreferences((current) => ({
      ...current,
      effectSettings: {
        ...current.effectSettings,
        [effectId]: { ...current.effectSettings[effectId], [key]: Number(value) }
      }
    }))
  }

  const activeOptionsEffect = effectOptionsMenu?.id === 'custom'
    ? { id: 'custom', name: preferences.effectName || 'Hiệu ứng của tôi' }
    : effectOptions.find((option) => option.id === effectOptionsMenu?.id)
  const activeOptionsSettings = activeOptionsEffect ? preferences.effectSettings[activeOptionsEffect.id] : null
  const activeOptionsControls = effectOptionsMenu?.id === 'custom'
    ? [
        { key: 'opacity', label: 'Độ mờ', min: 5, max: 40, unit: '%' },
        { key: 'scale', label: 'Kích thước tối đa', min: 35, max: 100, unit: '%' }
      ]
    : [
        { key: 'opacity', label: 'Độ mờ', min: 5, max: 50, unit: '%' },
        { key: 'size', label: 'Kích thước hạt', min: 8, max: 48, unit: ' px' },
        { key: 'density', label: 'Số lượng hạt', min: 6, max: 36, unit: '' },
        { key: 'speed', label: 'Thời gian một vòng', min: 8, max: 40, unit: ' giây' }
      ]

  return (
    <>
      <BackgroundEffect
        type={preferences.effect}
        customSrc={customEffectUrl}
        settings={preferences.effectSettings[preferences.effect]}
      />
      <div className="relative z-10 mx-auto max-w-4xl p-4 sm:p-6 pb-28 min-h-screen transition-colors">
      <header className="flex items-center justify-between gap-3 flex-wrap bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💚</span>
          <h1 className="text-xl font-extrabold text-ink tracking-tight">FinTrack</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <nav className="flex gap-1 text-xs sm:text-sm font-semibold">
            {links.map(([to, l]) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-xl transition-all ${
                    isActive 
                      ? 'bg-ink text-white shadow-sm' 
                      : 'text-gray-500 dark:text-gray-400 hover:bg-mist dark:hover:bg-gray-800 hover:text-ink dark:hover:text-white'
                  }`
                }
              >
                {l}
              </NavLink>
            ))}
          </nav>

          {/* Nút chuyển đổi Dark/Light mode */}
          <button
            onClick={() => setIsDark(!isDark)}
            aria-label="Chuyển đổi giao diện"
            className="p-2.5 rounded-xl bg-mist dark:bg-gray-800 text-ink hover:opacity-80 transition-all text-sm"
          >
            {isDark ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <main className="mt-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/jars" element={<Jars />} />
        </Routes>
      </main>

      <button
        type="button"
        onClick={() => setShowPersonalize((visible) => !visible)}
        aria-expanded={showPersonalize}
        aria-controls="personalize-panel"
        className="fixed bottom-6 left-6 z-40 flex items-center gap-2 rounded-full bg-white dark:bg-gray-900 px-4 py-3 font-bold text-ink shadow-xl border border-gray-100 dark:border-gray-800 transition-all hover:-translate-y-0.5"
      >
        <span aria-hidden="true">🎨</span> Cá nhân hóa
      </button>

      {showPersonalize && (
        <aside
          id="personalize-panel"
          aria-label="Tùy chỉnh giao diện"
          className="fixed bottom-20 left-6 z-50 max-h-[calc(100vh-6rem)] w-[min(340px,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 text-ink dark:text-gray-100 shadow-2xl animate-fadeIn"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-bold">Tùy chỉnh giao diện</h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Chọn màu chủ đạo và hình nền của bạn.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowPersonalize(false)}
              aria-label="Đóng tùy chỉnh giao diện"
              className="rounded-lg p-2 text-gray-400 hover:bg-mist dark:hover:bg-gray-800"
            >
              ✕
            </button>
          </div>

          <fieldset>
            <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Màu chủ đạo</legend>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPreferences((current) => ({ ...current, color: option.value }))}
                  aria-pressed={preferences.color === option.value}
                  aria-label={option.name}
                  title={option.name}
                  className={`relative mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-white/30 shadow-sm transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage ${
                    preferences.color === option.value ? 'ring-2 ring-sage ring-offset-2 ring-offset-white dark:ring-offset-gray-900' : ''
                  }`}
                  style={{ backgroundColor: option.value }}
                >
                  {preferences.color === option.value && <span aria-hidden="true" className="text-sm font-black text-white drop-shadow">✓</span>}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-5 border-t border-gray-100 dark:border-gray-800 pt-4">
            <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Hiệu ứng nền</legend>
            <div className="grid grid-cols-2 gap-2">
              {[...effectOptions, ...(preferences.effectName ? [{ id: 'custom', name: 'Hiệu ứng của tôi', icon: '✨' }] : [])].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setPreferences((current) => ({ ...current, effect: option.id }))
                    setEffectOptionsMenu(null)
                  }}
                  onContextMenu={(event) => option.id !== 'none' && openEffectOptions(event, option.id)}
                  onKeyDown={(event) => {
                    if (option.id !== 'none' && ((event.shiftKey && event.key === 'F10') || event.key === 'ContextMenu')) {
                      openEffectOptions(event, option.id)
                    }
                  }}
                  aria-pressed={preferences.effect === option.id}
                  title={option.id === 'none' ? option.name : `${option.name} · chuột phải để tùy chỉnh`}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors ${
                    preferences.effect === option.id
                      ? 'border-sage bg-sage/10 text-ink dark:text-gray-100'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-mist dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="text-base" aria-hidden="true">{option.icon}</span>
                  {option.name}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] text-gray-400">Nhấp phải vào hiệu ứng để chỉnh riêng độ mờ, kích thước và chuyển động.</p>

            <div className="mt-3">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 px-3 py-2.5 text-xs font-semibold transition-colors hover:border-sage hover:bg-sage/5">
                <span aria-hidden="true">✨</span>
                {preferences.effect === 'custom' ? 'Thay hiệu ứng của bạn' : 'Tải hiệu ứng của bạn'}
                <input
                  type="file"
                  accept="image/gif,image/png,image/webp,image/jpeg"
                  onChange={handleEffectUpload}
                  className="sr-only"
                />
              </label>
              <p className="mt-1.5 text-[10px] leading-relaxed text-gray-400">
                GIF động hoặc PNG/WEBP trong suốt · tối đa 10 MB. Không phóng lớn ảnh nhỏ để tránh vỡ nét.
              </p>
              {preferences.effect === 'custom' && (
                <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-mist/70 dark:bg-gray-800/70 px-2.5 py-2">
                  <span className="min-w-0 truncate text-[11px] font-medium text-gray-500 dark:text-gray-300">
                    {preferences.effectName || 'Hiệu ứng tùy chỉnh'}
                  </span>
                  <button
                    type="button"
                    onClick={removeCustomEffect}
                    className="shrink-0 text-[11px] font-semibold text-alert hover:underline"
                  >
                    Gỡ
                  </button>
                </div>
              )}
            </div>
          </fieldset>

          <div className="mt-5 border-t border-gray-100 dark:border-gray-800 pt-4">
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Ảnh nền</div>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 px-3 py-3 text-sm font-semibold transition-colors hover:border-sage hover:bg-sage/5">
              <span aria-hidden="true">🖼️</span>
              {preferences.background ? 'Thay ảnh nền' : 'Tải ảnh lên'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleBackgroundUpload}
                className="sr-only"
              />
            </label>
            <p className="mt-2 text-[11px] text-gray-400">PNG, JPG, WEBP hoặc GIF · xử lý tối đa 3840 × 2160, giữ nguyên tỷ lệ · nên dùng ảnh gốc từ 1920 × 1080 · tối đa 15 MB</p>
            {preferences.background && (
              <div className="mt-3 flex items-center gap-3">
                <img src={preferences.background} alt="Xem trước ảnh nền" className="h-12 w-16 rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => setPreferences((current) => ({ ...current, background: '' }))}
                  className="text-xs font-semibold text-alert hover:underline"
                >
                  Gỡ ảnh nền
                </button>
              </div>
            )}
            {uploadError && <p role="alert" className="mt-2 text-xs font-medium text-alert">{uploadError}</p>}
          </div>

          <button
            type="button"
            onClick={resetPersonalization}
            className="mt-4 w-full rounded-xl bg-mist dark:bg-gray-800 py-2.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:opacity-80"
          >
            Khôi phục mặc định
          </button>
        </aside>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 bg-sage hover:bg-sage/90 text-white rounded-full px-6 py-3.5 font-bold shadow-xl hover:shadow-2xl transition-all flex items-center gap-2 z-40 active:scale-95"
      >
        <span className="text-xl">+</span> Thêm giao dịch
      </button>

      {open && <QuickAdd onClose={() => setOpen(false)} />}
      </div>
      {effectOptionsMenu && activeOptionsEffect && activeOptionsSettings && createPortal(
        <section
          data-effect-options
          role="dialog"
          aria-label={`Tùy chỉnh ${activeOptionsEffect.name}`}
          onContextMenu={(event) => event.preventDefault()}
          className="fixed z-[1000] w-[min(272px,calc(100vw-1rem))] rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-ink dark:text-gray-100 shadow-2xl"
          style={{ left: effectOptionsMenu.x, top: effectOptionsMenu.y }}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="truncate text-sm font-bold">Tùy chỉnh {activeOptionsEffect.name}</h3>
            <button
              type="button"
              onClick={() => setEffectOptionsMenu(null)}
              aria-label="Đóng tùy chỉnh hiệu ứng"
              className="shrink-0 rounded-lg px-2 py-1 text-gray-400 hover:bg-mist dark:hover:bg-gray-800"
            >
              ✕
            </button>
          </div>
          <div className="space-y-3">
            {activeOptionsControls.map((control) => (
              <label key={control.key} className="block">
                <span className="mb-1 flex justify-between gap-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                  <span>{control.label}</span>
                  <output>{activeOptionsSettings[control.key]}{control.unit}</output>
                </span>
                <input
                  type="range"
                  min={control.min}
                  max={control.max}
                  step="1"
                  value={activeOptionsSettings[control.key]}
                  onChange={(event) => updateEffectSetting(effectOptionsMenu.id, control.key, event.target.value)}
                  aria-label={control.label}
                  className="w-full cursor-pointer accent-sage"
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPreferences((current) => ({
              ...current,
              effectSettings: { ...current.effectSettings, [effectOptionsMenu.id]: { ...defaultEffectSettings[effectOptionsMenu.id] } }
            }))}
            className="mt-3 w-full rounded-lg bg-mist dark:bg-gray-800 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:opacity-80"
          >
            Đặt lại tùy chỉnh hiệu ứng
          </button>
        </section>,
        document.body
      )}
    </>
  )
}