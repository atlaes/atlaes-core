'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff, Loader2, Mail } from 'lucide-react';

declare global {
  interface Window {
    google?: any;
    AppleID?: any;
  }
}

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const magicLinkSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type LoginFormData = z.infer<typeof loginSchema>;
type MagicLinkData = z.infer<typeof magicLinkSchema>;

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
  initialMode?: 'password' | 'magic-link';
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onSwitchToRegister,
  initialMode = 'password',
}) => {
  const { login, requestMagicLink, loginWithGoogle, loginWithApple } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isMagicLinkLoading, setIsMagicLinkLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [magicLinkUrl, setMagicLinkUrl] = useState('');
  const [loginMode, setLoginMode] = useState<'password' | 'magic-link'>(
    initialMode
  );
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  const appleClientId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || '';

  // Initialize Google Identity Services
  useEffect(() => {
    if (!googleClientId) return;

    // Wait for Google script to load
    const initGoogle = () => {
      if (!window.google) {
        // Script not loaded yet, try again in a bit
        setTimeout(initGoogle, 100);
        return;
      }

      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: any) => {
            setIsGoogleLoading(true);
            setError('');
            try {
              await loginWithGoogle(response.credential);
              onSuccess?.();
            } catch (err: any) {
              setError(err.message || 'Google login failed');
            } finally {
              setIsGoogleLoading(false);
            }
          },
        });

        // Render the button - clear any existing button first using safe DOM methods
        if (googleButtonRef.current && window.google?.accounts?.id) {
          // Clear using DOM methods instead of innerHTML
          while (googleButtonRef.current.firstChild) {
            googleButtonRef.current.removeChild(googleButtonRef.current.firstChild);
          }

          try {
            window.google.accounts.id.renderButton(googleButtonRef.current, {
              theme: 'outline',
              size: 'large',
              width: '100%',
              text: 'signin_with',
              locale: 'en',
              type: 'standard',
            });
          } catch (renderError) {
            console.error('Error rendering Google button:', renderError);
          }
        }
      } catch (error) {
        console.error('Error initializing Google Sign-In:', error);
      }
    };

    initGoogle();
  }, [googleClientId, loginWithGoogle, onSuccess]);

  // Initialize Apple Sign-In
  useEffect(() => {
    if (!appleClientId) return;

    // Load Apple Sign-In script if not already loaded
    if (!document.getElementById('apple-signin-script')) {
      const script = document.createElement('script');
      script.id = 'apple-signin-script';
      script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, [appleClientId]);

  // Handle Apple Sign-In
  const handleAppleSignIn = async () => {
    if (!window.AppleID) {
      setError('Apple Sign-In is not available. Please try again later.');
      return;
    }

    setIsAppleLoading(true);
    setError('');

    try {
      window.AppleID.auth.init({
        clientId: appleClientId,
        scope: 'name email',
        redirectURI: window.location.origin + '/auth/apple/callback',
        usePopup: true,
      });

      const response = await window.AppleID.auth.signIn();

      // Apple returns the id_token in authorization.id_token
      const idToken = response.authorization?.id_token;
      const user = response.user; // Only provided on first sign-in

      if (idToken) {
        await loginWithApple(idToken, user);
        onSuccess?.();
      } else {
        throw new Error('No ID token received from Apple');
      }
    } catch (err: any) {
      if (err.error !== 'popup_closed_by_user') {
        setError(err.message || 'Apple login failed');
      }
    } finally {
      setIsAppleLoading(false);
    }
  };

  // Load Google Identity Services script
  useEffect(() => {
    if (window.google) return; // Already loaded

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup is handled by React
    };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const {
    register: registerMagicLink,
    handleSubmit: handleMagicLinkSubmit,
    formState: { errors: magicLinkErrors },
  } = useForm<MagicLinkData>({
    resolver: zodResolver(magicLinkSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await login(data.email, data.password);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const onMagicLinkSubmit = async (data: MagicLinkData) => {
    setIsMagicLinkLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await requestMagicLink(data.email);
      setMagicLinkUrl(result.magicLink || '');
      setSuccess(
        'Magic link generated! Copy the URL below and paste it in your browser to test.'
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsMagicLinkLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-lg border border-gray-200">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-900 rounded-lg mb-4">
          <div className="w-6 h-6 bg-white rounded-full"></div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Sign in to VBL Refund
        </h2>
        <p className="text-sm text-gray-600">
          Welcome back! Please sign in to continue
        </p>
      </div>

      {/* Social Login Buttons */}
      <div className="mb-6 space-y-3">
        {/* Google Sign-In */}
        <div
          ref={googleButtonRef}
          className="flex items-center justify-center w-full"
          style={{ minHeight: '40px' }}
        ></div>
        {!googleClientId && (
          <p className="text-xs text-gray-500 text-center">
            Google Sign-In not configured
          </p>
        )}

        {/* Apple Sign-In */}
        {appleClientId ? (
          <button
            type="button"
            onClick={handleAppleSignIn}
            disabled={isAppleLoading || isGoogleLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {isAppleLoading ? (
              <Loader2 className="animate-spin h-4 w-4" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
            )}
            <span>{isAppleLoading ? 'Signing in...' : 'Sign in with Apple'}</span>
          </button>
        ) : (
          <p className="text-xs text-gray-500 text-center">
            Apple Sign-In not configured
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">or</span>
        </div>
      </div>

      {/* Login Mode Toggle */}
      <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
        <button
          type="button"
          onClick={() => {
            setLoginMode('password');
            setError('');
            setSuccess('');
            setMagicLinkUrl('');
            reset();
          }}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            loginMode === 'password'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Password
        </button>
        <button
          type="button"
          onClick={() => {
            setLoginMode('magic-link');
            setError('');
            setSuccess('');
            setMagicLinkUrl('');
            reset();
          }}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            loginMode === 'magic-link'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Magic Link
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}

      {magicLinkUrl && (
        <div className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded">
          <p className="font-semibold mb-2">Magic Link URL:</p>
          <div className="bg-white p-2 rounded border text-sm break-all">
            {magicLinkUrl}
          </div>
          <p className="text-xs mt-2 text-blue-600">
            Copy this URL and paste it in your browser to test the magic link
          </p>
        </div>
      )}

      {loginMode === 'password' ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-900 mb-1.5"
            >
              Email address
            </label>
            <input
              {...register('email')}
              type="email"
              id="email"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="Enter your email"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-900 mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                id="password"
                className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || isGoogleLoading || isMagicLinkLoading || isAppleLoading}
            className="w-full bg-gray-900 text-white py-2.5 px-4 rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm font-medium"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                Signing In...
              </>
            ) : (
              <>
                Continue
                <svg
                  className="ml-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </>
            )}
          </button>
        </form>
      ) : (
        <form
          onSubmit={handleMagicLinkSubmit(onMagicLinkSubmit)}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="magic-email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email Address
            </label>
            <input
              {...registerMagicLink('email')}
              type="email"
              id="magic-email"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="Enter your email"
            />
            {magicLinkErrors.email && (
              <p className="mt-1 text-sm text-red-600">
                {magicLinkErrors.email.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isMagicLinkLoading}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isMagicLinkLoading ? (
              <>
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                Sending Magic Link...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send Magic Link
              </>
            )}
          </button>
        </form>
      )}

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Don't have an account?{' '}
          <button
            onClick={onSwitchToRegister}
            className="text-gray-900 hover:text-gray-700 font-medium"
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
};
