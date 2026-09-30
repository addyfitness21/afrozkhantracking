import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const paramUserId = searchParams.get('userId');

    // Admin can specify client userId; Regular user views their own chat
    const targetUserId = authUser.role === 'ADMIN' && paramUserId ? paramUserId : authUser.id;

    const res = await query(
      'SELECT id, user_id, sender_role, sender_name, message, created_at FROM messages WHERE user_id = $1 ORDER BY created_at ASC',
      [targetUserId]
    );

    return NextResponse.json({ messages: res.rows });
  } catch (error: any) {
    console.error('Chat fetch error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId: recipientUserId, message } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message content cannot be empty' }, { status: 400 });
    }

    const targetUserId = authUser.role === 'ADMIN' ? (recipientUserId || '').trim() : authUser.id;

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
    }

    const res = await query(
      'INSERT INTO messages (user_id, sender_role, sender_name, message) VALUES ($1, $2, $3, $4)',
      [targetUserId, authUser.role, authUser.name, message.trim()]
    );

    const insertedMsg = res.rows && res.rows.length > 0 ? res.rows[0] : {
      id: Date.now(),
      user_id: targetUserId,
      sender_role: authUser.role,
      sender_name: authUser.name,
      message: message.trim(),
      created_at: new Date().toISOString()
    };

    return NextResponse.json({ success: true, message: insertedMsg });
  } catch (error: any) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to send message' }, { status: 500 });
  }
}
