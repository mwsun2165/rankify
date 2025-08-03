import { createServerSupabaseClient } from '@/lib/supabase-server'
import { LoginButton } from '@/components/login-button'

export default async function HomePage() {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex w-full max-w-6xl">
          {/* Left side - Logo/Branding */}
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="mb-8">
                <svg
                  className="w-24 h-24 mx-auto mb-6"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
              </div>
              <h1 className="text-4xl font-bold tracking-wide">RANKIFY</h1>
              <p className="text-xl mt-2 tracking-wider">MUSIC RANKINGS</p>
            </div>
          </div>

          {/* Right side - Login */}
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-md">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">LOGIN</h2>
                <p className="text-gray-400">
                  Connect with Spotify to get started
                </p>
              </div>

              <div className="space-y-6">
                <LoginButton />
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="space-y-4">
          <a
            href="/search"
            className="block w-full text-center p-8 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h2 className="text-xl font-semibold mb-2">Search</h2>
            <p className="text-gray-600">Find and rank albums or artists</p>
          </a>

          <a
            href="/browse"
            className="block w-full text-center p-8 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h2 className="text-xl font-semibold mb-2">Browse</h2>
            <p className="text-gray-600">Discover rankings from friends</p>
          </a>
        </div>
      </div>
    </main>
  )
}
