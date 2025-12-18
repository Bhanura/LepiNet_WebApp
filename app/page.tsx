'use client';
import Link from 'next/link';

export default function Home() {
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
              href="/login" 
              className="bg-white text-[#134a86] px-8 py-3 rounded-full font-bold hover:bg-gray-100 transition"
            >
              Get Started
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