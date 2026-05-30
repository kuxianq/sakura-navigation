import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Eye, EyeOff, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import { useNavStore } from '../../state/navStoreContext'
import { siteBelongsToCategory, getSiteCategoryIds } from '../../lib/site-categories'
import { IconByName } from '../../lib/icons'
import type { CardVariant, NavSite } from '../../types/navigation'
import { ConfirmDialog, Modal } from './Modal'
import { SiteForm, type SiteDraftState } from './SiteForm'

function emptyDraft(categoryId: string): SiteDraftState {
  return {
    id: '',
    name: '',
    url: '',
    description: '',
    icon: 'Sparkles',
    iconUrl: '',
    categoryId,
    categoryIds: categoryId ? [categoryId] : [],
    tags: [],
    sortOrder: 0,
    isVisible: true,
    cardVariant: 'inherit',
  }
}

function fromSite(site: NavSite): SiteDraftState {
  return {
    id: site.id,
    name: site.name,
    url: site.url,
    description: site.description,
    icon: site.icon,
    iconUrl: site.iconUrl ?? '',
    categoryId: site.categoryId,
    categoryIds: getSiteCategoryIds(site),
    tags: [...site.tags],
    sortOrder: site.sortOrder,
    isVisible: site.isVisible,
    cardVariant: site.cardVariant ?? 'inherit',
  }
}

export function SitesTab() {
  const { sites, categories, settings, createSite, updateSite, deleteSite, moveSite } = useNavStore()

  const [editing, setEditing] = useState<NavSite | null>(null)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<SiteDraftState>(() => emptyDraft(categories[0]?.id ?? ''))
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

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    return [...sites]
      .filter((site) => filterCategory === 'all' || siteBelongsToCategory(site, filterCategory))
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
        iconUrl: draft.iconUrl.trim() || undefined,
        categoryId: draft.categoryId,
        categoryIds: [...draft.categoryIds],
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
        iconUrl: draft.iconUrl.trim() || undefined,
        categoryId: draft.categoryId,
        categoryIds: [...draft.categoryIds],
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
          <p>站点可以显示在多个分类中；排序仍按主分类处理，全部页只保留一张卡片。</p>
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
                const categoryNames = getSiteCategoryIds(site).map((id) => categories.find((c) => c.id === id)?.name ?? id)
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
                    <td>
                      <div className="category-chip-list">
                        <strong>{categoryName}</strong>
                        {categoryNames.filter((name) => name !== categoryName).map((name) => <span key={name}>{name}</span>)}
                      </div>
                    </td>
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
        <SiteForm
          draft={draft}
          categories={categories}
          errors={errors}
          isEditing={!!editing}
          onChange={setDraft}
        />
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
