'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function UserDashboard() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [myRecords, setMyRecords] = useState<any[]>([]);
  const [myReviews, setMyReviews] = useState<any[]>([]);
  const [myReviewsCount, setMyReviewsCount] = useState(0);
  const [myReviewStats, setMyReviewStats] = useState({
    AGREE: 0,
    CORRECT: 0,
    UNSURE: 0,
    NOT_BUTTERFLY: 0,
  });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'records' | 'reviews'>('overview');
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/login');
    setUser(user);

    // 1. Get Profile
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    setProfile(profile);

    // 2. Get My Records
    const { data: records } = await supabase
      .from('ai_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setMyRecords(records || []);

    // 3. Get My Reviews (if verified expert)
    if (profile?.verification_status === 'verified') {
      const [reviewsResult, countResult] = await Promise.all([
        supabase
          .from('expert_reviews')
          .select(`
            id,
            ai_log_id,
            reviewer_id,
            verdict,
            agreed_with_ai,
            identified_species_name,
            is_new_discovery,
            identification_notes,
            created_at,
            image_quality_rating,
            ai_log:ai_logs(id, image_url, predicted_id, final_species_id, created_at)
          `)
          .eq('reviewer_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('expert_reviews')
          .select('id', { count: 'exact', head: true })
          .eq('reviewer_id', user.id),
      ]);

      if (reviewsResult.error) {
        console.error('Error loading my reviews:', reviewsResult.error);
        setMyReviews([]);
        setMyReviewsCount(0);
      } else {
        const reviews = reviewsResult.data || [];
        setMyReviews(reviews);
        setMyReviewsCount(countResult.count ?? reviews.length);

        const verdictStats = reviews.reduce(
          (acc: { AGREE: number; CORRECT: number; UNSURE: number; NOT_BUTTERFLY: number }, review: any) => {
            const currentVerdict = review?.verdict as 'AGREE' | 'CORRECT' | 'UNSURE' | 'NOT_BUTTERFLY' | null;
            if (currentVerdict && acc[currentVerdict] !== undefined) {
              acc[currentVerdict] += 1;
            }
            return acc;
          },
          { AGREE: 0, CORRECT: 0, UNSURE: 0, NOT_BUTTERFLY: 0 }
        );
        setMyReviewStats(verdictStats);
      }
    }

    // 4. Get Notifications
    const { data: notifs } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    setNotifications(notifs || []);
    
    setLoading(false);
  };

  const markNotificationAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, is_read: true } : n
    ));
  };

  const isVerifiedExpert = profile?.verification_status === 'verified';

  if (loading) return <div className="p-10 text-center">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#134a86]">
            {isVerifiedExpert ? 'Expert Dashboard' : 'My Dashboard'}
          </h1>
          <p className="text-gray-600">
            Welcome back, {profile?.first_name || 'contributor'}!
          </p>
          {isVerifiedExpert && (
            <span className="inline-block mt-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
              ✓ Verified Expert
            </span>
          )}
        </div>

        {/* Expert Application Card for non-verified users */}
        {!isVerifiedExpert && profile?.verification_status !== 'pending' && (
          <div className="mb-8 bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl shadow-sm border border-blue-200">
            <div className="flex items-center gap-4">
              <div className="bg-blue-500 p-4 rounded-full text-white text-2xl">🎓</div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-800">Become an Expert Reviewer</h3>
                <p className="text-gray-600 mb-3">
                  Share your expertise and help validate butterfly observations
                </p>
                {profile?.verification_status === 'rejected' ? (
                  <span className="text-sm text-red-600 font-medium">
                    Your previous application was rejected. Please contact an administrator for more information.
                  </span>
                ) : (
                  <Link 
                    href="/expert-application" 
                    className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Apply Now →
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {profile?.verification_status === 'pending' && (
          <div className="mb-8 bg-yellow-50 p-6 rounded-xl shadow-sm border border-yellow-200">
            <div className="flex items-center gap-4">
              <div className="text-3xl">⏳</div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Application Under Review</h3>
                <p className="text-gray-600">
                  Your expert verification request is being reviewed by our administrators.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="bg-purple-100 p-3 rounded-full text-purple-600 text-2xl">📸</div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{myRecords.length}</p>
                <p className="text-sm text-gray-500">My Observations</p>
              </div>
            </div>
          </div>

          {isVerifiedExpert && (
            <>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 p-3 rounded-full text-green-600 text-2xl">✓</div>
                  <div>
                    <p className="text-2xl font-bold text-gray-800">{myReviewsCount}</p>
                    <p className="text-sm text-gray-500">Reviews Submitted</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <Link href="/records" className="flex items-center gap-4 hover:opacity-80 transition">
                  <div className="bg-orange-100 p-3 rounded-full text-orange-600 text-2xl">🔍</div>
                  <div>
                    <p className="text-lg font-bold text-gray-800">Review Records</p>
                    <p className="text-sm text-gray-500">Help validate observations →</p>
                  </div>
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-200 mb-6">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`pb-2 px-4 font-medium ${activeTab === 'overview' ? 'text-[#134a86] border-b-2 border-[#134a86]' : 'text-gray-500'}`}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('records')}
            className={`pb-2 px-4 font-medium ${activeTab === 'records' ? 'text-[#134a86] border-b-2 border-[#134a86]' : 'text-gray-500'}`}
          >
            My Records ({myRecords.length})
          </button>
          {isVerifiedExpert && (
            <button 
              onClick={() => setActiveTab('reviews')}
              className={`pb-2 px-4 font-medium ${activeTab === 'reviews' ? 'text-[#134a86] border-b-2 border-[#134a86]' : 'text-gray-500'}`}
            >
              My Reviews ({myReviewsCount})
            </button>
          )}
        </div>

        {/* Tab Content: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {isVerifiedExpert && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Expert Review Summary</h3>
                    <p className="text-sm text-gray-500">Your personal review outcomes and activity</p>
                  </div>
                  <Link
                    href="/records"
                    className="inline-flex items-center px-4 py-2 bg-[#134a86] text-white rounded-lg hover:bg-blue-900 font-medium"
                  >
                    Review More Records
                  </Link>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-xl font-bold text-gray-800">{myReviewsCount}</p>
                  </div>
                  <div className="rounded-lg border border-green-200 p-3 bg-green-50">
                    <p className="text-xs text-green-700">Agree</p>
                    <p className="text-xl font-bold text-green-800">{myReviewStats.AGREE}</p>
                  </div>
                  <div className="rounded-lg border border-blue-200 p-3 bg-blue-50">
                    <p className="text-xs text-blue-700">Correct</p>
                    <p className="text-xl font-bold text-blue-800">{myReviewStats.CORRECT}</p>
                  </div>
                  <div className="rounded-lg border border-yellow-200 p-3 bg-yellow-50">
                    <p className="text-xs text-yellow-700">Unsure</p>
                    <p className="text-xl font-bold text-yellow-800">{myReviewStats.UNSURE}</p>
                  </div>
                  <div className="rounded-lg border border-red-200 p-3 bg-red-50">
                    <p className="text-xs text-red-700">Not Butterfly</p>
                    <p className="text-xl font-bold text-red-800">{myReviewStats.NOT_BUTTERFLY}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold mb-4 text-gray-800">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link 
                  href="/records" 
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                >
                  <h4 className="font-bold text-gray-800 mb-1">📚 Browse All Records</h4>
                  <p className="text-sm text-gray-600">
                    Explore butterfly observations from the community
                  </p>
                </Link>
                
                {isVerifiedExpert && (
                  <Link 
                    href="/records" 
                    className="p-4 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                  >
                    <h4 className="font-bold text-gray-800 mb-1">🔍 Review Records</h4>
                    <p className="text-sm text-gray-600">
                      Help validate observations and add expert reviews
                    </p>
                  </Link>
                )}

                <Link 
                  href="/profile" 
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                >
                  <h4 className="font-bold text-gray-800 mb-1">👤 Edit Profile</h4>
                  <p className="text-sm text-gray-600">
                    Update your personal information and preferences
                  </p>
                </Link>
              </div>
            </div>

            {/* Recent Records */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold mb-4 text-gray-800">Recent Observations</h3>
              {myRecords.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No observations yet. Upload butterflies using the mobile app!
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {myRecords.slice(0, 6).map(record => (
                    <Link 
                      key={record.id} 
                      href={`/records/${record.id}`}
                      className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition"
                    >
                      <div 
                        className="w-full h-40 bg-gray-200 relative"
                        onContextMenu={(e) => e.preventDefault()}
                      >
                        <img 
                          src={record.image_url} 
                          alt="Butterfly" 
                          className="w-full h-full object-cover"
                          onContextMenu={(e) => e.preventDefault()}
                          draggable={false}
                        />
                      </div>
                      <div className="p-3">
                        <p className="font-medium text-gray-800 truncate">
                          {record.final_species_name || record.predicted_species_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(record.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Content: My Records */}
        {activeTab === 'records' && (
          <div className="space-y-6">
            {myRecords.length === 0 ? (
              <div className="bg-white p-20 rounded-xl shadow-sm text-center">
                <p className="text-gray-500">
                  You haven't uploaded any observations yet. Use the LepiNet mobile app to get started!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {myRecords.map(record => (
                  <Link 
                    key={record.id} 
                    href={`/records/${record.id}`}
                    className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition border border-gray-200"
                  >
                    <div 
                      className="relative h-48 bg-gray-200"
                      onContextMenu={(e) => e.preventDefault()}
                    >
                      <img 
                        src={record.image_url} 
                        alt="Butterfly" 
                        className="w-full h-full object-cover"
                        onContextMenu={(e) => e.preventDefault()}
                        draggable={false}
                      />
                      <div className="absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold bg-white/90 shadow-sm">
                        {record.final_species_name ? '✅ Verified' : '🟠 Pending'}
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-gray-800 truncate">
                        {record.final_species_name || record.predicted_species_name || 'Unknown'}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(record.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Content: My Reviews */}
        {activeTab === 'reviews' && isVerifiedExpert && (
          <div className="space-y-6">
            {myReviews.length === 0 ? (
              <div className="bg-white p-20 rounded-xl shadow-sm text-center">
                <p className="text-gray-500">
                  You haven't submitted any reviews yet.
                </p>
                <Link 
                  href="/records" 
                  className="inline-block mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Start Reviewing
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {myReviews.map(review => (
                  <div 
                    key={review.id} 
                    className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
                  >
                    <div className="flex gap-4">
                      {review.ai_log?.image_url && (
                        <Link href={`/records/${review.ai_log.id}`}>
                          <div 
                            className="w-24 h-24 rounded-lg overflow-hidden cursor-pointer hover:opacity-80"
                            onContextMenu={(e) => e.preventDefault()}
                          >
                            <img 
                              src={review.ai_log.image_url} 
                              alt="Butterfly" 
                              className="w-full h-full object-cover"
                              onContextMenu={(e) => e.preventDefault()}
                              draggable={false}
                            />
                          </div>
                        </Link>
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-bold text-gray-800">
                              {review.identified_species_name || 'Review Submitted'}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {new Date(review.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            review.verdict === 'AGREE'
                              ? 'bg-green-100 text-green-700'
                              : review.verdict === 'CORRECT'
                                ? 'bg-blue-100 text-blue-700'
                                : review.verdict === 'NOT_BUTTERFLY'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {review.verdict || 'UNSURE'}
                          </span>
                        </div>
                        {review.identification_notes && (
                          <p className="text-sm text-gray-600 mb-2">{review.identification_notes}</p>
                        )}
                        <div className="flex gap-2 text-xs text-gray-500">
                          <span>AI Agreement: {review.agreed_with_ai ? 'Yes' : 'No'}</span>
                          {review.is_new_discovery && (
                            <span className="text-orange-600 font-medium">• New Discovery</span>
                          )}
                        </div>
                        {review.ai_log && (
                          <Link 
                            href={`/records/${review.ai_log.id}`}
                            className="inline-block mt-3 text-sm text-blue-600 hover:underline"
                          >
                            View Full Record →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
