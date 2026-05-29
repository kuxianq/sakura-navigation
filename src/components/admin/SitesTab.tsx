import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Eye, EyeOff, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import { useNavStore } from '../../state/navStoreContext'
import { ICON_OPTIONS } from '../../lib/icon-options'
import { IconByName } from '../../lib/icons'
import type { CardVariant, NavSite } from '../../types/navigation'
import { Field, NumberInput, Select, TagInput, TextArea, TextInput, Toggle } from './forms'
import { ConfirmDialog, Modal } from './Modal'

interface DraftState {
  id: string
  name: string
  url: string
  description: string
  icon: string
  categoryId: string
  tags: string[]
  sortOrder: number
  isVisible: boolean
  cardVariant: CardVariant | 'inherit'
}

function emptyDraft(categoryId: string): DraftState {
  return {
    id: '',
    name: '',
    url: '',
    description: '',
    icon: 'Sparkles',
    categoryId,
    tags: [],
    sortOrder: 0,
    isVisible: true,
    cardVariant: 'inherit',
  }
}

function fromSite(site: NavSite): DraftState {
  return {
    id: site.id,
    name: site.name,
    url: site.url,
    description: site.description,
    icon: site.icon,
    categoryId: site.categoryId,
    tags: [...site.tags],
    sortOrder: site.sortOrder,
    isVisible: site.isVisible,
    cardVariant: site.cardVariant ?? 'inherit',
  }
}

const cardVariantOptions: { value: DraftState['cardVariant']; label: string }[] = [
  { value: 'inherit', label: '跟随全局设置' },
  { value: 'glass', label: '玻璃悬浮' },
  { value: 'float', label: '通透悬浮' },
  { value: 'solid', label: '实体卡片' },
  { value: 'minimal', label: '极简入口' },
]

