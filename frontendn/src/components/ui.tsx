import { useEffect, useRef, type ButtonHTMLAttributes, type CSSProperties, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { X } from 'lucide-react'
import { cn } from '../lib/utils'

export function Button({ className, variant = 'secondary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) { return <button className={cn('button', `button-${variant}`, className)} {...props} /> }
export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) { return <input className={cn('input', className)} {...props} /> }
export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea className={cn('textarea', className)} {...props} /> }
export function Panel({ className, style, children }: { className?: string; style?: CSSProperties; children: ReactNode }) { return <section className={cn('panel', className)} style={style}>{children}</section> }
export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) { return <label className="label" htmlFor={htmlFor}>{children}</label> }
export function Divider() { return <div className="divider" /> }

export function Dialog({ open, title, description, onClose, children }: { open: boolean; title: string; description?: string; onClose: () => void; children: ReactNode }) {
  const dialogRef = useRef<HTMLDivElement>(null)
  useEffect(() => { if (!open) return; const listener = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }; document.addEventListener('keydown', listener); dialogRef.current?.focus(); return () => document.removeEventListener('keydown', listener) }, [open, onClose])
  if (!open) return null
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby={description ? 'dialog-description' : undefined} tabIndex={-1} ref={dialogRef}><div className="dialog-head"><div><h2 id="dialog-title">{title}</h2>{description && <p id="dialog-description">{description}</p>}</div><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={18} /></button></div>{children}</div></div>
}

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) { return <div className={cn('skeleton', className)} style={style} aria-hidden="true" /> }
