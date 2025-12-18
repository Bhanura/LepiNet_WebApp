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
      <section className="bg-[#134a86] text-white py-20 px-8 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold mb-6">Preserving Sri Lanka's Butterfly Diversity</h1>
          <p className="text-xl text-blue-100 mb-8 leading-relaxed">
            LepiNet connects citizen scientists with expert entomologists to verify, track, and conserve butterfly species using advanced AI.
          </p>
          <div className="flex justify-center gap-4">
            <Link 
              href="/signup" 
              className="bg-white text-[#134a86] px-8 py-3 rounded-full font-bold hover:bg-gray-100 transition"
            >
              Sign Up
            </Link>
            <Link 
              href="/login" 
              className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-full font-bold hover:bg-white hover:text-[#134a86] transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Stats / Info Section */}
      <section className="py-16 px-8 bg-white flex-1">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8 text-center">
          <div className="p-6">
            <div className="text-4xl mb-4">📸</div>
            <h3 className="text-xl font-bold mb-2">Capture & Identify</h3>
            <p className="text-gray-600">Use our mobile app to instantly identify species in the field.</p>
          </div>
          <div className="p-6">
            <div className="text-4xl mb-4">🔬</div>
            <h3 className="text-xl font-bold mb-2">Expert Verification</h3>
            <p className="text-gray-600">Verified experts review data to ensure scientific accuracy.</p>
          </div>
          <div className="p-6">
            <div className="text-4xl mb-4">🌍</div>
            <h3 className="text-xl font-bold mb-2">Open Data</h3>
            <p className="text-gray-600">Contributing to the national biodiversity database for future research.</p>
          </div>
        </div>
      </section>

    </main>
  );
}