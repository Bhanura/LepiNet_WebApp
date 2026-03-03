'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

// ─── Types ────────────────────────────────────────────────────────────────────

type ReadySummary = {
  speciesName: string;
  count: number;
};

type ModelEvaluation = {
  id: string;
  model_version: string;
  accuracy: number;
  f1_score: number;
  confusion_matrix_url: string;
  created_at: string;
};

type ModelVersion = {
  id: string;
  version_name: string;
  file_path: string;
  training_image_count: number;
  accuracy_score: number;
  is_active: boolean;
  created_at: string;
  evaluation?: ModelEvaluation; // Joined evaluation data
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AIControlPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(true);
  
  // Data States
  const [readySummary, setReadySummary] = useState<ReadySummary[]>([]);
  const [modelHistory, setModelHistory] = useState<ModelVersion[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelVersion | null>(null);

  // Training States
  const [epochs, setEpochs] = useState(5);
  const [lr, setLr] = useState(0.001);
  const [batchSize, setBatchSize] = useState(16);
  const [adminSecret, setAdminSecret] = useState('');
  const [isTraining, setIsTraining] = useState(false);
  const [trainMessage, setTrainMessage] = useState<{text: string, type: 'success'|'error'|'info'} | null>(null);

  // ─── Fetch Data ─────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/login');

    // Admin Verification
    const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (userData?.role !== 'admin') return router.push('/');

    // 1. Fetch Ready Images Summary
    const { data: readyLogs } = await supabase
      .from('ai_logs_with_stats')
      .select('final_common_name, final_species_id')
      .eq('training_status', 'ready');

    if (readyLogs) {
      const summaryMap = new Map<string, number>();
      readyLogs.forEach(log => {
        const name = log.final_common_name || log.final_species_id || 'Unknown';
        summaryMap.set(name, (summaryMap.get(name) || 0) + 1);
      });
      const summaryArray = Array.from(summaryMap, ([speciesName, count]) => ({ speciesName, count }));
      summaryArray.sort((a, b) => b.count - a.count); // Sort by highest count
      setReadySummary(summaryArray);
    }

    // 2. Fetch Model Versions & Evaluations
    const { data: versions } = await supabase.from('model_versions').select('*').order('created_at', { ascending: false });
    const { data: evaluations } = await supabase.from('model_evaluations').select('*');

    if (versions) {
      const enrichedVersions = versions.map(v => ({
        ...v,
        evaluation: evaluations?.find(e => e.model_version === v.version_name)
      }));
      setModelHistory(enrichedVersions);
    }

    setLoading(false);
  }, [router, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Trigger Training ───────────────────────────────────────────────────────

  const handleStartTraining = async () => {
    if (!adminSecret) {
      setTrainMessage({ text: "Admin Secret Password is required!", type: 'error' });
      return;
    }
    
    const totalReady = readySummary.reduce((sum, item) => sum + item.count, 0);
    if (totalReady === 0) {
      setTrainMessage({ text: "No 'Ready' images available for training.", type: 'error' });
      return;
    }

    setIsTraining(true);
    setTrainMessage({ text: "Initiating fine-tuning process... Please wait.", type: 'info' });

    try {
      const response = await fetch("https://bhanura-lepinet-backend.hf.space/trigger-training", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminSecret}`
        },
        body: JSON.stringify({ epochs, learning_rate: lr, batch_size: batchSize })
      });

      if (response.ok) {
        setTrainMessage({ text: "Training successfully started in the background! The model will update automatically.", type: 'success' });
        setAdminSecret(''); 
      } else {
        const err = await response.json();
        setTrainMessage({ text: `Failed: ${err.detail || 'Unauthorized'}`, type: 'error' });
      }
    } catch (error) {
      setTrainMessage({ text: "Network error. AI Server might be offline.", type: 'error' });
    }
    setIsTraining(false);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) return <div className="flex justify-center items-center min-h-screen"><div className="text-gray-500">Loading AI Control Center...</div></div>;

  const totalReadyImages = readySummary.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      
      {/* ── Page Header & Navigation ── */}
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Control Center</h1>
          <p className="text-sm text-gray-500 mt-1">Manage, Fine-Tune, and Evaluate LepiNet AI Models</p>
        </div>
        <button 
          onClick={() => router.push('/admin/training')}
          className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm"
        >
          ← Back to Curator Page
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* ── Section 1: Ready Images Summary ── */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col h-[400px]">
          <h2 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-600 p-1.5 rounded-lg">🦋</span>
            Ready for Training
          </h2>
          <div className="text-sm text-gray-500 mb-4">
            Total Images: <span className="font-bold text-blue-600 text-lg">{totalReadyImages}</span>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 border border-gray-100 rounded-xl bg-gray-50 p-2">
            {readySummary.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">No images approved yet.</div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-100 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 rounded-tl-lg">Species</th>
                    <th className="px-3 py-2 text-right rounded-tr-lg">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {readySummary.map((item, idx) => (
                    <tr key={idx} className="bg-white">
                      <td className="px-3 py-2 font-medium text-gray-700">{item.speciesName}</td>
                      <td className="px-3 py-2 text-right text-gray-600 font-semibold">{item.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Section 2: Hyperparameters & Trigger ── */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 h-[400px] flex flex-col">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="bg-purple-100 text-purple-600 p-1.5 rounded-lg">⚙️</span>
            Fine-Tuning Configuration
          </h2>
          
          <div className="grid grid-cols-3 gap-6 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Epochs (Passes)</label>
              <input type="number" value={epochs} onChange={e => setEpochs(Number(e.target.value))} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Learning Rate</label>
              <input type="number" step="0.0001" value={lr} onChange={e => setLr(Number(e.target.value))} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Batch Size</label>
              <input type="number" value={batchSize} onChange={e => setBatchSize(Number(e.target.value))} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" />
            </div>
          </div>

          <div className="mt-auto">
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Admin Authorization</label>
            <div className="flex gap-4">
              <input 
                type="password" 
                placeholder="Enter Admin Secret..." 
                value={adminSecret} 
                onChange={e => setAdminSecret(e.target.value)} 
                className="flex-1 border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500"
              />
              <button 
                onClick={handleStartTraining}
                disabled={isTraining || totalReadyImages === 0}
                className={`px-8 py-2.5 rounded-lg font-bold text-white transition-all shadow-md ${
                  isTraining || totalReadyImages === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 hover:shadow-lg'
                }`}
              >
                {isTraining ? 'Initializing...' : '🚀 Start Training'}
              </button>
            </div>
          </div>

          {trainMessage && (
            <div className={`mt-4 p-3 rounded-lg text-sm font-medium border ${
              trainMessage.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
              trainMessage.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' :
              'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              {trainMessage.text}
            </div>
          )}
        </div>
      </div>

      {/* ── Section 3: Model Versions History Table ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
          <span className="bg-green-100 text-green-600 p-1.5 rounded-lg">📊</span>
          Model Version History
        </h2>

        {modelHistory.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No models have been trained yet.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-4">Version Name</th>
                  <th className="px-6 py-4">Date Trained</th>
                  <th className="px-6 py-4 text-center">Images Used</th>
                  <th className="px-6 py-4 text-center">Accuracy</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {modelHistory.map((model) => (
                  <tr key={model.id} className="bg-white hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{model.version_name}</td>
                    <td className="px-6 py-4 text-gray-600">{new Date(model.created_at).toLocaleString()}</td>
                    <td className="px-6 py-4 text-center text-gray-600">{model.training_image_count || 0}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-blue-50 text-blue-700 font-semibold px-2.5 py-1 rounded-full">
                        {model.accuracy_score ? `${model.accuracy_score.toFixed(1)}%` : 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {model.is_active ? (
                        <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">ACTIVE</span>
                      ) : (
                        <span className="bg-gray-100 text-gray-500 text-xs font-bold px-3 py-1 rounded-full">INACTIVE</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {model.evaluation ? (
                        <button 
                          onClick={() => setSelectedModel(model)}
                          className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                        >
                          View Details
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">No Data</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal Popup for Evaluation Details ── */}
      {selectedModel && selectedModel.evaluation && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setSelectedModel(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6 border-b pb-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Evaluation Details</h3>
                <p className="text-gray-500 mt-1">Model Version: <span className="font-bold text-gray-800">{selectedModel.version_name}</span></p>
              </div>
              <button onClick={() => setSelectedModel(null)} className="text-gray-400 hover:text-gray-800 text-2xl leading-none">×</button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-xl text-center border border-blue-100">
                <div className="text-sm text-blue-600 uppercase font-bold tracking-wider mb-1">Accuracy</div>
                <div className="text-3xl font-black text-blue-800">{selectedModel.evaluation.accuracy.toFixed(1)}%</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-xl text-center border border-purple-100">
                <div className="text-sm text-purple-600 uppercase font-bold tracking-wider mb-1">F1 Score</div>
                <div className="text-3xl font-black text-purple-800">{selectedModel.evaluation.f1_score.toFixed(3)}</div>
              </div>
            </div>

            {selectedModel.evaluation.confusion_matrix_url && (
              <div>
                <h4 className="font-bold text-gray-700 mb-2">Confusion Matrix Plot</h4>
                <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden flex justify-center p-2">
                  <img 
                    src={selectedModel.evaluation.confusion_matrix_url} 
                    alt={`Confusion Matrix for ${selectedModel.version_name}`} 
                    className="max-h-[400px] object-contain"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}