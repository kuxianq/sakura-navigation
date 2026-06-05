import { ICON_OPTIONS } from '../../lib/icon-options'
import type { CardVariant, NavCategory } from '../../types/navigation'
import { Field, NumberInput, Select, TagInput, TextArea, TextInput, Toggle } from './forms'

export interface SiteDraftState {
  id: string
  name: string
  url: string
  description: string
  icon: string
  iconUrl: string
  categoryId: string
  categoryIds: string[]
  tags: string[]
  sortOrder: number
  isVisible: boolean
  featured: boolean
  cardVariant: CardVariant | 'inherit'
}

interface SiteFormProps {
  draft: SiteDraftState
  categories: NavCategory[]
  errors: { name?: string; url?: string; category?: string }
  isEditing: boolean
  onChange: (updater: (prev: SiteDraftState) => SiteDraftState) => void
}

const cardVariantOptions: { value: SiteDraftState['cardVariant']; label: string }[] = [
  { value: 'inherit', label: '跟随全局设置' },
  { value: 'glass', label: '玻璃悬浮' },
  { value: 'float', label: '通透悬浮' },
  { value: 'solid', label: '实体卡片' },
  { value: 'minimal', label: '极简入口' },
]

function withPrimaryCategory(categoryId: string, categoryIds: string[]) {
  return [...new Set([categoryId, ...categoryIds].filter(Boolean))]
}

export function SiteForm({ draft, categories, errors, isEditing, onChange }: SiteFormProps) {
  const categoryOptions = [...categories]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((category) => ({ value: category.id, label: category.name }))

  function setPrimaryCategory(categoryId: string) {
    onChange((prev) => ({
      ...prev,
      categoryId,
      categoryIds: withPrimaryCategory(categoryId, prev.categoryIds),
    }))
  }

  function toggleCategory(categoryId: string, checked: boolean) {
    onChange((prev) => {
      if (categoryId === prev.categoryId) return prev
      const next = checked
        ? withPrimaryCategory(prev.categoryId, [...prev.categoryIds, categoryId])
        : withPrimaryCategory(prev.categoryId, prev.categoryIds.filter((id) => id !== categoryId))
      return { ...prev, categoryIds: next }
    })
  }

  return (
    <div className="form-grid two-col site-form-grid">
      <Field label="站点名称" required error={errors.name}>
        <TextInput
          value={draft.name}
          onChange={(value) => onChange((prev) => ({ ...prev, name: value }))}
          placeholder="文档中心"
          required
        />
      </Field>
      <Field label="站点链接" required error={errors.url}>
        <TextInput
          value={draft.url}
          onChange={(value) => onChange((prev) => ({ ...prev, url: value }))}
          placeholder="https://example.com/docs"
          type="url"
          required
        />
      </Field>
      <Field label="主分类" required error={errors.category} hint="用于排序和默认归属，不能从显示分类中移除。">
        <Select
          value={draft.categoryId}
          onChange={setPrimaryCategory}
          options={categoryOptions.length ? categoryOptions : [{ value: '', label: '暂无分类' }]}
        />
      </Field>
      <Field label="内置图标">
        <Select
          value={draft.icon}
          onChange={(value) => onChange((prev) => ({ ...prev, icon: value }))}
          options={ICON_OPTIONS}
        />
      </Field>
      <div className="span-2">
        <Field label="额外显示分类" hint="同一个站点可同时显示在多个分类里；全部页仍只出现一次。">
          <div className="category-check-grid">
            {categories.length === 0 ? <span className="muted">暂无分类</span> : categories.map((category) => {
              const checked = draft.categoryIds.includes(category.id)
              const isPrimary = category.id === draft.categoryId
              return (
                <label className="check-pill" key={category.id}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={isPrimary}
                    onChange={(event) => toggleCategory(category.id, event.target.checked)}
                  />
                  <span>{category.name}</span>
                  {isPrimary ? <em>主分类</em> : null}
                </label>
              )
            })}
          </div>
        </Field>
      </div>
      {!isEditing ? (
        <Field label="ID" hint="可留空，系统会根据名称自动生成。">
          <TextInput
            value={draft.id}
            onChange={(value) => onChange((prev) => ({ ...prev, id: value }))}
            placeholder="docs-center"
          />
        </Field>
      ) : null}
      <Field label="排序" hint="在主分类内排序，数字越小越靠前。">
        <NumberInput
          value={draft.sortOrder}
          onChange={(value) => onChange((prev) => ({ ...prev, sortOrder: value }))}
        />
      </Field>
      <Field label="图标 URL" hint="可选；加载失败时自动回退到内置图标。">
        <TextInput
          value={draft.iconUrl}
          onChange={(value) => onChange((prev) => ({ ...prev, iconUrl: value }))}
          placeholder="https://example.com/icon.png"
          type="url"
        />
      </Field>
      <Field label="卡片样式" hint="可单独覆盖全局卡片样式。">
        <Select
          value={draft.cardVariant}
          onChange={(value) => onChange((prev) => ({ ...prev, cardVariant: value }))}
          options={cardVariantOptions}
        />
      </Field>
      <Field label="标签" hint="输入后按 Enter 或逗号添加。">
        <TagInput
          value={draft.tags}
          onChange={(value) => onChange((prev) => ({ ...prev, tags: value }))}
        />
      </Field>
      <div className="span-2">
        <Field label="简介">
          <TextArea
            value={draft.description}
            onChange={(value) => onChange((prev) => ({ ...prev, description: value }))}
            placeholder="用一句话说明这个入口的用途。"
            rows={3}
          />
        </Field>
      </div>
      <div className="span-2">
        <Toggle
          checked={draft.isVisible}
          onChange={(value) => onChange((prev) => ({ ...prev, isVisible: value }))}
          label="在首页显示"
          description="关闭后只在后台保留。"
        />
        <Toggle
          checked={draft.featured}
          onChange={(value) => onChange((prev) => ({ ...prev, featured: value }))}
          label="推荐入口"
          description="在首页卡片右上角显示轻量推荐角标。"
        />
      </div>
    </div>
  )
}
