import { useEffect, useState } from 'react'
import { Menu, Moon, Sun, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../../App'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui'

export function LandingNav() {
  const { user } = useAuth(); const [menuOpen, setMenuOpen] = useState(false); const [theme, setTheme] = useState<'light' | 'dark'>(() => (document.documentElement.dataset.theme as 'light' | 'dark' | undefined) ?? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'))
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('commitdev-theme', theme) }, [theme])
  const signIn = async () => { const { error } = await supabase.auth.signInWithOAuth({ provider: 'github', options: { scopes: 'public_repo write:repo_hook', redirectTo: `${window.location.origin}/auth/callback`, queryParams: { access_type: 'offline', prompt: 'consent' } } }); if (error) toast.error(error.message) }
  const close = () => setMenuOpen(false)
  return <header className="landing-nav"><div className="landing-nav-inner"><Link className="landing-wordmark" to="/" aria-label="CommitDev home">commitdev<span>▍</span></Link><nav id="landing-navigation" className={`landing-links ${menuOpen ? 'open' : ''}`} aria-label="Landing page navigation"><a href="#how-it-works" onClick={close}>How it works</a><a href="#features" onClick={close}>Features</a><a href="#cli" onClick={close}>CLI</a></nav><div className={`landing-nav-actions ${menuOpen ? 'open' : ''}`}><button className="theme-toggle" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button>{user ? <Link className="button button-primary landing-signin" to="/drafts" onClick={close}>Open dashboard</Link> : <Button variant="primary" className="landing-signin" onClick={() => void signIn()}>Sign in</Button>}</div><button className="landing-menu-button" aria-expanded={menuOpen} aria-controls="landing-navigation" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen((value) => !value)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button></div></header>
}
