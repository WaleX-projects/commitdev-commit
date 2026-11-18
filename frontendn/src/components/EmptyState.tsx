import { Terminal } from 'lucide-react'
import { Button, Panel } from './ui'

export function EmptyState({ code, title, action, onAction }: { code: string; title: string; action?: string; onAction?: () => void }) {
  return <Panel className="empty-state"><div className="terminal-line"><Terminal size={15} /><span>{code}</span></div><p>{title}</p>{action && onAction && <Button variant="primary" onClick={onAction}>{action}</Button>}</Panel>
}
