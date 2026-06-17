'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

type FormData = {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
};

type FormErrors = Partial<Record<keyof FormData | 'submit', string>>;

const NAME_REGEX = /^[A-Za-z\s'\-]+$/;

function validate(data: FormData): FormErrors {
  const errors: FormErrors = {};

  if (!data.firstName.trim() || data.firstName.trim().length < 2) {
    errors.firstName = 'First name must be at least 2 characters.';
  } else if (!NAME_REGEX.test(data.firstName.trim())) {
    errors.firstName = 'First name can only contain letters, spaces, hyphens, or apostrophes.';
  }

  if (!data.lastName.trim() || data.lastName.trim().length < 2) {
    errors.lastName = 'Last name must be at least 2 characters.';
  } else if (!NAME_REGEX.test(data.lastName.trim())) {
    errors.lastName = 'Last name can only contain letters, spaces, hyphens, or apostrophes.';
  }

  if (!data.email.trim()) {
    errors.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!data.password) {
    errors.password = 'Password is required.';
  } else if (data.password.length < 6) {
    errors.password = 'Password must be at least 6 characters.';
  }

  if (!data.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password.';
  } else if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
}

export default function SignUpPage() {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validate(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email.trim(),
      password: formData.password,
    });

    if (authError) {
      setErrors({ submit: authError.message });
      setLoading(false);
      return;
    }

    if (authData.user) {
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: formData.email.trim(),
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          role: 'user',
          verification_status: 'none',
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        setErrors({ submit: 'Account created but profile setup failed. Please contact support.' });
      } else {
        router.push('/login?registered=true');
      }
    }

    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error on change
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
    // Also re-check confirm password when password changes
    if (name === 'password' && errors.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: undefined }));
    }
  };

  const ErrorMsg = ({ field }: { field: keyof FormErrors }) =>
    errors[field] ? (
      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
        <span>⚠</span> {errors[field]}
      </p>
    ) : null;

  const inputClass = (field: keyof FormErrors) =>
    `w-full p-3 border rounded-lg mt-1 focus:ring-2 focus:ring-[#134a86] outline-none ${
      errors[field] ? 'border-red-400 bg-red-50' : 'border-gray-300'
    }`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="flex flex-col items-center text-center">
          <Link href="/">
            <Image
              src="/logo.png"
              alt="LepiNet Logo"
              width={80}
              height={80}
              className="mb-4 cursor-pointer hover:opacity-80 transition"
            />
          </Link>
          <h1 className="text-3xl font-bold text-[#134a86]">Create Account</h1>
          <p className="text-gray-500 mt-2">Join the LepiNet community</p>
        </div>

        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            ⚠ {errors.submit}
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">First Name</label>
              <input
                type="text"
                name="firstName"
                className={inputClass('firstName')}
                value={formData.firstName}
                onChange={handleChange}
                maxLength={50}
              />
              <ErrorMsg field="firstName" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Last Name</label>
              <input
                type="text"
                name="lastName"
                className={inputClass('lastName')}
                value={formData.lastName}
                onChange={handleChange}
                maxLength={50}
              />
              <ErrorMsg field="lastName" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              name="email"
              className={inputClass('email')}
              value={formData.email}
              onChange={handleChange}
            />
            <ErrorMsg field="email" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              name="password"
              className={inputClass('password')}
              value={formData.password}
              onChange={handleChange}
            />
            <ErrorMsg field="password" />
            {!errors.password && (
              <p className="text-xs text-gray-500 mt-1">At least 6 characters</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              className={inputClass('confirmPassword')}
              value={formData.confirmPassword}
              onChange={handleChange}
            />
            <ErrorMsg field="confirmPassword" />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#134a86] text-white rounded-lg font-bold hover:bg-blue-900 transition shadow-md disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="text-center space-y-3">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-[#134a86] font-medium hover:underline">
              Sign In
            </Link>
          </p>
          <Link href="/" className="block text-sm text-gray-600 hover:text-[#134a86] transition">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
