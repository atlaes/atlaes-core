'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { Loader2 } from 'lucide-react';

interface QualificationStep5Props {
  onBack: () => void;
}

// Sample testimonials matching the design
const TESTIMONIALS = [
  {
    id: 1,
    name: 'Manjunath AJ',
    rating: 5,
    text: 'Hello, Usually I don\'t write review, but I need to do for Germany Pension Refund team since they Truly deserved the appreciation. They maintained very well updated the settlement and always a response for every mail. I love Charlotte who...',
    source: 'google',
  },
  {
    id: 2,
    name: 'Sarah Johnson',
    rating: 5,
    text: 'Excellent service! The team made the entire process so smooth. I received my refund within 3 months. Highly recommend!',
    source: 'google',
  },
  {
    id: 3,
    name: 'Michael Chen',
    rating: 5,
    text: 'Professional and efficient. They handled everything from start to finish. Very happy with the outcome.',
    source: 'google',
  },
];

export default function QualificationStep5({ onBack }: QualificationStep5Props) {
  const router = useRouter();
  const { register: registerUser, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentTestimonialIndex, setCurrentTestimonialIndex] = useState(0);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!acceptedTerms) {
      setError('Please accept the Terms and Conditions');
      return;
    }

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      await registerUser({
        email,
        password,
        firstName: email.split('@')[0],
        lastName: 'User',
      });

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!acceptedTerms) {
      setError('Please accept the Terms and Conditions');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await loginWithGoogle(credentialResponse.credential);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit = acceptedTerms && email && !isLoading;

  return (
    <div className="min-h-screen bg-white flex">
      <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-12 p-6">
        {/* Left Side - Registration Form */}
        <div className="flex-1 flex flex-col max-w-xl">
          {/* Progress Indicator */}
          <div className="text-right mb-8">
            <span className="text-sm text-gray-500 font-medium">5/5</span>
          </div>

          {/* Congratulations Header */}
          <h1 className="text-4xl md:text-5xl font-bold text-[#221E49] mb-6">Congratulations</h1>

          <div className="bg-white border-2 border-[#221E49] rounded-lg p-6 mb-8">
            <p className="text-[#221E49] leading-relaxed">
              you qualify for a refund on your German pension contributions. Let's create a free account to register your details.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Email Signup Form */}
          <form onSubmit={handleEmailSignup} className="space-y-4 mb-6">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#50C9A5] focus:outline-none focus:ring-2 focus:ring-[#50C9A5]/20 transition-all"
                disabled={isLoading}
              />
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="terms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 w-4 h-4 text-[#50C9A5] border-gray-300 rounded focus:ring-[#50C9A5]"
                disabled={isLoading}
              />
              <label htmlFor="terms" className="text-sm text-gray-700 leading-relaxed">
                Yes, I have read and accept the{' '}
                <a href="/terms" className="text-[#50C9A5] hover:underline">
                  Terms and Conditions
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-[#50C9A5] hover:underline">
                  Data Privacy Policy
                </a>
                .
              </label>
            </div>

            {/* Sign Up Button */}
            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full py-4 rounded-lg font-semibold text-lg transition-colors ${
                canSubmit
                  ? 'bg-[#B8E6D5] text-[#221E49] hover:bg-[#A0DCC7]'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  Creating account...
                </span>
              ) : (
                'Sign Up'
              )}
            </button>
          </form>

          {/* Or Continue With */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-600">or continue with</span>
            </div>
          </div>

          {/* Social Sign-In Buttons */}
          <div className="flex gap-4 justify-center mb-12">
            {/* Apple Sign-In */}
            <button
              type="button"
              disabled
              className="w-14 h-14 rounded-full bg-[#221E49] flex items-center justify-center text-white text-2xl opacity-50 cursor-not-allowed"
            >

            </button>

            {/* Google Sign-In */}
            <button
              type="button"
              onClick={() => {
                if (acceptedTerms && googleClientId) {
                  // Trigger Google sign-in
                }
              }}
              className="w-14 h-14 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            </button>
          </div>

          {/* Back Button */}
          <div className="mt-auto">
            <button
              onClick={onBack}
              className="text-[#221E49] font-medium text-lg hover:opacity-70 transition-opacity"
              disabled={isLoading}
            >
              Back
            </button>
          </div>
        </div>

        {/* Right Side - Testimonials */}
        <div className="flex-1 bg-gray-50 rounded-2xl p-8 hidden lg:flex flex-col">
          <h2 className="text-3xl font-bold text-[#221E49] mb-8">
            What our customers say
          </h2>

          {/* Testimonial Cards Stack */}
          <div className="relative flex-1 mb-8">
            {TESTIMONIALS.map((testimonial, index) => (
              <div
                key={testimonial.id}
                className={`absolute bg-white rounded-2xl border-2 border-[#221E49] p-6 transition-all duration-300 ${
                  index === currentTestimonialIndex
                    ? 'z-30 opacity-100 transform translate-x-0'
                    : index === (currentTestimonialIndex + 1) % TESTIMONIALS.length
                    ? 'z-20 opacity-60 transform translate-x-8 translate-y-4'
                    : 'z-10 opacity-30 transform translate-x-16 translate-y-8'
                }`}
                style={{
                  width: 'calc(100% - 2rem)',
                }}
              >
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className="w-5 h-5 text-yellow-400 fill-current"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>

                <p className="text-gray-700 mb-6 leading-relaxed text-sm">
                  {testimonial.text}
                </p>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[#221E49]">{testimonial.name}</p>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      <span className="text-xs text-gray-500">Google Review</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Carousel Dots */}
          <div className="flex justify-center gap-2 mb-8">
            {TESTIMONIALS.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentTestimonialIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentTestimonialIndex ? 'bg-[#50C9A5]' : 'bg-gray-300'
                }`}
                aria-label={`View testimonial ${index + 1}`}
              />
            ))}
          </div>

          {/* Badges */}
          <div className="flex gap-4 justify-center">
            <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg px-6 py-3 text-center text-white">
              <p className="text-xs font-bold">CUSTOMERS'</p>
              <p className="text-xs font-bold">CHOICE</p>
              <p className="text-lg font-bold">2024</p>
              <p className="text-xs mt-1">Proven Expert</p>
            </div>
            <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg px-6 py-3 text-center text-white">
              <p className="text-xs font-bold">TOP SERVICE</p>
              <p className="text-xs font-bold">PROVIDER</p>
              <p className="text-lg font-bold">2024</p>
              <p className="text-xs mt-1">Proven Expert</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
