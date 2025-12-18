'use client';
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ExpertApplication() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Please log in first");

    const updates = {
      profession: formData.get('profession'),
      experience_years: formData.get('experience'),
      bio: formData.get('bio'),
      linkedin_url: formData.get('linkedin'),
      verification_status: 'pending'
    };

    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id);

    setLoading(false);
    
    if (error) {
      alert("Error submitting application");
    } else {
      alert("Application submitted! An admin will review your profile.");
      router.push('/'); // Redirect to Home Page
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-[#134a86]">Expert Verification</h1>
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">Cancel</Link>
          </div>
          
          <p className="text-gray-600 mb-6 text-sm">
            Join our scientific committee to review butterfly data. Your profile will be reviewed by an administrator.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Profession / Academic Title</label>
              <input name="profession" required className="w-full border border-gray-300 p-2 rounded focus:ring-[#134a86] focus:border-[#134a86]" placeholder="e.g. Entomologist" />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Years of Experience</label>
              <input name="experience" required className="w-full border border-gray-300 p-2 rounded focus:ring-[#134a86] focus:border-[#134a86]" placeholder="e.g. 5 years" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">LinkedIn / ResearchGate URL</label>
              <input name="linkedin" className="w-full border border-gray-300 p-2 rounded focus:ring-[#134a86] focus:border-[#134a86]" placeholder="https://..." />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Bio & Expertise</label>
              <textarea name="bio" required className="w-full border border-gray-300 p-2 rounded h-24 focus:ring-[#134a86] focus:border-[#134a86]" placeholder="Describe your background..." />
            </div>

            <button disabled={loading} className="w-full bg-[#134a86] text-white py-3 rounded-lg font-bold hover:bg-blue-900 transition mt-4">
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}