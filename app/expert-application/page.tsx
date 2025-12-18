'use client';
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr'; // Or your supabase util
import { useRouter } from 'next/navigation';

export default function ExpertApplication() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  // Initialize Supabase (Use your env vars here)
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
      verification_status: 'pending' // <--- This flags them for Admin Review
    };

    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id);

    setLoading(false);
    
    if (error) alert("Error submitting application");
    else {
      alert("Application submitted! An admin will review your profile.");
      router.push('/dashboard');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow-md">
      <h1 className="text-2xl font-bold mb-4 text-[#134a86]">Expert Verification</h1>
      <p className="text-gray-600 mb-6">Join our scientific committee to review butterfly data.</p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Profession / Academic Title</label>
          <input name="profession" required className="w-full border p-2 rounded" placeholder="e.g. Entomologist, Zoology Student" />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Years of Experience</label>
          <input name="experience" required className="w-full border p-2 rounded" placeholder="e.g. 5 years" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">LinkedIn or ResearchGate URL</label>
          <input name="linkedin" className="w-full border p-2 rounded" placeholder="https://..." />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Why should we verify you?</label>
          <textarea name="bio" required className="w-full border p-2 rounded h-24" placeholder="Briefly describe your expertise..." />
        </div>

        <button disabled={loading} className="w-full bg-[#134a86] text-white py-3 rounded-lg font-bold">
          {loading ? 'Submitting...' : 'Submit Application'}
        </button>
      </form>
    </div>
  );
}