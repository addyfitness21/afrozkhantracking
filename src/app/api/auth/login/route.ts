import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { initDatabase } from '@/lib/init-db';
import { createToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    // Ensure DB tables & initial seed accounts are created
    await initDatabase();

    const body = await request.json();
    const { id, password } = body;

    if (!id || !password) {
      return NextResponse.json(
        { error: 'User ID and Password are required' },
        { status: 400 }
      );
    }

    const cleanId = String(id).trim();
    const cleanPass = String(password).trim();

    // Query user from database
    const res = await query(
      'SELECT id, name, role, password FROM users WHERE id = $1',
      [cleanId]
    );

    if (res.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid User ID or Password' },
        { status: 401 }
      );
    }

    const userRow = res.rows[0];

    // Check password match (supports plain text for seed users & newly created simple passwords)
    if (userRow.password !== cleanPass) {
      return NextResponse.json(
        { error: 'Invalid User ID or Password' },
        { status: 401 }
      );
    }

    const authUser = {
      id: userRow.id,
      name: userRow.name,
      role: userRow.role,
    };

    const token = createToken(authUser);

    const response = NextResponse.json({
      success: true,
      user: authUser,
    });

    // Set cookie (valid for 30 days)
    response.cookies.set('fitpulse_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error?.message || 'Server login failed' },
      { status: 500 }
    );
  }
}
