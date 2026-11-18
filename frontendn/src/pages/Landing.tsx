import { ArrowDown, ArrowRight, Github } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui'
import { LandingNav } from './landing/LandingNav'
import { TerminalDemo } from './landing/TerminalDemo'
import { FAQ, Features, FinalCta, ForNonCoders, HowItWorks, LandingFooter, CliSection, Platforms, ProblemStrip } from './landing/LandingSections'

export function Landing() {
  const { user } = useAuth(); const navigate = useNavigate()
  const signIn = async () => { if (user) { navigate('/drafts'); return }; const { error } = await supabase.auth.signInWithOAuth({ provider: 'github', options: { scopes: 'public_repo write:repo_hook', redirectTo: `${window.location.origin}/auth/callback`, queryParams: { access_type: 'offline', prompt: 'consent' } } }); if (error) toast.error(error.message) }
  return <div className="landing-page"><LandingNav /><main><section className="landing-hero"><div className="landing-hero-copy"><h1>Ship code.<br /><em>Your commits write the post.</em></h1><p className="landing-subline">Add a tag to a commit. CommitDev reads the diff and drafts a post for LinkedIn and X. You approve it, it publishes.</p><div className="landing-hero-actions">{user ? <Button variant="primary" onClick={() => navigate('/drafts')}>Open dashboard <ArrowRight size={16} /></Button> : <Button variant="primary" onClick={() => void signIn()}><Github size={16} /> Continue with GitHub</Button>}<a className="button button-secondary" href="#cli">Get the CLI <ArrowDown size={15} /></a></div><p className="landing-note">Works with the Git and GitHub you already use.</p></div><div className="landing-hero-demo"><TerminalDemo /></div></section><ProblemStrip /><HowItWorks /><Features /><ForNonCoders /><CliSection /><Platforms /><FAQ /><FinalCta onSignIn={() => void signIn()} signedIn={Boolean(user)} /></main><LandingFooter /></div>
}
