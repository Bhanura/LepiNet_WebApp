'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import ProtectedImage from '@/components/ProtectedImage';

// ─── Types ────────────────────────────────────────────────────────────────────

type AiLogWithStats = {
  id: string;
  user_id: string;
  image_url: string;
  predicted_id: string;
  predicted_confidence: number;
  final_species_id: string;
  training_status: 'pending' | 'ready' | 'trained' | 'ignored';
  created_at: string;
  predicted_common_name: string;
  predicted_scientific_name: string;
  predicted_sinhala_name: string;
  final_common_name: string;
  final_scientific_name: string;
  final_sinhala_name: string;
  review_count: number;
  agree_count: number;
  correct_count: number;
  unsure_count: number;
  not_butterfly_count: number;
  avg_quality_rating: number;
  species_changed: boolean;
  uploader_name?: string;
};

type ReviewWithStats = {
  review_id: string;
  ai_log_id: string;
  reviewer_id: string;
  verdict: 'AGREE' | 'CORRECT' | 'UNSURE' | 'NOT_BUTTERFLY';
  identified_species_name: string | null;
  identification_notes: string | null;
  image_quality_rating: number;
  wings_visible: boolean;
  antennae_visible: boolean;
  body_visible: boolean;
  patterns_visible: boolean;
  is_new_discovery: boolean;
  created_at: string;
  comment_count: number;
  agree_comment_count: number;
  disagree_comment_count: number;
  rating_count: number;
  helpful_count: number;
  not_helpful_count: number;
  weighted_score: number;
  reviewer?: { first_name: string; last_name: string; role: string };
  comments?: Comment[];
};

type Comment = {
  id: string;
  comment_text: string;
  agrees_with_review: boolean;
  created_at: string;
  commenter?: { first_name: string; last_name: string };
};

