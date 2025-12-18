'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image'; // Import Image
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }
    
    if (data.user) {
      // Fetch user role and verification status from database
      const { data: userData } = await supabase
        .from('users')
        .select('role, verification_status')
        .eq('id', data.user.id)
        .single();

      // Small delay to ensure auth state is updated
      await new Promise(resolve => setTimeout(resolve, 500));

      // Redirect based on role - Super admins go to separate dashboard
      if (userData?.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        // Users and experts go to the same dashboard
        router.push('/dashboard');
      }
      
      // Don't reset loading state - let the redirect happen
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="flex flex-col items-center text-center">
          {/* Added Logo Here */}
          <Link href="/">
            <Image 
              src="/logo.png" 
              alt="LepiNet Logo" 
              width={80} 
              height={80} 
              className="mb-4 cursor-pointer hover:opacity-80 transition"
            />
          </Link>
          <h1 className="text-3xl font-bold text-[#134a86]">LepiNet</h1>
          <p className="text-gray-500 mt-2">Sign in to your account</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input 
              type="email" 
              required
              className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-[#134a86] outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input 
              type="password" 
              required
              className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-[#134a86] outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button 
            disabled={loading}
            className="w-full py-3 bg-[#134a86] text-white rounded-lg font-bold hover:bg-blue-900 transition shadow-md"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <div className="text-center space-y-3">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link href="/signup" className="text-[#134a86] font-medium hover:underline">
              Sign Up
            </Link>
          </p>
          <Link href="/" className="block text-sm text-gray-600 hover:text-[#134a86] transition">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}