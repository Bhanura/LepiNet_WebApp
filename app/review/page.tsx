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
  predicted_id: string;
  predicted_confidence: number;
  user_action: string;
  final_species_name: string | null;
  created_at: string;
};

export default function ReviewQueue() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [userAction, setUserAction] = useState('ALL'); // ALL, ACCEPTED, REJECTED, PENDING
  const [confidenceLevel, setConfidenceLevel] = useState('ALL'); // ALL, HIGH, MEDIUM, LOW, VERY_LOW
  const [reviewStatus, setReviewStatus] = useState('ALL'); // ALL, PENDING_REVIEW, REVIEWED
  const [sortOrder, setSortOrder] = useState<'DESC' | 'ASC'>('DESC'); // Newest first by default
  
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchQueue();
  }, [userAction, confidenceLevel, reviewStatus, sortOrder]);

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

    // 2. Build query with all filters
    let query = supabase
      .from('ai_logs')
      .select(`
        id, 
        image_url, 
        predicted_id, 
        predicted_confidence, 
        user_action, 
        final_species_name, 
        created_at,
        expert_reviews(id)
      `)
      .order('created_at', { ascending: sortOrder === 'ASC' });

    // Filter: User Action
    if (userAction !== 'ALL') {
      query = query.eq('user_action', userAction);
    }

    // Filter: AI Confidence Level
    if (confidenceLevel === 'HIGH') {
      query = query.gte('predicted_confidence', 0.9);
    } else if (confidenceLevel === 'MEDIUM') {
      query = query.gte('predicted_confidence', 0.75).lt('predicted_confidence', 0.9);
    } else if (confidenceLevel === 'LOW') {
      query = query.gte('predicted_confidence', 0.5).lt('predicted_confidence', 0.75);
    } else if (confidenceLevel === 'VERY_LOW') {
      query = query.lt('predicted_confidence', 0.5);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching queue:', error.message || error);
      setLogs([]);
      setLoading(false);
      return;
    }

    // Filter: Review Status (client-side filtering after fetch)
    let filteredData = data || [];
    if (reviewStatus === 'PENDING_REVIEW') {
      filteredData = filteredData.filter((log: any) => !log.expert_reviews || log.expert_reviews.length === 0);
    } else if (reviewStatus === 'REVIEWED') {
      filteredData = filteredData.filter((log: any) => log.expert_reviews && log.expert_reviews.length > 0);
    }

    setLogs(filteredData);
    setLoading(false);
  };

  const resetFilters = () => {
    setUserAction('ALL');
    setConfidenceLevel('ALL');
    setReviewStatus('ALL');
    setSortOrder('DESC');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#134a86]">Expert Review Queue</h1>
          <p className="text-gray-600 mt-2">Filter and review AI predictions</p>
        </div>

        {/* Filter Panel */}
        <div className="bg-white p-6 rounded-xl shadow-md mb-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. Time Order */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ⏰ Time Order
              </label>
              <select 
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'ASC' | 'DESC')}
                className="w-full bg-white border border-gray-300 text-gray-700 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#134a86] focus:border-[#134a86]"
              >
                <option value="DESC">⬇️ Newest First</option>
                <option value="ASC">⬆️ Oldest First</option>
              </select>
            </div>

            {/* 2. User Action */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                👤 User Action
              </label>
              <select 
                value={userAction}
                onChange={(e) => setUserAction(e.target.value)}
                className="w-full bg-white border border-gray-300 text-gray-700 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#134a86] focus:border-[#134a86]"
              >
                <option value="ALL">All Actions</option>
                <option value="ACCEPTED">✅ Accepted</option>
                <option value="REJECTED">❌ Rejected</option>
                <option value="PENDING">⏳ Pending</option>
              </select>
            </div>

            {/* 3. AI Confidence Level */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🎯 AI Confidence
              </label>
              <select 
                value={confidenceLevel}
                onChange={(e) => setConfidenceLevel(e.target.value)}
                className="w-full bg-white border border-gray-300 text-gray-700 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#134a86] focus:border-[#134a86]"
              >
                <option value="ALL">All Levels</option>
                <option value="HIGH">🟢 High (&gt;90%)</option>
                <option value="MEDIUM">🟡 Medium (75-90%)</option>
                <option value="LOW">🟠 Low (50-75%)</option>
                <option value="VERY_LOW">🔴 Very Low (&lt;50%)</option>
              </select>
            </div>

            {/* 4. Review Status */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📋 Review Status
              </label>
              <select 
                value={reviewStatus}
                onChange={(e) => setReviewStatus(e.target.value)}
                className="w-full bg-white border border-gray-300 text-gray-700 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#134a86] focus:border-[#134a86]"
              >
                <option value="ALL">All Records</option>
                <option value="PENDING_REVIEW">⏳ Pending Review</option>
                <option value="REVIEWED">✅ Reviewed</option>
              </select>
            </div>
          </div>

          {/* Reset Button */}
          <div className="mt-4 flex justify-end">
            <button 
              onClick={resetFilters}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2 px-4 py-2 hover:bg-blue-50 rounded-lg transition"
            >
              <span>🔄</span>
              <span>Reset All Filters</span>
            </button>
          </div>

          {/* Results Count */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing <span className="font-bold text-[#134a86]">{logs.length}</span> records
            </p>
          </div>
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
                    alt={log.final_species_name || log.predicted_id || "Butterfly"} 
                    authorName="LepiNet User" 
                  />
                </div>
                
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-gray-800">
                      {log.final_species_name || log.predicted_id || "Unknown Species"}
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