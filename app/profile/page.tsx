'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ── Validation helpers ──────────────────────────────────────────────────────
const PHONE_REGEX = /^\+?[0-9\s\-()]{7,20}$/;
const NAME_REGEX = /^[A-Za-z\s'\-]+$/;
const URL_VALIDATORS: Record<string, { prefixes: string[]; label: string }> = {
  linkedin_url: {
    prefixes: ['https://linkedin.com/', 'https://www.linkedin.com/'],
    label: 'LinkedIn',
  },
  researchgate_url: {
    prefixes: ['https://researchgate.net/', 'https://www.researchgate.net/'],
    label: 'ResearchGate',
  },
  google_scholar_url: {
    prefixes: ['https://scholar.google.com/', 'https://www.scholar.google.com/'],
    label: 'Google Scholar',
  },
};

function validateProfileForm(data: any): string[] {
  const errs: string[] = [];

  // Required names
  if (!data.first_name?.trim() || data.first_name.trim().length < 2)
    errs.push('First Name must be at least 2 characters.');
  else if (!NAME_REGEX.test(data.first_name.trim()))
    errs.push('First Name can only contain letters, spaces, hyphens, or apostrophes.');

  if (!data.last_name?.trim() || data.last_name.trim().length < 2)
    errs.push('Last Name must be at least 2 characters.');
  else if (!NAME_REGEX.test(data.last_name.trim()))
    errs.push('Last Name can only contain letters, spaces, hyphens, or apostrophes.');

  // Phone (optional — validate only if provided)
  if (data.mobile?.trim() && !PHONE_REGEX.test(data.mobile.trim()))
    errs.push('Mobile number format is invalid (e.g. +94 77 123 4567).');

  // Birthday — must not be in the future or more than 120 years ago
  if (data.birthday) {
    const dob = new Date(data.birthday);
    const now = new Date();
    const minDate = new Date();
    minDate.setFullYear(now.getFullYear() - 120);
    if (dob > now)
      errs.push('Birthday cannot be a future date.');
    else if (dob < minDate)
      errs.push('Birthday seems too far in the past (over 120 years ago).');
  }

  // Experience years (optional — validate if provided)
  if (data.experience_years !== undefined && data.experience_years !== null && data.experience_years !== '') {
    const exp = Number(data.experience_years);
    if (isNaN(exp) || !Number.isInteger(exp) || exp < 0 || exp > 80)
      errs.push('Years of Experience must be a whole number between 0 and 80.');
  }

  // URL prefix validation (only when a value is provided)
  for (const [field, { prefixes, label }] of Object.entries(URL_VALIDATORS)) {
    if (data[field]?.trim() && !prefixes.some((p: string) => data[field].trim().startsWith(p)))
      errs.push(`${label} URL must be a valid profile link (e.g. ${prefixes[0]}in/yourname).`);
  }

  // Bio max length
  if (data.bio && data.bio.length > 1000)
    errs.push('Bio must be under 1000 characters.');

  return errs;
}
// ────────────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [saveErrors, setSaveErrors] = useState<string[]>([]);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile) {
      setProfile(profile);
      setFormData(profile);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    // Run validation before touching the DB
    const validationErrors = validateProfileForm(formData);
    if (validationErrors.length > 0) {
      setSaveErrors(validationErrors);
      return;
    }
    setSaveErrors([]);
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Sanitise experience_years — store as number or null
    const expYears =
      formData.experience_years !== '' && formData.experience_years !== null && formData.experience_years !== undefined
        ? Number(formData.experience_years)
        : null;

    const { error } = await supabase
      .from('users')
      .update({
        first_name: formData.first_name?.trim(),
        last_name: formData.last_name?.trim(),
        mobile: formData.mobile?.trim() || null,
        birthday: formData.birthday || null,
        gender: formData.gender || null,
        educational_level: formData.educational_level?.trim() || null,
        profession: formData.profession?.trim() || null,
        experience_years: expYears,
        bio: formData.bio?.trim() || null,
        linkedin_url: formData.linkedin_url?.trim() || null,
        researchgate_url: formData.researchgate_url?.trim() || null,
        google_scholar_url: formData.google_scholar_url?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      setSaveErrors(['Failed to update profile: ' + error.message]);
    } else {
      setProfile(formData);
      setEditMode(false);
    }
    setSaving(false);
  };

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-pulse text-lg font-medium text-gray-600">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-600 mb-4">Profile not found</p>
          <Link 
            href="/dashboard"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800">My Profile</h1>
            <p className="text-gray-600 mt-2">Manage your personal information</p>
          </div>
          <Link 
            href="/dashboard"
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header Section with Avatar */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white">
            <div className="flex items-center gap-6">
              {/* Avatar */}
              <div className="relative">
                {profile.profile_photo_url ? (
                  <img 
                    src={profile.profile_photo_url} 
                    alt="Profile" 
                    className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-white flex items-center justify-center">
                    <span className="text-4xl font-bold text-blue-600">
                      {profile.first_name?.[0]}{profile.last_name?.[0]}
                    </span>
                  </div>
                )}
                {editMode && (
                  <div className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg cursor-pointer hover:bg-gray-100">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Name and Status */}
              <div className="flex-1">
                <h2 className="text-3xl font-bold">{profile.first_name} {profile.last_name}</h2>
                <p className="text-blue-100 mt-1">{profile.email}</p>
                <div className="flex gap-2 mt-3">
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
                    {profile.role === 'admin' ? '👑 Admin' : profile.verification_status === 'verified' ? '🎓 Verified Expert' : '👤 User'}
                  </span>
                  {profile.profession && (
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
                      {profile.profession}
                    </span>
                  )}
                </div>
              </div>

              {/* Edit Button */}
              {!editMode ? (
                <button
                  onClick={() => { setEditMode(true); setSaveErrors([]); }}
                  className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition shadow-lg"
                >
                  ✏️ Edit Profile
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition shadow-lg disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : '💾 Save'}
                  </button>
                  <button
                    onClick={() => {
                      setEditMode(false);
                      setFormData(profile);
                      setSaveErrors([]);
                    }}
                    className="px-4 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg font-semibold hover:bg-white/30 transition"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Profile Details */}
          <div className="p-8">
            {/* Validation errors banner */}
            {saveErrors.length > 0 && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm font-bold text-red-800 mb-2">⚠ Please fix the following before saving:</p>
                <ul className="list-disc pl-5 space-y-1">
                  {saveErrors.map((err, i) => (
                    <li key={i} className="text-sm text-red-700">{err}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="text-2xl">👤</span> Personal Information
                </h3>

                <ProfileField
                  label="First Name"
                  value={formData.first_name || ''}
                  editMode={editMode}
                  onChange={(val: string) => handleChange('first_name', val)}
                  required
                />

                <ProfileField
                  label="Last Name"
                  value={formData.last_name || ''}
                  editMode={editMode}
                  onChange={(val: string) => handleChange('last_name', val)}
                  required
                />

                <ProfileField
                  label="Email"
                  value={profile.email}
                  editMode={false}
                  icon="✉️"
                />

                <ProfileField
                  label="Mobile"
                  value={formData.mobile || ''}
                  editMode={editMode}
                  onChange={(val: string) => handleChange('mobile', val)}
                  placeholder="+94 77 123 4567"
                  icon="📱"
                  hint="Format: +94 77 123 4567"
                />

                <ProfileField
                  label="Birthday"
                  value={formData.birthday || ''}
                  editMode={editMode}
                  onChange={(val: string) => handleChange('birthday', val)}
                  type="date"
                  icon="🎂"
                  maxDate={new Date().toISOString().split('T')[0]}
                />

                <ProfileField
                  label="Gender"
                  value={formData.gender || ''}
                  editMode={editMode}
                  onChange={(val: string) => handleChange('gender', val)}
                  type="select"
                  options={['Male', 'Female', 'Other', 'Prefer not to say']}
                  icon="⚧"
                />

                <ProfileField
                  label="Education Level"
                  value={formData.educational_level || ''}
                  editMode={editMode}
                  onChange={(val: string) => handleChange('educational_level', val)}
                  icon="🎓"
                />
              </div>

              {/* Professional Information */}
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="text-2xl">💼</span> Professional Information
                </h3>

                <ProfileField
                  label="Profession"
                  value={formData.profession || ''}
                  editMode={editMode}
                  onChange={(val: string) => handleChange('profession', val)}
                  icon="💼"
                />

                <ProfileField
                  label="Years of Experience"
                  value={formData.experience_years ?? ''}
                  editMode={editMode}
                  onChange={(val: string) => handleChange('experience_years', val)}
                  icon="📅"
                  type="number"
                  min={0}
                  max={80}
                />

                <ProfileField
                  label="LinkedIn URL"
                  value={formData.linkedin_url || ''}
                  editMode={editMode}
                  onChange={(val: string) => handleChange('linkedin_url', val)}
                  placeholder="https://linkedin.com/in/yourprofile"
                  icon="🔗"
                />

                <ProfileField
                  label="ResearchGate URL"
                  value={formData.researchgate_url || ''}
                  editMode={editMode}
                  onChange={(val: string) => handleChange('researchgate_url', val)}
                  placeholder="https://researchgate.net/profile/yourprofile"
                  icon="🔗"
                />

                <ProfileField
                  label="Google Scholar URL"
                  value={formData.google_scholar_url || ''}
                  editMode={editMode}
                  onChange={(val: string) => handleChange('google_scholar_url', val)}
                  placeholder="https://scholar.google.com/citations?user=yourprofile"
                  icon="🔗"
                />

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Bio / Expertise
                  </label>
                  {editMode ? (
                    <textarea
                      value={formData.bio || ''}
                      onChange={(e) => handleChange('bio', e.target.value)}
                      rows={6}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      placeholder="Tell us about your expertise and interests..."
                    />
                  ) : (
                    <p className="text-gray-600 p-4 bg-gray-50 rounded-lg min-h-[120px]">
                      {profile.bio || 'No bio provided'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Account Stats */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Account Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Member Since</p>
                  <p className="text-lg font-bold text-blue-600">
                    {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Account Status</p>
                  <p className="text-lg font-bold text-green-600">
                    {profile.verification_status === 'banned' ? '🚫 Banned' : '✅ Active'}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Role</p>
                  <p className="text-lg font-bold text-purple-600 capitalize">
                    {profile.role}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Component
function ProfileField({ 
  label, 
  value, 
  editMode, 
  onChange, 
  type = 'text', 
  options = [], 
  placeholder = '',
  icon = '',
  required = false,
  hint = '',
  maxDate = '',
  min,
  max,
}: any) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {editMode ? (
        type === 'select' ? (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          >
            <option value="">Select {label}</option>
            {options.map((opt: string) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            max={maxDate || (type === 'number' ? max : undefined)}
            min={type === 'number' ? min : undefined}
            step={type === 'number' ? 1 : undefined}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        )
      ) : (
        <p className="text-gray-800 p-3 bg-gray-50 rounded-lg flex items-center gap-2">
          {icon && <span>{icon}</span>}
          <span>{value || 'Not provided'}</span>
        </p>
      )}
      {editMode && hint && (
        <p className="text-xs text-gray-500 mt-1">{hint}</p>
      )}
    </div>
  );
}
