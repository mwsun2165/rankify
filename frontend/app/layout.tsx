import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { UserNav } from '@/components/user-nav'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Rankify - Music Rankings',
  description:
    'Create and share Spotify album / song / artist rankings with friends',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          {/* Navigation Header */}
          {user && (
            <nav className="bg-white shadow-sm border-b border-gray-200">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                  {/* Logo and Navigation Links */}
                  <div className="flex items-center space-x-8">
                    <Link
                      href="/"
                      className="text-2xl font-bold text-green-600"
                    >
                      Rankify
                    </Link>
                    <div className="hidden md:flex space-x-6">
                      <Link
                        href="/search"
                        className="text-gray-700 hover:text-green-600 font-medium transition-colors"
                      >
                        Search
                      </Link>
                      <Link
                        href="/rank"
                        className="text-gray-700 hover:text-green-600 font-medium transition-colors"
                      >
                        Create Ranking
                      </Link>
                      <Link
                        href="/browse"
                        className="text-gray-700 hover:text-green-600 font-medium transition-colors"
                      >
                        Browse
                      </Link>
                      <Link
                        href="/compare"
                        className="text-gray-700 hover:text-green-600 font-medium transition-colors"
                      >
                        Compare
                      </Link>
                    </div>
                  </div>

                  {/* User Navigation */}
                  <UserNav />
                </div>
              </div>
            </nav>
          )}

          {/* Main Content */}
          <main>{children}</main>
        </div>

        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              style: {
                background: '#10b981',
              },
            },
            error: {
              style: {
                background: '#ef4444',
              },
            },
          }}
        />
      </body>
    </html>
  )
}
