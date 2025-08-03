import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { code } = await request.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Friend code is required' },
        { status: 400 }
      )
    }

    // Find target user by friend code
    const { data: targetProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, username')
      .eq('friend_code', code.toUpperCase())
      .single()

    if (profileError || !targetProfile) {
      return NextResponse.json(
        { error: 'Invalid friend code' },
        { status: 404 }
      )
    }

    // Check if user is trying to add themselves
    if (targetProfile.id === user.id) {
      return NextResponse.json(
        { error: 'Cannot add yourself as a friend' },
        { status: 400 }
      )
    }

    // Check if request already exists
    const { data: existingRequest } = await supabase
      .from('friend_requests')
      .select('id, status')
      .or(
        `and(requester_id.eq.${user.id},target_id.eq.${targetProfile.id}),and(requester_id.eq.${targetProfile.id},target_id.eq.${user.id})`
      )
      .single()

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return NextResponse.json(
          { error: 'Friend request already sent' },
          { status: 400 }
        )
      } else if (existingRequest.status === 'accepted') {
        return NextResponse.json({ error: 'Already friends' }, { status: 400 })
      }
    }

    // Create friend request
    const { data: friendRequest, error: requestError } = await supabase
      .from('friend_requests')
      .insert({
        requester_id: user.id,
        target_id: targetProfile.id,
      })
      .select()
      .single()

    if (requestError) {
      console.error('Error creating friend request:', requestError)
      return NextResponse.json(
        { error: 'Failed to send friend request' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Friend request sent to ${targetProfile.display_name || targetProfile.username}`,
    })
  } catch (error) {
    console.error('Error in send friend request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
