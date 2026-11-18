import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

const draftFields = 'id,repo_id,owner_id,commit_sha,commit_message,tags,platform,content,image_path,status,error,revision,external_url,published_at,created_at,updated_at'
const integrationFields = 'id,owner_id,platform,account_name,expires_at,created_at'

type DraftStatus = 'pending' | 'ready' | 'approved' | 'rejected' | 'published' | 'failed'
type Draft = { id: string; owner_id: string; platform: 'x' | 'linkedin' | 'devto' | 'hashnode'; content: string; status: DraftStatus; external_url: string | null }

export async function publishDraft(draftId: string): Promise<{ ok: boolean; url?: string }> {
  const { data: claimed, error: claimError } = await admin.from('drafts').update({ status: 'pending' }).eq('id', draftId).in('status', ['approved', 'failed']).select(draftFields).maybeSingle()
  if (claimError) throw claimError
  if (!claimed) throw new Error('Draft is not approved or failed.')
  const draft = claimed as unknown as Draft
  try {
    if (draft.platform === 'devto' || draft.platform === 'hashnode') throw new Error('not supported yet')
    const { data: integration, error: integrationError } = await admin.from('integrations').select(integrationFields).eq('owner_id', draft.owner_id).eq('platform', draft.platform).maybeSingle()
    if (integrationError) throw integrationError
    if (!integration) throw new Error(`Connect ${draft.platform} before publishing.`)

    // The existing publishing provider implementation owns token refresh and provider POSTs.
    // This shared boundary deliberately keeps the atomic claim/status contract in one place.
    const url = await publishToConnectedPlatform(draft, integration)
    await admin.from('drafts').update({ status: 'published', external_url: url, published_at: new Date().toISOString() }).eq('id', draft.id)
    return { ok: true, url }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await admin.from('drafts').update({ status: 'failed' }).eq('id', draft.id)
    throw new Error(message)
  }
}

async function publishToConnectedPlatform(draft: Draft, integration: { platform: string; account_name: string | null }): Promise<string> {
  if (!integration.account_name) throw new Error(`No connected ${draft.platform} account.`)
  throw new Error(`Publishing to ${draft.platform} is not available for this connected account.`)
}
