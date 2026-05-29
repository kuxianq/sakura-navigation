import { useState } from 'react'
import { Bot, Copy, KeyRound, Power, ShieldCheck, Trash2 } from 'lucide-react'
import { useNavStore } from '../../state/navStoreContext'
import type { AiCommandResult, AiScope } from '../../types/navigation'
import { Field, TextInput, Toggle } from './forms'

const scopeOptions: { value: AiScope; label: string; description: string }[] = [
  { value: 'content:read', label: '读取内容', description: '查看分类、站点、排序和可见状态。' },
  { value: 'content:write', label: '管理内容', description: '新增、修改、删除分类和站点。' },
  { value: 'appearance:read', label: '读取外观', description: '查看标题、主题、背景、页脚和卡片设置。' },
  { value: 'appearance:write', label: '管理外观', description: '修改标题、透明度、主题、背景、页脚和卡片设置。' },
  { value: 'ops:read', label: '读取状态', description: '查看数量、当前配置和基础运行状态。' },
  { value: 'audit:read', label: '读取日志', description: '查看 AI Key 调用与本地操作日志。' },
]

const defaultScopes: AiScope[] = ['content:read', 'content:write', 'appearance:read', 'appearance:write', 'ops:read', 'audit:read']

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

export function AiKeyTab() {
  const { aiKeys, aiAuditLogs, createAiKey, toggleAiKey, deleteAiKey, runAiCommand } = useNavStore()
  const [name, setName] = useState('主 AI 运维 Key')
  const [scopes, setScopes] = useState<AiScope[]>(defaultScopes)
  const [createdSecret, setCreatedSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [testKey, setTestKey] = useState('')
  const [testAction, setTestAction] = useState('settings.update')
  const [testPayload, setTestPayload] = useState('{\n  "siteTitle": "樱花导航",\n  "cardOpacity": 0.16\n}')
  const [testResult, setTestResult] = useState<AiCommandResult | null>(null)

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

  function generate() {
    const record = createAiKey({ name, scopes })
    setCreatedSecret(record.secret)
    setTestKey(record.secret)
  }

  function runTestCommand() {
    setTestResult(runAiCommand(testKey, testAction, testPayload))
  }

  return (
    <div className="console-module settings-console">
      <header className="console-module-head">
        <div>
          <p className="eyebrow"><Bot size={16} /> AI 运维 Key</p>
          <h2>本地 Key 管理</h2>

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
          <button type="button" className="btn btn-primary" onClick={generate} disabled={scopes.length === 0}>
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
        </section>

        <section className="control-section ai-section">
          <div className="section-title"><ShieldCheck size={18} /><span>Key 列表</span></div>
          {aiKeys.length === 0 ? (
            <p className="muted">还没有 Key。生成后会显示名称、前缀、权限和状态。</p>
          ) : (
            <div className="key-list">
              {aiKeys.map((key) => (
                <article className="key-card" key={key.id}>
                  <div>
                    <strong>{key.name}</strong>
                    <small>{key.prefix}... · {key.isActive ? '已启用' : '已禁用'} · {formatDate(key.createdAt)}</small>
                  </div>
                  <div className="key-scopes">
                    {key.scopes.map((scope) => <span key={scope}>{scope}</span>)}
                  </div>
                  <div className="row-actions">
                    <button type="button" className="icon-btn" aria-label="复制 Key 前缀" onClick={() => copy(key.prefix, key.name)}><Copy size={14} /></button>
                    <button type="button" className="icon-btn" aria-label={key.isActive ? '禁用 Key' : '启用 Key'} onClick={() => toggleAiKey(key.id)}><Power size={14} /></button>
                    <button type="button" className="icon-btn icon-danger" aria-label="删除 Key" onClick={() => deleteAiKey(key.id)}><Trash2 size={14} /></button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="control-section ai-section">
          <div className="section-title"><Bot size={18} /><span>本地命令验证</span></div>
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
            <Bot size={14} /> 执行本地验证
          </button>
          {testResult ? (
            <div className={`command-result ${testResult.result}`}>
              <strong>{testResult.ok ? '执行成功' : '已拦截'}</strong>
              <p>{testResult.message}</p>
              {testResult.changed?.length ? <small>Changed: {testResult.changed.join(', ')}</small> : null}
            </div>
          ) : null}
        </section>

        <section className="control-section ai-section">
          <div className="section-title"><Bot size={18} /><span>调用日志</span></div>
          {aiAuditLogs.length === 0 ? (
            <p className="muted">暂无调用日志。当前本地版会记录 Key 创建、启用、禁用和删除。</p>
          ) : (
            <div className="audit-list">
              {aiAuditLogs.slice(0, 12).map((log) => (
                <article className="audit-row" key={log.id}>
                  <strong>{log.action}</strong>
                  <span>{log.keyName}</span>
                  <small>{log.result} · {formatDate(log.createdAt)}</small>
                  <p>{log.detail}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
