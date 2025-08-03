import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@rankify/db-types'
import { updateSession } from '@/lib/supabase-middleware'

export async function middleware(request: NextRequest) {
  // Attempt to refresh the session (will update cookies if the refresh token is still valid)
  const response = await updateSession(request)

  const { pathname } = request.nextUrl

  // Routes that do not require authentication
  const isPublicRoute =
    pathname === '/' ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/')

  if (isPublicRoute) {
    return response
  }

  // Create a Supabase client tied to the current request cookies to check auth status
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If no valid user, redirect to the login page
  if (!user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // User is authenticated – allow request to continue
  return response
}

// Exclude Next.js internals and asset requests from middleware
export const config = {
  matcher: [
    // Skip static files, images, and favicon
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
