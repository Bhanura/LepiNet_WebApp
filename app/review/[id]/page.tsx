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
  const [predictedSpecies, setPredictedSpecies] = useState<any>(null);
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

      // 2. Load Predicted Species Details from species table
      if (logData?.predicted_id) {
        const { data: predictedSpeciesData } = await supabase
          .from('species')
          .select('*')
          .eq('butterfly_id', logData.predicted_id)
          .single();
        
        setPredictedSpecies(predictedSpeciesData);
      }

      // 3. Load Species List for dropdown
      const { data: speciesData } = await supabase
        .from('species')
        .select('butterfly_id, common_name_english, species_name_binomial, family, species_name_trinomial')
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
        <div className="bg-blue-50 p-4 rounded-lg mb-6 border-l-4 border-blue-600">
          <p className="text-xs text-blue-600 uppercase font-bold mb-1">AI PREDICTION</p>
          {predictedSpecies ? (
            <>
              <p className="text-lg font-bold text-gray-900">{predictedSpecies.common_name_english}</p>
              <p className="text-sm italic text-gray-700">{predictedSpecies.species_name_binomial}</p>
              {predictedSpecies.species_name_trinomial && (
                <p className="text-xs italic text-gray-600">{predictedSpecies.species_name_trinomial}</p>
              )}
              <p className="text-xs text-gray-600 mt-1">Family: {predictedSpecies.family}</p>
              {predictedSpecies.common_name_sinhalese && (
                <p className="text-xs text-gray-600">Sinhala: {predictedSpecies.common_name_sinhalese}</p>
              )}
            </>
          ) : (
            <p className="text-lg font-bold text-gray-900">{log.predicted_species_name || 'Unknown Species'}</p>
          )}
          <p className="text-sm text-gray-600 mt-2">Confidence: {Math.round(log.predicted_confidence * 100)}%</p>
          <div className="mt-2 pt-2 border-t border-blue-200">
             <p className="text-xs text-gray-500">User Action: <span className="font-bold">{log.user_action}</span></p>
          </div>
        </div>

        {/* Help Text */}
        <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
          <p className="text-sm font-semibold text-gray-700 mb-2">📋 How to Review:</p>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• <strong>Agree:</strong> The AI prediction is correct</li>
            <li>• <strong>Correct:</strong> The AI is wrong, you'll specify the right species</li>
            <li>• <strong>Unsure:</strong> You're not confident enough to confirm or correct</li>
          </ul>
        </div>

        {/* Verdict Form */}
        <div className="space-y-4 flex-1">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Your Verdict</label>
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => setVerdict('AGREE')}
                className={`py-3 px-2 rounded-lg border text-sm font-medium transition-all ${verdict === 'AGREE' ? 'bg-green-600 text-white border-green-600 shadow-md' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
              >
                <div className="text-xl mb-1">✅</div>
                <div className="text-xs">Agree</div>
              </button>
              <button 
                onClick={() => setVerdict('CORRECT')}
                className={`py-3 px-2 rounded-lg border text-sm font-medium transition-all ${verdict === 'CORRECT' ? 'bg-orange-600 text-white border-orange-600 shadow-md' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
              >
                <div className="text-xl mb-1">✏️</div>
                <div className="text-xs">Correct</div>
              </button>
              <button 
                onClick={() => setVerdict('UNSURE')}
                className={`py-3 px-2 rounded-lg border text-sm font-medium transition-all ${verdict === 'UNSURE' ? 'bg-yellow-500 text-white border-yellow-500 shadow-md' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
              >
                <div className="text-xl mb-1">❓</div>
                <div className="text-xs">Unsure</div>
              </button>
            </div>
            
            {/* Explanation for selected verdict */}
            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-800">
                {verdict === 'AGREE' && '✅ You confirm the AI prediction is correct.'}
                {verdict === 'CORRECT' && '✏️ You disagree with AI and will provide the correct species.'}
                {verdict === 'UNSURE' && '❓ You cannot confidently confirm or correct this identification.'}
              </p>
            </div>
          </div>

          {/* Conditional Dropdown for Correction */}
          {verdict === 'CORRECT' && (
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select the Correct Species
              </label>
              <p className="text-xs text-gray-600 mb-2">
                Choose the correct butterfly species from the list below:
              </p>
              <select 
                value={correctSpecies}
                onChange={(e) => setCorrectSpecies(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">-- Select Species --</option>
                {speciesList.map(s => (
                  <option key={s.butterfly_id} value={s.common_name_english}>
                    {s.common_name_english} ({s.species_name_binomial})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* New Discovery Toggle */}
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="flex items-start gap-3">
              <input 
                type="checkbox" 
                id="discovery" 
                checked={isDiscovery}
                onChange={(e) => setIsDiscovery(e.target.checked)}
                className="w-5 h-5 text-purple-600 rounded mt-0.5"
              />
              <div className="flex-1">
                <label htmlFor="discovery" className="text-sm font-semibold text-purple-900 cursor-pointer block mb-1">
                  Flag as Potential New Discovery 🌟
                </label>
                <p className="text-xs text-purple-700">
                  Check this if you believe this might be a new species or a rare discovery not commonly documented.
                </p>
              </div>
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Scientific Notes (Optional)
            </label>
            <p className="text-xs text-gray-600 mb-2">
              Add observations, reasoning, or any relevant details about your identification.
            </p>
            <textarea 
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm h-28 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="E.g., Wing markings clearly show distinctive patterns typical of this species, antenna shape confirms identification..."
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