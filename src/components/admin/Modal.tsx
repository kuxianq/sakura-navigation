import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  title: ReactNode
  description?: ReactNode
  onClose: () => void
  footer?: ReactNode
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function Modal({ open, title, description, onClose, footer, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className={`modal modal-${size}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h3>{title}</h3>
            {description ? <p>{description}</p> : null}
          </div>
          <button type="button" className="icon-btn" aria-label="关闭弹窗" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer ? <footer className="modal-footer">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  )
}

interface ConfirmProps {
  open: boolean
  title: ReactNode
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = '确认',
  cancelLabel = '取消',
  destructive,
  onConfirm,
  onCancel,
}: ConfirmProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      size="sm"
      footer={
        <>
          <button className="btn btn-ghost" type="button" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className={`btn ${destructive ? 'btn-danger' : 'btn-primary'}`}
            type="button"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="modal-message">{message}</p>
    </Modal>
  )
}
