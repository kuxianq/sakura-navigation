import { useEffect, useState } from 'react'
import { Bot, Copy, KeyRound, Power, ShieldCheck, Trash2 } from 'lucide-react'
import { useNavStore } from '../../state/navStoreContext'
import type { AiCommandResult, AiKeyRecord, AiScope } from '../../types/navigation'
import { Field, TextInput, Toggle } from './forms'

const scopeOptions: { value: AiScope; label: string; description: string }[] = [
  { value: 'content:read', label: '读取内容', description: '查看分类、站点、排序和可见状态。' },
  { value: 'content:write', label: '管理内容', description: '新增、修改、删除分类和站点。' },
  { value: 'appearance:read', label: '读取外观', description: '查看标题、主题、背景、页脚、网站图标和卡片设置。' },
  { value: 'appearance:write', label: '管理外观', description: '修改标题、主题、背景、页脚、网站图标和卡片设置。' },
  { value: 'ops:read', label: '读取状态', description: '查看数量、当前配置和基础运行状态。' },
  { value: 'audit:read', label: '读取日志', description: '查看 AI Key 调用与操作日志。' },
]

const defaultScopes: AiScope[] = ['content:read', 'content:write', 'appearance:read', 'appearance:write', 'ops:read', 'audit:read']

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : '从未使用'
}

async function parseJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    throw new Error('API 不可用：当前预览没有挂载 Cloudflare Functions，已切换到本地预览模式。')
  }
  const data = await response.json() as T
  if (!response.ok) throw new Error((data as { error?: string }).error || '请求失败')
  return data
}

