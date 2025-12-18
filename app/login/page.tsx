'use client';
import { useState } from 'react';
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

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      alert(error.message);
      setLoading(false);
    } else {
      router.push('/'); 
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="flex flex-col items-center text-center">
          {/* Added Logo Here */}
          <Image 
            src="/logo.png" 
            alt="LepiNet Logo" 
            width={80} 
            height={80} 
            className="mb-4"
          />
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
      </div>
    </div>
  );
}