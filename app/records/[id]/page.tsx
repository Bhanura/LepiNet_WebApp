'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useParams } from 'next/navigation';
import ProtectedImage from '@/components/ProtectedImage';

export default function RecordDetail() {
  const { id } = useParams();
  const [record, setRecord] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // 1. Fetch Record
      const { data: rec } = await supabase.from('ai_logs').select('*').eq('id', id).single();
      setRecord(rec);

      // 2. Fetch Reviews + Ratings Count
      // Note: In a real production app, we'd use a SQL View or Join for ratings. 
      // Here we fetch simple reviews for simplicity.
      const { data: revs } = await supabase
        .from('expert_reviews')
        .select(`
          *,
          reviewer:users (first_name, last_name, profession)
        `)
        .eq('ai_log_id', id)
        .order('created_at', { ascending: false });

      // 3. Fetch Vote Counts manually for now
      if (revs) {
        const reviewsWithVotes = await Promise.all(revs.map(async (r) => {
          const { count } = await supabase
            .from('review_ratings')
            .select('*', { count: 'exact', head: true })
            .eq('review_id', r.id)
            .eq('is_helpful', true);
          return { ...r, helpful_count: count || 0 };
        }));
        setReviews(reviewsWithVotes);
      }
      
      setLoading(false);
    };
    init();
  }, [id]);

  // --- ACTIONS ---

  const handleVote = async (reviewId: string) => {
    if (!currentUser) return alert("Please login to vote");

    const { error } = await supabase
      .from('review_ratings')
      .insert({ review_id: reviewId, rater_id: currentUser.id, is_helpful: true });

    if (error) {
      if (error.code === '23505') alert("You already voted!"); // Unique constraint error
      else alert("Error voting");
    } else {
      // Optimistic update
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, helpful_count: r.helpful_count + 1 } : r));
    }
  };

  if (loading || !record) return <div className="p-10 text-center">Loading Record...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
        
        {/* Left: Image */}
        <div className="space-y-6">
          <div className="bg-black rounded-xl overflow-hidden shadow-lg">
             <ProtectedImage src={record.image_url} alt="Butterfly" authorName="LepiNet User" />
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-bold mb-2">Metadata</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
               <div>
                 <p className="text-gray-500">AI Prediction</p>
                 <p className="font-semibold">{record.predicted_species_name}</p>
               </div>
               <div>
                 <p className="text-gray-500">Confidence</p>
                 <p className="font-semibold">{Math.round(record.predicted_confidence * 100)}%</p>
               </div>
               <div>
                 <p className="text-gray-500">Date</p>
                 <p className="font-semibold">{new Date(record.created_at).toLocaleDateString()}</p>
               </div>
            </div>
          </div>
        </div>

        {/* Right: Expert Reviews */}
        <div>
          <h2 className="text-2xl font-bold text-[#134a86] mb-6">Expert Reviews ({reviews.length})</h2>

          <div className="space-y-4">
            {reviews.length === 0 ? (
              <p className="text-gray-500 italic">No experts have reviewed this yet.</p>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                       <div className="bg-blue-100 text-blue-800 w-8 h-8 rounded-full flex items-center justify-center font-bold">
                         {review.reviewer?.first_name[0]}
                       </div>
                       <div>
                         <p className="font-bold text-sm">{review.reviewer?.first_name} {review.reviewer?.last_name}</p>
                         <p className="text-xs text-gray-500">{review.reviewer?.profession}</p>
                       </div>
                    </div>
                    {review.is_new_discovery && (
                      <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded font-bold">🌟 Discovery</span>
                    )}
                  </div>

                  <div className="mb-3">
                    <span className={`text-sm font-bold ${review.agreed_with_ai ? 'text-green-600' : 'text-orange-600'}`}>
                       {review.agreed_with_ai ? "✅ Agreed with AI" : `✏️ Identification: ${review.identified_species_name}`}
                    </span>
                  </div>

                  <p className="text-gray-700 text-sm mb-4 bg-gray-50 p-3 rounded">
                    "{review.comments || "No comments provided."}"
                  </p>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                     <button 
                       onClick={() => handleVote(review.id)}
                       className="flex items-center gap-1 hover:text-blue-600 transition"
                     >
                       👍 Helpful ({review.helpful_count})
                     </button>
                     <span>{new Date(review.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}