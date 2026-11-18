export type Platform = 'linkedin' | 'x' | 'devto' | 'hashnode'
export type DraftStatus = 'pending' | 'ready' | 'approved' | 'rejected' | 'published' | 'failed'

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type RowBase = { id: string; created_at: string }

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; github_login: string | null; avatar_url: string | null }
        Insert: { id: string; github_login?: string | null; avatar_url?: string | null }
        Update: { id?: string; github_login?: string | null; avatar_url?: string | null }
        Relationships: []
      }
      repos: {
        Row: RowBase & { owner_id: string; full_name: string; default_tone: string | null; default_platforms: Platform[] | null; webhook_secret: string; }
        Insert: { owner_id: string; full_name: string; default_tone?: string | null; default_platforms?: Platform[] | null; webhook_secret?: string }
        Update: { default_tone?: string | null; default_platforms?: Platform[] | null }
        Relationships: []
      }
      drafts: {
        Row: RowBase & { repo_id: string; owner_id: string; commit_sha: string; commit_message: string; tags: Json; platform: Platform; content: string; image_path: string | null; status: DraftStatus; error: string | null; revision: number; external_url: string | null; published_at: string | null; updated_at: string }
        Insert: { repo_id: string; owner_id: string; commit_sha: string; commit_message: string; tags: Json; platform: Platform; content: string; image_path?: string | null; status?: DraftStatus; error?: string | null; revision?: number; external_url?: string | null; published_at?: string | null; updated_at?: string }
        Update: { content?: string; status?: DraftStatus; image_path?: string | null }
        Relationships: []
      }
      integrations: {
        Row: RowBase & { owner_id: string; platform: Platform; account_name: string | null; expires_at: string | null }
        Insert: { owner_id: string; platform: Platform; account_name?: string | null; expires_at?: string | null }
        Update: { owner_id?: string; platform?: Platform; account_name?: string | null; expires_at?: string | null }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: { platform: Platform; draft_status: DraftStatus }
    CompositeTypes: Record<string, never>
  }
}
