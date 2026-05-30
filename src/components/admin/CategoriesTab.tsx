import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react'
import { useNavStore } from '../../state/navStoreContext'
import { ICON_OPTIONS } from '../../lib/icon-options'
import { getSiteCategoryIds } from '../../lib/site-categories'
import { IconByName } from '../../lib/icons'
import type { NavCategory } from '../../types/navigation'
import { Field, NumberInput, Select, TextArea, TextInput, Toggle } from './forms'
import { ConfirmDialog, Modal } from './Modal'

interface DraftState {
  id: string
  name: string
  icon: string
  description: string
  sortOrder: number
  isVisible: boolean
}

const emptyDraft: DraftState = {
  id: '',
  name: '',
  icon: 'Sparkles',
  description: '',
  sortOrder: 0,
  isVisible: true,
}

function fromCategory(category: NavCategory): DraftState {
  return {
    id: category.id,
    name: category.name,
    icon: category.icon,
    description: category.description ?? '',
    sortOrder: category.sortOrder,
    isVisible: category.isVisible,
  }
}

export function CategoriesTab() {
  const { categories, sites, createCategory, updateCategory, deleteCategory, moveCategory } = useNavStore()

  const [editing, setEditing] = useState<NavCategory | null>(null)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<DraftState>(emptyDraft)
  const [error, setError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<NavCategory | null>(null)

  const ordered = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  )

  const siteCounts = useMemo(() => {
    const counts = new Map<string, number>()
    sites.forEach((site) => {
      getSiteCategoryIds(site).forEach((categoryId) => {
        counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1)
      })
    })
    return counts
  }, [sites])

  const iconOptions = useMemo(
    () => ICON_OPTIONS,
    [],
  )

  function openCreate() {
    setDraft({
      ...emptyDraft,
      sortOrder: ordered.length ? Math.max(...ordered.map((c) => c.sortOrder)) + 1 : 1,
    })
    setError(null)
    setEditing(null)
    setCreating(true)
  }

  function openEdit(category: NavCategory) {
    setDraft(fromCategory(category))
    setError(null)
    setCreating(false)
    setEditing(category)
  }

  function closeModal() {
    setCreating(false)
    setEditing(null)
    setError(null)
  }

  function submit() {
    const name = draft.name.trim()
    if (!name) {
      setError('请填写分类名称')
      return
    }
    if (editing) {
      updateCategory(editing.id, {
        name,
        icon: draft.icon,
        description: draft.description.trim(),
        sortOrder: draft.sortOrder,
        isVisible: draft.isVisible,
      })
    } else {
      createCategory({
        id: draft.id || undefined,
        name,
        icon: draft.icon,
        description: draft.description.trim(),
        sortOrder: draft.sortOrder,
        isVisible: draft.isVisible,
      })
    }
    closeModal()
  }

  return (
    <div className="admin-section">
      <header className="admin-section-head">
        <div>
          <h2>分类设置</h2>
          <p>管理首页筛选栏里的分类，可调整排序、图标和显示状态。</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={openCreate}>
          <Plus size={16} /> 添加分类
        </button>
      </header>

      {ordered.length === 0 ? (
        <div className="admin-empty">还没有分类，先添加一个分类吧。</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>排序</th>
                <th>分类</th>
                <th>ID</th>
                <th>站点数</th>
                <th>显示状态</th>
                <th aria-label="操作" />
              </tr>
            </thead>
            <tbody>
              {ordered.map((category, index) => (
                <tr key={category.id}>
                  <td>
                    <div className="reorder-cell">
                      <span className="muted">{category.sortOrder}</span>
                      <div className="reorder-buttons">
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label="上移"
                          disabled={index === 0}
                          onClick={() => moveCategory(category.id, -1)}
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label="下移"
                          disabled={index === ordered.length - 1}
                          onClick={() => moveCategory(category.id, 1)}
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="row-title">
                      <span className="row-icon"><IconByName name={category.icon} /></span>
                      <div>
                        <strong>{category.name}</strong>
                        {category.description ? <small>{category.description}</small> : null}
                      </div>
                    </div>
                  </td>
                  <td><code className="mono">{category.id}</code></td>
                  <td>{siteCounts.get(category.id) ?? 0}</td>
                  <td>
                    <button
                      type="button"
                      className={`pill ${category.isVisible ? 'pill-on' : 'pill-off'}`}
                      onClick={() => updateCategory(category.id, { isVisible: !category.isVisible })}
                      aria-label={category.isVisible ? '隐藏分类' : '显示分类'}
                    >
                      {category.isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                      {category.isVisible ? '显示' : '隐藏'}
                    </button>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="icon-btn" aria-label="编辑" onClick={() => openEdit(category)}>
                        <Pencil size={14} />
                      </button>
                      <button type="button" className="icon-btn icon-danger" aria-label="删除" onClick={() => setPendingDelete(category)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={creating || !!editing}
        title={editing ? '编辑分类' : '添加分类'}
        description="分类会显示在首页的筛选栏里。"
        onClose={closeModal}
        footer={
          <>
            <button className="btn btn-ghost" type="button" onClick={closeModal}>取消</button>
            <button className="btn btn-primary" type="button" onClick={submit}>
              {editing ? '保存修改' : '创建分类'}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <Field label="分类名称" required error={error}>
            <TextInput
              value={draft.name}
              onChange={(value) => setDraft((prev) => ({ ...prev, name: value }))}
              placeholder="常用入口"
              required
            />
          </Field>
          {!editing ? (
            <Field label="ID" hint="可留空，系统会根据名称自动生成。">
              <TextInput
                value={draft.id}
                onChange={(value) => setDraft((prev) => ({ ...prev, id: value }))}
                placeholder="daily"
              />
            </Field>
          ) : null}
          <Field label="图标">
            <Select value={draft.icon} onChange={(value) => setDraft((prev) => ({ ...prev, icon: value }))} options={iconOptions} />
          </Field>
          <Field label="排序" hint="数字越小越靠前。">
            <NumberInput value={draft.sortOrder} onChange={(value) => setDraft((prev) => ({ ...prev, sortOrder: value }))} />
          </Field>
          <Field label="分类说明">
            <TextArea
              value={draft.description}
              onChange={(value) => setDraft((prev) => ({ ...prev, description: value }))}
              placeholder="简单说明这个分类放什么内容"
            />
          </Field>
          <Toggle
            checked={draft.isVisible}
            onChange={(value) => setDraft((prev) => ({ ...prev, isVisible: value }))}
            label="在首页显示"
            description="关闭后只在后台保留。"
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!pendingDelete}
        title="删除分类？"
        message={
          pendingDelete ? (
            <>
              <strong>{pendingDelete.name}</strong> 以及关联的{' '}
              <strong>{siteCounts.get(pendingDelete.id) ?? 0}</strong> 个站点会从当前列表中移除。
            </>
          ) : null
        }
        destructive
        confirmLabel="删除"
        cancelLabel="取消"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteCategory(pendingDelete.id)
          setPendingDelete(null)
        }}
      />
    </div>
  )
}
