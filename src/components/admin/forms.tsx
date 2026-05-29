import type { ChangeEvent, ReactNode } from 'react'

interface BaseProps {
  label: ReactNode
  hint?: ReactNode
  error?: string | null
  required?: boolean
  children: ReactNode
  htmlFor?: string
}

export function Field({ label, hint, error, required, children, htmlFor }: BaseProps) {
  return (
    <label className="field" htmlFor={htmlFor}>
      <span className="field-label">
        {label}
        {required ? <em aria-hidden="true">*</em> : null}
      </span>
      {children}
      {error ? <span className="field-error">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  )
}

interface TextProps {
  id?: string
  value: string
  onChange: (next: string) => void
  placeholder?: string
  type?: 'text' | 'url' | 'number' | 'password'
  required?: boolean
  inputMode?: 'numeric' | 'text' | 'url'
  min?: number
  max?: number
}

export function TextInput({ id, value, onChange, placeholder, type = 'text', required, inputMode, min, max }: TextProps) {
  return (
    <input
      id={id}
      className="field-input"
      type={type}
      value={value}
      placeholder={placeholder}
      required={required}
      inputMode={inputMode}
      min={min}
      max={max}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
    />
  )
}

interface NumberProps {
  id?: string
  value: number
  onChange: (next: number) => void
  min?: number
  max?: number
  step?: number
}

export function NumberInput({ id, value, onChange, min, max, step = 1 }: NumberProps) {
  return (
    <input
      id={id}
      className="field-input"
      type="number"
      value={Number.isFinite(value) ? value : 0}
      min={min}
      max={max}
      step={step}
      onChange={(e: ChangeEvent<HTMLInputElement>) => {
        const parsed = Number(e.target.value)
        onChange(Number.isFinite(parsed) ? parsed : 0)
      }}
    />
  )
}

interface RangeProps {
  id?: string
  label: ReactNode
  value: number
  onChange: (next: number) => void
  min: number
  max: number
  step?: number
  format?: (value: number) => ReactNode
}

export function RangeInput({ id, label, value, onChange, min, max, step = 1, format }: RangeProps) {
  const safeValue = Number.isFinite(value) ? value : min
  return (
    <label className="range-field" htmlFor={id}>
      <span className="range-label">
        <span>{label}</span>
        <strong>{format ? format(safeValue) : safeValue}</strong>
      </span>
      <input
        id={id}
        className="range-input"
        type="range"
        value={safeValue}
        min={min}
        max={max}
        step={step}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(Number(e.target.value))}
      />
    </label>
  )
}

interface TextAreaProps {
  id?: string
  value: string
  onChange: (next: string) => void
  placeholder?: string
  rows?: number
}

export function TextArea({ id, value, onChange, placeholder, rows = 3 }: TextAreaProps) {
  return (
    <textarea
      id={id}
      className="field-input field-textarea"
      value={value}
      placeholder={placeholder}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

interface SelectProps<T extends string> {
  id?: string
  value: T
  onChange: (next: T) => void
  options: { value: T; label: string }[]
}

export function Select<T extends string>({ id, value, onChange, options }: SelectProps<T>) {
  return (
    <select
      id={id}
      className="field-input field-select"
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

interface ToggleProps {
  id?: string
  checked: boolean
  onChange: (next: boolean) => void
  label: ReactNode
  description?: ReactNode
}

export function Toggle({ id, checked, onChange, label, description }: ToggleProps) {
  return (
    <label className="toggle" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle-track" aria-hidden="true">
        <span className="toggle-thumb" />
      </span>
      <span className="toggle-text">
        <strong>{label}</strong>
        {description ? <small>{description}</small> : null}
      </span>
    </label>
  )
}

interface TagInputProps {
  id?: string
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
}

export function TagInput({ id, value, onChange, placeholder = '输入标签后按 Enter' }: TagInputProps) {
  return (
    <div className="tag-input">
      <ul className="tag-input-list">
        {value.map((tag) => (
          <li key={tag}>
            <span>{tag}</span>
            <button
              type="button"
              aria-label={`移除 ${tag}`}
              onClick={() => onChange(value.filter((t) => t !== tag))}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <input
        id={id}
        className="field-input"
        placeholder={placeholder}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ',') return
          event.preventDefault()
          const target = event.currentTarget
          const next = target.value.trim()
          if (!next) return
          if (!value.includes(next)) onChange([...value, next])
          target.value = ''
        }}
      />
    </div>
  )
}
