import { createClient, FunctionsHttpError } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

const previewOrigin = typeof window === 'undefined' ? 'http://127.0.0.1:3000' : window.location.origin
export const supabase = createClient<Database>(supabaseUrl ?? previewOrigin, supabaseAnonKey ?? 'dev-preview-key', { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })

type FunctionErrorLike = { message: string; context?: { json: () => Promise<unknown> } }
export async function unwrapFunctionError(error: FunctionErrorLike): Promise<string> {
  let message = error.message
  if (error instanceof FunctionsHttpError && error.context) {
    try { const context = await error.context.json() as { error?: string }; if (context?.error) message = context.error } catch { /* Keep the client message when the response is not JSON. */ }
  } else if (error.context) {
    try { const context = await error.context.json() as { error?: string }; if (context?.error) message = context.error } catch { /* Keep the client message when the response is not JSON. */ }
  }
  return message
}

export async function invokeFn<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body })
  if (!error) return data as T
  throw new Error(await unwrapFunctionError(error))
}
