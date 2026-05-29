import { useState } from 'react'
import { KeyRound, Save } from 'lucide-react'
import { useNavStore } from '../../state/navStoreContext'
import type { ThemeSettings } from '../../types/navigation'
import { Field, TextInput, Toggle } from './forms'

type SecurityDraft = Pick<ThemeSettings, 'frontendPasswordEnabled' | 'frontendPassword' | 'adminPasswordEnabled' | 'adminPassword'>

function pickSecurity(settings: ThemeSettings): SecurityDraft {
  return {
    frontendPasswordEnabled: settings.frontendPasswordEnabled,
    frontendPassword: settings.frontendPassword,
    adminPasswordEnabled: settings.adminPasswordEnabled,
    adminPassword: settings.adminPassword,
  }
}

export function SecurityTab() {
  const { settings, updateSettings } = useNavStore()
  const [draft, setDraft] = useState<SecurityDraft>(() => pickSecurity(settings))
  const [frontendConfirm, setFrontendConfirm] = useState(settings.frontendPassword)
  const [adminConfirm, setAdminConfirm] = useState(settings.adminPassword)
  const [lastSettingsRef, setLastSettingsRef] = useState(settings)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  if (settings !== lastSettingsRef) {
    setLastSettingsRef(settings)
    setDraft(pickSecurity(settings))
    setFrontendConfirm(settings.frontendPassword)
    setAdminConfirm(settings.adminPassword)
  }

  const frontendMismatch = draft.frontendPassword !== frontendConfirm
  const adminMismatch = draft.adminPassword !== adminConfirm
  const frontendMissing = draft.frontendPasswordEnabled && !draft.frontendPassword.trim()
  const adminMissing = draft.adminPasswordEnabled && !draft.adminPassword.trim()
  const dirty = JSON.stringify(draft) !== JSON.stringify(pickSecurity(settings))
  const canSave = dirty && !frontendMismatch && !adminMismatch && !frontendMissing && !adminMissing

  function patch<K extends keyof SecurityDraft>(key: K, value: SecurityDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  function save() {
    if (!canSave) return
    updateSettings(draft)
    setSavedAt(Date.now())
  }

  return (
    <div className="console-module settings-console">
      <header className="console-module-head">
        <div>
          <p className="eyebrow"><KeyRound size={16} /> 访问安全</p>
          <h2>访问密码</h2>

        </div>
      </header>

      <div className="control-board settings-board-single">
        <section className="control-section">
          <div className="section-title"><KeyRound size={18} /><span>前台访问</span></div>
          <Toggle
            checked={draft.frontendPasswordEnabled}
            onChange={(value) => patch('frontendPasswordEnabled', value)}
            label="启用前台访问密码"
            description="启用后，访问首页前需要通过密码验证。"
          />
          <div className="form-grid two-col">
            <Field label="前台访问密码" error={frontendMissing ? '启用前请填写访问密码。' : null}>
              <TextInput type="password" value={draft.frontendPassword} onChange={(value) => patch('frontendPassword', value)} placeholder="设置访问密码" />
            </Field>
            <Field label="确认前台访问密码" error={frontendMismatch ? '两次输入不一致。' : null}>
              <TextInput type="password" value={frontendConfirm} onChange={setFrontendConfirm} placeholder="再次输入访问密码" />
            </Field>
          </div>
        </section>

        <section className="control-section">
          <div className="section-title"><KeyRound size={18} /><span>后台登录</span></div>
          <Toggle
            checked={draft.adminPasswordEnabled}
            onChange={(value) => patch('adminPasswordEnabled', value)}
            label="启用后台登录密码"
            description="启用后，进入控制台前需要登录。"
          />
          <div className="form-grid two-col">
            <Field label="后台登录密码" error={adminMissing ? '启用前请填写后台密码。' : null}>
              <TextInput type="password" value={draft.adminPassword} onChange={(value) => patch('adminPassword', value)} placeholder="设置后台密码" />
            </Field>
            <Field label="确认后台登录密码" error={adminMismatch ? '两次输入不一致。' : null}>
              <TextInput type="password" value={adminConfirm} onChange={setAdminConfirm} placeholder="再次输入后台密码" />
            </Field>
          </div>
        </section>
      </div>

      <footer className="settings-actions console-actions">
        <span className="muted">
          {dirty ? '有未保存的安全设置。' : savedAt ? `已保存 · ${new Date(savedAt).toLocaleTimeString()}` : '等待保存。'}
        </span>
        <div className="settings-action-buttons">
          <button type="button" className="btn btn-primary" onClick={save} disabled={!canSave}>
            <Save size={14} /> 保存安全设置
          </button>
        </div>
      </footer>
    </div>
  )
}
