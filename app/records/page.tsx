'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';

type RecordWithStats = {
  id: string;
  image_url: string;
  predicted_species_name: string;
  final_species_name: string;
  predicted_confidence: number;
  user_action: string;
  user_id: string;
  created_at: string;
  review_count: number;
  species_details?: {
    common_name_english: string;
    species_name_binomial: string;
    family: string;
  } | null;
};

export default function RecordsGallery() {
  const [records, setRecords] = useState<RecordWithStats[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<RecordWithStats[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [userAction, setUserAction] = useState('ALL');
  const [confidenceLevel, setConfidenceLevel] = useState('ALL');
  const [reviewStatus, setReviewStatus] = useState('ALL');
  const [sortOrder, setSortOrder] = useState<'DESC' | 'ASC'>('DESC');
  const [viewMode, setViewMode] = useState<'all' | 'mine'>('all');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchRecords();
  }, [sortOrder]);

  useEffect(() => {
    filterRecords();
  }, [searchTerm, userAction, confidenceLevel, reviewStatus, sortOrder, viewMode, records]);

  const fetchRecords = async () => {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    // Fetch all records with review counts
    const { data: allRecords } = await supabase
      .from('ai_logs')
      .select('*')
      .order('created_at', { ascending: sortOrder === 'ASC' });

    if (allRecords) {
      // Fetch review counts and species details for each record
      const recordsWithStats = await Promise.all(
        allRecords.map(async (record) => {
          // Get review count
          const { count } = await supabase
            .from('expert_reviews')
            .select('*', { count: 'exact', head: true })
            .eq('ai_log_id', record.id);

          // Get species details if predicted_id exists
          let speciesDetails = null;
          if (record.predicted_id) {
            const { data: species } = await supabase
              .from('species')
              .select('common_name_english, species_name_binomial, family')
              .eq('butterfly_id', record.predicted_id)
              .single();
            speciesDetails = species;
          }

          return {
            ...record,
            review_count: count || 0,
            species_details: speciesDetails,
          };
        })
      );

      setRecords(recordsWithStats);
      setFilteredRecords(recordsWithStats);
    }

    setLoading(false);
  };

  const filterRecords = () => {
    let filtered = [...records];

    // Sort order
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'DESC' ? dateB - dateA : dateA - dateB;
    });

    // View mode filter (all vs my records)
    if (viewMode === 'mine' && currentUser) {
      filtered = filtered.filter(r => r.user_id === currentUser.id);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.predicted_species_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.final_species_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // User Action filter
    if (userAction !== 'ALL') {
      filtered = filtered.filter(r => r.user_action === userAction);
    }

    // AI Confidence filter
    if (confidenceLevel === 'HIGH') {
      filtered = filtered.filter(r => r.predicted_confidence >= 0.9);
    } else if (confidenceLevel === 'MEDIUM') {
      filtered = filtered.filter(r => r.predicted_confidence >= 0.75 && r.predicted_confidence < 0.9);
    } else if (confidenceLevel === 'LOW') {
      filtered = filtered.filter(r => r.predicted_confidence >= 0.5 && r.predicted_confidence < 0.75);
    } else if (confidenceLevel === 'VERY_LOW') {
      filtered = filtered.filter(r => r.predicted_confidence < 0.5);
    }

    // Review Status filter
    if (reviewStatus === 'PENDING_REVIEW') {
      filtered = filtered.filter(r => r.review_count === 0);
    } else if (reviewStatus === 'REVIEWED') {
      filtered = filtered.filter(r => r.review_count > 0);
    }

    setFilteredRecords(filtered);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setUserAction('ALL');
    setConfidenceLevel('ALL');
    setReviewStatus('ALL');
    setSortOrder('DESC');
  };

  if (loading) return <div className="p-10 text-center">Loading Records...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#134a86]">Butterfly Records</h1>
            <p className="text-gray-600">
              Click on any record to view details and expert reviews • {filteredRecords.length} {filteredRecords.length === 1 ? 'record' : 'records'} found
            </p>
          </div>

          {/* View Mode Toggle */}
          {currentUser && (
            <div className="flex gap-2 bg-white rounded-lg p-1 border border-gray-200">
              <button
                onClick={() => setViewMode('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  viewMode === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                All Records
              </button>
              <button
                onClick={() => setViewMode('mine')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  viewMode === 'mine' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                My Records
              </button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* 1. Search */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🔍 Search Species
              </label>
              <input 
                type="text" 
                placeholder="Search species..." 
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* 2. Time Order */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ⏰ Time Order
              </label>
              <select 
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'ASC' | 'DESC')}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="DESC">⬇️ Newest First</option>
                <option value="ASC">⬆️ Oldest First</option>
              </select>
            </div>

            {/* 3. User Action */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                👤 User Action
              </label>
              <select 
                value={userAction}
                onChange={(e) => setUserAction(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="ALL">All Actions</option>
                <option value="ACCEPTED">✅ Accepted</option>
                <option value="REJECTED">❌ Rejected</option>
                <option value="PENDING">⏳ Pending</option>
              </select>
            </div>

            {/* 4. AI Confidence */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🎯 AI Confidence
              </label>
              <select 
                value={confidenceLevel}
                onChange={(e) => setConfidenceLevel(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="ALL">All Levels</option>
                <option value="HIGH">🟢 High (&gt;90%)</option>
                <option value="MEDIUM">🟡 Medium (75-90%)</option>
                <option value="LOW">🟠 Low (50-75%)</option>
                <option value="VERY_LOW">🔴 Very Low (&lt;50%)</option>
              </select>
            </div>

            {/* 5. Review Status */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📋 Review Status
              </label>
              <select 
                value={reviewStatus}
                onChange={(e) => setReviewStatus(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="ALL">All Records</option>
                <option value="PENDING_REVIEW">⏳ Pending Review</option>
                <option value="REVIEWED">✅ Reviewed</option>
              </select>
            </div>
          </div>

          {/* Reset Button & Count */}
          <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Showing <span className="font-bold text-[#134a86]">{filteredRecords.length}</span> of <span className="font-bold">{records.length}</span> records
            </p>
            <button 
              onClick={resetFilters}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2 px-4 py-2 hover:bg-blue-50 rounded-lg transition"
            >
              <span>🔄</span>
              <span>Reset All Filters</span>
            </button>
          </div>
        </div>

        {/* Records Grid */}
        {filteredRecords.length === 0 ? (
          <div className="bg-white p-20 rounded-xl shadow-sm text-center">
            <p className="text-gray-500">No records found matching your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredRecords.map((record) => (
              <Link 
                key={record.id} 
                href={`/records/${record.id}`} 
                className="block group"
              >
                <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition border border-gray-200">
                  {/* Image */}
                  <div 
                    className="h-56 relative bg-gray-200"
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    <img 
                      src={record.image_url} 
                      alt="Butterfly" 
                      className="w-full h-full object-cover"
                      onContextMenu={(e) => e.preventDefault()}
                      draggable={false}
                    />
                    
                    {/* Status Badge */}
                    {record.final_species_name ? (
                      <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full shadow font-medium">
                        ✓ Verified
                      </div>
                    ) : (
                      <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full shadow font-medium">
                        🟠 Pending
                      </div>
                    )}

                    {/* Review Count Badge */}
                    {record.review_count > 0 && (
                      <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full shadow font-medium">
                        {record.review_count} {record.review_count === 1 ? 'Review' : 'Reviews'}
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-4">
                    <h3 className="font-bold text-lg text-gray-800 group-hover:text-[#134a86] transition truncate">
                      {record.species_details?.common_name_english || record.final_species_name || record.predicted_species_name || 'Unknown Species'}
                    </h3>
                    {record.species_details && (
                      <p className="text-sm italic text-gray-600 mt-1 truncate">
                        {record.species_details.species_name_binomial}
                      </p>
                    )}
                    
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-xs text-gray-500">
                        {new Date(record.created_at).toLocaleDateString()}
                      </span>
                      {!record.final_species_name && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {Math.round(record.predicted_confidence * 100)}% AI
                        </span>
                      )}
                    </div>

                    {/* Summary Info */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <span>💬</span>
                          {record.review_count} {record.review_count === 1 ? 'Review' : 'Reviews'}
                        </span>
                        {record.final_species_name && (
                          <span className="text-green-600 font-medium">
                            ✓ Expert Verified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination Info */}
        {filteredRecords.length > 0 && (
          <div className="mt-8 text-center text-gray-500 text-sm">
            Showing {filteredRecords.length} of {records.length} total records
          </div>
        )}
      </div>
    </div>
  );
}
