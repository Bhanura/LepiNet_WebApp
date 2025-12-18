'use client';
import Link from 'next/link';
import Image from 'next/image'; // Import Image component
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, usePathname } from 'next/navigation';

export default function NavBar() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string>('user');
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
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (data) setRole(data.role);
      }
    };
    
    getUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        // Fetch role when auth state changes
        supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data) setRole(data.role);
          });
      } else {
        setUser(null);
        setRole('user');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (pathname === '/login') return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole('user');
    router.push('/');
    router.refresh();
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          
          {/* Logo & Home Link */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-3">
              {/* Added Logo Here */}
              <Image 
                src="/logo.png" 
                alt="LepiNet Logo" 
                width={40} 
                height={40} 
                className="w-10 h-10 object-contain"
              />
              <span className="text-2xl font-bold text-[#134a86]">LepiNet</span>
            </Link>
          </div>

          {/* Right Side Links */}
          <div className="flex items-center gap-6">
        
            <Link href="/records" className="text-gray-600 hover:text-[#134a86] font-medium text-sm">
               📚 Records
            </Link>

            {user ? (
              <>
                {/* Dashboard Link (For Everyone) */}
                <Link href="/dashboard" className="text-gray-600 hover:text-[#134a86] font-medium text-sm">
                   My Dashboard
                </Link>

                {role === 'admin' && (
                  <Link href="/admin/dashboard" className="text-gray-600 hover:text-[#134a86] font-medium text-sm">
                    Admin Dashboard
                  </Link>
                )}
                {role === 'user' && (
                  <Link href="/expert-application" className="text-gray-600 hover:text-[#134a86] font-medium text-sm">
                    Become an Expert
                  </Link>
                )}
                {role === 'expert' && (
                  <Link href="/review" className="text-gray-600 hover:text-[#134a86] font-medium text-sm">
                    Review Queue
                  </Link>
                )}

                <div className="h-6 w-px bg-gray-300 mx-2"></div>

                <button 
                  onClick={handleLogout} 
                  className="text-red-600 hover:text-red-800 font-medium text-sm"
                >
                  Sign Out
                </button>
              </>
            ) : pathname !== '/' && (
              <Link 
                href="/login" 
                className="bg-[#134a86] text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-900 transition text-sm"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}