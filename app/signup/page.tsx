'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    if (formData.password.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    // 1. Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });

    if (authError) {
      alert(authError.message);
      setLoading(false);
      return;
    }

    if (authData.user) {
      // 2. Create user profile in users table
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: formData.email,
          first_name: formData.firstName,
          last_name: formData.lastName,
          role: 'user',
          verification_status: 'none',
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        alert('Account created but profile setup failed. Please contact support.');
      } else {
        alert('Account created successfully! Please check your email to verify your account.');
        router.push('/login');
      }
    }

    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="flex flex-col items-center text-center">
          <Link href="/">
            <Image 
              src="/logo.png" 
              alt="LepiNet Logo" 
              width={80} 
              height={80} 
              className="mb-4 cursor-pointer hover:opacity-80 transition"
            />
          </Link>
          <h1 className="text-3xl font-bold text-[#134a86]">Create Account</h1>
          <p className="text-gray-500 mt-2">Join the LepiNet community</p>
        </div>
        
        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">First Name</label>
              <input 
                type="text" 
                name="firstName"
                required
                className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-[#134a86] outline-none"
                value={formData.firstName}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Last Name</label>
              <input 
                type="text" 
                name="lastName"
                required
                className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-[#134a86] outline-none"
                value={formData.lastName}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input 
              type="email" 
              name="email"
              required
              className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-[#134a86] outline-none"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input 
              type="password" 
              name="password"
              required
              minLength={6}
              className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-[#134a86] outline-none"
              value={formData.password}
              onChange={handleChange}
            />
            <p className="text-xs text-gray-500 mt-1">At least 6 characters</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
            <input 
              type="password" 
              name="confirmPassword"
              required
              className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-[#134a86] outline-none"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
          </div>
          
          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#134a86] text-white rounded-lg font-bold hover:bg-blue-900 transition shadow-md disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>
        
        <div className="text-center space-y-3">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-[#134a86] font-medium hover:underline">
              Sign In
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
