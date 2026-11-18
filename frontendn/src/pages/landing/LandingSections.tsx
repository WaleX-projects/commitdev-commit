import { useState } from 'react'
import { ArrowRight, Check, ChevronDown, Code2, GitBranch, Image, LockKeyhole, MessageSquareText, Radio, ShieldCheck, Terminal, WandSparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '../../components/ui'
import { PlatformIcon } from '../../components/StatusBadge'

export function ProblemStrip() { return <section className="landing-problem"><p>You build in public in theory. In practice you never get around to writing the post.</p></section> }

const steps = [
  { icon: GitBranch, number: '01', title: 'Tag a commit', body: 'Add [post] to the message. Optional [linkedin] [x] [tone=casual] [length=short].' },
  { icon: Radio, number: '02', title: 'Push as normal', body: 'A git hook or GitHub webhook triggers CommitDev. Nothing else changes in your workflow.' },
  { icon: MessageSquareText, number: '03', title: 'Review the draft', body: 'An AI draft appears instantly in your terminal or the dashboard. Edit, regenerate with feedback, or attach an image.' },
  { icon: Check, number: '04', title: 'Publish', body: 'Approve, and it posts to your connected accounts.' },
]
export function HowItWorks() { return <section className="landing-section" id="how-it-works"><div className="landing-section-intro"><p className="landing-kicker">HOW IT WORKS</p><h2>How it works</h2></div><div className="steps-grid">{steps.map(({ icon: Icon, number, title, body }) => <article className="step-card" key={number}><div className="step-number">{number}</div><Icon size={19} /><h3>{title}</h3><p>{body}</p></article>)}</div></section> }

const features = [
  { icon: GitBranch, title: 'Works from your repo', body: 'A tag in the commit message is the only trigger.' },
  { icon: Radio, title: 'Live review queue', body: 'Drafts appear in real time in the CLI and the web app.' },
  { icon: WandSparkles, title: 'Your voice', body: 'Set a default tone per repo and give feedback to regenerate.' },
  { icon: Image, title: 'Images', body: 'Attach a screenshot or a photo to a draft.' },
  { icon: ShieldCheck, title: 'Safer by default', body: 'Credential-looking lines are removed from diffs before the AI sees them.' },
  { icon: LockKeyhole, title: 'Private by design', body: 'Every row is protected by row-level security, so only you can read your drafts and connections.' },
]
export function Features() { return <section className="landing-section" id="features"><div className="landing-section-intro"><p className="landing-kicker">FEATURES</p><h2>Features</h2></div><div className="features-grid">{features.map(({ icon: Icon, title, body }) => <article className="feature-card" key={title}><Icon size={18} /><h3>{title}</h3><p>{body}</p></article>)}</div></section> }

export function ForNonCoders() { return <section className="landing-section landing-noncoders"><div><p className="landing-kicker">FOR NON-CODERS</p><p className="landing-noncoder-copy">Building with an AI that writes the code? You still use Git and GitHub. Add one tag and CommitDev handles the marketing.</p></div><div className="noncoder-code"><span className="prompt-symbol">$</span><code>git commit -m "add checkout page [post]"</code><span className="terminal-cursor">▍</span></div></section> }

const cliCommands = [['login', 'Connect the CLI to your CommitDev account.'], ['init', 'Set up the hook for the current repository.'], ['watch', 'Listen for tagged commits as they are pushed.'], ['drafts', 'See what is waiting in the review queue.'], ['approve', 'Approve a draft from the terminal.'], ['publish', 'Publish an approved draft.'], ['connect', 'Connect a publishing account.']]
export function CliSection() { const command = import.meta.env.VITE_CLI_INSTALL_CMD || 'bun add -g commitdev'; const [copied, setCopied] = useState(false); const copy = async () => { await navigator.clipboard.writeText(command); setCopied(true); toast.success('Install command copied.'); window.setTimeout(() => setCopied(false), 1400) }; return <section className="landing-section" id="cli"><div className="cli-section-head"><div><p className="landing-kicker">CLI</p><h2>Built for the terminal</h2></div><Link className="text-link" to="/cli">Full CLI guide <ArrowRight size={15} /></Link></div><div className="landing-cli-grid"><div className="landing-install"><div className="install-label"><Terminal size={15} /> INSTALL</div><div className="landing-code-block"><code>{command}</code><button className="icon-button" aria-label="Copy install command" onClick={() => void copy()}>{copied ? <Check size={15} /> : <Code2 size={15} />}</button></div></div><div className="command-table" role="table" aria-label="CommitDev CLI commands">{cliCommands.map(([name, description]) => <div className="command-row" role="row" key={name}><code>{name}</code><span>{description}</span></div>)}</div></div></section> }

export function Platforms() { return <section className="landing-section landing-platforms"><div className="landing-section-intro"><p className="landing-kicker">PLATFORMS</p><h2>Platforms</h2></div><div className="platform-row"><PlatformCard platform="linkedin" label="LinkedIn" status="Available" /><PlatformCard platform="x" label="X" status="Available" /><PlatformCard platform="devto" label="Dev.to" status="Coming soon" muted /><PlatformCard platform="hashnode" label="Hashnode" status="Coming soon" muted /></div></section> }
function PlatformCard({ platform, label, status, muted }: { platform: 'linkedin' | 'x' | 'devto' | 'hashnode'; label: string; status: string; muted?: boolean }) { return <div className={`platform-card ${muted ? 'muted' : ''}`}><PlatformIcon platform={platform} size={19} /><div><strong>{label}</strong><span className={muted ? '' : 'available'}>{status}</span></div></div> }

const faqs = [['Does it post without my approval?', 'No. Every draft waits for you to approve it.'], ['What does it read from my repo?', 'The commit message and the diff of tagged commits only, with credential-looking lines removed first.'], ['Which platforms are supported?', 'LinkedIn and X today; Dev.to and Hashnode are planned. X posting is text only for now.'], ['Do I need to use the terminal?', 'No. The web app can review, edit, approve and publish too, though the CLI is the fastest way to start.'], ['Is my data private?', 'Your drafts and connections are only readable by your account. Connected account tokens are never exposed to the browser or the CLI.']]
export function FAQ() { return <section className="landing-section landing-faq"><div className="landing-section-intro"><p className="landing-kicker">FAQ</p><h2>FAQ</h2></div><div className="faq-list">{faqs.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={17} /></summary><p>{answer}</p></details>)}</div></section> }

export function FinalCta({ onSignIn, signedIn }: { onSignIn: () => void; signedIn: boolean }) { return <section className="final-cta"><div><p className="landing-kicker">READY WHEN YOU ARE</p><h2>Your next commit can be your next post.</h2></div>{signedIn ? <Link className="button button-primary" to="/drafts">Open dashboard <ArrowRight size={15} /></Link> : <Button variant="primary" onClick={onSignIn}>Continue with GitHub <ArrowRight size={15} /></Button>}</section> }

export function LandingFooter() { return <footer className="landing-footer"><Link className="landing-wordmark" to="/">commitdev<span>▍</span></Link><nav aria-label="Footer navigation"><a href="#how-it-works">How it works</a><a href="#features">Features</a><a href="#cli">CLI</a><Link to="/login">Sign in</Link></nav><p>Built with Git, GitHub and Supabase</p></footer> }
