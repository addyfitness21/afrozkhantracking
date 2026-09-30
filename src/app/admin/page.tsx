'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminDashboard from '@/components/AdminDashboard';
import LoginForm from '@/components/LoginForm';

export default function DedicatedAdminPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<{ id: string; name: string; role: 'USER' | 'ADMIN' } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
        console.error('Admin session check error:', err);
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
          <p className="text-slate-500 text-xs font-semibold">Loading Admin Portal...</p>
        </div>
      </div>
    );
  }

  if (!authUser || authUser.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Admin Portal Authentication</h2>
          <p className="text-xs text-slate-500 mt-1">Please sign in with Admin credentials to access the management panel.</p>
        </div>
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  return <AdminDashboard user={authUser} onLogout={handleLogout} />;
}
