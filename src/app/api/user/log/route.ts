import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { logDate, weight, imageUrl, notes, userId } = body;

    let targetUserId = authUser.id;
    if (userId && String(userId).trim()) {
      const cleanTarget = String(userId).trim();
      if (authUser.role === 'ADMIN' || authUser.id.trim().toLowerCase() === cleanTarget.toLowerCase()) {
        targetUserId = cleanTarget;
      }
    }

    if (!logDate || !weight) {
      return NextResponse.json({ error: 'Date and Weight (kg) are required' }, { status: 400 });
    }

    const numericWeight = parseFloat(weight);
    if (isNaN(numericWeight) || numericWeight <= 0 || numericWeight > 500) {
      return NextResponse.json({ error: 'Please enter a valid weight in kg' }, { status: 400 });
    }

    const cleanDate = typeof logDate === 'string' ? logDate.split('T')[0] : logDate;

    // Save as brand new log entry (never overwrite or delete previous entries)
    const res = await query(
      `INSERT INTO daily_logs (user_id, log_date, weight, image_url, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [targetUserId, cleanDate, numericWeight, imageUrl || null, notes || '']
    );

    return NextResponse.json({
      success: true,
      message: 'Daily body weight and progress logged successfully!'
    });
  } catch (error: any) {
    console.error('Error logging daily weight:', error);
    return NextResponse.json({ error: error?.message || 'Failed to save daily log' }, { status: 500 });
  }
}
