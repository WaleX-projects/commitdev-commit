import { Check, CircleDashed, XCircle } from 'lucide-react'
import type { DraftStatus, Platform } from '../lib/database.types'
import { cn } from '../lib/utils'

export function PlatformIcon({ platform, size = 16 }: { platform: Platform; size?: number }) {
  const label = platform === 'x' ? 'X' : platform === 'linkedin' ? 'in' : platform === 'devto' ? 'dev' : 'h'
  return <span className={cn('platform-icon', `platform-${platform}`)} style={{ width: size + 5, height: size + 5 }} aria-label={platform}>{label}</span>
}

export function StatusBadge({ status }: { status: DraftStatus }) {
  return <span className={cn('status-badge', `status-${status}`)}>{status === 'pending' && <CircleDashed size={12} className="spin" />}{status === 'published' && <Check size={12} />}{status === 'failed' && <XCircle size={12} />}{status}</span>
}
