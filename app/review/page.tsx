'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

type Record = {
  id: string;
  species_id: string;
  user_id: string;
  location: string;
  image_url: string;
  confidence_score: number;
  verification_status: 'pending' | 'verified' | 'rejected';
  created_at: string;
  species?: {
    scientific_name: string;
    common_name: string;
  };
};

export default function ReviewQueue() {
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchPendingRecords();
  }, []);

  const fetchPendingRecords = async () => {
    // Verify Expert Access
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      setLoading(false);
      router.push('/login');
      return;
    }

    const { data: currentUser, error: dbError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (dbError || (currentUser?.role !== 'expert' && currentUser?.role !== 'admin')) {
      setLoading(false);
      alert('Unauthorized - Expert access required');
      router.push('/');
      return;
    }

    // Fetch pending records - first try without species relation
    const { data, error } = await supabase
      .from('records')
      .select('*')
      .eq('verification_status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching records:', error);
      alert(`Database error: ${error.message || JSON.stringify(error)}`);
      setRecords([]);
    } else {
      setRecords(data || []);
    }

    setLoading(false);
  };

  const handleVerification = async (recordId: string, status: 'verified' | 'rejected') => {
    const { error } = await supabase
      .from('records')
      .update({ 
        verification_status: status,
        verified_at: new Date().toISOString()
      })
      .eq('id', recordId);

    if (error) {
      alert('Error updating record: ' + error.message);
    } else {
      alert(`Record ${status === 'verified' ? 'Verified' : 'Rejected'} successfully!`);
      fetchPendingRecords(); // Refresh the list
    }
  };

  if (loading) {
    return <div className="p-10 text-center">Loading review queue...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-[#134a86]">Review Queue</h1>

        {records.length === 0 ? (
          <div className="bg-white p-12 rounded-lg shadow text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-700 mb-2">All Caught Up!</h2>
            <p className="text-gray-500">There are no pending records to review at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {records.map((record) => (
              <div key={record.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="relative h-64 bg-gray-200">
                  <img
                    src={record.image_url}
                    alt="Butterfly observation"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="p-6">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-800">
                      Species ID: {record.species_id || 'Unknown'}
                    </h3>
                    <p className="text-sm text-gray-500">Record ID: {record.id.slice(0, 8)}...</p>
                  </div>

                  <div className="space-y-2 mb-4 text-sm">
                    <p className="text-gray-600">
                      <span className="font-medium">Location:</span> {record.location}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium">AI Confidence:</span>{' '}
                      <span className={`font-bold ${
                        record.confidence_score > 0.8 ? 'text-green-600' :
                        record.confidence_score > 0.5 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {(record.confidence_score * 100).toFixed(1)}%
                      </span>
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium">Submitted:</span>{' '}
                      {new Date(record.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleVerification(record.id, 'verified')}
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition"
                    >
                      ✓ Verify
                    </button>
                    <button
                      onClick={() => handleVerification(record.id, 'rejected')}
                      className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition"
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
