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

    const res = await query('SELECT * FROM plans WHERE user_id = $1', [userId]);
    const plan = res.rows.length > 0 ? res.rows[0] : { user_id: userId, diet_plan: '', workout_plan: '' };

    return NextResponse.json({ plan });
  } catch (error: any) {
    console.error('Error fetching plan:', error);
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
    const { userId, dietPlan, workoutPlan } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await query(`
      INSERT INTO plans (user_id, diet_plan, workout_plan, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id)
      DO UPDATE SET
        diet_plan = EXCLUDED.diet_plan,
        workout_plan = EXCLUDED.workout_plan,
        updated_at = CURRENT_TIMESTAMP;
    `, [userId, dietPlan || '', workoutPlan || '']);

    return NextResponse.json({ success: true, message: 'Diet & Workout plan updated successfully' });
  } catch (error: any) {
    console.error('Error saving plan:', error);
    return NextResponse.json({ error: error?.message || 'Failed to save plan' }, { status: 500 });
  }
}
