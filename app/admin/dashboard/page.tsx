'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

type Applicant = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  profession: string;
  experience_years: string;
  bio: string;
  linkedin_url: string;
  verification_status: string;
};

export default function AdminDashboard() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchApplicants();
  }, []);

  const fetchApplicants = async () => {
    // 1. Check if I am an Admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/');

    // 2. Fetch Pending Applications
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('verification_status', 'pending');

    if (error) {
      console.error(error);
      alert("Error fetching data. Are you an admin?");
    } else {
      setApplicants(data || []);
    }
    setLoading(false);
  };

  const handleDecision = async (userId: string, approved: boolean) => {
    const status = approved ? 'verified' : 'rejected';
    const role = approved ? 'expert' : 'user';

    const { error } = await supabase
      .from('users')
      .update({ verification_status: status, role: role })
      .eq('id', userId);

    if (error) {
      alert("Failed to update status");
    } else {
      // Remove from list locally
      setApplicants(prev => prev.filter(app => app.id !== userId));
      alert(`User ${approved ? 'Approved' : 'Rejected'} successfully!`);
    }
  };

  if (loading) return <div className="p-10">Loading Dashboard...</div>;

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8 text-[#134a86]">Admin Dashboard</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Pending Expert Applications ({applicants.length})</h2>
        </div>

        {applicants.length === 0 ? (
          <div className="p-10 text-center text-gray-500">No pending applications right now.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {applicants.map((app) => (
              <div key={app.id} className="p-6 flex flex-col md:flex-row gap-6">
                {/* Applicant Details */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-bold">{app.first_name} {app.last_name}</h3>
                    <span className="text-sm bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">{app.profession}</span>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4">{app.email}</p>
                  
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <p className="text-sm text-gray-700 font-medium mb-1">Expertise / Bio:</p>
                    <p className="text-sm text-gray-600">{app.bio}</p>
                  </div>

                  <div className="flex gap-4 text-sm">
                    <p><span className="font-semibold">Experience:</span> {app.experience_years}</p>
                    {app.linkedin_url && (
                        <a href={app.linkedin_url} target="_blank" className="text-blue-600 hover:underline">
                          View LinkedIn / ResearchGate
                        </a>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex md:flex-col justify-center gap-3 min-w-[140px]">
                  <button 
                    onClick={() => handleDecision(app.id, true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition"
                  >
                    Approve
                  </button>
                  <button 
                    onClick={() => handleDecision(app.id, false)}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}