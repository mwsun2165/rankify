'use client'

import { useEffect, useState, useRef } from 'react'
import { createClientSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'react-hot-toast'

interface Notification {
  id: string
  type: 'friend_request' | 'ranking_like'
  data: any
  is_read: boolean
  created_at: string
}

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClientSupabaseClient()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Load notifications and set up real-time subscription
  useEffect(() => {
    const loadNotifications = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/notifications?limit=10')
        if (response.ok) {
          const data = await response.json()
          setNotifications(data.notifications || [])
          setUnreadCount(
            data.notifications?.filter((n: Notification) => !n.is_read)
              .length || 0
          )
        }
      } catch (error) {
        console.error('Error loading notifications:', error)
      } finally {
        setLoading(false)
      }
    }

    loadNotifications()
  }, [supabase])

  // Real-time subscription for notifications
  useEffect(() => {
    let channel: any = null

    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotification = payload.new as Notification
            setNotifications((prev) => [newNotification, ...prev.slice(0, 9)])
            setUnreadCount((prev) => prev + 1)

            // Show toast for new notifications
            if (newNotification.type === 'friend_request') {
              toast.success(
                `New friend request from ${newNotification.data.requester_name}`
              )
            } else if (newNotification.type === 'ranking_like') {
              toast.success(
                `${newNotification.data.liker_name} liked your ranking`
              )
            }
          }
        )
        .subscribe()
    }

    init()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [supabase])

  const handleFriendRequest = async (
    notificationId: string,
    requestId: string,
    action: 'accept' | 'decline'
  ) => {
    try {
      const response = await fetch('/api/friends/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requestId, action }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(data.message)

        // Mark notification as read and remove from list
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
        setUnreadCount((prev) => Math.max(0, prev - 1))
      } else {
        toast.error(data.error || 'Failed to respond to friend request')
      }
    } catch (error) {
      toast.error('Failed to respond to friend request')
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationIds: [notificationId] }),
      })

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, is_read: true } : n
          )
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ markAllRead: true }),
      })

      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
        setUnreadCount(0)
        toast.success('All notifications marked as read')
      }
    } catch (error) {
      toast.error('Failed to mark notifications as read')
    }
  }

  const renderNotification = (notification: Notification) => {
    const timeAgo = new Date(notification.created_at).toLocaleDateString()

    if (notification.type === 'friend_request') {
      return (
        <div
          key={notification.id}
          className={`p-4 border-b border-gray-100 ${!notification.is_read ? 'bg-blue-50' : ''}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                Friend Request
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {notification.data.requester_name} wants to be your friend
              </p>
              <p className="text-xs text-gray-500 mt-1">{timeAgo}</p>
            </div>
            {!notification.is_read && (
              <div className="flex space-x-2 ml-4">
                <button
                  onClick={() =>
                    handleFriendRequest(
                      notification.id,
                      notification.data.friend_request_id,
                      'accept'
                    )
                  }
                  className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Accept
                </button>
                <button
                  onClick={() =>
                    handleFriendRequest(
                      notification.id,
                      notification.data.friend_request_id,
                      'decline'
                    )
                  }
                  className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Decline
                </button>
              </div>
            )}
          </div>
        </div>
      )
    }

    if (notification.type === 'ranking_like') {
      return (
        <div
          key={notification.id}
          className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${!notification.is_read ? 'bg-blue-50' : ''}`}
          onClick={() => !notification.is_read && markAsRead(notification.id)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">New Like</p>
              <p className="text-sm text-gray-600 mt-1">
                {notification.data.liker_name} liked &quot;
                {notification.data.ranking_title}&quot;
              </p>
              <p className="text-xs text-gray-500 mt-1">{timeAgo}</p>
            </div>
            {!notification.is_read && (
              <div className="w-2 h-2 bg-blue-600 rounded-full ml-4 mt-2"></div>
            )}
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 rounded-full"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Header */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications yet
              </div>
            ) : (
              notifications.map(renderNotification)
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-100 text-center">
              <button className="text-sm text-blue-600 hover:text-blue-700">
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
