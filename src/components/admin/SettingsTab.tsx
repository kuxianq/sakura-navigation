import { useState } from 'react'
import { Image, Info, LayoutTemplate, Palette, Save, Sparkles } from 'lucide-react'
import { useNavStore } from '../../state/navStoreContext'
import type { ThemeSettings } from '../../types/navigation'
import { getThemePreset, themePresets } from '../../data/themePresets'
import { Field, RangeInput, Select, TextArea, TextInput, Toggle } from './forms'

type SettingsPanel = 'basic' | 'theme' | 'background' | 'cards'

interface SettingsTabProps {
  panel?: SettingsPanel
}

const backgroundModes: { value: ThemeSettings['backgroundMode']; label: string }[] = [
  { value: 'gradient', label: '主题渐变（不请求外部图片）' },
  { value: 'api', label: '随机图片 API（每次自动取图）' },
  { value: 'custom', label: '固定图片 URL（指定一张图）' },
]

const cardVariants: { value: ThemeSettings['cardVariant']; label: string }[] = [
  { value: 'glass', label: '玻璃悬浮' },
  { value: 'float', label: '通透悬浮' },
  { value: 'solid', label: '实体卡片' },
  { value: 'minimal', label: '极简入口' },
]

const animationLevels: { value: ThemeSettings['animationLevel']; label: string }[] = [
  { value: 'none', label: '关闭动画' },
  { value: 'soft', label: '轻柔动画' },
  { value: 'rich', label: '丰富动画' },
]

const densityOptions: { value: ThemeSettings['cardDensity']; label: string }[] = [
  { value: 'compact', label: '紧凑' },
  { value: 'standard', label: '标准' },
  { value: 'loose', label: '宽松' },
]

const panelCopy: Record<SettingsPanel, { eyebrow: string; title: string; desc: string }> = {
  basic: {
    eyebrow: '基础信息',
    title: '网站基础信息',
    desc: '设置首页标题、副标题和整体动画强度。',
  },
  theme: {
    eyebrow: '主题设置',
    title: '主题预设',
    desc: '',
  },
  background: {
    eyebrow: '背景设置',
    title: '首页背景',
    desc: '选择背景来源，并通过滑块调节遮罩、模糊、亮度和饱和度。',
  },
  cards: {
    eyebrow: '卡片样式',
    title: '站点卡片外观',
    desc: '设置首页入口卡片的样式、圆角、透明度和模糊强度。',
  },
}

