'use client';

import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, User, Mail, Calendar, MapPin, Phone } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                VBL Refund Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">
                Welcome, {user.profile?.firstName || user.email}
              </span>
              <button
                onClick={logout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-blue-600" />
                Profile Information
              </h2>

              <div className="space-y-4">
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-3 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{user.email}</p>
                    {user.emailVerified && (
                      <span className="text-xs text-green-600">✓ Verified</span>
                    )}
                  </div>
                </div>

                {user.profile && (
                  <>
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-3 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Name</p>
                        <p className="font-medium">
                          {user.profile.firstName} {user.profile.lastName}
                        </p>
                      </div>
                    </div>

                    {user.profile.dateOfBirth && (
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-3 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Date of Birth</p>
                          <p className="font-medium">
                            {user.profile.dateOfBirth}
                          </p>
                        </div>
                      </div>
                    )}

                    {user.profile.nationality && (
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-3 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Nationality</p>
                          <p className="font-medium">
                            {user.profile.nationality}
                          </p>
                        </div>
                      </div>
                    )}

                    {user.profile.phone && (
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 mr-3 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Phone</p>
                          <p className="font-medium">{user.profile.phone}</p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Application Status */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Application Status</h2>

              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <User className="w-16 h-16 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Application Started
                </h3>
                <p className="text-gray-600 mb-6">
                  Ready to start your German pension refund application? Click
                  below to begin.
                </p>
                <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                  Start New Application
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
