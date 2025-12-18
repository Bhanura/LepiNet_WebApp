'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedImage from '@/components/ProtectedImage';

export default function UserDashboard() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [myRecords, setMyRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/login');
    setUser(user);

    // 1. Get Profile (to check Expert Status)
    const { data: profile } = await supabase
      .from('users')
      .select('role, verification_status')
      .eq('id', user.id)
      .single();
    setProfile(profile);

    // 2. Get My Uploads
    const { data: records } = await supabase
      .from('ai_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setMyRecords(records || []);
    
    setLoading(false);
  };

  if (loading) return <div className="p-10 text-center">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#134a86]">My Dashboard</h1>
            <p className="text-gray-600">Welcome back, contributor!</p>
          </div>

          {/* Expert Application Status Card */}
          {profile?.role === 'user' && (
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-full text-blue-600">🎓</div>
              <div>
                <p className="font-bold text-gray-800">Become an Expert</p>
                {profile.verification_status === 'pending' ? (
                  <span className="text-sm text-yellow-600 font-medium">Application Under Review ⏳</span>
                ) : profile.verification_status === 'rejected' ? (
                  <span className="text-sm text-red-600 font-medium">Application Rejected ❌</span>
                ) : (
                  <Link href="/expert-application" className="text-sm text-[#134a86] hover:underline">
                    Apply Now &rarr;
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* My Records Gallery */}
        <h2 className="text-xl font-bold mb-6 text-gray-800">My Observations ({myRecords.length})</h2>
        
        {myRecords.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500">You haven't uploaded any butterflies via the mobile app yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {myRecords.map((rec) => (
              <div key={rec.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition group">
                <div className="relative h-48">
                   <ProtectedImage src={rec.image_url} alt="My Record" authorName="Me" />
                   
                   {/* Status Badge */}
                   <div className="absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold bg-white/90 shadow-sm">
                      {rec.final_species_name ? '✅ Verified' : '🟠 Reviewing'}
                   </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-800 truncate">
                    {rec.final_species_name || rec.predicted_species_name}
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">
                    {new Date(rec.created_at).toLocaleDateString()}
                  </p>
                  <Link href={`/records/${rec.id}`} className="block text-center text-sm border border-[#134a86] text-[#134a86] py-1 rounded hover:bg-blue-50 transition">
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}