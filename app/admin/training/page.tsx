'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function TrainingCurator() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/login');

    // Fetch Reviews that are CERTAIN but NOT trained yet
    const { data } = await supabase
      .from('expert_reviews')
      .select(`
        id, identified_species_name, agreed_with_ai, training_status, confidence_level,
        ai_log:ai_logs(id, image_url, predicted_species_name)
      `)
      .eq('confidence_level', 'certain')
      .eq('training_status', 'pending'); // Only show pending ones
      
    setCandidates(data || []);
    setLoading(false);
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
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
    await supabase.from('expert_reviews').update({ training_status: 'ignored' }).eq('id', id);
    fetchCandidates();
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
        <div className="flex justify-between items-center mb-6">
          <div>
             <h1 className="text-3xl font-bold text-[#134a86]">AI Training Curator</h1>
             <p className="text-gray-600">Review verified images before feeding them to the AI.</p>
          </div>
          <button 
            onClick={triggerTraining}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2"
          >
            🚀 Start Fine-Tuning
          </button>
        </div>

        {/* Toolbar */}
        <div className="sticky top-4 z-10 bg-white p-4 rounded-xl shadow border mb-6 flex justify-between items-center">
          <div className="font-bold text-gray-700">
            {selectedIds.size} selected
          </div>
          <div className="space-x-4">
             <button 
               onClick={() => setSelectedIds(new Set(candidates.map(c => c.id)))}
               className="text-sm text-gray-600 hover:text-black"
             >
               Select All
             </button>
             <button 
               onClick={handleApprove}
               disabled={selectedIds.size === 0}
               className={`px-6 py-2 rounded-lg font-bold text-white transition ${selectedIds.size > 0 ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300'}`}
             >
               Approve Selection
             </button>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {candidates.length === 0 ? (
             <p className="col-span-full text-center text-gray-500 py-10">No pending verified images found.</p>
          ) : candidates.map((item) => {
            const label = item.agreed_with_ai 
              ? item.ai_log.predicted_species_name 
              : item.identified_species_name;

            return (
              <div 
                key={item.id} 
                className={`relative rounded-lg overflow-hidden border-2 cursor-pointer bg-white shadow-sm transition ${selectedIds.has(item.id) ? 'border-green-500 ring-2 ring-green-200' : 'border-transparent'}`}
                onClick={() => toggleSelection(item.id)}
              >
                <div className="h-40 bg-gray-200">
                  <img src={item.ai_log.image_url} className="w-full h-full object-cover" alt="candidate" />
                </div>
                
                {/* Checkbox Indicator */}
                <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border border-white flex items-center justify-center ${selectedIds.has(item.id) ? 'bg-green-500 text-white' : 'bg-black/30'}`}>
                  {selectedIds.has(item.id) && "✓"}
                </div>

                <div className="p-3">
                  <p className="font-bold text-xs truncate mb-1" title={label}>{label}</p>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleIgnore(item.id); }}
                    className="text-red-500 text-xs hover:underline block w-full text-left"
                  >
                    Ignore (Bad Quality)
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}