'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, usePathname } from 'next/navigation';

export default function NavBar() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [role, setRole] = useState<string>('user');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();
  const pathname = usePathname();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (data) {
          setRole(data.role);
          setProfile(data);
        }

        // Fetch notifications
        fetchNotifications(user.id);
      }
    };
    
    getUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        // Fetch profile when auth state changes
        supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setRole(data.role);
              setProfile(data);
            }
          });
        // Fetch notifications
        fetchNotifications(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setRole('user');
        setNotifications([]);
        setUnreadCount(0);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchNotifications = async (userId: string) => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((n: any) => !n.is_read).length);
    }
  };

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    // Update local state
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    return past.toLocaleDateString();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'review_comment': return '💬';
      case 'verification_status': return '✅';
      case 'role_change': return '🎖️';
      default: return '🔔';
    }
  };

  if (pathname === '/login') return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setRole('user');
    setShowDropdown(false);
    router.push('/');
    router.refresh();
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          
          {/* Logo & Home Link */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <Image 
                  src="/logo.png" 
                  alt="LepiNet Logo" 
                  width={40} 
                  height={40} 
                  className="w-10 h-10 object-contain transition-transform group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-blue-400 rounded-full opacity-0 group-hover:opacity-20 transition-opacity blur-xl"></div>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                LepiNet
              </span>
            </Link>
          </div>

          {/* Right Side Links */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                {/* Notification Bell */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowNotifications(!showNotifications);
                      setShowDropdown(false);
                    }}
                    className="relative flex items-center justify-center w-10 h-10 hover:bg-gray-100 rounded-full transition-all"
                  >
                    <svg 
                      className="w-6 h-6 text-gray-600" 
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
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full border-2 border-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 animate-fadeIn max-h-[32rem] overflow-hidden flex flex-col">
                      {/* Header */}
                      <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
                        <h3 className="font-bold text-gray-800 text-lg">Notifications</h3>
                        {unreadCount > 0 && (
                          <button 
                            onClick={markAllAsRead}
                            className="text-xs text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                          >
                            Mark all as read
                          </button>
                        )}
                      </div>

                      {/* Notifications List */}
                      <div className="overflow-y-auto flex-1">
                        {notifications.length === 0 ? (
                          <div className="py-12 text-center text-gray-500">
                            <div className="text-5xl mb-3">🔔</div>
                            <p className="font-medium">No notifications yet</p>
                            <p className="text-sm">We'll notify you when something arrives</p>
                          </div>
                        ) : (
                          notifications.map((notification) => (
                            <div
                              key={notification.id}
                              onClick={() => {
                                if (!notification.is_read) markAsRead(notification.id);
                                setShowNotifications(false);
                                // Navigate if related_id exists
                                if (notification.related_id && notification.type === 'review_comment') {
                                  router.push(`/records/${notification.related_id}`);
                                }
                              }}
                              className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                                !notification.is_read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                              }`}
                            >
                              <div className="flex gap-3">
                                {/* Icon */}
                                <div className={`text-2xl ${!notification.is_read ? 'scale-110' : ''}`}>
                                  {getNotificationIcon(notification.type)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm mb-1 ${!notification.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'}`}>
                                    {notification.title}
                                  </p>
                                  <p className="text-sm text-gray-600 line-clamp-2">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                                    <span>⏱️</span>
                                    <span>{getTimeAgo(notification.created_at)}</span>
                                  </p>
                                </div>

                                {/* Unread Indicator */}
                                {!notification.is_read && (
                                  <div className="flex items-start pt-1">
                                    <div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Footer */}
                      {notifications.length > 0 && (
                        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                          <Link
                            href="/notifications"
                            onClick={() => setShowNotifications(false)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center justify-center gap-1 hover:underline"
                          >
                            <span>See all notifications</span>
                            <span>→</span>
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Admin Link */}
                {role === 'admin' && (
                  <Link 
                    href="/admin/dashboard" 
                    className="flex items-center gap-2 px-4 py-2 text-purple-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg font-medium transition-all"
                  >
                    <span className="text-xl">👑</span>
                    <span className="hidden sm:inline">Admin</span>
                  </Link>
                )}

                {/* User Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowDropdown(!showDropdown);
                      setShowNotifications(false);
                    }}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-all group"
                  >
                    {/* Avatar */}
                    {profile?.profile_photo_url ? (
                      <img 
                        src={profile.profile_photo_url} 
                        alt="Profile" 
                        className="w-9 h-9 rounded-full border-2 border-blue-500 object-cover group-hover:border-blue-600 transition-all"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold border-2 border-blue-500 group-hover:border-blue-600 transition-all shadow-md">
                        {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                      </div>
                    )}
                    
                    {/* Name & Role */}
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-semibold text-gray-800">
                        {profile?.first_name} {profile?.last_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {role === 'admin' ? '👑 Admin' : profile?.verification_status === 'verified' ? '🎓 Expert' : '👤 User'}
                      </p>
                    </div>

                    {/* Dropdown Arrow */}
                    <svg 
                      className={`w-4 h-4 text-gray-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50 animate-fadeIn">
                      {/* User Info Header */}
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-800">
                          {profile?.first_name} {profile?.last_name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
                      </div>

                      {/* Menu Items */}
                      <Link
                        href="/profile"
                        onClick={() => setShowDropdown(false)}
                        className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      >
                        <span className="text-xl">👤</span>
                        <span className="font-medium">View Profile</span>
                      </Link>

                      <Link
                        href="/dashboard"
                        onClick={() => setShowDropdown(false)}
                        className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      >
                        <span className="text-xl">📊</span>
                        <span className="font-medium">My Dashboard</span>
                      </Link>

                      {role === 'user' && profile?.verification_status !== 'verified' && profile?.verification_status !== 'pending' && (
                        <Link
                          href="/expert-application"
                          onClick={() => setShowDropdown(false)}
                          className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                          <span className="text-xl">🎓</span>
                          <span className="font-medium">Become Expert</span>
                        </Link>
                      )}

                      <Link
                        href="/records"
                        onClick={() => setShowDropdown(false)}
                        className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      >
                        <span className="text-xl">📚</span>
                        <span className="font-medium">Records</span>
                      </Link>

                      {profile?.verification_status === 'verified' && (
                        <Link
                          href="/review/page"
                          onClick={() => setShowDropdown(false)}
                          className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                          <span className="text-xl">🔍</span>
                          <span className="font-medium">Review Records</span>
                        </Link>
                      )}

                      <div className="border-t border-gray-100 mt-2"></div>

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors font-medium"
                      >
                        <span className="text-xl">🚪</span>
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : pathname !== '/' && (
              <Link 
                href="/login" 
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all"
              >
                <span>Login</span>
                <span className="text-lg">→</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(showDropdown || showNotifications) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setShowDropdown(false);
            setShowNotifications(false);
          }}
        ></div>
      )}
    </nav>
  );
}