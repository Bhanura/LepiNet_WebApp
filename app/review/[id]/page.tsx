'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
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
  const [verdict, setVerdict] = useState<'AGREE' | 'CORRECT' | 'UNSURE' | 'NOT_BUTTERFLY'>('AGREE');
  const [confidenceLevel, setConfidenceLevel] = useState<'certain' | 'uncertain'>('certain');
  const [correctSpecies, setCorrectSpecies] = useState('');
  const [isDiscovery, setIsDiscovery] = useState(false);
  const [comments, setComments] = useState('');
  const [speciesSearch, setSpeciesSearch] = useState('');
  const [searchFilter, setSearchFilter] = useState<'all' | 'common' | 'scientific'>('all');
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const init = async () => {
      // 1. Load Log Details
      const { data: logData, error: logError } = await supabase
        .from('ai_logs')
        .select('*')
        .eq('id', id)
        .single();
      
      if (logError) {
        console.error('Error loading log:', logError);
        console.error('Error details:', JSON.stringify(logError, null, 2));
        alert(`Failed to load record: ${logError.message || 'Unknown error'}`);
      }
      
      console.log('Log Data:', logData);
      setLog(logData);

      // 2. Load Predicted Species Details from species table
      if (logData?.predicted_id) {
        console.log('Fetching species for predicted_id:', logData.predicted_id);
        const { data: predictedSpeciesData, error: speciesError } = await supabase
          .from('species')
          .select('*')
          .eq('butterfly_id', logData.predicted_id)
          .single();
        
        if (speciesError) {
          console.error('Error loading species:', speciesError);
          console.error('Species error details:', JSON.stringify(speciesError, null, 2));
        } else {
          console.log('Predicted Species Data:', predictedSpeciesData);
          setPredictedSpecies(predictedSpeciesData);
        }
      } else {
        console.log('No predicted_id found in log data');
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

    // Handle "Not a butterfly" case
    if (verdict === 'NOT_BUTTERFLY') {
      const { error } = await supabase
        .from('expert_reviews')
        .insert({
          ai_log_id: id,
          reviewer_id: user.id,
          agreed_with_ai: false,
          identified_species_name: 'Not a Butterfly',
          confidence_level: 'certain',
          is_new_discovery: false,
          comments: comments || 'This is not a butterfly'
        });

      if (error) {
        console.error('Review submission error:', error);
        alert("Submission Failed: " + error.message);
        setSubmitting(false);
      } else {
        alert("Review Submitted Successfully!");
        router.push(`/records/${id}`);
      }
      return;
    }

    // Logic: If they agree, the identified name is from species details
    // If they correct it, it's the dropdown value.
    const finalName = verdict === 'AGREE' 
      ? (predictedSpecies?.common_name_english || log.predicted_species_name)
      : correctSpecies;
    const agreed = verdict === 'AGREE';

    const { error } = await supabase
      .from('expert_reviews')
      .insert({
        ai_log_id: id,
        reviewer_id: user.id,
        agreed_with_ai: agreed,
        identified_species_name: finalName,
        confidence_level: confidenceLevel,
        is_new_discovery: isDiscovery,
        comments: comments
      });

    if (error) {
      console.error('Review submission error:', error);
      alert("Submission Failed: " + error.message);
      setSubmitting(false);
    } else {
      alert("Review Submitted Successfully!");
      router.push(`/records/${id}`);
    }
  };

  // Filter species list based on search
  const filteredSpeciesList = speciesList.filter(s => {
    if (!speciesSearch) return true;
    const search = speciesSearch.toLowerCase();
    
    if (searchFilter === 'common') {
      return s.common_name_english?.toLowerCase().includes(search);
    } else if (searchFilter === 'scientific') {
      return s.species_name_binomial?.toLowerCase().includes(search) || 
             s.species_name_trinomial?.toLowerCase().includes(search);
    } else {
      return s.common_name_english?.toLowerCase().includes(search) ||
             s.species_name_binomial?.toLowerCase().includes(search) ||
             s.species_name_trinomial?.toLowerCase().includes(search);
    }
  });

  if (loading || !log) return <div className="p-10 text-center">Loading Workstation...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/records"
              className="inline-flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-gray-900 transition-all"
            >
              <span>←</span>
              <span className="text-sm">All Records</span>
            </Link>
            <span className="text-gray-400">|</span>
            <Link
              href={`/records/${id}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-gray-900 transition-all"
            >
              <span>←</span>
              <span className="text-sm">Record Details</span>
            </Link>
          </div>
          <span className="text-sm font-medium text-gray-700">Expert Review Form</span>
        </div>
      </div>

      <div className="flex">
        {/* LEFT PANEL: Image Viewer with AI Details - 50% */}
        <div className="w-1/2 p-6 flex flex-col gap-6 overflow-y-auto" style={{ maxHeight: '100vh' }}>
        {/* Image */}
        <div className="bg-black rounded-xl overflow-hidden shadow-xl">
          <div className="relative w-full" style={{ height: '55vh' }}>
            <ProtectedImage src={log.image_url} alt="Specimen" authorName="Contributor" />
          </div>
        </div>

        {/* AI Prediction Details */}
        <div className="bg-blue-50 p-6 rounded-xl border-l-4 border-blue-600 shadow-lg">
          <p className="text-xs text-blue-600 uppercase font-bold mb-3">AI PREDICTION DETAILS</p>
          {predictedSpecies ? (
            <div className="space-y-3">
              <div>
                <p className="text-gray-600 text-sm">Common Name</p>
                <p className="text-2xl font-bold text-gray-900">{predictedSpecies.common_name_english}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Scientific Name</p>
                <p className="text-lg italic text-gray-800">{predictedSpecies.species_name_binomial}</p>
                {predictedSpecies.species_name_trinomial && (
                  <p className="text-sm italic text-gray-700">{predictedSpecies.species_name_trinomial}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-blue-200">
                <div>
                  <p className="text-gray-600 text-sm">Family</p>
                  <p className="font-semibold text-gray-800">{predictedSpecies.family}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">AI Confidence</p>
                  <p className="font-bold text-blue-600">{Math.round(log.predicted_confidence * 100)}%</p>
                </div>
              </div>
              {predictedSpecies.common_name_sinhalese && (
                <div className="pt-2">
                  <p className="text-gray-600 text-sm">Sinhala Name</p>
                  <p className="font-semibold text-gray-800">{predictedSpecies.common_name_sinhalese}</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="text-2xl font-bold text-gray-900">{log.predicted_species_name || 'Unknown Species'}</p>
              <p className="text-sm text-gray-600 mt-2">Confidence: {Math.round(log.predicted_confidence * 100)}%</p>
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-blue-200">
            <p className="text-xs text-gray-600">User Action: <span className="font-bold text-gray-800">{log.user_action}</span></p>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Review Form - 50% */}
      <div className="w-1/2 bg-white p-8 flex flex-col border-l-4 border-blue-600 overflow-y-auto" style={{ maxHeight: '100vh' }}>
        <h2 className="text-3xl font-bold text-[#134a86] mb-6">Submit Expert Review</h2>

        {/* Help Text */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-5 rounded-xl mb-6 border border-blue-300 shadow-sm">
          <p className="text-sm font-bold text-blue-900 mb-3">📋 Review Guidelines</p>
          <ul className="text-sm text-gray-700 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✅</span>
              <span><strong>Agree:</strong> The AI prediction is correct</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-600 font-bold">✏️</span>
              <span><strong>Correct:</strong> The AI is wrong, specify the right species</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-600 font-bold">❓</span>
              <span><strong>Unsure:</strong> Not confident enough to confirm or correct</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600 font-bold">🚫</span>
              <span><strong>Not a Butterfly:</strong> This image doesn&apos;t contain a butterfly</span>
            </li>
          </ul>
        </div>

        {/* Verdict Form */}
        <div className="space-y-4 flex-1">
          <div>
            <label className="block text-base font-bold text-gray-800 mb-4">Your Verdict</label>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setVerdict('AGREE')}
                className={`py-4 px-3 rounded-xl border-2 text-sm font-medium transition-all transform hover:scale-105 ${verdict === 'AGREE' ? 'bg-green-600 text-white border-green-600 shadow-lg scale-105' : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-green-400'}`}
              >
                <div className="text-3xl mb-2">✅</div>
                <div className="text-sm font-bold">Agree</div>
              </button>
              <button 
                onClick={() => setVerdict('CORRECT')}
                className={`py-4 px-3 rounded-xl border-2 text-sm font-medium transition-all transform hover:scale-105 ${verdict === 'CORRECT' ? 'bg-orange-600 text-white border-orange-600 shadow-lg scale-105' : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-orange-400'}`}
              >
                <div className="text-3xl mb-2">✏️</div>
                <div className="text-sm font-bold">Correct</div>
              </button>
              <button 
                onClick={() => setVerdict('UNSURE')}
                className={`py-4 px-3 rounded-xl border-2 text-sm font-medium transition-all transform hover:scale-105 ${verdict === 'UNSURE' ? 'bg-yellow-500 text-white border-yellow-500 shadow-lg scale-105' : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-yellow-400'}`}
              >
                <div className="text-3xl mb-2">❓</div>
                <div className="text-sm font-bold">Unsure</div>
              </button>
              <button 
                onClick={() => setVerdict('NOT_BUTTERFLY')}
                className={`py-4 px-3 rounded-xl border-2 text-sm font-medium transition-all transform hover:scale-105 ${verdict === 'NOT_BUTTERFLY' ? 'bg-red-600 text-white border-red-600 shadow-lg scale-105' : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-red-400'}`}
              >
                <div className="text-3xl mb-2">🚫</div>
                <div className="text-sm font-bold">Not a Butterfly</div>
              </button>
            </div>
            
            {/* Explanation for selected verdict */}
            <div className="mt-4 p-4 bg-blue-50 rounded-xl border-l-4 border-blue-600">
              <p className="text-sm font-medium text-blue-900">
                {verdict === 'AGREE' && '✅ You confirm the AI prediction is correct.'}
                {verdict === 'CORRECT' && '✏️ You disagree with AI and will provide the correct species.'}
                {verdict === 'UNSURE' && '❓ You cannot confidently confirm or correct this identification.'}
                {verdict === 'NOT_BUTTERFLY' && '🚫 This image does not contain a butterfly.'}
              </p>
            </div>
          </div>

          {/* Confidence Level Selection */}
          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-5 rounded-xl border-2 border-teal-300 shadow-sm">
            <label className="block text-base font-bold text-teal-900 mb-3">
              Your Confidence Level 🎯
            </label>
            <p className="text-sm text-teal-700 mb-4">
              <strong>Important:</strong> Reviews marked as &quot;Certain&quot; may be used to improve the AI model through training.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setConfidenceLevel('certain')}
                className={`py-4 px-4 rounded-xl border-2 text-sm font-medium transition-all transform hover:scale-105 ${
                  confidenceLevel === 'certain' 
                    ? 'bg-teal-600 text-white border-teal-600 shadow-lg scale-105' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-teal-400'
                }`}
              >
                <div className="text-3xl mb-2">💯</div>
                <div className="font-bold">Certain</div>
                <div className="text-xs mt-1 opacity-90">100% confident in my identification</div>
              </button>
              <button 
                onClick={() => setConfidenceLevel('uncertain')}
                className={`py-4 px-4 rounded-xl border-2 text-sm font-medium transition-all transform hover:scale-105 ${
                  confidenceLevel === 'uncertain' 
                    ? 'bg-amber-500 text-white border-amber-500 shadow-lg scale-105' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-amber-400'
                }`}
              >
                <div className="text-3xl mb-2">🤔</div>
                <div className="font-bold">Uncertain</div>
                <div className="text-xs mt-1 opacity-90">Some doubts about identification</div>
              </button>
            </div>
            
            {/* Training Eligibility Indicator */}
            {confidenceLevel === 'certain' && verdict !== 'UNSURE' && verdict !== 'NOT_BUTTERFLY' && (
              <div className="mt-4 p-3 bg-green-100 rounded-lg border border-green-300">
                <p className="text-xs font-semibold text-green-800 flex items-center gap-2">
                  <span>🌟</span>
                  <span>This review is eligible for AI training data</span>
                </p>
              </div>
            )}
            {confidenceLevel === 'uncertain' && (
              <div className="mt-4 p-3 bg-amber-100 rounded-lg border border-amber-300">
                <p className="text-xs font-semibold text-amber-800 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>This review will not be used for AI training</span>
                </p>
              </div>
            )}
          </div>

          {/* Conditional Dropdown for Correction */}
          {verdict === 'CORRECT' && (
            <div className="bg-orange-50 p-5 rounded-xl border-2 border-orange-300 shadow-sm">
              <label className="block text-base font-bold text-orange-900 mb-4">
                Select the Correct Species
              </label>
              
              {/* Search and Filter Controls */}
              <div className="space-y-2 mb-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search species..."
                    value={speciesSearch}
                    onChange={(e) => setSpeciesSearch(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSearchFilter('all')}
                    className={`px-3 py-1 text-xs rounded-lg font-medium transition ${searchFilter === 'all' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setSearchFilter('common')}
                    className={`px-3 py-1 text-xs rounded-lg font-medium transition ${searchFilter === 'common' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    Common Name
                  </button>
                  <button
                    onClick={() => setSearchFilter('scientific')}
                    className={`px-3 py-1 text-xs rounded-lg font-medium transition ${searchFilter === 'scientific' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    Scientific Name
                  </button>
                </div>
              </div>

              <select 
                value={correctSpecies}
                onChange={(e) => setCorrectSpecies(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                size={8}
              >
                <option value="">-- Select Species ({filteredSpeciesList.length} results) --</option>
                {filteredSpeciesList.map(s => (
                  <option key={s.butterfly_id} value={s.common_name_english}>
                    {s.common_name_english} ({s.species_name_binomial})
                  </option>
                ))}
              </select>
              {filteredSpeciesList.length === 0 && speciesSearch && (
                <p className="text-xs text-red-600 mt-2">No species found matching your search.</p>
              )}
            </div>
          )}

          {/* New Discovery Toggle */}
          <div className="bg-purple-50 p-5 rounded-xl border-2 border-purple-300 shadow-sm">
            <div className="flex items-start gap-4">
              <input 
                type="checkbox" 
                id="discovery" 
                checked={isDiscovery}
                onChange={(e) => setIsDiscovery(e.target.checked)}
                className="w-6 h-6 text-purple-600 rounded mt-0.5 cursor-pointer"
              />
              <div className="flex-1">
                <label htmlFor="discovery" className="text-base font-bold text-purple-900 cursor-pointer block mb-2">
                  Flag as Potential New Discovery 🌟
                </label>
                <p className="text-sm text-purple-700">
                  Check this if you believe this might be a new species or a rare discovery not commonly documented.
                </p>
              </div>
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="block text-base font-bold text-gray-800 mb-3">
              Scientific Notes (Optional)
            </label>
            <p className="text-sm text-gray-600 mb-3">
              Add observations, reasoning, or any relevant details about your identification.
            </p>
            <textarea 
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-xl p-4 text-sm h-32 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              placeholder="E.g., Wing markings clearly show distinctive patterns typical of this species, antenna shape confirms identification..."
            />
          </div>
        </div>

        {/* Submit Button */}
        <button 
          onClick={handleSubmit}
          disabled={submitting || (verdict === 'CORRECT' && !correctSpecies)}
          className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg mt-6 transition-all transform ${
            submitting || (verdict === 'CORRECT' && !correctSpecies) 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-[#134a86] hover:bg-blue-900 hover:scale-105 active:scale-95'
          }`}
        >
          {submitting ? 'Submitting...' : 'Submit Review'}
        </button>

      </div>
      {/* End RIGHT PANEL */}

      </div>
      {/* End flex container */}

    </div>
  );
}