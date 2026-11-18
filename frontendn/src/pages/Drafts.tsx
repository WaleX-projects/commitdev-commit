import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, RefreshCw } from 'lucide-react'
import { PageHeader } from '../components/Layout'
import { EmptyState } from '../components/EmptyState'
import { Panel, Skeleton } from '../components/ui'
import { PlatformIcon, StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../App'
import { useDrafts, useRepos, type Draft } from '../lib/queries'
import { firstLine, relativeTime, shortSha } from '../lib/utils'

type Filter = 'ready' | 'approved' | 'published' | 'rejected' | 'all'
const tabs: Array<{ id: Filter; label: string }> = [{ id: 'ready', label: 'Needs review' }, { id: 'approved', label: 'Approved' }, { id: 'published', label: 'Published' }, { id: 'rejected', label: 'Rejected / Failed' }, { id: 'all', label: 'All' }]

export function Drafts() {
  const { user } = useAuth(); const [filter, setFilter] = useState<Filter>('ready'); const drafts = useDrafts(user?.id); const repos = useRepos(user?.id)
  const repoMap = useMemo(() => new Map((repos.data ?? []).map((repo) => [repo.id, repo.full_name])), [repos.data])
  const list = useMemo(() => (drafts.data ?? []).filter((draft) => filter === 'all' ? true : filter === 'rejected' ? draft.status === 'rejected' || draft.status === 'failed' : draft.status === filter), [drafts.data, filter])
  return <div className="page"><PageHeader eyebrow="REVIEW QUEUE" title="Drafts" description="A realtime queue of posts generated from your tagged commits." action={<button className="button button-secondary" onClick={() => void drafts.refetch()}><RefreshCw size={15} /> Refresh</button>} /><div className="tabs">{tabs.map((tab) => <button key={tab.id} className={`tab ${filter === tab.id ? 'active' : ''}`} onClick={() => setFilter(tab.id)}>{tab.label}{tab.id === 'ready' && drafts.data?.filter((draft) => draft.status === 'ready').length ? ` · ${drafts.data.filter((draft) => draft.status === 'ready').length}` : ''}</button>)}</div>{drafts.isLoading ? <div className="draft-list">{[1, 2, 3].map((item) => <Panel key={item} className="draft-card"><Skeleton className="platform-icon" /><div className="draft-main"><Skeleton style={{ width: '35%', height: 13 }} /><Skeleton style={{ width: '70%', height: 16, marginTop: 8 }} /></div></Panel>)}</div> : list.length ? <div className="draft-list">{list.map((draft, index) => <DraftCard key={draft.id} draft={draft} repoName={repoMap.get(draft.repo_id) ?? 'unknown repo'} index={index} />)}</div> : <EmptyState code={'git commit -m "feat: x [post][linkedin]"'} title={filter === 'ready' ? 'No drafts need your eyes right now.' : 'Nothing in this view yet.'} action={filter === 'all' ? 'Compose a post' : undefined} onAction={() => window.location.assign('/compose')} />}</div>
}

function DraftCard({ draft, repoName, index }: { draft: Draft; repoName: string; index: number }) { return <Link to={`/drafts/${draft.id}`} className={`panel draft-card ${draft.status === 'ready' ? 'ready' : ''}`} style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}><PlatformIcon platform={draft.platform} /><div className="draft-main"><div className="draft-meta"><span className="repo-name">{repoName}</span><span className="sha-chip">{shortSha(draft.commit_sha)}</span></div><div className="draft-line">{firstLine(draft.content)}</div><div className="draft-subline">{draft.commit_message}</div></div><div className="draft-status"><StatusBadge status={draft.status} /><span className="time">{relativeTime(draft.updated_at)}</span></div><ArrowUpRight size={16} color="var(--faint)" /></Link> }