export function SettingsTab({ panel = 'basic' }: SettingsTabProps) {
  const { settings, updateSettings } = useNavStore()
  const [draft, setDraft] = useState<ThemeSettings>(settings)
  const [lastSettingsRef, setLastSettingsRef] = useState(settings)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [autoApply, setAutoApply] = useState(true)

  if (settings !== lastSettingsRef) {
    setLastSettingsRef(settings)
    setDraft(settings)
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings)
  const copy = panelCopy[panel]
  const saveLabel = savedAt ? `已保存 · ${new Date(savedAt).toLocaleTimeString()}` : '等待保存。'

  function patch<K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) {
    setDraft((prev) => {
      const next = { ...prev, [key]: value }
      if (autoApply) updateSettings({ [key]: value } as Partial<ThemeSettings>)
      return next
    })
  }

  function applyPreset(id: ThemeSettings['preset']) {
    const preset = getThemePreset(id)
    const patchValue: Partial<ThemeSettings> = {
      preset: id,
      primaryColor: preset.primaryColor,
      accentColor: preset.accentColor,
      textColor: preset.textColor,
      panelColor: preset.panelColor,
      borderColor: preset.borderColor,
      shadowColor: preset.shadowColor,
    }
    setDraft((prev) => ({ ...prev, ...patchValue }))
    if (autoApply) updateSettings(patchValue)
  }

  function forceSave() {
    updateSettings(draft)
    setSavedAt(Date.now())
  }

  return (
    <div className="console-module settings-console">
      <header className="console-module-head">
        <div>
          <p className="eyebrow"><Sparkles size={16} /> {copy.eyebrow}</p>
          <h2>{copy.title}</h2>
          {copy.desc ? <p>{copy.desc}</p> : null}
        </div>
        <Toggle checked={autoApply} onChange={setAutoApply} label="实时预览" description="修改时立即作用到前台" />
      </header>

      <div className="control-board settings-board-single">
        {panel === 'basic' ? (
          <section className="control-section">
            <div className="section-title"><Info size={18} /><span>网站信息</span></div>
            <Field label="网站标题" required><TextInput value={draft.siteTitle} onChange={(value) => patch('siteTitle', value)} /></Field>
            <Field label="副标题 / 标语"><TextArea value={draft.siteSubtitle} onChange={(value) => patch('siteSubtitle', value)} rows={3} /></Field>
            <div className="form-grid two-col">
              <Field label="页脚图标"><TextInput value={draft.footerIcon} onChange={(value) => patch('footerIcon', value)} placeholder="🌸" /></Field>
              <Field label="页脚品牌"><TextInput value={draft.footerBrand} onChange={(value) => patch('footerBrand', value)} placeholder="Sakura Navigation" /></Field>
              <Field label="页脚文字" hint="显示在首页底部，用于一句话签名。"><TextInput value={draft.footerText} onChange={(value) => patch('footerText', value)} placeholder="轻盈地收藏常用入口" /></Field>
            </div>
            <Field
              label="动画效果"
              hint="控制首页光晕、背景漂浮和卡片悬浮动效强度；如果想更安静，可以选关闭。"
            >
              <Select value={draft.animationLevel} onChange={(value) => patch('animationLevel', value)} options={animationLevels} />
            </Field>
          </section>
        ) : null}

        {panel === 'theme' ? (
          <section className="control-section wide">
            <div className="section-title"><Palette size={18} /><span>主题预设</span></div>
            <div className="theme-preset-grid">
              {themePresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`theme-preset ${draft.preset === preset.id ? 'active' : ''}`}
                  onClick={() => applyPreset(preset.id)}
                >
                  <span className="theme-swatch" style={{ background: `linear-gradient(135deg, ${preset.primaryColor}, ${preset.accentColor})` }} />
                  <strong>{preset.name}</strong>
                  <small>{preset.description}</small>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {panel === 'background' ? (
          <section className="control-section">
            <div className="section-title"><Image size={18} /><span>背景来源与效果</span></div>
            <Field label="背景模式" hint="随机图片 API 和固定图片 URL 都是图片来源，只是一个随机、一个固定。">
              <Select value={draft.backgroundMode} onChange={(value) => patch('backgroundMode', value)} options={backgroundModes} />
            </Field>
            <Field label="随机图片 API" hint="选择随机图片 API 时使用；接口返回 { url } 或 { imgurl }。"><TextInput value={draft.backgroundApi} onChange={(value) => patch('backgroundApi', value)} /></Field>
            <Field label="固定图片 URL" hint="选择固定图片 URL 时使用。"><TextInput value={draft.backgroundUrl ?? ''} onChange={(value) => patch('backgroundUrl', value)} /></Field>
            <Field label="兜底背景"><TextInput value={draft.fallbackBackground} onChange={(value) => patch('fallbackBackground', value)} /></Field>
            <div className="slider-grid">
              <RangeInput label="遮罩透明度" value={draft.backgroundOpacity} onChange={(value) => patch('backgroundOpacity', value)} min={0} max={1} step={0.05} format={(value) => `${Math.round(value * 100)}%`} />
              <RangeInput label="背景模糊" value={draft.backgroundBlur} onChange={(value) => patch('backgroundBlur', value)} min={0} max={30} step={1} format={(value) => `${value}px`} />
              <RangeInput label="亮度" value={draft.backgroundBrightness} onChange={(value) => patch('backgroundBrightness', value)} min={0.4} max={1.4} step={0.05} format={(value) => `${Math.round(value * 100)}%`} />
              <RangeInput label="饱和度" value={draft.backgroundSaturation} onChange={(value) => patch('backgroundSaturation', value)} min={0.5} max={1.8} step={0.05} format={(value) => `${Math.round(value * 100)}%`} />
            </div>
          </section>
        ) : null}

        {panel === 'cards' ? (
          <section className="control-section">
            <div className="section-title"><LayoutTemplate size={18} /><span>站点卡片</span></div>
            <Field label="卡片样式"><Select value={draft.cardVariant} onChange={(value) => patch('cardVariant', value)} options={cardVariants} /></Field>
            <Field label="卡片密度"><Select value={draft.cardDensity} onChange={(value) => patch('cardDensity', value)} options={densityOptions} /></Field>
            <div className="slider-grid">
              <RangeInput label="圆角" value={draft.cardRadius} onChange={(value) => patch('cardRadius', value)} min={8} max={42} step={1} format={(value) => `${value}px`} />
              <RangeInput label="透明度" value={draft.cardOpacity} onChange={(value) => patch('cardOpacity', value)} min={0.04} max={0.6} step={0.02} format={(value) => `${Math.round(value * 100)}%`} />
              <RangeInput label="模糊" value={draft.cardBlur} onChange={(value) => patch('cardBlur', value)} min={0} max={30} step={1} format={(value) => `${value}px`} />
              <RangeInput label="边框透明度" value={draft.cardBorderOpacity} onChange={(value) => patch('cardBorderOpacity', value)} min={0} max={0.8} step={0.02} format={(value) => `${Math.round(value * 100)}%`} />
              <RangeInput label="阴影强度" value={draft.cardShadow} onChange={(value) => patch('cardShadow', value)} min={0} max={0.6} step={0.02} format={(value) => `${Math.round(value * 100)}%`} />
            </div>
            <Toggle checked={draft.showCardDescription} onChange={(value) => patch('showCardDescription', value)} label="显示描述" />
            <Toggle checked={draft.showCardTags} onChange={(value) => patch('showCardTags', value)} label="显示标签" />
          </section>
        ) : null}
      </div>

      <footer className="settings-actions console-actions">
        <span className="muted">
          {dirty ? '有未保存修改。' : saveLabel}
        </span>
        <div className="settings-action-buttons">
          <button type="button" className="btn btn-primary" onClick={forceSave}><Save size={14} /> {savedAt && !dirty ? '重新保存' : '保存设置'}</button>
        </div>
      </footer>
    </div>
  )
}
