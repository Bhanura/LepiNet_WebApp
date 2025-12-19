'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // Show logged-in dashboard
  if (user) {
    return (
      <main className="min-h-[calc(100vh-64px)] bg-gray-50">
        <div className="max-w-7xl mx-auto p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#134a86] mb-2">Welcome to LepiNet</h1>
            <p className="text-gray-600">Your personal butterfly observation platform</p>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="text-xl font-bold mb-2">Mobile App</h3>
              <p className="text-gray-600 mb-4">Download our mobile app to identify butterflies in the field.</p>
              <button className="text-[#134a86] font-medium hover:underline">Coming Soon</button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-bold mb-2">My Records</h3>
              <p className="text-gray-600 mb-4">View and manage your butterfly observations and submissions.</p>
              <button className="text-[#134a86] font-medium hover:underline">View Records</button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
              <div className="text-4xl mb-4">🦋</div>
              <h3 className="text-xl font-bold mb-2">Species Database</h3>
              <p className="text-gray-600 mb-4">Explore the complete butterfly species database of Sri Lanka.</p>
              <button className="text-[#134a86] font-medium hover:underline">Browse Species</button>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-[#134a86] mb-2">🎓 Become an Expert Reviewer</h3>
            <p className="text-gray-700 mb-4">
              Have expertise in butterfly identification? Apply to become an expert reviewer and help verify observations from citizen scientists.
            </p>
            <Link 
              href="/expert-application" 
              className="inline-block bg-[#134a86] text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-900 transition"
            >
              Apply Now
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Show public landing page for non-logged-in users
  return (
    <main className="flex flex-col min-h-[calc(100vh-64px)]">
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white py-24 px-8 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="mb-8 inline-block">
            <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold">
              🦋 AI-Powered Biodiversity Platform
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
            Preserving Sri Lanka's
            <span className="block bg-gradient-to-r from-yellow-200 to-pink-200 bg-clip-text text-transparent">
              Butterfly Diversity
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 mb-10 leading-relaxed max-w-3xl mx-auto">
            Connect with expert entomologists to verify, track, and conserve butterfly species using advanced AI technology.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link 
              href="/signup" 
              className="group bg-white text-blue-600 px-8 py-4 rounded-full font-bold hover:bg-gray-100 transition-all hover:scale-105 shadow-2xl flex items-center justify-center gap-2"
            >
              <span>Get Started</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
            <Link 
              href="/login" 
              className="group bg-transparent border-2 border-white text-white px-8 py-4 rounded-full font-bold hover:bg-white hover:text-blue-600 transition-all hover:scale-105 flex items-center justify-center gap-2"
            >
              <span>Sign In</span>
              <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-8 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From field observation to verified data in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all hover:-translate-y-2 border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform shadow-lg">
                📸
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-800">Capture & Identify</h3>
              <p className="text-gray-600 leading-relaxed">
                Use our mobile app to instantly identify butterfly species in the field using advanced AI technology.
              </p>
            </div>

            <div className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all hover:-translate-y-2 border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform shadow-lg">
                🔬
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-800">Expert Verification</h3>
              <p className="text-gray-600 leading-relaxed">
                Verified experts review and validate observations to ensure scientific accuracy and reliability.
              </p>
            </div>

            <div className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all hover:-translate-y-2 border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform shadow-lg">
                🌍
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-800">Open Data</h3>
              <p className="text-gray-600 leading-relaxed">
                Contributing to the national biodiversity database for conservation and future research.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Contribute to Science?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join our community of citizen scientists and expert entomologists in preserving Sri Lanka's butterfly biodiversity.
          </p>
          <Link 
            href="/signup"
            className="inline-block bg-white text-blue-600 px-10 py-4 rounded-full text-lg font-bold hover:bg-gray-100 transition-all hover:scale-105 shadow-2xl"
          >
            Join LepiNet Today
          </Link>
        </div>
      </section>

    </main>
  );
}