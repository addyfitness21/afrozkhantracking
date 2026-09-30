import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cleanUserId = String(authUser.id).trim();
    const res = await query('SELECT * FROM payment_reminders WHERE TRIM(user_id) = TRIM($1)', [cleanUserId]);
    const reminder = res.rows.length > 0 ? res.rows[0] : null;

    return NextResponse.json({ reminder });
  } catch (error: any) {
    console.error('User payment fetch error:', error);
    return NextResponse.json({ error: error?.message || 'Database error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'mark_paid') {
      await query(
        `UPDATE payment_reminders SET status = 'PAID', updated_at = CURRENT_TIMESTAMP WHERE user_id = $1`,
        [authUser.id]
      );
      return NextResponse.json({ success: true, message: 'Payment status updated to PAID' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Update payment status error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update payment status' }, { status: 500 });
  }
}
