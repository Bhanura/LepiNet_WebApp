'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ProfileView() {
  const { id } = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        setProfile(data);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [id]);

  if (loading) return <div className="p-10 text-center">Loading Profile...</div>;
  if (!profile) return <div className="p-10 text-center">Profile not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <div className="mb-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 border border-gray-300 transition-all"
          >
            <span>←</span>
            <span>Back</span>
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header with Banner */}
          <div className="h-32 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
          
          {/* Profile Info */}
          <div className="px-8 pb-8">
            {/* Avatar */}
            <div className="relative -mt-16 mb-4">
              {profile.profile_photo_url ? (
                <img
                  src={profile.profile_photo_url}
                  alt={`${profile.first_name} ${profile.last_name}`}
                  className="w-32 h-32 rounded-full border-4 border-white object-cover shadow-lg"
                />
              ) : (
                <div className="w-32 h-32 rounded-full border-4 border-white bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg">
                  <span className="text-5xl font-bold text-white">
                    {profile.first_name[0]}{profile.last_name[0]}
                  </span>
                </div>
              )}
              {profile.verification_status === 'verified' && (
                <div className="absolute bottom-0 right-0 bg-green-500 text-white rounded-full p-2 border-4 border-white">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>

            {/* Name and Role */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {profile.first_name} {profile.last_name}
              </h1>
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  profile.role === 'expert' ? 'bg-blue-100 text-blue-700' :
                  profile.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                </span>
                {profile.verification_status === 'verified' && (
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700">
                    ✓ Verified Expert
                  </span>
                )}
              </div>
              {profile.profession && (
                <p className="text-lg text-gray-600">{profile.profession}</p>
              )}
            </div>

            {/* Details Grid */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {profile.email && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Email</p>
                  <p className="text-gray-900">{profile.email}</p>
                </div>
              )}
              {profile.experience_years && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Experience</p>
                  <p className="text-gray-900">{profile.experience_years} years</p>
                </div>
              )}
              {profile.educational_level && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Education</p>
                  <p className="text-gray-900">{profile.educational_level}</p>
                </div>
              )}
              {profile.mobile && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Mobile</p>
                  <p className="text-gray-900">{profile.mobile}</p>
                </div>
              )}
            </div>

            {/* Bio */}
            {profile.bio && (
              <div className="mb-6">
                <p className="text-sm text-gray-500 mb-2">About</p>
                <p className="text-gray-700 leading-relaxed">{profile.bio}</p>
              </div>
            )}

            {/* LinkedIn */}
            {profile.linkedin_url && (
              <div>
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                  View LinkedIn Profile
                </a>
              </div>
            )}

            {/* Member Since */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Member since {new Date(profile.created_at).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
