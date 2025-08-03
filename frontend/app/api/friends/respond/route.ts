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

    const { requestId, action } = await request.json()

    if (!requestId || !action || !['accept', 'decline'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      )
    }

    // Verify the friend request exists and user is the target
    const { data: friendRequest, error: requestError } = await supabase
      .from('friend_requests')
      .select('id, requester_id, target_id, status')
      .eq('id', requestId)
      .eq('target_id', user.id)
      .eq('status', 'pending')
      .single()

    if (requestError || !friendRequest) {
      return NextResponse.json(
        { error: 'Friend request not found' },
        { status: 404 }
      )
    }

    // Update friend request status
    const newStatus = action === 'accept' ? 'accepted' : 'declined'
    const { error: updateError } = await supabase
      .from('friend_requests')
      .update({ status: newStatus })
      .eq('id', requestId)

    if (updateError) {
      console.error('Error updating friend request:', updateError)
      return NextResponse.json(
        { error: 'Failed to update friend request' },
        { status: 500 }
      )
    }

    // If accepted, create mutual follows
    if (action === 'accept') {
      const { error: followError } = await supabase.from('follows').upsert([
        { follower_id: friendRequest.requester_id, following_id: user.id },
        { follower_id: user.id, following_id: friendRequest.requester_id },
      ])

      if (followError) {
        console.error('Error creating mutual follows:', followError)
        // Don't fail the request if follows creation fails, just log it
      }
    }

    // Mark related notification as read
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('type', 'friend_request')
      .eq('data->friend_request_id', requestId)

    return NextResponse.json({
      success: true,
      message:
        action === 'accept'
          ? 'Friend request accepted'
          : 'Friend request declined',
    })
  } catch (error) {
    console.error('Error in respond to friend request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
