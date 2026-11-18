import { Github } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui'

export function Login() {
  const signIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'github', options: { scopes: 'public_repo write:repo_hook', redirectTo: `${window.location.origin}/auth/callback`, queryParams: { access_type: 'offline', prompt: 'consent' } } })
    if (error) toast.error(error.message)
  }
  return <main className="auth-page"><section className="auth-card"><div className="wordmark">commitdev<span>▍</span></div><h1>Turn commits into posts</h1><p>Review the words before they leave the repo.</p><div className="typed-line">$ git commit -m "feat: ship it [post][linkedin]"</div><Button variant="primary" className="auth-button" onClick={signIn}><Github size={17} /> Continue with GitHub</Button></section></main>
}
