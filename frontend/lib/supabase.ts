// Legacy client - prefer using supabase-client.ts or supabase-server.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@rankify/db-types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
