'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedImage from '@/components/ProtectedImage';

export default function RecordDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [record, setRecord] = useState<any>(null);
  const [predictedSpecies, setPredictedSpecies] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState<{[key: string]: string}>({});
  const [commentingOn, setCommentingOn] = useState<string | null>(null);
  const [showCommentsFor, setShowCommentsFor] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchReviews = async () => {
    console.log('Fetching reviews for record:', id);
    // Fetch Reviews with reviewer info
    const { data: revs, error: reviewError } = await supabase
      .from('expert_reviews')
      .select(`
        *,
        reviewer:users!reviewer_id (id, first_name, last_name, profession, profile_photo_url)
      `)
      .eq('ai_log_id', id)
      .order('created_at', { ascending: false });

    if (reviewError) {
      console.error('Error fetching reviews:', reviewError);
      return;
    }

    console.log('Fetched reviews:', revs);

    // Fetch Vote Counts and Comments for each review
    if (revs) {
      const reviewsWithData = await Promise.all(revs.map(async (r) => {
        // Get vote count
        const { count } = await supabase
          .from('review_ratings')
          .select('*', { count: 'exact', head: true })
          .eq('review_id', r.id)
          .eq('is_helpful', true);
        
        // Get comments with commenter info
        const { data: comments, error: commentsError } = await supabase
          .from('review_comments')
          .select(`
            id,
            comment_text,
            created_at,
            commenter:users!commenter_id (id, first_name, last_name, profession, profile_photo_url)
          `)
          .eq('review_id', r.id)
          .order('created_at', { ascending: true });
        
        if (commentsError) {
          console.error('Error fetching comments for review', r.id, ':', commentsError);
        } else {
          console.log('Comments for review', r.id, ':', comments);
        }
        
        return { ...r, helpful_count: count || 0, review_comments: comments || [] };
      }));
      console.log('Reviews with votes and comments:', reviewsWithData);
      setReviews(reviewsWithData);
    }
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      if (user) {
        // Fetch user profile to check if verified expert
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        setUserProfile(profile);
      }

      // 1. Fetch Record
      const { data: rec } = await supabase.from('ai_logs').select('*').eq('id', id).single();
      setRecord(rec);

      // 1.5 Fetch predicted species details
      if (rec?.predicted_id) {
        const { data: species } = await supabase
          .from('species')
          .select('*')
          .eq('butterfly_id', rec.predicted_id)
          .single();
        setPredictedSpecies(species);
      }

      // 2. Fetch Reviews
      await fetchReviews();
      
      setLoading(false);
    };
    init();

    // Refetch reviews when window regains focus (user returns from review page)
    const handleFocus = () => {
      fetchReviews();
    };
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
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

  const handleComment = async (reviewId: string) => {
    if (!currentUser) return alert("Please login to comment");
    if (userProfile?.verification_status !== 'verified') return alert("Only verified experts can comment");
    
    const comment = commentText[reviewId]?.trim();
    if (!comment) return alert("Please enter a comment");

    const { error } = await supabase
      .from('review_comments')
      .insert({ review_id: reviewId, commenter_id: currentUser.id, comment_text: comment });

    if (error) {
      console.error('Comment error:', error);
      alert("Failed to post comment: " + error.message);
    } else {
      alert("Comment posted successfully!");
      setCommentText(prev => ({ ...prev, [reviewId]: '' }));
      setCommentingOn(null);
      // Refresh reviews to show new comment count
      await fetchReviews();
    }
  };

  if (loading || !record) return <div className="p-10 text-center">Loading Record...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Navigation */}
      <div className="max-w-5xl mx-auto mb-4">
        <Link
          href="/records"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 border border-gray-300 transition-all"
        >
          <span>←</span>
          <span>Back to Records</span>
        </Link>
      </div>

      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
        
        {/* Left: Image */}
        <div className="space-y-6">
          <div className="bg-black rounded-xl overflow-hidden shadow-lg">
             <ProtectedImage src={record.image_url} alt="Butterfly" authorName="LepiNet User" />
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-bold mb-4">AI Prediction Details</h2>
            {predictedSpecies ? (
              <div className="space-y-3">
                <div>
                  <p className="text-gray-500 text-sm">Common Name</p>
                  <p className="font-bold text-lg text-gray-800">{predictedSpecies.common_name_english}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Scientific Name</p>
                  <p className="font-semibold italic text-gray-700">{predictedSpecies.species_name_binomial}</p>
                  {predictedSpecies.species_name_trinomial && (
                    <p className="text-sm italic text-gray-600">{predictedSpecies.species_name_trinomial}</p>
                  )}
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Family</p>
                  <p className="font-semibold text-gray-700">{predictedSpecies.family}</p>
                </div>
                {predictedSpecies.common_name_sinhalese && (
                  <div>
                    <p className="text-gray-500 text-sm">Sinhala Name</p>
                    <p className="font-semibold text-gray-700">{predictedSpecies.common_name_sinhalese}</p>
                  </div>
                )}
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-gray-500 text-sm">AI Confidence</p>
                  <p className="font-bold text-blue-600">{Math.round(record.predicted_confidence * 100)}%</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Date Uploaded</p>
                  <p className="font-semibold text-gray-700">{new Date(record.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-gray-500 text-sm">AI Prediction</p>
                  <p className="font-semibold">{record.predicted_species_name || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Confidence</p>
                  <p className="font-semibold">{Math.round(record.predicted_confidence * 100)}%</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Date</p>
                  <p className="font-semibold">{new Date(record.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Expert Reviews */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[#134a86]">Expert Reviews ({reviews.length})</h2>
            {userProfile?.verification_status === 'verified' && (
              <Link
                href={`/review/${id}`}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all flex items-center gap-2"
              >
                <span>✍️</span>
                <span>Add Review</span>
              </Link>
            )}
          </div>

          <div className="space-y-4">
            {reviews.length === 0 ? (
              <p className="text-gray-500 italic">No experts have reviewed this yet.</p>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                       {review.reviewer?.profile_photo_url ? (
                         <img
                           src={review.reviewer.profile_photo_url}
                           alt={`${review.reviewer.first_name} ${review.reviewer.last_name}`}
                           className="w-8 h-8 rounded-full object-cover border-2 border-blue-200"
                         />
                       ) : (
                         <div className="bg-blue-100 text-blue-800 w-8 h-8 rounded-full flex items-center justify-center font-bold">
                           {review.reviewer?.first_name[0]}
                         </div>
                       )}
                       <div>
                         <Link 
                           href={`/profile/${review.reviewer?.id}`}
                           className="font-bold text-sm hover:text-blue-600 transition-colors cursor-pointer"
                         >
                           {review.reviewer?.first_name} {review.reviewer?.last_name}
                         </Link>
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
                     {userProfile?.verification_status === 'verified' && (
                       <button
                         onClick={() => setCommentingOn(commentingOn === review.id ? null : review.id)}
                         className="flex items-center gap-1 hover:text-green-600 transition"
                       >
                         💬 Comment ({review.review_comments?.length || 0})
                       </button>
                     )}
                     {review.review_comments && review.review_comments.length > 0 && (
                       <button
                         onClick={() => setShowCommentsFor(showCommentsFor === review.id ? null : review.id)}
                         className="flex items-center gap-1 hover:text-indigo-600 transition font-medium"
                       >
                         {showCommentsFor === review.id ? '▼ Hide' : '▶ View'} Comments ({review.review_comments.length})
                       </button>
                     )}
                     <span>{new Date(review.created_at).toLocaleDateString()}</span>
                  </div>

                  {/* Comment Form */}
                  {commentingOn === review.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <textarea
                        value={commentText[review.id] || ''}
                        onChange={(e) => setCommentText(prev => ({ ...prev, [review.id]: e.target.value }))}
                        placeholder="Add your expert comment..."
                        className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleComment(review.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                        >
                          Post Comment
                        </button>
                        <button
                          onClick={() => {
                            setCommentingOn(null);
                            setCommentText(prev => ({ ...prev, [review.id]: '' }));
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Display Comments */}
                  {showCommentsFor === review.id && review.review_comments && Array.isArray(review.review_comments) && review.review_comments.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Comments ({review.review_comments.length})
                      </p>
                      {review.review_comments.map((comment: any) => {
                        if (!comment || typeof comment !== 'object') return null;
                        
                        const commenterName = String(comment.commenter?.first_name || 'Unknown');
                        const commenterLastName = String(comment.commenter?.last_name || '');
                        const commenterProfession = String(comment.commenter?.profession || 'Expert');
                        const commenterInitial = commenterName.charAt(0) || '?';
                        const commentText = String(comment.comment_text || '');
                        const commentId = String(comment.id || Math.random());
                        const commenterProfilePhoto = comment.commenter?.profile_photo_url;
                        const commenterId = comment.commenter?.id;
                        
                        return (
                          <div key={commentId} className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-start gap-2">
                              {commenterProfilePhoto ? (
                                <img
                                  src={commenterProfilePhoto}
                                  alt={`${commenterName} ${commenterLastName}`}
                                  className="w-7 h-7 rounded-full object-cover border-2 border-green-200 flex-shrink-0"
                                />
                              ) : (
                                <div className="bg-green-100 text-green-800 w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">
                                  {commenterInitial}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Link
                                    href={`/profile/${commenterId}`}
                                    className="font-semibold text-sm text-gray-800 hover:text-green-600 transition-colors cursor-pointer"
                                  >
                                    {commenterName} {commenterLastName}
                                  </Link>
                                  <span className="text-xs text-gray-500">•</span>
                                  <p className="text-xs text-gray-500">{commenterProfession}</p>
                                </div>
                                <p className="text-sm text-gray-700">{commentText}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(comment.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}