type Filters = {
  trainingStatus: string;
  speciesSearch: string;
  speciesChanged: string;
  dateFrom: string;
  dateTo: string;
  minReviews: string;
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TrainingCurator() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [records, setRecords] = useState<AiLogWithStats[]>([]);
  const [filtered, setFiltered] = useState<AiLogWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<AiLogWithStats | null>(null);
  const [detailReviews, setDetailReviews] = useState<ReviewWithStats[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [bulkRetraining, setBulkRetraining] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    trainingStatus: '',
    speciesSearch: '',
    speciesChanged: '',
    dateFrom: '',
    dateTo: '',
    minReviews: '',
  });

  // ─── Fetch Records ──────────────────────────────────────────────────────────

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/login');

    // Check admin role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    if (userData?.role !== 'admin') return router.push('/');

    const { data, error } = await supabase
      .from('ai_logs_with_stats')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) { 
      console.error(error); 
      setLoading(false); 
      return; 
    }

    // Fetch uploader names separately
    const userIds = [...new Set((data || []).map((r: any) => r.user_id))];
    const { data: users } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .in('id', userIds);

    const userMap = new Map((users || []).map((u: any) => [u.id, `${u.first_name} ${u.last_name}`]));

    const enriched = (data || []).map((r: any) => ({
      ...r,
      uploader_name: userMap.get(r.user_id) || 'Unknown',
    }));

    setRecords(enriched);
    setFiltered(enriched);
    setLoading(false);
  }, [router, supabase]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // ─── Apply Filters ──────────────────────────────────────────────────────────

  useEffect(() => {
    let result = [...records];

    if (filters.trainingStatus)
      result = result.filter(r => r.training_status === filters.trainingStatus);

    if (filters.speciesSearch) {
      const q = filters.speciesSearch.toLowerCase();
      result = result.filter(r =>
        r.predicted_common_name?.toLowerCase().includes(q) ||
        r.final_common_name?.toLowerCase().includes(q) ||
        r.predicted_scientific_name?.toLowerCase().includes(q) ||
        r.final_scientific_name?.toLowerCase().includes(q)
      );
    }

    if (filters.speciesChanged === 'true')
      result = result.filter(r => r.species_changed);
    else if (filters.speciesChanged === 'false')
      result = result.filter(r => !r.species_changed);

    if (filters.dateFrom)
      result = result.filter(r => new Date(r.created_at) >= new Date(filters.dateFrom));

    if (filters.dateTo)
      result = result.filter(r => new Date(r.created_at) <= new Date(filters.dateTo));

    if (filters.minReviews)
      result = result.filter(r => r.review_count >= parseInt(filters.minReviews));

    setFiltered(result);
  }, [filters, records]);

  // ─── Status Counts ──────────────────────────────────────────────────────────

  const counts = {
    pending: records.filter(r => r.training_status === 'pending').length,
    ready: records.filter(r => r.training_status === 'ready').length,
    trained: records.filter(r => r.training_status === 'trained').length,
    ignored: records.filter(r => r.training_status === 'ignored').length,
  };

  // ─── Status Update ──────────────────────────────────────────────────────────

  const updateStatus = async (id: string, status: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setUpdatingId(id);

    // Use .select() to verify the update actually happened
    const { data, error } = await supabase
      .from('ai_logs')
      .update({ training_status: status })
      .eq('id', id)
      .select()
      .single();

    // Check both error AND data to catch RLS failures
    if (error || !data) {
      console.error('Status update error:', error);
      alert('Failed to update status. Check browser console for details.\n\nThis might be a permissions issue.');
      setUpdatingId(null);
      return;
    }

    // Update local state ONLY if database update succeeded
    setRecords(prev => prev.map(r => r.id === id ? { ...r, training_status: status as AiLogWithStats['training_status'] } : r));
    if (selectedRecord?.id === id) {
      setSelectedRecord(prev => prev ? { ...prev, training_status: status as AiLogWithStats['training_status'] } : null);
    }

    setUpdatingId(null);
  };

  // ─── Bulk Retrain All Trained Records ──────────────────────────────────────

  const retrainAll = async () => {
    const trainedRecords = records.filter(r => r.training_status === 'trained');
    
    if (trainedRecords.length === 0) {
      alert('No trained records to retrain.');
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to mark all ${trainedRecords.length} trained record(s) for retraining?\n\nThis will change their status from 'trained' to 'ready'.`
    );

    if (!confirmed) return;

    setBulkRetraining(true);

    // Update all trained records to ready
    const { error } = await supabase
      .from('ai_logs')
      .update({ training_status: 'ready' })
      .eq('training_status', 'trained');

    if (error) {
      console.error('Bulk retrain error:', error);
      alert('Failed to retrain all records. Check browser console for details.');
      setBulkRetraining(false);
      return;
    }

    // Update local state
    setRecords(prev => prev.map(r => 
      r.training_status === 'trained' 
        ? { ...r, training_status: 'ready' as AiLogWithStats['training_status'] } 
        : r
    ));

    // Clear selected record if it was trained
    if (selectedRecord?.training_status === 'trained') {
      setSelectedRecord(null);
    }

    setBulkRetraining(false);
    alert(`Successfully marked ${trainedRecords.length} record(s) for retraining!`);
  };

  // ─── Open Detail ────────────────────────────────────────────────────────────

  const openDetail = async (record: AiLogWithStats) => {
    setSelectedRecord(record);
    setDetailLoading(true);

    // Fetch reviews with stats
    const { data: reviews, error } = await supabase
      .from('reviews_with_stats')
      .select('*')
      .eq('ai_log_id', record.id)
      .order('created_at', { ascending: false });

    if (error) { 
      console.error(error); 
      setDetailLoading(false); 
      return; 
    }

    // Fetch reviewer info
    const reviewerIds = [...new Set((reviews || []).map((r: any) => r.reviewer_id))];
    const { data: reviewers } = await supabase
      .from('users')
      .select('id, first_name, last_name, role')
      .in('id', reviewerIds);

    const reviewerMap = new Map((reviewers || []).map((u: any) => [u.id, u]));

    // Fetch comments for each review
    const reviewIds = (reviews || []).map((r: any) => r.review_id);
    const { data: comments } = await supabase
      .from('review_comments')
      .select('id, review_id, comment_text, agrees_with_review, created_at, commenter_id')
      .in('review_id', reviewIds)
      .order('created_at', { ascending: true });

    // Fetch commenter info
    const commenterIds = [...new Set((comments || []).map((c: any) => c.commenter_id))];
    const { data: commenters } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .in('id', commenterIds);

    const commenterMap = new Map((commenters || []).map((u: any) => [u.id, u]));

    // Map comments to reviews
    const commentsByReview = new Map<string, Comment[]>();
    (comments || []).forEach((c: any) => {
      if (!commentsByReview.has(c.review_id)) commentsByReview.set(c.review_id, []);
      commentsByReview.get(c.review_id)!.push({
        ...c,
        commenter: commenterMap.get(c.commenter_id),
      });
    });

    const enriched = (reviews || []).map((r: any) => ({
      ...r,
      reviewer: reviewerMap.get(r.reviewer_id),
      comments: commentsByReview.get(r.review_id) || [],
    }));

    setDetailReviews(enriched);
    setDetailLoading(false);
  };

  // ─── Filter Reset ───────────────────────────────────────────────────────────

  const resetFilters = () => setFilters({
    trainingStatus: '', speciesSearch: '', speciesChanged: '',
    dateFrom: '', dateTo: '', minReviews: '',
  });

  // ─── Verdict Badge ──────────────────────────────────────────────────────────

  const verdictBadge = (verdict: string) => {
    const map: Record<string, string> = {
      AGREE: 'bg-green-100 text-green-800',
      CORRECT: 'bg-blue-100 text-blue-800',
      UNSURE: 'bg-yellow-100 text-yellow-800',
      NOT_BUTTERFLY: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      AGREE: '✓ Agrees with AI',
      CORRECT: '🔄 Corrected ID',
      UNSURE: '? Unsure',
      NOT_BUTTERFLY: '✗ Not a Butterfly',
    };
    return (
      <span className={`text-xs px-2 py-1 rounded-full font-medium ${map[verdict] || 'bg-gray-100 text-gray-800'}`}>
        {labels[verdict] || verdict}
      </span>
    );
  };

  // ─── Status Badge ───────────────────────────────────────────────────────────

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-700',
      ready: 'bg-blue-100 text-blue-700',
      trained: 'bg-green-100 text-green-700',
      ignored: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`text-xs px-2 py-1 rounded-full font-medium ${map[status] || 'bg-gray-100'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-gray-500">Loading Training Curator...</div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      
      {/* ── Page Header & Navigation ── */}
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Training Curator</h1>
          <p className="text-sm text-gray-500 mt-1">Review and curate training data for AI models</p>
        </div>
        <button 
          onClick={() => router.push('/admin/ai-models')}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm"
        >
          AI Control Center →
        </button>
      </div>

      {/* ── Status Overview ── */}
      <div className="mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
          {[
            { label: 'Pending', key: 'pending', color: 'border-gray-300 bg-gray-50' },
            { label: 'Ready', key: 'ready', color: 'border-blue-300 bg-blue-50' },
            { label: 'Trained', key: 'trained', color: 'border-green-300 bg-green-50' },
            { label: 'Ignored', key: 'ignored', color: 'border-red-300 bg-red-50' },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setFilters(f => ({ ...f, trainingStatus: f.trainingStatus === s.key ? '' : s.key }))}
              className={`p-4 rounded-xl border-2 text-left transition-all ${s.color} ${filters.trainingStatus === s.key ? 'ring-2 ring-offset-2 ring-blue-500' : 'hover:shadow-md'}`}
            >
              <div className="text-2xl font-bold">{counts[s.key as keyof typeof counts]}</div>
              <div className="text-sm text-gray-600">{s.label}</div>
            </button>
          ))}
        </div>
        
        {/* Bulk Actions - Only show when Trained filter is active */}
        {filters.trainingStatus === 'trained' && counts.trained > 0 && (
          <div className="flex justify-end">
            <button
              onClick={retrainAll}
              disabled={bulkRetraining}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>↻</span>
              {bulkRetraining ? `Retraining ${counts.trained} record(s)...` : `Retrain All (${counts.trained})`}
            </button>
          </div>
        )}
      </div>

      {/* ── Filter Panel ── */}
      <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Search species name..."
            value={filters.speciesSearch}
            onChange={e => setFilters(f => ({ ...f, speciesSearch: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filters.trainingStatus}
            onChange={e => setFilters(f => ({ ...f, trainingStatus: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="ready">Ready</option>
            <option value="trained">Trained</option>
            <option value="ignored">Ignored</option>
          </select>
          <select
            value={filters.speciesChanged}
            onChange={e => setFilters(f => ({ ...f, speciesChanged: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Records</option>
            <option value="false">AI Confirmed</option>
            <option value="true">Expert Corrected</option>
          </select>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            placeholder="Min reviews..."
            value={filters.minReviews}
            onChange={e => setFilters(f => ({ ...f, minReviews: e.target.value }))}
            min="0"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex justify-between items-center mt-3">
          <span className="text-sm text-gray-500">
            Showing {filtered.length} of {records.length} records
          </span>
          <button
            onClick={resetFilters}
            className="text-sm text-blue-600 hover:underline"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* ── Records Grid ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No records found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(record => (
            <div
              key={record.id}
              onClick={() => openDetail(record)}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden cursor-pointer hover:shadow-lg transition-all group"
            >
              {/* Image */}
              <div className="relative aspect-[4/3]">
                <ProtectedImage
                  src={record.image_url}
                  alt={record.final_common_name || 'Butterfly'}
                  authorName={record.uploader_name || 'LepiNet User'}
                  objectFit="cover"
                />
                {/* Status badge */}
                <div className="absolute top-2 left-2">
                  {statusBadge(record.training_status)}
                </div>
                {/* Species changed warning */}
                {record.species_changed && (
                  <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                    ⚠ ID Changed
                  </div>
                )}
              </div>

              {/* Card Content */}
              <div className="p-3">
                {/* AI Prediction */}
                <div className="mb-1">
                  <span className="text-xs text-gray-400">AI: </span>
                  <span className="text-xs text-gray-600">
                    {record.predicted_common_name || record.predicted_id || 'Unknown'}
                  </span>
                </div>

                {/* Consensus */}
                <div className="mb-2">
                  <span className="text-xs text-gray-400">Consensus: </span>
                  <span className={`text-sm font-semibold ${record.species_changed ? 'text-orange-600' : 'text-green-600'}`}>
                    {record.final_common_name || record.final_species_id || 'Unknown'}
                  </span>
                </div>

                {/* Review count + Actions */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-500">
                    {record.review_count} {record.review_count === 1 ? 'Review' : 'Reviews'}
                  </span>

                  {/* Action Buttons */}
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    {record.training_status !== 'trained' && (
                      <>
                        {record.training_status !== 'ready' && (
                          <button
                            onClick={e => updateStatus(record.id, 'ready', e)}
                            disabled={updatingId === record.id}
                            className="w-7 h-7 bg-green-500 hover:bg-green-600 text-white rounded-full text-sm flex items-center justify-center disabled:opacity-50"
                            title="Mark as Ready"
                          >
                            ✓
                          </button>
                        )}
                        {record.training_status !== 'ignored' && (
                          <button
                            onClick={e => updateStatus(record.id, 'ignored', e)}
                            disabled={updatingId === record.id}
                            className="w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm flex items-center justify-center disabled:opacity-50"
                            title="Ignore"
                          >
                            ✗
                          </button>
                        )}
                        {record.training_status === 'ignored' && (
                          <button
                            onClick={e => updateStatus(record.id, 'pending', e)}
                            disabled={updatingId === record.id}
                            className="w-7 h-7 bg-gray-500 hover:bg-gray-600 text-white rounded-full text-sm flex items-center justify-center disabled:opacity-50"
                            title="Restore to Pending"
                          >
                            ↺
                          </button>
                        )}
                      </>
                    )}
                    {record.training_status === 'trained' && (
                      <button
                        onClick={e => updateStatus(record.id, 'ready', e)}
                        disabled={updatingId === record.id}
                        className="w-7 h-7 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-sm flex items-center justify-center disabled:opacity-50"
                        title="Retrain"
                      >
                        ↻
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Detail Modal ── */}
      {selectedRecord && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto"
          onClick={() => { setSelectedRecord(null); setDetailReviews([]); }}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full my-8"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Record Details</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Uploaded by {selectedRecord.uploader_name} · {new Date(selectedRecord.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => { setSelectedRecord(null); setDetailReviews([]); }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Left: Image + Species Info */}
                <div>
                  <div className="rounded-xl overflow-hidden mb-4">
                    <ProtectedImage
                      src={selectedRecord.image_url}
                      alt={selectedRecord.final_common_name}
                      authorName={selectedRecord.uploader_name || 'LepiNet User'}
                      objectFit="contain"
                    />
                  </div>

                  {/* Species Comparison */}
                  <div className="space-y-3">
                    {/* AI Prediction */}
                    <div className="p-3 bg-blue-50 rounded-xl border-l-4 border-blue-400">
                      <p className="text-xs text-blue-500 font-medium mb-1">AI Prediction</p>
                      <p className="font-semibold text-gray-800">
                        {selectedRecord.predicted_common_name || selectedRecord.predicted_id || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500 italic">{selectedRecord.predicted_scientific_name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Confidence: {(selectedRecord.predicted_confidence * 100).toFixed(1)}%
                      </p>
                    </div>

                    {/* Expert Consensus */}
                    <div className={`p-3 rounded-xl border-l-4 ${selectedRecord.species_changed ? 'bg-orange-50 border-orange-400' : 'bg-green-50 border-green-400'}`}>
                      <p className={`text-xs font-medium mb-1 ${selectedRecord.species_changed ? 'text-orange-500' : 'text-green-500'}`}>
                        Expert Consensus {selectedRecord.species_changed ? '⚠ Changed' : '✓ Confirmed'}
                      </p>
                      <p className="font-semibold text-gray-800">
                        {selectedRecord.final_common_name || selectedRecord.final_species_id || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500 italic">{selectedRecord.final_scientific_name}</p>
                    </div>
                  </div>

                  {/* Stats Summary */}
                  <div className="grid grid-cols-4 gap-2 mt-4">
                    {[
                      { label: 'Reviews', value: selectedRecord.review_count, color: 'text-blue-600' },
                      { label: 'Agree', value: selectedRecord.agree_count, color: 'text-green-600' },
                      { label: 'Correct', value: selectedRecord.correct_count, color: 'text-purple-600' },
                      { label: 'Unsure', value: selectedRecord.unsure_count, color: 'text-yellow-600' },
                    ].map(s => (
                      <div key={s.label} className="text-center p-2 bg-gray-50 rounded-lg">
                        <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                        <div className="text-xs text-gray-500">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Training Actions */}
                  <div className="flex gap-2 mt-4">
                    {selectedRecord.training_status !== 'trained' && selectedRecord.training_status !== 'ready' && (
                      <button
                        onClick={() => updateStatus(selectedRecord.id, 'ready')}
                        disabled={updatingId === selectedRecord.id}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        ✓ Mark as Ready
                      </button>
                    )}
                    {selectedRecord.training_status === 'ready' && (
                      <button
                        onClick={() => updateStatus(selectedRecord.id, 'trained')}
                        disabled={updatingId === selectedRecord.id}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        ✓ Mark as Trained
                      </button>
                    )}
                    {selectedRecord.training_status !== 'ignored' && selectedRecord.training_status !== 'trained' && (
                      <button
                        onClick={() => updateStatus(selectedRecord.id, 'ignored')}
                        disabled={updatingId === selectedRecord.id}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        ✗ Ignore
                      </button>
                    )}
                    {selectedRecord.training_status === 'ignored' && (
                      <button
                        onClick={() => updateStatus(selectedRecord.id, 'pending')}
                        disabled={updatingId === selectedRecord.id}
                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        ↺ Restore to Pending
                      </button>
                    )}
                    {selectedRecord.training_status === 'trained' && (
                      <button
                        onClick={() => updateStatus(selectedRecord.id, 'ready')}
                        disabled={updatingId === selectedRecord.id}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        ↻ Mark for Retraining
                      </button>
                    )}
                  </div>
                </div>

                {/* Right: Reviews List */}
                <div>
                  <h3 className="font-bold text-gray-800 mb-4">
                    Expert Reviews ({selectedRecord.review_count})
                  </h3>

                  {detailLoading ? (
                    <div className="text-center py-8 text-gray-400">Loading reviews...</div>
                  ) : detailReviews.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">No reviews yet.</div>
                  ) : (
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                      {detailReviews.map(review => (
                        <div key={review.review_id} className="border border-gray-200 rounded-xl p-4">

                          {/* Reviewer Header */}
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                              {review.reviewer?.first_name?.[0] || '?'}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-gray-800">
                                  {review.reviewer?.first_name} {review.reviewer?.last_name}
                                </span>
                                {review.reviewer?.role === 'verified_expert' && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">✓ Verified</span>
                                )}
                              </div>
                              <div className="text-xs text-gray-400">
                                {new Date(review.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            {verdictBadge(review.verdict)}
                          </div>

                          {/* Quality + Features */}
                          <div className="flex flex-wrap gap-2 mb-3 text-xs">
                            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                              Quality: {review.image_quality_rating}/5 ⭐
                            </span>
                            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                              Score: {review.weighted_score.toFixed(1)}
                            </span>
                            {review.is_new_discovery && (
                              <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                                🔭 New Discovery
                              </span>
                            )}
                          </div>

                          {/* Visible features */}
                          <div className="flex gap-2 mb-3 flex-wrap">
                            {[
                              { key: 'wings_visible', label: 'Wings' },
                              { key: 'antennae_visible', label: 'Antennae' },
                              { key: 'body_visible', label: 'Body' },
                              { key: 'patterns_visible', label: 'Patterns' },
                            ].map(f => (
                              <span
                                key={f.key}
                                className={`text-xs px-2 py-0.5 rounded-full ${(review as any)[f.key] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}
                              >
                                {f.label}
                              </span>
                            ))}
                          </div>

                          {/* Corrected species */}
                          {review.verdict === 'CORRECT' && review.identified_species_name && (
                            <div className="mb-3 p-2 bg-blue-50 rounded-lg text-sm">
                              <span className="text-blue-600 font-medium">Identified as: </span>
                              <span className="text-blue-800">{review.identified_species_name}</span>
                            </div>
                          )}

                          {/* Notes */}
                          {review.identification_notes && (
                            <p className="text-sm text-gray-600 mb-3 italic">
                              "{review.identification_notes}"
                            </p>
                          )}

                          {/* Ratings */}
                          {review.rating_count > 0 && (
                            <div className="flex gap-3 text-xs text-gray-500 mb-3">
                              <span>👍 {review.helpful_count} Helpful</span>
                              <span>👎 {review.not_helpful_count} Not Helpful</span>
                            </div>
                          )}

                          {/* Comments */}
                          {review.comments && review.comments.length > 0 && (
                            <div className="border-t border-gray-100 pt-3 mt-3 space-y-2">
                              <p className="text-xs font-medium text-gray-500 mb-2">
                                Comments ({review.agree_comment_count} agree · {review.disagree_comment_count} disagree)
                              </p>
                              {review.comments.map(comment => (
                                <div key={comment.id} className="flex gap-2">
                                  <div className={`w-1 flex-shrink-0 rounded-full ${comment.agrees_with_review ? 'bg-green-400' : 'bg-red-400'}`} />
                                  <div>
                                    <span className="text-xs font-medium text-gray-700">
                                      {comment.commenter?.first_name} {comment.commenter?.last_name}
                                    </span>
                                    <span className={`text-xs ml-1 ${comment.agrees_with_review ? 'text-green-600' : 'text-red-600'}`}>
                                      {comment.agrees_with_review ? '· Agrees' : '· Disagrees'}
                                    </span>
                                    <p className="text-xs text-gray-600 mt-0.5">{comment.comment_text}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
