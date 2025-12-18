'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import ProtectedImage from '@/components/ProtectedImage';

export default function ReviewDetail() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  
  // Data State
  const [log, setLog] = useState<any>(null);
  const [speciesList, setSpeciesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [verdict, setVerdict] = useState<'AGREE' | 'CORRECT' | 'UNSURE'>('AGREE');
  const [correctSpecies, setCorrectSpecies] = useState('');
  const [isDiscovery, setIsDiscovery] = useState(false);
  const [comments, setComments] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const init = async () => {
      // 1. Load Log Details
      const { data: logData } = await supabase
        .from('ai_logs')
        .select('*')
        .eq('id', id)
        .single();
      
      setLog(logData);

      // 2. Load Species List for dropdown
      const { data: speciesData } = await supabase
        .from('species')
        .select('butterfly_id, common_name_english, species_name_binomial')
        .order('common_name_english');
      
      setSpeciesList(speciesData || []);
      setLoading(false);
    };
    init();
  }, [id]);

  const handleSubmit = async () => {
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return alert("Error: Not logged in");

    // Logic: If they agree, the identified name is the AI's name.
    // If they correct it, it's the dropdown value.
    const finalName = verdict === 'AGREE' ? log.predicted_species_name : correctSpecies;
    const agreed = verdict === 'AGREE';

    const { error } = await supabase
      .from('expert_reviews')
      .insert({
        ai_log_id: id,
        reviewer_id: user.id,
        agreed_with_ai: agreed,
        identified_species_name: finalName,
        confidence_level: verdict === 'UNSURE' ? 'uncertain' : 'certain',
        is_new_discovery: isDiscovery,
        comments: comments
      });

    if (error) {
      alert("Submission Failed: " + error.message);
      setSubmitting(false);
    } else {
      alert("Review Submitted Successfully!");
      router.push('/review'); // Go back to queue
    }
  };

  if (loading || !log) return <div className="p-10 text-center">Loading Workstation...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col md:flex-row gap-6">
      
      {/* LEFT: Image Viewer */}
      <div className="flex-1 bg-black rounded-xl overflow-hidden flex items-center justify-center relative shadow-lg">
        {/* We use standard img here for raw zoom capability, or ProtectedImage if you prefer safety over zoom */}
        <div className="relative w-full h-[80vh]">
           <ProtectedImage src={log.image_url} alt="Specimen" authorName="Contributor" />
        </div>
      </div>

      {/* RIGHT: Analysis Panel */}
      <div className="w-full md:w-[400px] bg-white rounded-xl shadow-lg border border-gray-200 p-6 flex flex-col h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-[#134a86] mb-4">Expert Analysis</h2>

        {/* AI Metadata */}
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <p className="text-xs text-blue-600 uppercase font-bold mb-1">AI Prediction</p>
          <p className="text-lg font-bold text-gray-900">{log.predicted_species_name}</p>
          <p className="text-sm text-gray-600">Confidence: {Math.round(log.predicted_confidence * 100)}%</p>
          <div className="mt-2 pt-2 border-t border-blue-100">
             <p className="text-xs text-gray-500">User Action: <span className="font-bold">{log.user_action}</span></p>
          </div>
        </div>

        {/* Verdict Form */}
        <div className="space-y-4 flex-1">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Your Verdict</label>
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => setVerdict('AGREE')}
                className={`py-2 px-1 rounded border text-sm font-medium ${verdict === 'AGREE' ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
              >
                ✅ Agree
              </button>
              <button 
                onClick={() => setVerdict('CORRECT')}
                className={`py-2 px-1 rounded border text-sm font-medium ${verdict === 'CORRECT' ? 'bg-[#134a86] text-white border-[#134a86]' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
              >
                ✏️ Correct
              </button>
              <button 
                onClick={() => setVerdict('UNSURE')}
                className={`py-2 px-1 rounded border text-sm font-medium ${verdict === 'UNSURE' ? 'bg-yellow-500 text-white border-yellow-500' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
              >
                ❓ Unsure
              </button>
            </div>
          </div>

          {/* Conditional Dropdown for Correction */}
          {verdict === 'CORRECT' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Correct Species</label>
              <select 
                value={correctSpecies}
                onChange={(e) => setCorrectSpecies(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
              >
                <option value="">-- Search Species --</option>
                {speciesList.map(s => (
                  <option key={s.butterfly_id} value={s.common_name_english}>
                    {s.common_name_english} ({s.species_name_binomial})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* New Discovery Toggle */}
          <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
            <input 
              type="checkbox" 
              id="discovery" 
              checked={isDiscovery}
              onChange={(e) => setIsDiscovery(e.target.checked)}
              className="w-5 h-5 text-purple-600 rounded"
            />
            <label htmlFor="discovery" className="text-sm font-medium text-purple-900 cursor-pointer">
              Flag as Potential New Discovery 🌟
            </label>
          </div>

          {/* Comments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scientific Notes</label>
            <textarea 
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm h-24"
              placeholder="E.g., Wing markings suggest..."
            />
          </div>
        </div>

        {/* Submit Button */}
        <button 
          onClick={handleSubmit}
          disabled={submitting || (verdict === 'CORRECT' && !correctSpecies)}
          className={`w-full py-3 rounded-lg font-bold text-white shadow-md mt-6 ${
            submitting ? 'bg-gray-400' : 'bg-[#134a86] hover:bg-blue-900'
          }`}
        >
          {submitting ? 'Submitting...' : 'Submit Review'}
        </button>

      </div>
    </div>
  );
}