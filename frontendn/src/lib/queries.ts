import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { DraftStatus, Database, Platform } from './database.types'
import { supabase, invokeFn } from './supabase'

export type Draft = Database['public']['Tables']['drafts']['Row']
export type Repo = Database['public']['Tables']['repos']['Row']
export type Integration = Database['public']['Tables']['integrations']['Row']

const draftSelect = 'id,repo_id,owner_id,commit_sha,commit_message,tags,platform,content,image_path,status,error,revision,external_url,published_at,created_at,updated_at'
const repoSelect = 'id,owner_id,full_name,default_tone,default_platforms,webhook_secret,created_at'
const integrationSelect = 'id,owner_id,platform,account_name,expires_at,created_at'

export const queryKeys = {
  repos: (userId?: string) => ['repos', userId] as const,
  drafts: (userId?: string) => ['drafts', userId] as const,
  draft: (id: string) => ['draft', id] as const,
  integrations: (userId?: string) => ['integrations', userId] as const,
  profile: (userId?: string) => ['profile', userId] as const,
}

export function useProfile(userId?: string) {
  return useQuery({
    queryKey: queryKeys.profile(userId), enabled: Boolean(userId),
    queryFn: async () => { const { data, error } = await supabase.from('profiles').select('id,github_login,avatar_url').eq('id', userId as string).maybeSingle(); if (error) throw error; return data },
  })
}

export function useRepos(userId?: string) {
  return useQuery({
    queryKey: queryKeys.repos(userId), enabled: Boolean(userId),
    queryFn: async () => { const { data, error } = await supabase.from('repos').select(repoSelect).eq('owner_id', userId as string).order('full_name'); if (error) throw error; return data as Repo[] },
  })
}

export function useDrafts(userId?: string) {
  return useQuery({
    queryKey: queryKeys.drafts(userId), enabled: Boolean(userId),
    queryFn: async () => { const { data, error } = await supabase.from('drafts').select(draftSelect).eq('owner_id', userId as string).order('updated_at', { ascending: false }); if (error) throw error; return data as Draft[] },
  })
}

export function useDraft(id?: string) {
  return useQuery({
    queryKey: queryKeys.draft(id ?? ''), enabled: Boolean(id),
    queryFn: async () => { const { data, error } = await supabase.from('drafts').select(draftSelect).eq('id', id as string).maybeSingle(); if (error) throw error; return data as Draft | null },
  })
}

export function useIntegrations(userId?: string) {
  return useQuery({
    queryKey: queryKeys.integrations(userId), enabled: Boolean(userId),
    queryFn: async () => { const { data, error } = await supabase.from('integrations').select(integrationSelect).eq('owner_id', userId as string).order('platform'); if (error) throw error; return data as Integration[] },
  })
}

export function useCreateRepo(userId?: string) {
  const client = useQueryClient()
  return useMutation({ mutationFn: async (full_name: string) => { const { data, error } = await supabase.from('repos').insert({ owner_id: userId as string, full_name }).select(repoSelect).single(); if (error) throw error; return data as Repo }, onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.repos(userId) }) })
}

export function useUpdateRepo(userId?: string) {
  const client = useQueryClient()
  return useMutation({ mutationFn: async (input: { id: string; default_tone: string; default_platforms: Platform[] }) => { const { error } = await supabase.from('repos').update({ default_tone: input.default_tone, default_platforms: input.default_platforms }).eq('id', input.id); if (error) throw error }, onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.repos(userId) }) })
}

export function useDeleteRepo(userId?: string) {
  const client = useQueryClient()
  return useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from('repos').delete().eq('id', id); if (error) throw error }, onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.repos(userId) }) })
}

export function useUpdateDraft(userId?: string) {
  const client = useQueryClient()
  return useMutation({ mutationFn: async (input: { id: string; content?: string; status?: DraftStatus; image_path?: string | null }) => { const update: { content?: string; status?: DraftStatus; image_path?: string | null } = {}; if (input.content !== undefined) update.content = input.content; if (input.status !== undefined) update.status = input.status; if (input.image_path !== undefined) update.image_path = input.image_path; const { error } = await supabase.from('drafts').update(update).eq('id', input.id); if (error) throw error }, onSuccess: (_, input) => { client.invalidateQueries({ queryKey: queryKeys.drafts(userId) }); client.invalidateQueries({ queryKey: queryKeys.draft(input.id) }) } })
}

export function useDeleteDraft(userId?: string) {
  const client = useQueryClient()
  return useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from('drafts').delete().eq('id', id); if (error) throw error }, onSuccess: (_, id) => { client.invalidateQueries({ queryKey: queryKeys.drafts(userId) }); client.removeQueries({ queryKey: queryKeys.draft(id) }) } })
}

export function useDeleteIntegration(userId?: string) {
  const client = useQueryClient()
  return useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from('integrations').delete().eq('id', id); if (error) throw error }, onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.integrations(userId) }) })
}

export function useGenerateDraft() {
  return useMutation({ mutationFn: (input: { draft_id: string; feedback?: string }) => invokeFn<{ ok: boolean }>('generate-draft', input) })
}

export function usePublishDraft() {
  return useMutation({ mutationFn: (draft_id: string) => invokeFn<{ ok: boolean; url?: string }>('publish-draft', { draft_id }) })
}

export function useComposePost() {
  return useMutation({ mutationFn: (input: { repo_id: string; platform: Platform; content: string; publish: boolean }) => invokeFn<{ ok: boolean; draft_id: string; url?: string }>('compose-post', input) })
}

export function useConnectFunction() {
  return useMutation({ mutationFn: (input: Record<string, unknown>) => invokeFn<{ url?: string; state?: string; verifier?: string; ok?: boolean; account?: string }>('connect', input) })
}
