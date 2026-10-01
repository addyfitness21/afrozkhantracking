'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/LoginForm';

export default function Home() {
  const router = useRouter();

  const handleLoginSuccess = (user: { id: string; name: string; role: 'USER' | 'ADMIN' }) => {
    if (user.role === 'ADMIN') {
      router.push('/admin');
    } else {
      router.push(`/${encodeURIComponent(user.id)}`);
    }
  };

  // Root URL (/) is strictly the Login Page — always displays the login form immediately
  return <LoginForm onLoginSuccess={handleLoginSuccess} />;
}
