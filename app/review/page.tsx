'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedImage from '@/components/ProtectedImage';

// Types
type LogEntry = {
  id: string;
  image_url: string;
  predicted_species_name: string;
  predicted_confidence: number;
  user_action: string;
  created_at: string;
};

export default function ReviewQueue() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, ACCEPTED, REJECTED, PENDING
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchQueue();
  }, [filter]);

  const fetchQueue = async () => {
    setLoading(true);
    
    // 1. Verify Expert Role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/login');

    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userProfile?.role !== 'expert' && userProfile?.role !== 'admin') {
      alert("Access Restricted: Experts Only");
      return router.push('/');
    }

    // 2. Fetch Logs based on filter
    let query = supabase
      .from('ai_logs')
      .select('id, image_url, predicted_species_name, predicted_confidence, user_action, created_at')
      .order('created_at', { ascending: false });

    if (filter !== 'ALL') {
      query = query.eq('user_action', filter);
    }

    const { data, error } = await query;

    if (error) console.error(error);
    else setLogs(data || []);
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-[#134a86]">Expert Review Queue</h1>
          
          {/* Filter Dropdown */}
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#134a86]"
          >
            <option value="ALL">All Records</option>
            <option value="ACCEPTED">User Accepted</option>
            <option value="REJECTED">User Rejected</option>
            <option value="PENDING">Pending Action</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading records...</div>
        ) : logs.length === 0 ? (
          <div className="bg-white p-10 rounded-xl shadow text-center text-gray-500">
            No records found for this filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {logs.map((log) => (
              <div key={log.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
                <div className="relative h-48 w-full bg-gray-100">
                  {/* Using the Protected Image Component we made earlier */}
                  <ProtectedImage 
                    src={log.image_url} 
                    alt={log.predicted_species_name || "Butterfly"} 
                    authorName="LepiNet User" 
                  />
                </div>
                
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-gray-800">
                      {log.predicted_species_name || "Unknown Species"}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                      log.user_action === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                      log.user_action === 'REJECTED' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {log.user_action}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-500 mb-4">
                    AI Confidence: <span className="font-medium text-gray-700">{Math.round(log.predicted_confidence * 100)}%</span>
                  </p>

                  <Link 
                    href={`/review/${log.id}`}
                    className="block w-full text-center bg-[#134a86] text-white py-2 rounded-lg font-medium hover:bg-blue-900 transition"
                  >
                    Inspect & Verify
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