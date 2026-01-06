'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function TrainingCurator() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<'all' | 'agreed' | 'corrected'>('all');
  const [filterTrainingStatus, setFilterTrainingStatus] = useState<'pending' | 'ready' | 'trained' | 'ignored' | 'all'>('pending');
  const [searchSpecies, setSearchSpecies] = useState('');
  const router = useRouter();
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchCandidates();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [candidates, filterStatus, filterTrainingStatus, searchSpecies]);

  const applyFilters = () => {
    let filtered = [...candidates];

    // Filter by training status
    if (filterTrainingStatus !== 'all') {
      filtered = filtered.filter(c => c.training_status === filterTrainingStatus);
    }

    // Filter by status
    if (filterStatus === 'agreed') {
      filtered = filtered.filter(c => c.agreed_with_ai);
    } else if (filterStatus === 'corrected') {
      filtered = filtered.filter(c => !c.agreed_with_ai);
    }

    // Filter by species search
    if (searchSpecies) {
      filtered = filtered.filter(c => 
        c.identified_species_name?.toLowerCase().includes(searchSpecies.toLowerCase()) ||
        c.ai_log?.final_species_name?.toLowerCase().includes(searchSpecies.toLowerCase())
      );
    }

    setFilteredCandidates(filtered);
  };

  const fetchCandidates = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/login');

    // Verify admin access
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userProfile?.role !== 'admin') {
      alert('Access Denied: Admin only');
      router.push('/');
      return;
    }

    console.log('Fetching expert_reviews...');

    // Fetch ALL Reviews with ai_logs data (no training status filter on query)
    const { data, error } = await supabase
      .from('expert_reviews')
      .select(`
        id, 
        ai_log_id,
        identified_species_name, 
        agreed_with_ai, 
        training_status, 
        confidence_level,
        created_at,
        ai_logs!inner(id, image_url, predicted_id, final_species_name)
      `)
      .eq('confidence_level', 'certain')
      .neq('identified_species_name', 'Not a Butterfly')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching candidates:', error);
      alert('Error loading training candidates: ' + (error.message || 'Unknown error'));
    } else {
      console.log('Training candidates fetched:', data);
      console.log('Number of candidates:', data?.length || 0);
      
      // Transform the data to match expected structure
      const transformedData = data?.map(item => ({
        ...item,
        ai_log: item.ai_logs
      })) || [];
      
      setCandidates(transformedData);
      setFilteredCandidates(transformedData);
    }
    
    setLoading(false);
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCandidates.length && filteredCandidates.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCandidates.map(c => c.id)));
    }
  };

  const handleApprove = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Mark ${selectedIds.size} images as READY for training?`)) return;

    const { error } = await supabase
      .from('expert_reviews')
      .update({ training_status: 'ready' })
      .in('id', Array.from(selectedIds));

    if (error) alert("Error: " + error.message);
    else {
      alert("Images approved! They will be used in the next training run.");
      fetchCandidates();
      setSelectedIds(new Set());
    }
  };

  const handleIgnore = async (id: string) => {
    if (!confirm("Mark this image as ignored? It won't be used for training.")) return;
    await supabase.from('expert_reviews').update({ training_status: 'ignored' }).eq('id', id);
    fetchCandidates();
  };

  const handleRestore = async (id: string) => {
    if (!confirm("Restore this image back to pending status?")) return;
    await supabase.from('expert_reviews').update({ training_status: 'pending' }).eq('id', id);
    fetchCandidates();
  };

  const handleMarkAsTrained = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Mark ${selectedIds.size} images as TRAINED? This should be done after successfully training the model.`)) return;

    const { error } = await supabase
      .from('expert_reviews')
      .update({ training_status: 'trained' })
      .in('id', Array.from(selectedIds));

    if (error) alert("Error: " + error.message);
    else {
      alert("Images marked as trained!");
      fetchCandidates();
      setSelectedIds(new Set());
    }
  };

  const triggerTraining = async () => {
    const secret = prompt("Enter Admin Secret to start the Python Trainer:");
    if (!secret) return;

    // UPDATE THIS URL to your actual Hugging Face Space URL
    const AI_URL = "https://bhanura-lepinet-backend.hf.space/retrain"; 

    try {
        alert("Signal sent! Check Hugging Face Logs.");
        await fetch(`${AI_URL}?secret=${secret}`, { method: 'POST' });
    } catch (e) {
        alert("Signal sent (or CORS error). Check HF logs to confirm.");
    }
  };

  if (loading) return <div className="p-10">Loading Candidates...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
             <h1 className="text-3xl font-bold text-[#134a86]">AI Training Curator</h1>
             <p className="text-gray-600">Review verified images before feeding them to the AI.</p>
             <p className="text-sm text-gray-500 mt-1">
               Showing {filteredCandidates.length} of {candidates.length} candidates
             </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={triggerTraining}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2"
            >
              🚀 Start Fine-Tuning
            </button>
          </div>
        </div>

        {/* Training Status Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <button
            onClick={() => setFilterTrainingStatus('pending')}
            className={`p-4 rounded-xl border-2 transition ${
              filterTrainingStatus === 'pending'
                ? 'border-yellow-500 bg-yellow-50'
                : 'border-gray-200 bg-white hover:border-yellow-300'
            }`}
          >
            <div className="text-2xl mb-1">⏳</div>
            <div className="text-sm font-medium text-gray-600">Pending</div>
            <div className="text-xl font-bold text-gray-900">
              {candidates.filter(c => c.training_status === 'pending').length}
            </div>
          </button>

          <button
            onClick={() => setFilterTrainingStatus('ready')}
            className={`p-4 rounded-xl border-2 transition ${
              filterTrainingStatus === 'ready'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 bg-white hover:border-green-300'
            }`}
          >
            <div className="text-2xl mb-1">✅</div>
            <div className="text-sm font-medium text-gray-600">Ready</div>
            <div className="text-xl font-bold text-gray-900">
              {candidates.filter(c => c.training_status === 'ready').length}
            </div>
          </button>

          <button
            onClick={() => setFilterTrainingStatus('trained')}
            className={`p-4 rounded-xl border-2 transition ${
              filterTrainingStatus === 'trained'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-blue-300'
            }`}
          >
            <div className="text-2xl mb-1">🎓</div>
            <div className="text-sm font-medium text-gray-600">Trained</div>
            <div className="text-xl font-bold text-gray-900">
              {candidates.filter(c => c.training_status === 'trained').length}
            </div>
          </button>

          <button
            onClick={() => setFilterTrainingStatus('ignored')}
            className={`p-4 rounded-xl border-2 transition ${
              filterTrainingStatus === 'ignored'
                ? 'border-red-500 bg-red-50'
                : 'border-gray-200 bg-white hover:border-red-300'
            }`}
          >
            <div className="text-2xl mb-1">🚫</div>
            <div className="text-sm font-medium text-gray-600">Ignored</div>
            <div className="text-xl font-bold text-gray-900">
              {candidates.filter(c => c.training_status === 'ignored').length}
            </div>
          </button>

          <button
            onClick={() => setFilterTrainingStatus('all')}
            className={`p-4 rounded-xl border-2 transition ${
              filterTrainingStatus === 'all'
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 bg-white hover:border-purple-300'
            }`}
          >
            <div className="text-2xl mb-1">📊</div>
            <div className="text-sm font-medium text-gray-600">All</div>
            <div className="text-xl font-bold text-gray-900">
              {candidates.length}
            </div>
          </button>
        </div>

        {/* Filters & View Toggle */}
        <div className="bg-white p-4 rounded-xl shadow border mb-6 space-y-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            {/* Left side filters */}
            <div className="flex flex-wrap gap-4 items-center">
              {/* Search */}
              <input
                type="text"
                placeholder="Search species..."
                value={searchSpecies}
                onChange={(e) => setSearchSpecies(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
              />
              
              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Reviews</option>
                <option value="agreed">Agreed with AI</option>
                <option value="corrected">Expert Corrected</option>
              </select>
            </div>

            {/* Right side view toggle */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                  viewMode === 'grid' 
                    ? 'bg-white text-blue-600 shadow' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  Grid
                </span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                  viewMode === 'list' 
                    ? 'bg-white text-blue-600 shadow' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  List
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="sticky top-4 z-10 bg-white p-4 rounded-xl shadow border mb-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="font-bold text-gray-700">
              {selectedIds.size} selected
            </div>
            <button 
              onClick={toggleSelectAll}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {selectedIds.size === filteredCandidates.length && filteredCandidates.length > 0 ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="flex items-center gap-3">
             {filterTrainingStatus === 'pending' && (
               <button 
                 onClick={handleApprove}
                 disabled={selectedIds.size === 0}
                 className={`px-6 py-2 rounded-lg font-bold text-white transition ${selectedIds.size > 0 ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300'}`}
               >
                 ✓ Approve for Training ({selectedIds.size})
               </button>
             )}
             {filterTrainingStatus === 'ready' && (
               <button 
                 onClick={handleMarkAsTrained}
                 disabled={selectedIds.size === 0}
                 className={`px-6 py-2 rounded-lg font-bold text-white transition ${selectedIds.size > 0 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300'}`}
               >
                 🎓 Mark as Trained ({selectedIds.size})
               </button>
             )}
          </div>
        </div>

        {/* Content: Grid or List View */}
        {filteredCandidates.length === 0 ? (
          <div className="bg-white p-10 rounded-xl shadow text-center text-gray-500">
            <p className="text-lg font-medium">No candidates found</p>
            <p className="text-sm mt-2">Try adjusting your filters</p>
          </div>
        ) : viewMode === 'grid' ? (
          <GridView 
            candidates={filteredCandidates} 
            selectedIds={selectedIds} 
            toggleSelection={toggleSelection}
            handleIgnore={handleIgnore}
            handleRestore={handleRestore}
            trainingStatus={filterTrainingStatus}
          />
        ) : (
          <ListView 
            candidates={filteredCandidates} 
            selectedIds={selectedIds} 
            toggleSelection={toggleSelection}
            handleIgnore={handleIgnore}
            handleRestore={handleRestore}
            trainingStatus={filterTrainingStatus}
          />
        )}
      </div>
    </div>
  );
}

// Grid View Component
function GridView({ candidates, selectedIds, toggleSelection, handleIgnore, handleRestore, trainingStatus }: any) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {candidates.map((item: any) => {
        const label = item.agreed_with_ai 
          ? (item.ai_log.final_species_name || item.identified_species_name)
          : item.identified_species_name;

        const statusColors = {
          pending: 'bg-yellow-100 text-yellow-700',
          ready: 'bg-green-100 text-green-700',
          trained: 'bg-blue-100 text-blue-700',
          ignored: 'bg-red-100 text-red-700'
        };

        return (
          <div 
            key={item.id} 
            className={`relative rounded-lg overflow-hidden border-2 cursor-pointer bg-white shadow-sm hover:shadow-md transition ${
              selectedIds.has(item.id) ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-200'
            }`}
            onClick={() => toggleSelection(item.id)}
          >
            <div className="h-40 bg-gray-200 relative">
              <img src={item.ai_log.image_url} className="w-full h-full object-cover" alt="candidate" />
              
              {/* Training Status Badge */}
              <div className={`absolute top-2 left-2 text-xs px-2 py-1 rounded-full font-bold ${statusColors[item.training_status as keyof typeof statusColors]}`}>
                {item.training_status === 'pending' && '⏳ Pending'}
                {item.training_status === 'ready' && '✅ Ready'}
                {item.training_status === 'trained' && '🎓 Trained'}
                {item.training_status === 'ignored' && '🚫 Ignored'}
              </div>
              
              {/* Checkbox Indicator */}
              <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center ${
                selectedIds.has(item.id) ? 'bg-green-500 text-white' : 'bg-black/30'
              }`}>
                {selectedIds.has(item.id) && "✓"}
              </div>

              {/* Agreement Badge */}
              <div className={`absolute bottom-2 left-2 text-xs px-2 py-1 rounded-full font-bold ${
                item.agreed_with_ai 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-orange-100 text-orange-700'
              }`}>
                {item.agreed_with_ai ? '✓ Agreed' : '✏️ Corrected'}
              </div>
            </div>

            <div className="p-3">
              <p className="font-bold text-sm truncate mb-1" title={label}>{label}</p>
              <p className="text-xs text-gray-500 truncate">
                {item.agreed_with_ai ? `AI: ${item.ai_log.final_species_name}` : `From: ${item.ai_log.final_species_name}`}
              </p>
              <div className="mt-2 flex gap-1">
                {(item.training_status === 'pending' || item.training_status === 'ready') && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleIgnore(item.id); }}
                    className="text-red-500 text-xs hover:underline flex-1 text-left"
                  >
                    🚫 Ignore
                  </button>
                )}
                {item.training_status === 'ignored' && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleRestore(item.id); }}
                    className="text-blue-500 text-xs hover:underline flex-1 text-left"
                  >
                    ↻ Restore
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// List View Component
function ListView({ candidates, selectedIds, toggleSelection, handleIgnore, handleRestore, trainingStatus }: any) {
  return (
    <div className="space-y-3">
      {candidates.map((item: any) => {
        const label = item.agreed_with_ai 
          ? (item.ai_log.final_species_name || item.identified_species_name)
          : item.identified_species_name;

        const statusConfig = {
          pending: { color: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: '⏳', text: 'Pending Review' },
          ready: { color: 'bg-green-100 text-green-700 border-green-300', icon: '✅', text: 'Ready for Training' },
          trained: { color: 'bg-blue-100 text-blue-700 border-blue-300', icon: '🎓', text: 'Already Trained' },
          ignored: { color: 'bg-red-100 text-red-700 border-red-300', icon: '🚫', text: 'Ignored' }
        };

        const status = statusConfig[item.training_status as keyof typeof statusConfig];

        return (
          <div 
            key={item.id}
            className={`bg-white rounded-lg border-2 overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer ${
              selectedIds.has(item.id) ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-200'
            }`}
            onClick={() => toggleSelection(item.id)}
          >
            <div className="flex gap-4 p-4">
              {/* Checkbox */}
              <div className="flex items-center">
                <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                  selectedIds.has(item.id) 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : 'border-gray-300'
                }`}>
                  {selectedIds.has(item.id) && "✓"}
                </div>
              </div>

              {/* Image */}
              <div className="w-32 h-32 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                <img src={item.ai_log.image_url} className="w-full h-full object-cover" alt="candidate" />
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-gray-900 truncate" title={label}>
                      {label}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-bold ${
                        item.agreed_with_ai 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {item.agreed_with_ai ? '✓ Agreed with AI' : '✏️ Expert Corrected'}
                      </div>
                      <div className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-bold border-2 ${status.color}`}>
                        {status.icon} {status.text}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 font-medium min-w-[100px]">AI Prediction:</span>
                    <span className="text-gray-900">{item.ai_log.final_species_name || 'Unknown'}</span>
                  </div>
                  
                  {!item.agreed_with_ai && (
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 font-medium min-w-[100px]">Expert Says:</span>
                      <span className="text-gray-900 font-semibold">{item.identified_species_name}</span>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 font-medium min-w-[100px]">Confidence:</span>
                    <span className="text-gray-900">{item.confidence_level}</span>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 font-medium min-w-[100px]">Record ID:</span>
                    <span className="text-gray-400 text-xs font-mono">{item.ai_log_id.substring(0, 8)}...</span>
                  </div>

                  {item.created_at && (
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 font-medium min-w-[100px]">Reviewed:</span>
                      <span className="text-gray-400 text-xs">{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                {(item.training_status === 'pending' || item.training_status === 'ready') && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleIgnore(item.id); }}
                    className="text-red-500 text-sm hover:bg-red-50 px-3 py-2 rounded-lg transition font-medium whitespace-nowrap"
                  >
                    🚫 Ignore
                  </button>
                )}
                {item.training_status === 'ignored' && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleRestore(item.id); }}
                    className="text-blue-500 text-sm hover:bg-blue-50 px-3 py-2 rounded-lg transition font-medium whitespace-nowrap"
                  >
                    ↻ Restore
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
