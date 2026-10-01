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
    // Strictly verify session with backend - do NOT auto-unlock from localStorage
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (res.ok && data.authenticated && data.user) {
          setAuthUser(data.user);
        } else {
          setAuthUser(null);
          localStorage.removeItem('fitpulse_user');
        }
      } catch (err) {
        setAuthUser(null);
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
      // If admin logs in, stay on this client page in admin mode
    } else if (u.id.toLowerCase() !== targetUsername.toLowerCase()) {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-slate-500 text-xs font-semibold">Verifying Client Authorization...</p>
        </div>
      </div>
    );
  }

  // If not logged in with password, require password authentication
  if (!authUser) {
    return (
      <LoginForm
        initialUserId={targetUsername}
        title={`Client Portal (${targetUsername})`}
        subtitle="Password required to access this client workspace"
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  // If logged in as a different regular user, show mismatch switcher
  if (authUser.role !== 'ADMIN' && authUser.id.trim().toLowerCase() !== targetUsername.toLowerCase()) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 text-center">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md shadow-xl space-y-4">
          <UserCheck className="w-12 h-12 text-indigo-600 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900">Signed In As {authUser.name}</h3>
          <p className="text-xs text-slate-500">
            You are currently authenticated as <strong className="text-slate-800 font-mono">{authUser.id}</strong>. To view <strong className="text-indigo-600 font-mono">/{targetUsername}</strong>, please sign in with that account's password.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={() => router.push(`/${encodeURIComponent(authUser.id)}`)}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
            >
              Go to My Workspace (/{authUser.id})
            </button>
            <button
              onClick={handleLogout}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all"
            >
              Switch Account / Sign In with Password
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Construct target user prop object
  const targetUserObj = {
    id: targetUsername,
    name: authUser.id.trim().toLowerCase() === targetUsername.toLowerCase() ? authUser.name : targetUsername,
    role: 'USER' as const,
  };

  return (
    <div>
      {/* Admin Notice Bar when Coach/Admin views a client's page */}
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
