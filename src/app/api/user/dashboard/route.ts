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
    const paramUserId = searchParams.get('userId') || searchParams.get('username');

    let targetUserId = authUser.id;
    if (paramUserId && paramUserId.trim()) {
      const cleanParam = paramUserId.trim();
      if (authUser.role === 'ADMIN' || authUser.id.trim().toLowerCase() === cleanParam.toLowerCase()) {
        targetUserId = cleanParam;
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Fetch full user record
    const userRes = await query(
      'SELECT id, name, role, age, initial_weight, height, target_weight, created_at FROM users WHERE TRIM(id) = TRIM($1)',
      [targetUserId]
    );
    const userProfile = userRes.rows.length > 0 ? userRes.rows[0] : (targetUserId === authUser.id ? authUser : { id: targetUserId, name: targetUserId, role: 'USER' });

    // Fetch user daily logs
    const logsRes = await query(
      'SELECT id, user_id, log_date, weight, image_url, notes, created_at FROM daily_logs WHERE TRIM(user_id) = TRIM($1) ORDER BY log_date DESC',
      [targetUserId]
    );

    // Fetch user plan
    const planRes = await query('SELECT diet_plan, workout_plan, updated_at FROM plans WHERE TRIM(user_id) = TRIM($1)', [targetUserId]);
    const plan = planRes.rows.length > 0 ? planRes.rows[0] : { diet_plan: '', workout_plan: '' };

    // Fetch payment reminder
    const payRes = await query('SELECT * FROM payment_reminders WHERE TRIM(user_id) = TRIM($1)', [targetUserId]);
    const paymentReminder = payRes.rows.length > 0 ? payRes.rows[0] : null;

    // Calculate weight statistics
    const logs = logsRes.rows;
    const latestLog = logs[0] || null;
    const oldestLog = logs[logs.length - 1] || null;
    
    let weightChange = null;
    if (latestLog && oldestLog && logs.length > 1) {
      weightChange = (parseFloat(latestLog.weight) - parseFloat(oldestLog.weight)).toFixed(1);
    }

    return NextResponse.json({
      user: userProfile,
      logs,
      latestLog,
      weightChange,
      plan,
      paymentReminder
    });
  } catch (error: any) {
    console.error('User dashboard fetch error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to load user dashboard' }, { status: 500 });
  }
}
