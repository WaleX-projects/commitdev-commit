import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'

export function AuthCallback() {
  const navigate = useNavigate()
  const [message, setMessage] = useState('Completing GitHub sign in…')
  useEffect(() => { let active = true; const code = new URLSearchParams(window.location.search).get('code'); if (!code) { navigate('/drafts', { replace: true }); return } supabase.auth.exchangeCodeForSession(code).then(({ error }) => { if (!active) return; if (error) { setMessage(error.message); toast.error(error.message); setTimeout(() => navigate('/login', { replace: true }), 1400) } else navigate('/drafts', { replace: true }) }); return () => { active = false } }, [navigate])
  return <main className="auth-page"><section className="auth-card"><div className="wordmark">commitdev<span>▍</span></div><p>{message}</p></section></main>
}
