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
    // Strictly verify session with backend - do NOT auto-unlock from localStorage
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (res.ok && data.authenticated && data.user && data.user.role === 'ADMIN') {
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
    if (u.role === 'ADMIN') {
      setAuthUser(u);
      try {
        localStorage.setItem('fitpulse_user', JSON.stringify(u));
      } catch (e) {}
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-slate-500 text-xs font-semibold">Checking Admin Authorization...</p>
        </div>
      </div>
    );
  }

  // If not authenticated as ADMIN, display Admin Login Form requiring password
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
