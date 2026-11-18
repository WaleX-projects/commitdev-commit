import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronRight, CircleDashed, Terminal } from 'lucide-react'

export type TerminalFrame = { command: string; output: string[]; postVisible: boolean }

export function getTerminalFrame(reducedMotion: boolean, elapsed = 0): TerminalFrame {
  if (reducedMotion) return { command: 'git push', output: ['drafting for linkedin...', 'draft ready · a1b2c3d4', 'approved · published'], postVisible: true }
  const phase = elapsed % 12000
  if (phase < 2800) return { command: 'git commit -m "feat: realtime sync [post][linkedin]"', output: [], postVisible: false }
  if (phase < 4500) return { command: 'git push', output: [], postVisible: false }
  if (phase < 6800) return { command: 'git push', output: ['drafting for linkedin...'], postVisible: false }
  if (phase < 9000) return { command: 'git push', output: ['drafting for linkedin...', 'draft ready · a1b2c3d4'], postVisible: false }
  return { command: 'git push', output: ['drafting for linkedin...', 'draft ready · a1b2c3d4', 'approved · published'], postVisible: true }
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => { const query = window.matchMedia('(prefers-reduced-motion: reduce)'); const update = () => setReduced(query.matches); update(); query.addEventListener('change', update); return () => query.removeEventListener('change', update) }, [])
  return reduced
}

export function TerminalDemo() {
  const reducedMotion = usePrefersReducedMotion()
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => { if (reducedMotion) return; const started = performance.now(); const timer = window.setInterval(() => setElapsed(performance.now() - started), 100); return () => window.clearInterval(timer) }, [reducedMotion])
  const frame = useMemo(() => getTerminalFrame(reducedMotion, elapsed), [reducedMotion, elapsed])
  return <div className="terminal-demo-wrap"><div className="terminal-window" aria-label="CommitDev terminal flow"><div className="terminal-window-head"><div className="terminal-dots"><i /><i /><i /></div><span><Terminal size={13} /> commitdev watch</span><span className="terminal-live">live</span></div><div className="terminal-body"><div className="terminal-prompt"><span className="prompt-symbol">$</span><span className={reducedMotion ? '' : 'terminal-command'}>{frame.command}</span><span className="terminal-cursor" aria-hidden="true">▍</span></div>{frame.output.map((line, index) => <div className={`terminal-output ${index === frame.output.length - 1 ? 'terminal-output-current' : ''}`} key={line}><ChevronRight size={13} />{line}{line.includes('published') && <Check size={13} />}</div>)}</div></div><div className={`landing-post-card ${frame.postVisible ? 'post-visible' : ''}`}><div className="post-card-head"><span className="post-avatar">cd</span><div><strong>commitdev</strong><span>@commitdev · just now</span></div><span className="post-status"><CircleDashed size={12} /> approved</span></div><p>Realtime sync is live. Drafts now appear in the review queue as the push lands.</p><div className="post-card-foot"><span>LinkedIn-style preview</span><span className="mono">a1b2c3d4</span></div></div></div>
}
