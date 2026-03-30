'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';

type RecordWithStats = {
  id: string;
  image_url: string;
  predicted_common_name: string | null;
  predicted_scientific_name: string | null;
  final_common_name: string | null;
  predicted_confidence: number;
  user_action: string;
  user_id: string;
  created_at: string;
  review_count: number;
};

export default function RecordsGallery() {
  const PAGE_SIZE = 25;
  const [records, setRecords] = useState<RecordWithStats[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
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
  }, [currentPage, searchTerm, userAction, confidenceLevel, reviewStatus, sortOrder, viewMode]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, userAction, confidenceLevel, reviewStatus, sortOrder, viewMode]);

  const applyFiltersToQuery = (query: any, userId: string | null) => {
    let filteredQuery = query;

    filteredQuery = filteredQuery.neq('uploader_role', 'admin');

    if (viewMode === 'mine') {
      if (userId) {
        filteredQuery = filteredQuery.eq('user_id', userId);
      } else {
        filteredQuery = filteredQuery.eq('user_id', '__no_user__');
      }
    }

    if (searchTerm.trim()) {
      const q = searchTerm.trim().replace(/,/g, ' ');
      filteredQuery = filteredQuery.or(
        `predicted_common_name.ilike.%${q}%,final_common_name.ilike.%${q}%,predicted_scientific_name.ilike.%${q}%`
      );
    }

    if (userAction !== 'ALL') {
      filteredQuery = filteredQuery.eq('user_action', userAction);
    }

    if (confidenceLevel === 'HIGH') {
      filteredQuery = filteredQuery.gte('predicted_confidence', 0.9);
    } else if (confidenceLevel === 'MEDIUM') {
      filteredQuery = filteredQuery.gte('predicted_confidence', 0.75).lt('predicted_confidence', 0.9);
    } else if (confidenceLevel === 'LOW') {
      filteredQuery = filteredQuery.gte('predicted_confidence', 0.5).lt('predicted_confidence', 0.75);
    } else if (confidenceLevel === 'VERY_LOW') {
      filteredQuery = filteredQuery.lt('predicted_confidence', 0.5);
    }

    if (reviewStatus === 'PENDING_REVIEW') {
      filteredQuery = filteredQuery.eq('review_count', 0);
    } else if (reviewStatus === 'REVIEWED') {
      filteredQuery = filteredQuery.gt('review_count', 0);
    }

    return filteredQuery;
  };

  const fetchRecords = async () => {
    setLoading(true);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    const from = (currentPage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const pageQuery = applyFiltersToQuery(
      supabase
        .from('ai_logs_with_stats')
        .select('id, image_url, predicted_common_name, predicted_scientific_name, final_common_name, predicted_confidence, user_action, user_id, created_at, review_count')
        .order('created_at', { ascending: sortOrder === 'ASC' })
        .range(from, to),
      user?.id || null
    );

    const filteredCountQuery = applyFiltersToQuery(
      supabase
        .from('ai_logs_with_stats')
        .select('id', { count: 'exact', head: true }),
      user?.id || null
    );

    const [pageResult, filteredCountResult, totalCountResult] = await Promise.all([
      pageQuery,
      filteredCountQuery,
      supabase
        .from('ai_logs_with_stats')
        .select('id', { count: 'exact', head: true })
        .neq('uploader_role', 'admin'),
    ]);

    const { data: allRecords, error } = pageResult;

    if (error) {
      console.error('Error loading records:', error);
      setRecords([]);
      setTotalFiltered(0);
      setLoading(false);
      return;
    }

    const normalizedRecords = (allRecords || []).map((record: any) => ({
      ...record,
      review_count: record.review_count || 0,
    }));

    setRecords(normalizedRecords);
    setTotalFiltered(filteredCountResult.count || 0);
    setTotalRecords(totalCountResult.count || 0);

    setLoading(false);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setUserAction('ALL');
    setConfidenceLevel('ALL');
    setReviewStatus('ALL');
    setSortOrder('DESC');
  };

  if (loading) return <div className="p-10 text-center">Loading Records...</div>;

  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const visibleRecords = records;

  const getPaginationItems = (): Array<number | '...'> => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (safeCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }

    if (safeCurrentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages];
  };

  const paginationItems = getPaginationItems();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#134a86]">Butterfly Records</h1>
            <p className="text-gray-600">
              Click on any record to view details and expert reviews • {totalFiltered} {totalFiltered === 1 ? 'record' : 'records'} found
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
              Showing <span className="font-bold text-[#134a86]">{visibleRecords.length}</span> of <span className="font-bold">{totalFiltered}</span> filtered records
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
        {totalFiltered === 0 ? (
          <div className="bg-white p-20 rounded-xl shadow-sm text-center">
            <p className="text-gray-500">No records found matching your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {visibleRecords.map((record) => (
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
                      loading="lazy"
                      decoding="async"
                      fetchPriority="low"
                      onContextMenu={(e) => e.preventDefault()}
                      draggable={false}
                    />
                    
                    {/* Status Badge */}
                    {record.final_common_name ? (
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
                      {record.final_common_name || record.predicted_common_name || 'Unknown Species'}
                    </h3>
                    {record.predicted_scientific_name && (
                      <p className="text-sm italic text-gray-600 mt-1 truncate">
                        {record.predicted_scientific_name}
                      </p>
                    )}
                    
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-xs text-gray-500">
                        {new Date(record.created_at).toLocaleDateString()}
                      </span>
                      {!record.final_common_name && (
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
                        {record.final_common_name && (
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

        {totalFiltered > 0 && totalPages > 1 && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={safeCurrentPage === 1}
              className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            {paginationItems.map((item, index) => {
              if (item === '...') {
                return (
                  <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                    ...
                  </span>
                );
              }

              const isActive = item === safeCurrentPage;
              return (
                <button
                  key={`page-${item}`}
                  onClick={() => setCurrentPage(item)}
                  className={`min-w-10 px-3 py-2 rounded-lg text-sm font-medium border ${
                    isActive
                      ? 'bg-[#134a86] text-white border-[#134a86]'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {item}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={safeCurrentPage === totalPages}
              className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}

        {/* Pagination Info */}
        {totalFiltered > 0 && (
          <div className="mt-8 text-center text-gray-500 text-sm">
            Page {safeCurrentPage} of {totalPages} • Showing {visibleRecords.length} of {totalFiltered} filtered records ({totalRecords} total)
          </div>
        )}
      </div>
    </div>
  );
}
