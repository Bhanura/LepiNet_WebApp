'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    // Check if user is logged in
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-12">
          <h1 className="text-4xl font-bold text-[#134a86]">LepiNet Web</h1>
          {user ? (
             <div className="flex items-center gap-4">
                <span className="text-gray-600 text-sm">Logged in as {user.email}</span>
                <button onClick={handleLogout} className="text-red-600 hover:text-red-800 font-medium">Sign Out</button>
             </div>
          ) : (
            <Link href="/login" className="bg-[#134a86] text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-900 transition">
              Login
            </Link>
          )}
        </header>

        {/* Dashboard Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          
          {/* Card 1: Expert Application */}
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition">
            <h2 className="text-2xl font-bold mb-3">🦋 Apply to be an Expert</h2>
            <p className="text-gray-600 mb-6">
              Are you a researcher or enthusiast? Apply to become a verified reviewer for our data.
            </p>
            <Link href="/expert-application" className="text-[#134a86] font-bold hover:underline">
              Go to Application &rarr;
            </Link>
          </div>

          {/* Card 2: Admin Dashboard */}
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition">
            <h2 className="text-2xl font-bold mb-3">🛡️ Admin Dashboard</h2>
            <p className="text-gray-600 mb-6">
              Manage users, approve expert applications, and oversee system data.
            </p>
            <Link href="/admin/dashboard" className="text-[#134a86] font-bold hover:underline">
              Open Dashboard &rarr;
            </Link>
          </div>

        </div>
      </div>
    </main>
  );
}