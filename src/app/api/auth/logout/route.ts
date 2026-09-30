import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out' });
  response.cookies.set('fitpulse_token', '', {
    httpOnly: true,
    expires: new Date(0),
    maxAge: 0,
    path: '/',
  });
  return response;
}

