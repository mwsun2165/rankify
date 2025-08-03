import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// This route is called from the client to fully clear the Supabase session
// stored in HTTP-only cookies. A simple client-side signOut only clears
// localStorage and memory but leaves the cookies untouched. Clearing them
// here ensures that subsequent requests made from the browser are treated
// as unauthenticated by the server.
export async function POST(request: NextRequest) {
  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )

  await supabase.auth.signOut()

  // Explicitly remove the auth cookies so the browser never sends stale tokens
  cookieStore.delete('sb-access-token')
  cookieStore.delete('sb-refresh-token')

  // Return a simple JSON response; the client handles the redirect.
  return NextResponse.json({ success: true })
}
