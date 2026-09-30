'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import UserDashboard from '@/components/UserDashboard';
import LoginForm from '@/components/LoginForm';
import { ArrowLeft, ShieldCheck, UserCheck } from 'lucide-react';

export default function DedicatedUserPage() {
  const params = useParams();
  const router = useRouter();
  const rawUsername = params?.username as string;
  const targetUsername = rawUsername ? decodeURIComponent(rawUsername).trim() : '';

  const [authUser, setAuthUser] = useState<{ id: string; name: string; role: 'USER' | 'ADMIN' } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage or verify with backend
    try {
      const stored = localStorage.getItem('fitpulse_user');
      if (stored) {
        setAuthUser(JSON.parse(stored));
      }
    } catch (e) {}

    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (res.ok && data.authenticated && data.user) {
          setAuthUser(data.user);
          localStorage.setItem('fitpulse_user', JSON.stringify(data.user));
        } else {
          setAuthUser(null);
          localStorage.removeItem('fitpulse_user');
        }
      } catch (err) {
        console.error('Session check error:', err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const handleLoginSuccess = (u: { id: string; name: string; role: 'USER' | 'ADMIN' }) => {
    setAuthUser(u);
    try {
      localStorage.setItem('fitpulse_user', JSON.stringify(u));
    } catch (e) {}

    if (u.role === 'ADMIN') {
      router.push('/admin');
    } else {
      router.push(`/${encodeURIComponent(u.id)}`);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    localStorage.removeItem('fitpulse_user');
    setAuthUser(null);
    router.push('/');
  };

  if (loading && !authUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-slate-500 text-xs font-semibold">Loading Client Page ({targetUsername})...</p>
        </div>
      </div>
    );
  }

  // If not logged in, prompt sign in
  if (!authUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Accessing User Page: <span className="text-indigo-600 font-mono">/{targetUsername}</span></h2>
          <p className="text-xs text-slate-500 mt-1">Please log in to view this dedicated client workspace.</p>
        </div>
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  // If logged in user is regular USER but navigating to someone else's username, redirect to their own page
  if (authUser.role !== 'ADMIN' && authUser.id.trim().toLowerCase() !== targetUsername.toLowerCase()) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 text-center">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md shadow-xl space-y-4">
          <UserCheck className="w-12 h-12 text-indigo-600 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900">Redirecting to Your Dedicated Page</h3>
          <p className="text-xs text-slate-500">
            You are logged in as <strong className="text-slate-800">{authUser.name}</strong> ({authUser.id}).
          </p>
          <button
            onClick={() => router.push(`/${encodeURIComponent(authUser.id)}`)}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20"
          >
            Go to My Page (/{authUser.id})
          </button>
        </div>
      </div>
    );
  }

  // Construct target user prop object
  const targetUserObj = {
    id: targetUsername,
    name: authUser.id.trim().toLowerCase() === targetUsername.toLowerCase() ? authUser.name : targetUsername,
    role: 'USER'
  };

  return (
    <div>
      {/* Admin Notice Bar when Admin views client page */}
      {authUser.role === 'ADMIN' && (
        <div className="bg-indigo-900 text-white px-4 py-2.5 flex items-center justify-between text-xs font-medium border-b border-indigo-800 sticky top-0 z-50 shadow-md">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>
              Admin Mode: Viewing dedicated workspace for client <strong className="text-amber-300 font-mono">/{targetUsername}</strong>
            </span>
          </div>

          <button
            onClick={() => router.push('/admin')}
            className="px-3 py-1 rounded-lg bg-indigo-800 hover:bg-indigo-700 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors border border-indigo-700"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Admin Portal</span>
          </button>
        </div>
      )}

      <UserDashboard user={targetUserObj} onLogout={handleLogout} />
    </div>
  );
}
