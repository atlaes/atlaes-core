'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff, Loader2, Mail } from 'lucide-react';

declare global {
  interface Window {
    google?: any;
    AppleID?: any;
  }
}

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
  initialMode?: 'password' | 'magic-link';
  appName?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onSwitchToRegister,
  initialMode = 'magic-link',
  appName = 'GPR Refund',
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
  const [loginMode, setLoginMode] = useState<'password' | 'magic-link'>(initialMode);
  const [googleButtonRendered, setGoogleButtonRendered] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const googleButtonRef = useRef<HTMLDivElement>(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  const appleClientId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || '';

  // Initialize Google Identity Services
  useEffect(() => {
    if (!googleClientId) return;

    const initGoogle = () => {
      if (!window.google) {
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

        if (googleButtonRef.current && window.google?.accounts?.id && !googleButtonRendered) {
          // Clear existing children safely
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
            setGoogleButtonRendered(true);
          } catch (renderError) {
            console.error('Error rendering Google button:', renderError);
          }
        }
      } catch (error) {
        console.error('Error initializing Google Sign-In:', error);
      }
    };

    initGoogle();
  }, [googleClientId, loginWithGoogle, onSuccess, googleButtonRendered]);

  // Load Google Identity Services script
  useEffect(() => {
    if (window.google || !googleClientId) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }, [googleClientId]);

  // Load Apple Sign-In script
  useEffect(() => {
    if (window.AppleID || !appleClientId) return;

    const script = document.createElement('script');
    script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.AppleID && appleClientId) {
        window.AppleID.auth.init({
          clientId: appleClientId,
          scope: 'name email',
          redirectURI: `${window.location.origin}/auth/apple/callback`,
          usePopup: true,
        });
      }
    };
    document.body.appendChild(script);
  }, [appleClientId]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await login(email, password);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLinkRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsMagicLinkLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await requestMagicLink(email);
      setMagicLinkUrl(result.magicLink || '');
      setSuccess('Magic link sent! Check your email to continue.');
    } catch (err: any) {
      setError(err.message || 'Failed to send magic link');
    } finally {
      setIsMagicLinkLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    if (!appleClientId || !window.AppleID) {
      setError('Apple Sign-In is not configured');
      return;
    }

    setIsAppleLoading(true);
    setError('');

    try {
      const response = await window.AppleID.auth.signIn();
      await loginWithApple(response.authorization.id_token, response.user);
      onSuccess?.();
    } catch (err: any) {
      if (err.error !== 'popup_closed_by_user') {
        setError(err.message || 'Apple login failed');
      }
    } finally {
      setIsAppleLoading(false);
    }
  };

  const isAnyLoading = isLoading || isMagicLinkLoading || isGoogleLoading || isAppleLoading;

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-lg border border-gray-200">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-lg mb-4">
          <div className="w-6 h-6 bg-white rounded-full"></div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Sign in to {appName}
        </h2>
        <p className="text-sm text-gray-600">
          Welcome back! Please sign in to continue
        </p>
      </div>

      {/* Social Login Buttons */}
      <div className="space-y-3 mb-6">
        {/* Google Sign-In */}
        <div
          ref={googleButtonRef}
          className="flex items-center justify-center w-full"
          style={{ minHeight: '44px' }}
        />
        {!googleClientId && (
          <button
            disabled
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg text-gray-400 bg-gray-50 cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google (Not configured)
          </button>
        )}

        {/* Apple Sign-In */}
        <button
          type="button"
          onClick={handleAppleLogin}
          disabled={isAnyLoading || !appleClientId}
          className={`w-full flex items-center justify-center gap-3 px-4 py-3 border rounded-lg transition-colors ${
            appleClientId
              ? 'bg-black text-white hover:bg-gray-800 border-black'
              : 'bg-gray-50 text-gray-400 border-gray-300 cursor-not-allowed'
          }`}
        >
          {isAppleLoading ? (
            <Loader2 className="animate-spin h-5 w-5" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
          )}
          {appleClientId ? 'Sign in with Apple' : 'Sign in with Apple (Not configured)'}
        </button>
      </div>

      {/* Divider */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">or continue with email</span>
        </div>
      </div>

      {/* Login Mode Toggle */}
      <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
        <button
          type="button"
          onClick={() => {
            setLoginMode('magic-link');
            setError('');
            setSuccess('');
            setMagicLinkUrl('');
          }}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            loginMode === 'magic-link'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Magic Link
        </button>
        <button
          type="button"
          onClick={() => {
            setLoginMode('password');
            setError('');
            setSuccess('');
            setMagicLinkUrl('');
          }}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            loginMode === 'password'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Password
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Magic Link URL (for development) */}
      {magicLinkUrl && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg">
          <p className="font-semibold text-sm mb-2">Development Mode - Magic Link:</p>
          <div className="bg-white p-2 rounded border text-xs break-all font-mono">
            {magicLinkUrl}
          </div>
          <p className="text-xs mt-2 text-blue-600">
            In production, this link will be sent via email.
          </p>
        </div>
      )}

      {/* Magic Link Form */}
      {loginMode === 'magic-link' ? (
        <form onSubmit={handleMagicLinkRequest} className="space-y-4">
          <div>
            <label htmlFor="magic-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="magic-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
              placeholder="Enter your email"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isAnyLoading}
            className="w-full bg-indigo-600 text-white py-2.5 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm font-medium"
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
      ) : (
        /* Password Form */
        <form onSubmit={handlePasswordLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                placeholder="Enter your password"
                required
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
          </div>

          <button
            type="submit"
            disabled={isAnyLoading}
            className="w-full bg-indigo-600 text-white py-2.5 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm font-medium"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      )}

      {/* Register Link */}
      {onSwitchToRegister && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <button
              onClick={onSwitchToRegister}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Sign up
            </button>
          </p>
        </div>
      )}
    </div>
  );
};

export default LoginForm;
