'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/LoginForm';
import UserDashboard from '@/components/UserDashboard';
import AdminDashboard from '@/components/AdminDashboard';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; name: string; role: 'USER' | 'ADMIN' } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Instant hydration from localStorage if available
    try {
      const stored = localStorage.getItem('fitpulse_user');
      if (stored) {
        const u = JSON.parse(stored);
        setUser(u);
      }
    } catch (e) {}

    // 2. Validate session with backend /api/auth/me
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (res.ok && data.authenticated && data.user) {
          setUser(data.user);
          localStorage.setItem('fitpulse_user', JSON.stringify(data.user));
          if (data.user.role === 'USER') {
            router.replace(`/${encodeURIComponent(data.user.id)}`);
          }
        } else {
          setUser(null);
          localStorage.removeItem('fitpulse_user');
        }
      } catch (err) {
        console.error('Session verification failed:', err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [router]);

  const handleLoginSuccess = (u: { id: string; name: string; role: 'USER' | 'ADMIN' }) => {
    setUser(u);
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
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      localStorage.removeItem('fitpulse_user');
      setUser(null);
    }
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-slate-500 text-xs font-semibold font-mono">Restoring Session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  if (user.role === 'ADMIN') {
    return <AdminDashboard user={user} onLogout={handleLogout} />;
  }

  return <UserDashboard user={user} onLogout={handleLogout} />;
}

