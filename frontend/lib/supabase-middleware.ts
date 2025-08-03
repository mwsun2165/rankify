import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@rankify/db-types'

/**
 * This helper is run from `middleware.ts` so that we can refresh an expired
 * Supabase session cookie before the request hits a Server Component. Server
 * Components can read cookies but cannot modify them, so we do the refresh at
 * the edge where cookie mutation is allowed.
 */
export async function updateSession(request: NextRequest) {
  // Prepare a mutable response that mirrors the incoming request headers so we
  // can update cookies if Supabase generates a new session.
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Read cookie values coming from the request
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        // Write any updated cookies to the response (allowed in middleware)
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // This call will refresh the session if it has expired and make Supabase set
  // a new auth cookie via the callbacks defined above.
  await supabase.auth.getUser()

  return response
}
