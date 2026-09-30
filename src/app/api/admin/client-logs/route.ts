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

    const cleanUserId = userId.trim();

    // Fetch user details
    const userRes = await query('SELECT id, name, role, age, initial_weight, height, target_weight, password, created_at FROM users WHERE TRIM(id) = $1', [cleanUserId]);
    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: 'Client user not found' }, { status: 404 });
    }

    // Fetch user daily logs
    const logsRes = await query(
      'SELECT id, user_id, log_date, weight, image_url, notes, created_at FROM daily_logs WHERE TRIM(user_id) = $1 ORDER BY log_date DESC, id DESC',
      [cleanUserId]
    );

    const formattedLogs = logsRes.rows.map((log: any) => {
      let formattedDate = log.log_date;
      if (formattedDate instanceof Date) {
        formattedDate = formattedDate.toISOString().split('T')[0];
      } else if (typeof formattedDate === 'string' && formattedDate.includes('T')) {
        formattedDate = formattedDate.split('T')[0];
      }
      return {
        ...log,
        log_date: String(formattedDate),
        weight: parseFloat(log.weight)
      };
    });

    // Fetch user plan
    const planRes = await query('SELECT diet_plan, workout_plan, updated_at FROM plans WHERE TRIM(user_id) = $1', [cleanUserId]);
    const plan = planRes.rows.length > 0 ? planRes.rows[0] : { diet_plan: '', workout_plan: '' };

    return NextResponse.json({
      client: userRes.rows[0],
      logs: formattedLogs,
      plan
    });
  } catch (error: any) {
    console.error('Error fetching client logs:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch logs' }, { status: 500 });
  }
}
