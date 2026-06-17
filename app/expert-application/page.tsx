'use client';
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type FormState = {
  profession: string;
  experience: string;
  linkedin: string;
  researchgate: string;
  googlescholar: string;
  bio: string;
};

type FormErrors = Partial<Record<keyof FormState | 'links', string>>;

// Each entry lists all accepted prefixes for that field
const URL_VALIDATORS: Record<string, { prefixes: string[]; label: string }> = {
  linkedin: {
    prefixes: ['https://linkedin.com/', 'https://www.linkedin.com/'],
    label: 'linkedin.com',
  },
  researchgate: {
    prefixes: ['https://researchgate.net/', 'https://www.researchgate.net/'],
    label: 'researchgate.net',
  },
  googlescholar: {
    prefixes: [
      'https://scholar.google.com/',
      'https://www.scholar.google.com/',
    ],
    label: 'scholar.google.com',
  },
};

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};

  // Profession
  if (!form.profession.trim() || form.profession.trim().length < 2) {
    errors.profession = 'Please enter a valid profession (at least 2 characters).';
  } else if (form.profession.trim().length > 100) {
    errors.profession = 'Profession must be under 100 characters.';
  }

  // Experience — must be a non-negative integer ≤ 80
  const exp = Number(form.experience);
  if (form.experience.trim() === '' || isNaN(exp) || !Number.isInteger(exp) || exp < 0 || exp > 80) {
    errors.experience = 'Please enter a whole number of years between 0 and 80.';
  }

  // URL prefix validation (only when a value is provided)
  for (const [field, { prefixes, label }] of Object.entries(URL_VALIDATORS)) {
    const val = form[field as keyof FormState].trim();
    if (val && !prefixes.some(p => val.startsWith(p))) {
      errors[field as keyof FormErrors] = `URL must be a valid ${label} profile link (e.g. ${prefixes[0]}in/yourname).`;
    }
  }

  // At least one professional URL required
  if (!form.linkedin.trim() && !form.researchgate.trim() && !form.googlescholar.trim()) {
    errors.links = 'Please provide at least one professional profile URL (LinkedIn, ResearchGate, or Google Scholar).';
  }

  // Bio — min 50 chars, max 1000
  if (!form.bio.trim() || form.bio.trim().length < 50) {
    errors.bio = `Bio must be at least 50 characters (currently ${form.bio.trim().length}).`;
  } else if (form.bio.trim().length > 1000) {
    errors.bio = 'Bio must be under 1000 characters.';
  }

  return errors;
}

export default function ExpertApplication() {
  const [form, setForm] = useState<FormState>({
    profession: '',
    experience: '',
    linkedin: '',
    researchgate: '',
    googlescholar: '',
    bio: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    // Clear the error for this field on change
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
    // Also clear the "links" group error when any URL field changes
    if (['linkedin', 'researchgate', 'googlescholar'].includes(name)) {
      setErrors(prev => ({ ...prev, links: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError('');

    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSubmitError('You must be logged in to submit an application.');
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('users')
      .update({
        profession: form.profession.trim(),
        experience_years: Number(form.experience),
        bio: form.bio.trim(),
        linkedin_url: form.linkedin.trim() || null,
        researchgate_url: form.researchgate.trim() || null,
        google_scholar_url: form.googlescholar.trim() || null,
        verification_status: 'pending',
      })
      .eq('id', user.id);

    setLoading(false);

    if (error) {
      setSubmitError('Failed to submit application. Please try again.');
    } else {
      router.push('/dashboard');
    }
  };

  // Helper: renders an error message beneath a field
  const ErrorMsg = ({ field }: { field: keyof FormErrors }) =>
    errors[field] ? (
      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
        <span>⚠</span> {errors[field]}
      </p>
    ) : null;

  const inputClass = (field: keyof FormErrors) =>
    `w-full border p-2 rounded focus:ring-[#134a86] focus:border-[#134a86] ${
      errors[field] ? 'border-red-400 bg-red-50' : 'border-gray-300'
    }`;

  const bioLen = form.bio.trim().length;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-[#134a86]">Expert Verification</h1>
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">Cancel</Link>
          </div>

          <p className="text-gray-600 mb-6 text-sm">
            Join our scientific committee to review butterfly data. Your profile will be reviewed by an administrator.
          </p>

          {submitError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              ⚠ {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Profession */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Profession / Academic Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="profession"
                value={form.profession}
                onChange={handleChange}
                className={inputClass('profession')}
                placeholder="e.g. Entomologist"
                maxLength={100}
              />
              <ErrorMsg field="profession" />
            </div>

            {/* Years of Experience */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Years of Experience <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="experience"
                value={form.experience}
                onChange={handleChange}
                className={inputClass('experience')}
                placeholder="e.g. 5"
                min={0}
                max={80}
                step={1}
              />
              <ErrorMsg field="experience" />
            </div>

            {/* URL group error */}
            {errors.links && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                ⚠ {errors.links}
              </div>
            )}

            {/* LinkedIn */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                LinkedIn Profile URL
              </label>
              <input
                type="url"
                name="linkedin"
                value={form.linkedin}
                onChange={handleChange}
                className={inputClass('linkedin')}
                placeholder="https://linkedin.com/in/..."
              />
              <ErrorMsg field="linkedin" />
            </div>

            {/* ResearchGate */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                ResearchGate Profile URL
              </label>
              <input
                type="url"
                name="researchgate"
                value={form.researchgate}
                onChange={handleChange}
                className={inputClass('researchgate')}
                placeholder="https://researchgate.net/profile/..."
              />
              <ErrorMsg field="researchgate" />
            </div>

            {/* Google Scholar */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Google Scholar Profile URL
              </label>
              <input
                type="url"
                name="googlescholar"
                value={form.googlescholar}
                onChange={handleChange}
                className={inputClass('googlescholar')}
                placeholder="https://scholar.google.com/citations?user=..."
              />
              <ErrorMsg field="googlescholar" />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Bio &amp; Expertise <span className="text-red-500">*</span>
              </label>
              <textarea
                name="bio"
                value={form.bio}
                onChange={handleChange}
                className={`${inputClass('bio')} h-28 resize-none`}
                placeholder="Describe your background and areas of expertise... (min. 50 characters)"
                maxLength={1000}
              />
              <div className="flex justify-between items-start mt-1">
                <ErrorMsg field="bio" />
                <span className={`text-xs ml-auto ${bioLen < 50 ? 'text-amber-600' : 'text-gray-400'}`}>
                  {bioLen} / 1000
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Fields marked <span className="text-red-500">*</span> are required. At least one professional URL must be provided.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#134a86] text-white py-3 rounded-lg font-bold hover:bg-blue-900 transition mt-2 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}