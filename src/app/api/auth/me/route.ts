import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const authPayload = await getAuthUser();
    if (!authPayload || !authPayload.id) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const cleanId = String(authPayload.id).trim();
    const res = await query(
      'SELECT id, name, role FROM users WHERE id = $1',
      [cleanId]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const dbUser = res.rows[0];
    return NextResponse.json({
      authenticated: true,
      user: {
        id: dbUser.id,
        name: dbUser.name,
        role: dbUser.role,
      },
    });
  } catch (error) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }
}
