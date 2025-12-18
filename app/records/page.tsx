'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import ProtectedImage from '@/components/ProtectedImage';

export default function RecordsGallery() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchRecords();
  }, [search]); // Re-run when search changes (debounce this in production)

  const fetchRecords = async () => {
    let query = supabase
      .from('ai_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (search) {
      // Simple text search on species name
      query = query.ilike('predicted_species_name', `%${search}%`);
    }

    const { data, error } = await query;
    if (!error) setRecords(data || []);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold text-[#134a86]">Biodiversity Records</h1>
          
          {/* Search Bar */}
          <input 
            type="text" 
            placeholder="Search species..." 
            className="p-3 rounded-lg border border-gray-300 w-full md:w-80"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {records.map((rec) => (
            <Link key={rec.id} href={`/records/${rec.id}`} className="block group">
              <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition border border-gray-100">
                <div className="h-56 relative bg-gray-200">
                   {/* Using standard img for list view performance, or ProtectedImage */}
                   <img src={rec.image_url} alt="Butterfly" className="w-full h-full object-cover" />
                   {rec.final_species_name && (
                     <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded shadow">
                       Verified
                     </div>
                   )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-800 group-hover:text-[#134a86] transition">
                    {rec.final_species_name || rec.predicted_species_name}
                  </h3>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-500">ID: {rec.predicted_id}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {Math.round(rec.predicted_confidence * 100)}% Match
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}