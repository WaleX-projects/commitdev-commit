import { Component, createContext, useContext, useEffect, useState, type ErrorInfo, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { Session, User } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { Layout } from './components/Layout'
import { Skeleton } from './components/ui'
import { Drafts } from './pages/Drafts'
import { DraftDetail } from './pages/DraftDetail'
import { Repos } from './pages/Repos'
import { Connections } from './pages/Connections'
import { Compose } from './pages/Compose'
import { Cli } from './pages/Cli'
import { Login } from './pages/Login'
import { AuthCallback } from './pages/AuthCallback'
import { ConnectCallback } from './pages/ConnectCallback'
import { Landing } from './pages/Landing'
import { supabase } from './lib/supabase'
import type { Draft } from './lib/queries'
import { queryKeys } from './lib/queries'

type AuthContextValue = { user: User | null; session: Session | null; loading: boolean }
const AuthContext = createContext<AuthContextValue>({ user: null, session: null, loading: true })
export const useAuth = () => useContext(AuthContext)

function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => { if (mounted) { setSession(data.session); setLoading(false) } })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setLoading(false) })
    return () => { mounted = false; listener.subscription.unsubscribe() }
  }, [])
  return <AuthContext.Provider value={{ user: session?.user ?? null, session, loading }}>{children}</AuthContext.Provider>
}

function RealtimeBridge({ userId }: { userId: string }) {
  const client = useQueryClient()
  useEffect(() => {
    const channel = supabase.channel(`drafts:${userId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'drafts', filter: `owner_id=eq.${userId}` }, (payload) => {
      const draft = payload.new as Draft
      client.setQueryData<Draft[]>(queryKeys.drafts(userId), (current = []) => [draft, ...current.filter((item) => item.id !== draft.id)])
      client.setQueryData(queryKeys.draft(draft.id), draft)
      if (draft.status === 'ready') toast.success('A draft is ready for review.')
    }).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'drafts', filter: `owner_id=eq.${userId}` }, (payload) => {
      const draft = payload.new as Draft
      const old = payload.old as Partial<Draft>
      client.setQueryData<Draft[]>(queryKeys.drafts(userId), (current = []) => current.map((item) => item.id === draft.id ? draft : item))
      client.setQueryData(queryKeys.draft(draft.id), draft)
      if (old.status !== 'ready' && draft.status === 'ready') toast.success('A draft is ready for review.')
    }).subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [client, userId])
  return null
}

function ProtectedLayout() {
  const { user, loading } = useAuth()
  if (loading) return <div className="auth-page"><Skeleton className="auth-card" /></div>
  if (!user) return <Navigate to="/login" replace />
  return <><RealtimeBridge userId={user.id} /><Layout userId={user.id}><Outlet /></Layout></>
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('CommitDev render error', error, info) }
  render() { if (this.state.hasError) return <div className="auth-page"><div className="auth-card"><div className="eyebrow">COMMITDEV / ERROR</div><h1>Something broke.</h1><p>Reload the page to restore the review workbench.</p><button className="button button-primary auth-button" onClick={() => window.location.reload()}>Reload app</button></div></div>; return this.props.children }
}

export default function App() {
  return <ErrorBoundary><BrowserRouter><AuthProvider><Routes><Route path="/" element={<Landing />} /><Route path="/login" element={<Login />} /><Route path="/auth/callback" element={<AuthCallback />} /><Route path="/connect/callback" element={<ConnectCallback />} /><Route element={<ProtectedLayout />}><Route path="drafts" element={<Drafts />} /><Route path="drafts/:id" element={<DraftDetail />} /><Route path="repos" element={<Repos />} /><Route path="connections" element={<Connections />} /><Route path="compose" element={<Compose />} /><Route path="cli" element={<Cli />} /></Route><Route path="*" element={<Navigate to="/" replace />} /></Routes></AuthProvider></BrowserRouter></ErrorBoundary>
}