export function AiKeyTab() {
  const localStore = useNavStore()
  const [aiKeys, setAiKeys] = useState<AiKeyRecord[]>([])
  const [name, setName] = useState('主 AI 运维 Key')
  const [scopes, setScopes] = useState<AiScope[]>(defaultScopes)
  const [createdSecret, setCreatedSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [status, setStatus] = useState('等待操作。')
  const [loading, setLoading] = useState(false)
  const [testKey, setTestKey] = useState('')
  const [testAction, setTestAction] = useState('settings.update')
  const [testPayload, setTestPayload] = useState(`{
  "siteTitle": "樱花导航",
  "cardOpacity": 0.16
}`)
  const [testResult, setTestResult] = useState<AiCommandResult | null>(null)
  const [apiAvailable, setApiAvailable] = useState(true)

  function switchToLocalPreview(reason?: string) {
    setApiAvailable(false)
    setAiKeys(localStore.aiKeys)
    setStatus(reason ?? '当前是本地预览模式：Key 会保存在浏览器 localStorage，不会写入线上 D1。')
  }

  async function loadKeys() {
    try {
      const data = await parseJson<{ ok: boolean; items: AiKeyRecord[] }>(await fetch('/api/ai/keys'))
      setAiKeys(data.items)
    } catch (error) {
      switchToLocalPreview(error instanceof Error ? error.message : '读取 Key 失败，已切换到本地预览模式。')
    }
  }

  useEffect(() => {
    let cancelled = false
    fetch('/api/ai/keys')
      .then((response) => parseJson<{ ok: boolean; items: AiKeyRecord[] }>(response))
      .then((data) => {
        if (!cancelled) setAiKeys(data.items)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setApiAvailable(false)
          setStatus(error instanceof Error ? error.message : '读取 Key 失败，已切换到本地预览模式。')
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const displayedAiKeys = apiAvailable ? aiKeys : localStore.aiKeys

  function toggleScope(scope: AiScope, enabled: boolean) {
    setScopes((prev) => {
      if (enabled) return prev.includes(scope) ? prev : [...prev, scope]
      return prev.filter((item) => item !== scope)
    })
  }

  async function copy(text: string, label: string) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      window.prompt('复制 Key', text)
    }
    setCopied(label)
    window.setTimeout(() => setCopied(null), 1800)
  }

  async function generate() {
    setLoading(true)
    try {
      if (!apiAvailable) {
        const item = localStore.createAiKey({ name, scopes })
        setCreatedSecret(item.secret ?? null)
        setTestKey(item.secret ?? '')
      setStatus('本地预览 Key 已生成，刷新后仍保存在 localStorage。')
        return
      }
      const data = await parseJson<{ ok: boolean; item: AiKeyRecord; secret: string }>(await fetch('/api/ai/keys', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, scopes }),
      }))
      setCreatedSecret(data.secret)
      setTestKey(data.secret)
      setAiKeys((prev) => [data.item, ...prev])
      setStatus('新 Key 已生成，完整 Key 只显示一次。')
    } catch (error) {
      switchToLocalPreview(error instanceof Error ? error.message : '生成 Key 失败，已切换到本地预览模式。')
    } finally {
      setLoading(false)
    }
  }

  async function toggleAiKey(key: AiKeyRecord) {
    setLoading(true)
    try {
      if (!apiAvailable) {
        localStore.toggleAiKey(key.id)
        setStatus(key.isActive ? '本地 Key 已禁用。' : '本地 Key 已启用。')
        return
      }
      await parseJson<{ ok: boolean }>(await fetch(`/api/ai/keys/${key.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isActive: !key.isActive }),
      }))
      setAiKeys((prev) => prev.map((item) => (item.id === key.id ? { ...item, isActive: !key.isActive } : item)))
      setStatus(key.isActive ? 'Key 已禁用。' : 'Key 已启用。')
    } catch (error) {
      switchToLocalPreview(error instanceof Error ? error.message : '更新 Key 失败，已切换到本地预览模式。')
    } finally {
      setLoading(false)
    }
  }

  async function deleteAiKey(key: AiKeyRecord) {
    if (!window.confirm(`删除 Key：${key.name}？删除后无法恢复。`)) return
    setLoading(true)
    try {
      if (!apiAvailable) {
        localStore.deleteAiKey(key.id)
        setStatus('本地 Key 已删除。')
        return
      }
      await parseJson<{ ok: boolean }>(await fetch(`/api/ai/keys/${key.id}`, { method: 'DELETE' }))
      setAiKeys((prev) => prev.filter((item) => item.id !== key.id))
      setStatus('Key 已删除。')
    } catch (error) {
      switchToLocalPreview(error instanceof Error ? error.message : '删除 Key 失败，已切换到本地预览模式。')
    } finally {
      setLoading(false)
    }
  }

  async function runTestCommand() {
    try {
      const payload = testPayload.trim() ? JSON.parse(testPayload) as Record<string, unknown> : {}
      if (!apiAvailable) {
        const result = localStore.runAiCommand(testKey, testAction, JSON.stringify(payload))
        setTestResult(result)
        setStatus(result.ok ? '本地命令已执行，状态已写入 localStorage。' : '本地命令被拦截。')
        return
      }
      const data = await parseJson<{ ok: boolean; result: AiCommandResult['result']; changed?: string[]; error?: string }>(await fetch('/api/ai/command', {
        method: 'POST',
        headers: { authorization: `Bearer ${testKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ action: testAction, payload }),
      }))
      setTestResult({ ok: data.ok, result: data.result, message: `${testAction} 已执行。`, changed: data.changed })
      setStatus('命令已执行，首页状态已写入 D1。')
      void loadKeys()
    } catch (error) {
      setTestResult({ ok: false, result: 'blocked', message: error instanceof Error ? error.message : '命令执行失败。' })
    }
  }

  return (
    <div className="console-module settings-console">
      <header className="console-module-head">
        <div>
          <p className="eyebrow"><Bot size={16} /> AI 运维 Key</p>
          <h2>{apiAvailable ? '生产 Key 管理' : '本地预览 Key 管理'}</h2>
        </div>
      </header>

      <div className="control-board settings-board-single">
        <section className="control-section ai-section">
          <div className="section-title"><KeyRound size={18} /><span>创建 Key</span></div>
          <Field label="Key 名称">
            <TextInput value={name} onChange={setName} placeholder="例如：主 AI 运维 Key" />
          </Field>
          <div className="scope-grid">
            {scopeOptions.map((scope) => (
              <Toggle
                key={scope.value}
                checked={scopes.includes(scope.value)}
                onChange={(enabled) => toggleScope(scope.value, enabled)}
                label={scope.label}
                description={scope.description}
              />
            ))}
          </div>
          <p className="muted">禁止范围：访问安全、前台/后台密码、AI Key 自己的生成/删除/禁用能力不会开放给 Key 调用。</p>
          <button type="button" className="btn btn-primary" onClick={generate} disabled={scopes.length === 0 || loading}>
            <KeyRound size={14} /> 生成 Key
          </button>
          {createdSecret ? (
            <div className="key-secret-box">
              <strong>完整 Key 只在这里显示一次</strong>
              <code>{createdSecret}</code>
              <button type="button" className="btn btn-ghost" onClick={() => copy(createdSecret, '新 Key')}><Copy size={14} /> 复制完整 Key</button>
            </div>
          ) : null}
          {copied ? <p className="muted">已复制：{copied}</p> : null}
          <p className="muted">{status}</p>
        </section>

        <section className="control-section ai-section">
          <div className="section-title"><ShieldCheck size={18} /><span>Key 列表</span></div>
          {displayedAiKeys.length === 0 ? (
            <p className="muted">还没有 Key。生成后会显示名称、前缀、权限和状态。</p>
          ) : (
            <div className="key-list">
              {displayedAiKeys.map((key) => (
                <article className="key-card" key={key.id}>
                  <div>
                    <strong>{key.name}</strong>
                    <small>{key.prefix}... · {key.isActive ? '已启用' : '已禁用'} · 创建 {formatDate(key.createdAt)} · 最近使用 {formatDate(key.lastUsedAt)}</small>
                  </div>
                  <div className="key-scopes">
                    {key.scopes.map((scope) => <span key={scope}>{scope}</span>)}
                  </div>
                  <div className="row-actions">
                    <button type="button" className="icon-btn" aria-label="复制 Key 前缀" onClick={() => copy(key.prefix, key.name)}><Copy size={14} /></button>
                    <button type="button" className="icon-btn" aria-label={key.isActive ? '禁用 Key' : '启用 Key'} onClick={() => toggleAiKey(key)}><Power size={14} /></button>
                    <button type="button" className="icon-btn icon-danger" aria-label="删除 Key" onClick={() => deleteAiKey(key)}><Trash2 size={14} /></button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="control-section ai-section">
          <div className="section-title"><Bot size={18} /><span>真实命令验证</span></div>
          <Field label="测试 Key">
            <TextInput type="password" value={testKey} onChange={setTestKey} placeholder="粘贴 sk_nav_..." />
          </Field>
          <Field label="Action">
            <TextInput value={testAction} onChange={setTestAction} placeholder="settings.update / site.update / category.update" />
          </Field>
          <Field label="Payload JSON" hint="支持 site/category 的 create/update/delete/reorder/visibility.update；settings/update 只能改外观白名单。">
            <textarea className="field-input field-textarea" value={testPayload} onChange={(event) => setTestPayload(event.target.value)} rows={6} />
          </Field>
          <button type="button" className="btn btn-primary" onClick={runTestCommand} disabled={!testKey.trim() || !testAction.trim()}>
            <Bot size={14} /> 执行线上验证
          </button>
          {testResult ? (
            <div className={`command-result ${testResult.result}`}>
              <strong>{testResult.ok ? '执行成功' : '已拦截'}</strong>
              <p>{testResult.message}</p>
              {testResult.changed?.length ? <small>Changed: {testResult.changed.join(', ')}</small> : null}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
