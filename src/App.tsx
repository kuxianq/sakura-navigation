import { useEffect, useState, type FormEvent } from 'react'
import { KeyRound, LayoutDashboard, LogOut, Settings2, Sparkles } from 'lucide-react'
import { NavStoreProvider } from './state/navStore'
import { useNavStore } from './state/navStoreContext'
import { loadBackground } from './lib/background'
import { HomePage } from './components/home/HomePage'
import { AdminConsole } from './components/admin/AdminConsole'
import './styles/app.css'

type Route = 'home' | 'admin'

function readRoute(): Route {
  return window.location.pathname.startsWith('/admin') ? 'admin' : 'home'
}

interface AuthGateProps {
  title: string
  description: string
  value: string
  error: string | null
  submitLabel: string
  onChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

function AuthGate({ title, description, value, error, submitLabel, onChange, onSubmit }: AuthGateProps) {
  return (
    <section className="auth-gate" aria-label={title}>
      <div className="auth-card">
        <span className="auth-icon"><KeyRound size={24} /></span>
        <p className="eyebrow">Private Access</p>
        <h1>{title}</h1>
        <p>{description}</p>
        <form onSubmit={onSubmit} className="auth-form">
          <input
            className="field-input"
            type="password"
            value={value}
            placeholder="请输入密码"
            onChange={(event) => onChange(event.target.value)}
            autoFocus
          />
          {error ? <span className="field-error">{error}</span> : null}
          <button className="btn btn-primary" type="submit">{submitLabel}</button>
        </form>
      </div>
    </section>
  )
}

function AppShell() {
  const { settings } = useNavStore()
  const [route, setRoute] = useState<Route>(() => readRoute())
  const [apiBackground, setApiBackground] = useState<string | null>(null)
  const [frontendUnlockToken, setFrontendUnlockToken] = useState(() => sessionStorage.getItem('nav_frontend_unlocked') ?? '')
  const [adminUnlockToken, setAdminUnlockToken] = useState(() => sessionStorage.getItem('nav_admin_unlocked') ?? '')
  const [accessInput, setAccessInput] = useState('')
  const [adminInput, setAdminInput] = useState('')
  const [accessError, setAccessError] = useState<string | null>(null)
  const [adminError, setAdminError] = useState<string | null>(null)

  useEffect(() => {
    const onPop = () => setRoute(readRoute())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    if (settings.backgroundMode !== 'api') {
      // Non-api modes are derived synchronously below; clear any cached API background.
      return
    }
    let cancelled = false
    loadBackground(settings.backgroundApi).then((url) => {
      if (!cancelled && url) setApiBackground(url)
    })
    return () => {
      cancelled = true
    }
  }, [settings.backgroundApi, settings.backgroundMode])

  // Derive the active background image at render time so non-async modes do not need an effect.
  let background = settings.fallbackBackground
  if (settings.backgroundMode === 'custom' && settings.backgroundUrl) {
    background = settings.backgroundUrl
  } else if (settings.backgroundMode === 'api' && apiBackground) {
    background = apiBackground
  }

  function navigate(path: string) {
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path)
    }
    setRoute(readRoute())
  }

  function unlockFrontend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (accessInput === settings.frontendPassword && settings.frontendPassword.trim()) {
      sessionStorage.setItem('nav_frontend_unlocked', settings.frontendPassword)
      setFrontendUnlockToken(settings.frontendPassword)
      setAccessError(null)
      return
    }
    setAccessError('访问密码不正确。')
  }

  function unlockAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (adminInput === settings.adminPassword && settings.adminPassword.trim()) {
      sessionStorage.setItem('nav_admin_unlocked', settings.adminPassword)
      setAdminUnlockToken(settings.adminPassword)
      setAdminError(null)
      return
    }
    setAdminError('后台登录密码不正确。')
  }

  function logoutFrontend() {
    sessionStorage.removeItem('nav_frontend_unlocked')
    setFrontendUnlockToken('')
    setAccessInput('')
  }

  function logoutAdmin() {
    sessionStorage.removeItem('nav_admin_unlocked')
    setAdminUnlockToken('')
    setAdminInput('')
  }

  const frontendUnlocked = settings.frontendPasswordEnabled && Boolean(settings.frontendPassword.trim()) && frontendUnlockToken === settings.frontendPassword
  const adminUnlocked = settings.adminPasswordEnabled && Boolean(settings.adminPassword.trim()) && adminUnlockToken === settings.adminPassword
  const needsFrontendPassword = route === 'home' && settings.frontendPasswordEnabled && Boolean(settings.frontendPassword.trim()) && !frontendUnlocked
  const needsAdminPassword = route === 'admin' && settings.adminPasswordEnabled && Boolean(settings.adminPassword.trim()) && !adminUnlocked

  const shellStyle = {
    '--bg-image': `url(${background})`,
    '--theme-primary': settings.primaryColor,
    '--theme-accent': settings.accentColor,
    '--theme-text': settings.textColor,
    '--theme-panel': settings.panelColor,
    '--theme-border': settings.borderColor,
    '--theme-shadow': settings.shadowColor,
    '--bg-opacity': settings.backgroundOpacity,
    '--bg-blur': `${settings.backgroundBlur}px`,
    '--bg-brightness': settings.backgroundBrightness,
    '--bg-saturation': settings.backgroundSaturation,
    '--card-radius': `${settings.cardRadius}px`,
    '--card-opacity': settings.cardOpacity,
    '--card-blur': `${settings.cardBlur}px`,
    '--card-border-opacity': settings.cardBorderOpacity,
    '--card-shadow': settings.cardShadow,
  } as React.CSSProperties

  return (
    <main className={`app-shell theme-${settings.preset}`} style={shellStyle}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="page-glass">
        <header className="topbar">
          <button className="brand" onClick={() => navigate('/')} type="button" aria-label="返回首页">
            <span className="brand-mark"><Sparkles size={22} /></span>
            <span>
              <strong>{settings.siteTitle}</strong>
            </span>
          </button>
          <nav className="top-actions" aria-label="主导航">
            <button className={route === 'home' ? 'active' : ''} onClick={() => navigate('/')} type="button">
              <LayoutDashboard size={17} /> 首页
            </button>
            <button className={route === 'admin' ? 'active' : ''} onClick={() => navigate('/admin')} type="button">
              <Settings2 size={17} /> 后台
            </button>
            {route === 'home' && settings.frontendPasswordEnabled && frontendUnlocked ? (
              <button onClick={logoutFrontend} type="button"><LogOut size={16} /> 退出</button>
            ) : null}
            {route === 'admin' && settings.adminPasswordEnabled && adminUnlocked ? (
              <button onClick={logoutAdmin} type="button"><LogOut size={16} /> 退出</button>
            ) : null}
          </nav>
        </header>

        {needsFrontendPassword ? (
          <AuthGate
            title="访问樱花导航"
            description="这个首页已开启访问保护，通过密码后即可进入。"
            value={accessInput}
            error={accessError}
            submitLabel="进入首页"
            onChange={setAccessInput}
            onSubmit={unlockFrontend}
          />
        ) : needsAdminPassword ? (
          <AuthGate
            title="进入后台控制台"
            description="后台已开启登录保护，通过密码后即可管理站点内容。"
            value={adminInput}
            error={adminError}
            submitLabel="进入后台"
            onChange={setAdminInput}
            onSubmit={unlockAdmin}
          />
        ) : route === 'admin' ? <AdminConsole /> : <HomePage />}
      </div>
    </main>
  )
}

export default function App() {
  return (
    <NavStoreProvider>
      <AppShell />
    </NavStoreProvider>
  )
}
