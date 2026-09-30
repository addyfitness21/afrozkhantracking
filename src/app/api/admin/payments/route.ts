import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const res = await query('SELECT * FROM payment_reminders WHERE user_id = $1', [userId]);
    const reminder = res.rows.length > 0 ? res.rows[0] : null;

    return NextResponse.json({ reminder });
  } catch (error: any) {
    console.error('Admin payment fetch error:', error);
    return NextResponse.json({ error: error?.message || 'Database error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, amount, dueDate, notes, status } = body;

    if (!userId || !amount || !dueDate) {
      return NextResponse.json({ error: 'User ID, Amount, and Due Date are required' }, { status: 400 });
    }

    await query(
      `INSERT INTO payment_reminders (user_id, amount, due_date, notes, status, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id)
       DO UPDATE SET
         amount = EXCLUDED.amount,
         due_date = EXCLUDED.due_date,
         notes = EXCLUDED.notes,
         status = EXCLUDED.status,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, amount, dueDate, notes || '', status || 'PENDING']
    );

    return NextResponse.json({ success: true, message: 'Payment reminder saved and sent to client!' });
  } catch (error: any) {
    console.error('Save payment reminder error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to save payment reminder' }, { status: 500 });
  }
}
