import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { invokeFn } from '../lib/supabase'

export function ConnectCallback() {
  const navigate = useNavigate()
  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const state = params.get('state')
      const platform = sessionStorage.getItem('commitdev-connect-platform') as 'x' | 'linkedin' | null
      const storedState = sessionStorage.getItem('commitdev-connect-state')
      const verifier = sessionStorage.getItem('commitdev-connect-verifier')
      sessionStorage.removeItem('commitdev-connect-platform'); sessionStorage.removeItem('commitdev-connect-state'); sessionStorage.removeItem('commitdev-connect-verifier')
      if (!code || !state || !platform || state !== storedState || !verifier) { toast.error('Connection state did not match. Start the connection again.'); navigate('/connections', { replace: true }); return }
      try { const result = await invokeFn<{ ok: boolean; account?: string }>('connect', { action: 'finish', platform, code, redirect_uri: `${window.location.origin}/connect/callback`, verifier }); toast.success(result.account ? `Connected ${result.account}` : `Connected ${platform}`); navigate('/connections', { replace: true }) } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not connect account.'); navigate('/connections', { replace: true }) }
    }
    void run()
  }, [navigate])
  return <main className="auth-page"><section className="auth-card"><div className="wordmark">commitdev<span>▍</span></div><p>Finishing connection…</p></section></main>
}
