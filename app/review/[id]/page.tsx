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

  // Stage Navigation
  const [currentStage, setCurrentStage] = useState(1);

  // Stage 1: Image Quality State
  const [imageQualityRating, setImageQualityRating] = useState(3);
  const [wingsVisible, setWingsVisible] = useState(true);
  const [bodyVisible, setBodyVisible] = useState(true);
  const [patternsVisible, setPatternsVisible] = useState(true);
  const [antennaeVisible, setAntennaeVisible] = useState(false);

  // Stage 2: Identification State
  const [verdict, setVerdict] = useState<'AGREE' | 'CORRECT' | 'UNSURE' | 'NOT_BUTTERFLY'>('AGREE');
  const [correctSpecies, setCorrectSpecies] = useState('');
  const [isDiscovery, setIsDiscovery] = useState(false);
  const [speciesSearch, setSpeciesSearch] = useState('');
  const [searchFilter, setSearchFilter] = useState<'all' | 'common' | 'scientific'>('all');

  // Stage 3: Notes State
  const [identificationNotes, setIdentificationNotes] = useState('');

  // Image Viewer State
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Stage Navigation Helpers
  const canProceedToStage2 = () => {
    // At least one feature must be visible
    return wingsVisible || bodyVisible || patternsVisible || antennaeVisible;
  };

  const canProceedToStage3 = () => {
    // If CORRECT verdict, must select a species
    if (verdict === 'CORRECT') {
      return correctSpecies !== '';
    }
    return true;
  };

  const canSubmit = () => {
    return canProceedToStage2() && canProceedToStage3();
  };

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
      
      // Fetch user data separately
      let userData = null;
      if (logData?.user_id) {
        const { data: user } = await supabase
          .from('users')
          .select('id, first_name, last_name, profile_photo_url')
          .eq('id', logData.user_id)
          .single();
        userData = user;
      }
      
      console.log('Log Data:', logData);
      console.log('Image URL:', logData?.image_url);
      setLog({ ...logData, users: userData });

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

    if (!user) {
      alert("Error: Not logged in");
      setSubmitting(false);
      return;
    }

    // Calculate agreed_with_ai based on verdict
    const agreedWithAI = verdict === 'AGREE';

    // Get identified_species_name
    let identifiedSpeciesName: string = '';

    if (verdict === 'NOT_BUTTERFLY') {
      identifiedSpeciesName = 'Not a Butterfly';
    } else if (verdict === 'AGREE') {
      identifiedSpeciesName = predictedSpecies?.common_name_english || log.predicted_species_name;
    } else if (verdict === 'CORRECT' && correctSpecies) {
      identifiedSpeciesName = correctSpecies;
    } else if (verdict === 'UNSURE') {
      identifiedSpeciesName = 'Unsure';
    }

    const { error } = await supabase
      .from('expert_reviews')
      .insert({
        ai_log_id: id,
        reviewer_id: user.id,
        verdict: verdict,
        agreed_with_ai: agreedWithAI,
        identified_species_name: identifiedSpeciesName,
        image_quality_rating: imageQualityRating,
        wings_visible: wingsVisible,
        body_visible: bodyVisible,
        patterns_visible: patternsVisible,
        antennae_visible: antennaeVisible,
        is_new_discovery: isDiscovery,
        identification_notes: identificationNotes || null
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

  // Image Viewer Controls
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.5, 5));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.5, 0.5));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setImagePosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      setImagePosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const openViewer = () => {
    setIsViewerOpen(true);
    setZoomLevel(1);
    setImagePosition({ x: 0, y: 0 });
  };

  const closeViewer = () => {
    setIsViewerOpen(false);
    setZoomLevel(1);
    setImagePosition({ x: 0, y: 0 });
  };

  // Keyboard shortcuts for viewer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isViewerOpen) return;
      
      if (e.key === 'Escape') closeViewer();
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-') handleZoomOut();
      if (e.key === '0') handleResetZoom();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isViewerOpen, zoomLevel]);

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
        <div 
          className="bg-black rounded-xl overflow-hidden shadow-lg cursor-pointer hover:ring-4 hover:ring-blue-400 transition-all relative group"
          onClick={openViewer}
        >
          <ProtectedImage 
            src={log?.image_url || ''} 
            alt="Butterfly specimen" 
            authorName={log?.users ? `${log.users.first_name} ${log.users.last_name}` : 'LepiNet User'}
            objectFit="contain"
          />
          {/* Hover hint */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-100 transition-opacity py-6 flex items-end justify-center pointer-events-none">
            <span className="text-white text-sm font-medium">🔍 Click to view full size</span>
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
        <h2 className="text-3xl font-bold text-[#134a86] mb-2">3-Stage Expert Review</h2>
        
        {/* Stage Progress Indicator */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center flex-1">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${currentStage >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
              1
            </div>
            <div className={`flex-1 h-1 mx-2 ${currentStage >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
          </div>
          <div className="flex items-center flex-1">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${currentStage >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
              2
            </div>
            <div className={`flex-1 h-1 mx-2 ${currentStage >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
          </div>
          <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${currentStage >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
            3
          </div>
        </div>

        {/* STAGE 1: Image Quality Assessment */}
        {currentStage === 1 && (
          <div className="space-y-6 flex-1">
            <div className="bg-blue-50 p-4 rounded-xl border-l-4 border-blue-600">
              <p className="text-sm font-bold text-blue-900">📸 Stage 1: Image Quality Assessment</p>
              <p className="text-xs text-blue-700 mt-1">Evaluate the image quality and visible features</p>
            </div>

            {/* Star Rating */}
            <div>
              <label className="block text-base font-bold text-gray-800 mb-3">
                Image Quality Rating ⭐
              </label>
              <p className="text-sm text-gray-600 mb-3">Rate the overall image quality (clarity, lighting, focus)</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(rating => (
                  <button
                    key={rating}
                    onClick={() => setImageQualityRating(rating)}
                    className={`w-14 h-14 rounded-xl border-2 font-bold text-2xl transition-all transform hover:scale-110 ${
                      imageQualityRating >= rating
                        ? 'bg-yellow-400 text-white border-yellow-500 scale-105'
                        : 'bg-gray-100 text-gray-400 border-gray-300'
                    }`}
                  >
                    ⭐
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {imageQualityRating === 1 && '⭐ Very Poor - Image unusable'}
                {imageQualityRating === 2 && '⭐⭐ Poor - Difficult to identify'}
                {imageQualityRating === 3 && '⭐⭐⭐ Fair - Adequate for identification'}
                {imageQualityRating === 4 && '⭐⭐⭐⭐ Good - Clear and detailed'}
                {imageQualityRating === 5 && '⭐⭐⭐⭐⭐ Excellent - Professional quality'}
              </p>
            </div>

            {/* Visible Features Checkboxes */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-xl border-2 border-green-300">
              <label className="block text-base font-bold text-green-900 mb-3">
                Visible Features ✓
              </label>
              <p className="text-sm text-green-700 mb-4">
                Check all butterfly features that are clearly visible in the image (at least one required)
              </p>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wingsVisible}
                    onChange={(e) => setWingsVisible(e.target.checked)}
                    className="w-5 h-5 text-green-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-800">🦋 Wings visible and clear</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bodyVisible}
                    onChange={(e) => setBodyVisible(e.target.checked)}
                    className="w-5 h-5 text-green-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-800">🐛 Body visible and clear</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={patternsVisible}
                    onChange={(e) => setPatternsVisible(e.target.checked)}
                    className="w-5 h-5 text-green-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-800">🎨 Wing patterns visible</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={antennaeVisible}
                    onChange={(e) => setAntennaeVisible(e.target.checked)}
                    className="w-5 h-5 text-green-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-800">📡 Antennae visible</span>
                </label>
              </div>
              {!canProceedToStage2() && (
                <div className="mt-4 p-3 bg-red-100 rounded-lg border border-red-300">
                  <p className="text-xs font-semibold text-red-800">⚠️ Please select at least one visible feature</p>
                </div>
              )}
            </div>

            {/* Stage 1 Navigation */}
            <button
              onClick={() => setCurrentStage(2)}
              disabled={!canProceedToStage2()}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all transform ${
                canProceedToStage2()
                  ? 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Next: Identification →
            </button>
          </div>
        )}

        {/* STAGE 2: Identification */}
        {currentStage === 2 && (
          <div className="space-y-6 flex-1">
            <div className="bg-orange-50 p-4 rounded-xl border-l-4 border-orange-600">
              <p className="text-sm font-bold text-orange-900">🔍 Stage 2: Species Identification</p>
              <p className="text-xs text-orange-700 mt-1">Confirm or correct the AI prediction</p>
            </div>

            {/* Verdict Selection */}
            <div>
              <label className="block text-base font-bold text-gray-800 mb-4">Your Verdict</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setVerdict('AGREE')}
                  className={`py-4 px-3 rounded-xl border-2 text-sm font-medium transition-all transform hover:scale-105 ${
                    verdict === 'AGREE'
                      ? 'bg-green-600 text-white border-green-600 shadow-lg scale-105'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-green-400'
                  }`}
                >
                  <div className="text-3xl mb-2">✅</div>
                  <div className="text-sm font-bold">Agree</div>
                </button>
                <button
                  onClick={() => setVerdict('CORRECT')}
                  className={`py-4 px-3 rounded-xl border-2 text-sm font-medium transition-all transform hover:scale-105 ${
                    verdict === 'CORRECT'
                      ? 'bg-orange-600 text-white border-orange-600 shadow-lg scale-105'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-orange-400'
                  }`}
                >
                  <div className="text-3xl mb-2">✏️</div>
                  <div className="text-sm font-bold">Correct</div>
                </button>
                <button
                  onClick={() => setVerdict('UNSURE')}
                  className={`py-4 px-3 rounded-xl border-2 text-sm font-medium transition-all transform hover:scale-105 ${
                    verdict === 'UNSURE'
                      ? 'bg-yellow-500 text-white border-yellow-500 shadow-lg scale-105'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-yellow-400'
                  }`}
                >
                  <div className="text-3xl mb-2">❓</div>
                  <div className="text-sm font-bold">Unsure</div>
                </button>
                <button
                  onClick={() => setVerdict('NOT_BUTTERFLY')}
                  className={`py-4 px-3 rounded-xl border-2 text-sm font-medium transition-all transform hover:scale-105 ${
                    verdict === 'NOT_BUTTERFLY'
                      ? 'bg-red-600 text-white border-red-600 shadow-lg scale-105'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-red-400'
                  }`}
                >
                  <div className="text-3xl mb-2">🚫</div>
                  <div className="text-sm font-bold">Not a Butterfly</div>
                </button>
              </div>

              {/* Explanation */}
              <div className="mt-4 p-4 bg-blue-50 rounded-xl border-l-4 border-blue-600">
                <p className="text-sm font-medium text-blue-900">
                  {verdict === 'AGREE' && '✅ You confirm the AI prediction is correct.'}
                  {verdict === 'CORRECT' && '✏️ You disagree with AI and will provide the correct species.'}
                  {verdict === 'UNSURE' && '❓ You cannot confidently confirm or correct this identification.'}
                  {verdict === 'NOT_BUTTERFLY' && '🚫 This image does not contain a butterfly.'}
                </p>
              </div>
            </div>

            {/* Conditional Species Dropdown */}
            {verdict === 'CORRECT' && (
              <div className="bg-orange-50 p-5 rounded-xl border-2 border-orange-300">
                <label className="block text-base font-bold text-orange-900 mb-4">
                  Select the Correct Species
                </label>

                {/* Search and Filter */}
                <div className="space-y-2 mb-3">
                  <input
                    type="text"
                    placeholder="Search species..."
                    value={speciesSearch}
                    onChange={(e) => setSpeciesSearch(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSearchFilter('all')}
                      className={`px-3 py-1 text-xs rounded-lg font-medium transition ${
                        searchFilter === 'all' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setSearchFilter('common')}
                      className={`px-3 py-1 text-xs rounded-lg font-medium transition ${
                        searchFilter === 'common' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      Common Name
                    </button>
                    <button
                      onClick={() => setSearchFilter('scientific')}
                      className={`px-3 py-1 text-xs rounded-lg font-medium transition ${
                        searchFilter === 'scientific' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      Scientific Name
                    </button>
                  </div>
                </div>

                <select
                  value={correctSpecies}
                  onChange={(e) => setCorrectSpecies(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500"
                  size={8}
                >
                  <option value="">-- Select Species ({filteredSpeciesList.length} results) --</option>
                  {filteredSpeciesList.map(s => (
                    <option key={s.butterfly_id} value={s.common_name_english}>
                      {s.common_name_english} ({s.species_name_binomial})
                    </option>
                  ))}
                </select>
                {!canProceedToStage3() && (
                  <p className="text-xs text-red-600 mt-2">⚠️ Please select a species to proceed</p>
                )}
              </div>
            )}

            {/* New Discovery Toggle */}
            <div className="bg-purple-50 p-5 rounded-xl border-2 border-purple-300">
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
                    Check this if you believe this might be a new species or rare discovery.
                  </p>
                </div>
              </div>
            </div>

            {/* Stage 2 Navigation */}
            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStage(1)}
                className="flex-1 py-3 rounded-xl font-bold text-gray-700 bg-gray-200 hover:bg-gray-300 transition"
              >
                ← Back
              </button>
              <button
                onClick={() => setCurrentStage(3)}
                disabled={!canProceedToStage3()}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                  canProceedToStage3()
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Next: Summary →
              </button>
            </div>
          </div>
        )}

        {/* STAGE 3: Summary & Notes */}
        {currentStage === 3 && (
          <div className="space-y-6 flex-1">
            <div className="bg-green-50 p-4 rounded-xl border-l-4 border-green-600">
              <p className="text-sm font-bold text-green-900">📝 Stage 3: Final Review & Notes</p>
              <p className="text-xs text-green-700 mt-1">Review your assessment and add notes</p>
            </div>

            {/* Review Summary */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border-2 border-blue-300">
              <p className="text-base font-bold text-blue-900 mb-4">Review Summary</p>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Image Quality:</span>
                  <span className="font-bold text-gray-900">{'⭐'.repeat(imageQualityRating)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Visible Features:</span>
                  <span className="font-bold text-gray-900">
                    {[wingsVisible && 'Wings', bodyVisible && 'Body', patternsVisible && 'Patterns', 
                      antennaeVisible && 'Antennae']
                      .filter(Boolean).join(', ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Verdict:</span>
                  <span className="font-bold text-gray-900">
                    {verdict === 'AGREE' && '✅ Agree'}
                    {verdict === 'CORRECT' && '✏️ Correct'}
                    {verdict === 'UNSURE' && '❓ Unsure'}
                    {verdict === 'NOT_BUTTERFLY' && '🚫 Not a Butterfly'}
                  </span>
                </div>
                {verdict === 'CORRECT' && correctSpecies && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Correct Species:</span>
                    <span className="font-bold text-gray-900">{correctSpecies}</span>
                  </div>
                )}
                {isDiscovery && (
                  <div className="pt-2 border-t border-blue-200">
                    <span className="text-purple-600 font-bold">🌟 Flagged as potential new discovery</span>
                  </div>
                )}
              </div>
            </div>

            {/* Identification Notes */}
            <div>
              <label className="block text-base font-bold text-gray-800 mb-3">
                Identification Notes (Optional)
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Add observations, reasoning, or relevant details about your identification.
              </p>
              <textarea
                value={identificationNotes}
                onChange={(e) => setIdentificationNotes(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-xl p-4 text-sm h-32 focus:ring-2 focus:ring-blue-500"
                placeholder="E.g., Wing markings clearly show distinctive patterns typical of this species..."
              />
            </div>

            {/* Stage 3 Navigation */}
            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStage(2)}
                className="flex-1 py-3 rounded-xl font-bold text-gray-700 bg-gray-200 hover:bg-gray-300 transition"
              >
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !canSubmit()}
                className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all transform ${
                  submitting || !canSubmit()
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700 hover:scale-105'
                }`}
              >
                {submitting ? 'Submitting...' : 'Submit Review ✓'}
              </button>
            </div>
          </div>
        )}
      </div>
      {/* End RIGHT PANEL */}

      </div>
      {/* End flex container */}

      {/* Image Zoom Viewer Modal */}
      {isViewerOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center"
          onClick={closeViewer}
        >
          {/* Close Button */}
          <button
            onClick={closeViewer}
            className="absolute top-4 right-4 bg-white text-gray-800 px-4 py-2 rounded-lg font-bold hover:bg-gray-200 transition z-50"
          >
            ✕ Close (ESC)
          </button>

          {/* Zoom Controls */}
          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-2 flex flex-col gap-2 z-50">
            <button
              onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
              title="Zoom In (+)"
            >
              🔍 +
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
              title="Zoom Out (-)"
            >
              🔍 -
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleResetZoom(); }}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg font-bold hover:bg-gray-700 transition"
              title="Reset (0)"
            >
              ⟲ Reset
            </button>
            <div className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg text-center font-bold text-sm">
              {Math.round(zoomLevel * 100)}%
            </div>
          </div>

          {/* Zoom Instructions */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-90 rounded-lg shadow-lg px-6 py-3 z-50">
            <p className="text-sm text-gray-800 font-medium">
              <span className="font-bold">🖱️ Mouse Wheel:</span> Zoom In/Out |
              <span className="font-bold ml-2">⌨️ Keyboard:</span> + / - (Zoom) | 0 (Reset) | ESC (Close)
              {zoomLevel > 1 && <span className="ml-2 font-bold text-blue-600">| 🖐️ Drag to Pan</span>}
            </p>
          </div>

          {/* Image Container */}
          <div 
            className="relative overflow-hidden flex items-center justify-center bg-black"
            style={{ 
              width: '85vw', 
              height: '85vh', 
              cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={(e) => {
              e.preventDefault();
              if (e.deltaY < 0) handleZoomIn();
              else handleZoomOut();
            }}
          >
            <div
              style={{
                transform: `scale(${zoomLevel}) translate(${imagePosition.x / zoomLevel}px, ${imagePosition.y / zoomLevel}px)`,
                transition: isDragging ? 'none' : 'transform 0.3s ease-out',
                transformOrigin: 'center center',
                maxWidth: '100%',
                maxHeight: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <img
                src={log.image_url}
                alt="Specimen - Detailed View"
                onContextMenu={(e) => e.preventDefault()}
                style={{
                  maxWidth: '100%',
                  maxHeight: '85vh',
                  objectFit: 'contain',
                  display: 'block',
                  userSelect: 'none'
                }}
                draggable={false}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}