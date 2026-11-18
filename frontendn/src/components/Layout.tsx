import { useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, Boxes, ChevronRight, ClipboardList, GitBranch, Menu, PenLine, Plug, X } from 'lucide-react'
import { Button } from './ui'
import { useProfile, useDrafts } from '../lib/queries'
import { supabase } from '../lib/supabase'

const links = [
  { to: '/drafts', label: 'Drafts', icon: ClipboardList },
  { to: '/compose', label: 'Compose', icon: PenLine },
  { to: '/repos', label: 'Repos', icon: GitBranch },
  { to: '/connections', label: 'Connections', icon: Plug },
  { to: '/cli', label: 'Get CLI', icon: BookOpen },
]

export function Layout({ userId, children }: { userId: string; children?: ReactNode }) {
  const [drawer, setDrawer] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const profile = useProfile(userId)
  const drafts = useDrafts(userId)
  const readyCount = drafts.data?.filter((draft) => draft.status === 'ready').length ?? 0

  const signOut = async () => { await supabase.auth.signOut(); navigate('/login') }
  return <div className="app-shell">
    <header className="mobile-topbar"><button className="icon-button" aria-label="Open navigation" onClick={() => setDrawer(true)}><Menu size={21} /></button><span className="wordmark">commitdev<span>▍</span></span><div className="mobile-topbar-space" /></header>
    {drawer && <div className="mobile-drawer-backdrop" onClick={() => setDrawer(false)}><aside className="mobile-drawer" onClick={(event) => event.stopPropagation()}><div className="drawer-head"><span className="wordmark">commitdev<span>▍</span></span><button className="icon-button" aria-label="Close navigation" onClick={() => setDrawer(false)}><X size={19} /></button></div><NavItems close={() => setDrawer(false)} readyCount={readyCount} /></aside></div>}
    <aside className="sidebar"><div className="sidebar-head"><span className="wordmark">commitdev<span>▍</span></span><span className="sidebar-mark"><Boxes size={17} /></span></div><NavItems readyCount={readyCount} /><div className="sidebar-foot"><div className="user-chip"><div className="avatar">{profile.data?.avatar_url ? <img src={profile.data.avatar_url} alt="" /> : (profile.data?.github_login?.[0] ?? 'U').toUpperCase()}</div><div className="user-meta"><strong>{profile.data?.github_login ?? 'GitHub user'}</strong><span>connected</span></div><ChevronRight size={14} /></div><Button variant="ghost" className="signout" onClick={signOut}>Sign out</Button></div></aside>
    <main className="main-content">{children ?? <Outlet />}</main>
  </div>
}

function NavItems({ close, readyCount }: { close?: () => void; readyCount: number }) {
  return <nav className="nav-list" aria-label="Main navigation">{links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={close} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon size={17} /><span>{label}</span>{label === 'Drafts' && readyCount > 0 && <span className="count-pill">{readyCount}</span>}</NavLink>)}</nav>
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) { return <div className="page-header"><div><div className="eyebrow">{eyebrow ?? 'COMMITDEV'}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action && <div className="page-header-action">{action}</div>}</div> }

export function Breadcrumb({ label }: { label: string }) { return <div className="breadcrumb"><span>commitdev</span><ChevronRight size={14} /><strong>{label}</strong></div> }
