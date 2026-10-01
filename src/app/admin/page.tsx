'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminDashboard from '@/components/AdminDashboard';
import LoginForm from '@/components/LoginForm';
import { getSessionToken, clearTabSession, authFetch } from '@/lib/clientAuth';

export default function DedicatedAdminPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<{ id: string; name: string; role: 'USER' | 'ADMIN' } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if this specific tab has an authenticated session token
    const token = getSessionToken();
    if (!token) {
      // New tab / copied URL / unauthenticated tab -> strictly show login form
      setAuthUser(null);
      setLoading(false);
      return;
    }

    const checkSession = async () => {
      try {
        const res = await authFetch('/api/auth/me');
        const data = await res.json();
        if (res.ok && data.authenticated && data.user && data.user.role === 'ADMIN') {
          setAuthUser(data.user);
        } else {
          clearTabSession();
          setAuthUser(null);
        }
      } catch (err) {
        clearTabSession();
        setAuthUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const handleLoginSuccess = (u: { id: string; name: string; role: 'USER' | 'ADMIN' }) => {
    if (u.role === 'ADMIN') {
      setAuthUser(u);
    } else {
      router.push(`/${encodeURIComponent(u.id)}`);
    }
  };

  const handleLogout = async () => {
    try {
      await authFetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    clearTabSession();
    setAuthUser(null);
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-slate-500 text-xs font-semibold">Verifying Admin Access...</p>
        </div>
      </div>
    );
  }

  // If not authenticated in this specific tab, display Login Form
  if (!authUser || authUser.role !== 'ADMIN') {
    return (
      <LoginForm
        title="Admin Portal Access"
        subtitle="Password required to access Coach Dashboard"
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return <AdminDashboard user={authUser} onLogout={handleLogout} />;
}