export function SitesTab() {
  const { sites, categories, settings, createSite, updateSite, deleteSite, moveSite } = useNavStore()

  const [editing, setEditing] = useState<NavSite | null>(null)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<DraftState>(() => emptyDraft(categories[0]?.id ?? ''))
  const [errors, setErrors] = useState<{ name?: string; url?: string; category?: string }>({})
  const [pendingDelete, setPendingDelete] = useState<NavSite | null>(null)
  const [filterCategory, setFilterCategory] = useState<'all' | string>('all')
  const [search, setSearch] = useState('')

  const categoryOptions = useMemo(
    () =>
      [...categories]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((category) => ({ value: category.id, label: category.name })),
    [categories],
  )

  const iconOptions = useMemo(
    () => ICON_OPTIONS,
    [],
  )

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    return [...sites]
      .filter((site) => filterCategory === 'all' || site.categoryId === filterCategory)
      .filter((site) => {
        if (!normalized) return true
        return [site.name, site.description, site.url, ...site.tags]
          .join(' ')
          .toLowerCase()
          .includes(normalized)
      })
      .sort((a, b) => {
        if (a.categoryId !== b.categoryId) return a.categoryId.localeCompare(b.categoryId)
        return a.sortOrder - b.sortOrder
      })
  }, [filterCategory, search, sites])

  const peerIndex = useMemo(() => {
    const map = new Map<string, NavSite[]>()
    sites.forEach((site) => {
      if (!map.has(site.categoryId)) map.set(site.categoryId, [])
      map.get(site.categoryId)!.push(site)
    })
    map.forEach((list) => list.sort((a, b) => a.sortOrder - b.sortOrder))
    return map
  }, [sites])

  function openCreate() {
    const category = categories[0]
    if (!category) {
      setErrors({ category: '请先创建分类，再添加站点。' })
      return
    }
    setDraft(emptyDraft(category.id))
    setErrors({})
    setEditing(null)
    setCreating(true)
  }

  function openEdit(site: NavSite) {
    setDraft(fromSite(site))
    setErrors({})
    setCreating(false)
    setEditing(site)
  }

  function closeModal() {
    setCreating(false)
    setEditing(null)
    setErrors({})
  }

  function validate(): boolean {
    const next: typeof errors = {}
    if (!draft.name.trim()) next.name = '请填写站点名称。'
    if (!draft.url.trim()) {
      next.url = '请填写站点链接。'
    } else {
      try {
        new URL(draft.url.trim())
      } catch {
        next.url = '请输入类似 https://example.com 的有效链接。'
      }
    }
    if (!draft.categoryId) next.category = '请选择所属分类。'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function submit() {
    if (!validate()) return
    const cardVariant: CardVariant | undefined =
      draft.cardVariant === 'inherit' ? undefined : draft.cardVariant
    if (editing) {
      updateSite(editing.id, {
        name: draft.name.trim(),
        url: draft.url.trim(),
        description: draft.description.trim(),
        icon: draft.icon,
        categoryId: draft.categoryId,
        tags: [...draft.tags],
        sortOrder: draft.sortOrder,
        isVisible: draft.isVisible,
        cardVariant,
      })
    } else {
      createSite({
        id: draft.id || undefined,
        name: draft.name.trim(),
        url: draft.url.trim(),
        description: draft.description.trim(),
        icon: draft.icon,
        categoryId: draft.categoryId,
        tags: [...draft.tags],
        sortOrder: draft.sortOrder || undefined,
        isVisible: draft.isVisible,
        cardVariant,
      })
    }
    closeModal()
  }

  function rowPosition(site: NavSite) {
    const peers = peerIndex.get(site.categoryId) ?? []
    return peers.findIndex((peer) => peer.id === site.id)
  }

  return (
    <div className="admin-section">
      <header className="admin-section-head">
        <div>
          <h2>站点设置</h2>
          <p>每个站点都属于一个分类，可在分类内调整排序、显示状态和卡片样式。</p>
        </div>
        <div className="admin-section-tools">
          <input
            className="field-input compact"
            placeholder="搜索名称、链接或标签..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="搜索站点"
          />
          <select
            className="field-input field-select compact"
            value={filterCategory}
            onChange={(event) => setFilterCategory(event.target.value)}
            aria-label="按分类筛选"
          >
            <option value="all">全部分类</option>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <button className="btn btn-primary" type="button" onClick={openCreate}>
            <Plus size={16} /> 添加站点
          </button>
        </div>
      </header>

      {filtered.length === 0 ? (
        <div className="admin-empty">
          {sites.length === 0 ? '还没有站点，先添加一个入口吧。' : '没有符合筛选条件的站点。'}
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>排序</th>
                <th>站点</th>
                <th>分类</th>
                <th>标签</th>
                <th>样式</th>
                <th>显示状态</th>
                <th aria-label="操作" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((site) => {
                const peers = peerIndex.get(site.categoryId) ?? []
                const idx = rowPosition(site)
                const categoryName = categories.find((c) => c.id === site.categoryId)?.name ?? site.categoryId
                return (
                  <tr key={site.id}>
                    <td>
                      <div className="reorder-cell">
                        <span className="muted">{site.sortOrder}</span>
                        <div className="reorder-buttons">
                          <button
                            type="button"
                            className="icon-btn"
                            aria-label="在分类内上移"
                            disabled={idx <= 0}
                            onClick={() => moveSite(site.id, -1)}
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn"
                            aria-label="在分类内下移"
                            disabled={idx === -1 || idx >= peers.length - 1}
                            onClick={() => moveSite(site.id, 1)}
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="row-title">
                        <span className="row-icon"><IconByName name={site.icon} /></span>
                        <div>
                          <strong>{site.name}</strong>
                          <small className="row-url">
                            <a href={site.url} target="_blank" rel="noreferrer">
                              {site.url} <ExternalLink size={12} />
                            </a>
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>{categoryName}</td>
                    <td>
                      <div className="tag-row inline">
                        {site.tags.length === 0 ? <span className="muted">—</span> : site.tags.map((tag) => <em key={tag}>{tag}</em>)}
                      </div>
                    </td>
                    <td>{site.cardVariant ?? <span className="muted">跟随 {settings.cardVariant}</span>}</td>
                    <td>
                      <button
                        type="button"
                        className={`pill ${site.isVisible ? 'pill-on' : 'pill-off'}`}
                        onClick={() => updateSite(site.id, { isVisible: !site.isVisible })}
                        aria-label={site.isVisible ? '隐藏站点' : '显示站点'}
                      >
                        {site.isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                        {site.isVisible ? '显示' : '隐藏'}
                      </button>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button type="button" className="icon-btn" aria-label="编辑" onClick={() => openEdit(site)}>
                          <Pencil size={14} />
                        </button>
                        <button type="button" className="icon-btn icon-danger" aria-label="删除" onClick={() => setPendingDelete(site)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={creating || !!editing}
        title={editing ? '编辑站点' : '添加站点'}
        description="站点会作为首页入口卡片显示。"
        onClose={closeModal}
        size="lg"
        footer={
          <>
            <button className="btn btn-ghost" type="button" onClick={closeModal}>取消</button>
            <button className="btn btn-primary" type="button" onClick={submit}>
              {editing ? '保存修改' : '创建站点'}
            </button>
          </>
        }
      >
        <div className="form-grid two-col">
          <Field label="站点名称" required error={errors.name}>
            <TextInput
              value={draft.name}
              onChange={(value) => setDraft((prev) => ({ ...prev, name: value }))}
              placeholder="文档中心"
              required
            />
          </Field>
          <Field label="站点链接" required error={errors.url}>
            <TextInput
              value={draft.url}
              onChange={(value) => setDraft((prev) => ({ ...prev, url: value }))}
              placeholder="https://example.com/docs"
              type="url"
              required
            />
          </Field>
          <Field label="所属分类" required error={errors.category}>
            <Select
              value={draft.categoryId}
              onChange={(value) => setDraft((prev) => ({ ...prev, categoryId: value }))}
              options={categoryOptions.length ? categoryOptions : [{ value: '', label: '暂无分类' }]}
            />
          </Field>
          <Field label="图标">
            <Select
              value={draft.icon}
              onChange={(value) => setDraft((prev) => ({ ...prev, icon: value }))}
              options={iconOptions}
            />
          </Field>
          {!editing ? (
            <Field label="ID" hint="可留空，系统会根据名称自动生成。">
              <TextInput
                value={draft.id}
                onChange={(value) => setDraft((prev) => ({ ...prev, id: value }))}
                placeholder="docs-center"
              />
            </Field>
          ) : null}
          <Field label="排序" hint="在所属分类内排序，数字越小越靠前。">
            <NumberInput
              value={draft.sortOrder}
              onChange={(value) => setDraft((prev) => ({ ...prev, sortOrder: value }))}
            />
          </Field>
          <Field label="卡片样式" hint="可单独覆盖全局卡片样式。">
            <Select
              value={draft.cardVariant}
              onChange={(value) => setDraft((prev) => ({ ...prev, cardVariant: value }))}
              options={cardVariantOptions}
            />
          </Field>
          <Field label="标签" hint="输入后按 Enter 或逗号添加。">
            <TagInput
              value={draft.tags}
              onChange={(value) => setDraft((prev) => ({ ...prev, tags: value }))}
            />
          </Field>
          <div className="span-2">
            <Field label="简介">
              <TextArea
                value={draft.description}
                onChange={(value) => setDraft((prev) => ({ ...prev, description: value }))}
                placeholder="用一句话说明这个入口的用途。"
                rows={3}
              />
            </Field>
          </div>
          <div className="span-2">
            <Toggle
              checked={draft.isVisible}
              onChange={(value) => setDraft((prev) => ({ ...prev, isVisible: value }))}
              label="在首页显示"
              description="关闭后只在后台保留。"
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!pendingDelete}
        title="删除站点？"
        message={pendingDelete ? <><strong>{pendingDelete.name}</strong> 会从当前列表中移除。</> : null}
        destructive
        confirmLabel="删除"
        cancelLabel="取消"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteSite(pendingDelete.id)
          setPendingDelete(null)
        }}
      />
    </div>
  )
}
