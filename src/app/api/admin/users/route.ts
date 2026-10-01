import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthUser, createToken } from '@/lib/auth';

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 });
    }

    const res = await query(`
      SELECT 
        u.id, 
        u.name, 
        u.role, 
        u.password,
        u.age,
        u.initial_weight,
        u.height,
        u.target_weight,
        u.gender,
        u.created_at,
        COUNT(l.id)::int as total_logs,
        MAX(l.log_date) as last_log_date,
        (
          SELECT weight FROM daily_logs 
          WHERE TRIM(user_id) = TRIM(u.id) 
          ORDER BY log_date DESC LIMIT 1
        ) as latest_weight
      FROM users u
      LEFT JOIN daily_logs l ON TRIM(u.id) = TRIM(l.user_id)
      GROUP BY u.id, u.name, u.role, u.password, u.age, u.initial_weight, u.height, u.target_weight, u.gender, u.created_at
      ORDER BY u.created_at DESC;
    `);

    return NextResponse.json({ users: res.rows });
  } catch (error: any) {
    console.error('Error fetching admin users:', error);
    return NextResponse.json({ error: error?.message || 'Database query failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 });
    }

    const body = await request.json();
    const { action, id, password, name, role, age, initial_weight, height, target_weight, gender, userId, newPassword } = body;

    // 1. Create new user
    if (action === 'create') {
      if (!id || !password || !name) {
        return NextResponse.json({ error: 'User ID, Password, and Name are required' }, { status: 400 });
      }

      const cleanId = String(id).trim();
      const cleanPass = String(password).trim();
      const cleanName = String(name).trim();
      const userRole = role === 'ADMIN' ? 'ADMIN' : 'USER';
      const parsedAge = age ? parseInt(String(age), 10) : null;
      const parsedInitialWeight = initial_weight ? parseFloat(String(initial_weight)) : null;
      const parsedHeight = height ? parseFloat(String(height)) : null;
      const parsedTargetWeight = target_weight ? parseFloat(String(target_weight)) : null;
      const userGender = gender ? String(gender).trim().toUpperCase() : 'MALE';

      // Check existing user
      const check = await query('SELECT id FROM users WHERE TRIM(id) = $1', [cleanId]);
      if (check.rows.length > 0) {
        return NextResponse.json({ error: 'User ID already exists. Please choose a unique ID.' }, { status: 400 });
      }

      await query(
        'INSERT INTO users (id, password, name, role, age, initial_weight, height, target_weight, gender) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [cleanId, cleanPass, cleanName, userRole, parsedAge, parsedInitialWeight, parsedHeight, parsedTargetWeight, userGender]
      );

      // Create initial log entry if initial weight provided
      if (parsedInitialWeight) {
        const today = new Date().toISOString().split('T')[0];
        await query(
          'INSERT INTO daily_logs (user_id, log_date, weight, age, notes) VALUES ($1, $2, $3, $4, $5)',
          [cleanId, today, parsedInitialWeight, parsedAge, 'Initial onboarding weight set by Admin']
        );
      }

      // Create default plan placeholder for new user
      await query(
        'INSERT INTO plans (user_id, diet_plan, workout_plan) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO NOTHING',
        [
          cleanId,
          'Diet plan not assigned yet by admin.',
          'Workout plan not assigned yet by admin.'
        ]
      );

      return NextResponse.json({ success: true, message: `User ${cleanId} created successfully.` });
    }

    // 2. Edit / Change User Password
    if (action === 'updatePassword') {
      if (!userId || !newPassword) {
        return NextResponse.json({ error: 'User ID and new password are required' }, { status: 400 });
      }

      const cleanUserId = String(userId).trim();
      const cleanNewPass = String(newPassword).trim();

      await query('UPDATE users SET password = $1 WHERE TRIM(id) = $2', [cleanNewPass, cleanUserId]);
      return NextResponse.json({ success: true, message: `Password for User ${cleanUserId} updated successfully.` });
    }

    // 3. Delete User
    if (action === 'delete') {
      if (!userId) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      }

      const cleanUserId = String(userId).trim();
      if (cleanUserId === authUser.id) {
        return NextResponse.json({ error: 'You cannot delete your own admin account while logged in.' }, { status: 400 });
      }

      await query('DELETE FROM users WHERE TRIM(id) = $1', [cleanUserId]);
      return NextResponse.json({ success: true, message: `User ${cleanUserId} deleted successfully.` });
    }

    // 4. Update Credentials & Body Metrics
    if (action === 'updateCredentials') {
      const { currentUserId, newUserId, newName, newPassword, newAge, newInitialWeight, newHeight, newTargetWeight, newGender } = body;
      if (!currentUserId || !newUserId || !newName || !newPassword) {
        return NextResponse.json({ error: 'User ID, Name, and Password are required' }, { status: 400 });
      }

      const cId = String(currentUserId).trim();
      const nId = String(newUserId).trim();
      const nName = String(newName).trim();
      const nPass = String(newPassword).trim();
      const pAge = newAge ? parseInt(String(newAge), 10) : null;
      const pInitialWeight = newInitialWeight ? parseFloat(String(newInitialWeight)) : null;
      const pHeight = newHeight ? parseFloat(String(newHeight)) : null;
      const pTargetWeight = newTargetWeight ? parseFloat(String(newTargetWeight)) : null;
      const pGender = newGender ? String(newGender).trim().toUpperCase() : 'MALE';

      if (cId !== nId) {
        const check = await query('SELECT id FROM users WHERE TRIM(id) = $1', [nId]);
        if (check.rows.length > 0) {
          return NextResponse.json({ error: 'New User ID is already taken by another account.' }, { status: 400 });
        }

        // Update references in child tables before updating users primary key
        await query('UPDATE daily_logs SET user_id = $1 WHERE TRIM(user_id) = $2', [nId, cId]);
        await query('UPDATE plans SET user_id = $1 WHERE TRIM(user_id) = $2', [nId, cId]);
        await query('UPDATE messages SET user_id = $1 WHERE TRIM(user_id) = $2', [nId, cId]);
        await query('UPDATE payment_reminders SET user_id = $1 WHERE TRIM(user_id) = $2', [nId, cId]);
      }

      await query(
        'UPDATE users SET id = $1, name = $2, password = $3, age = $4, initial_weight = $5, height = $6, target_weight = $7, gender = $8 WHERE TRIM(id) = $9',
        [nId, nName, nPass, pAge, pInitialWeight, pHeight, pTargetWeight, pGender, cId]
      );

      const response = NextResponse.json({ success: true, message: 'Credentials updated successfully.', newUserId: nId });

      // If updating the currently logged-in Admin's credentials, issue a refreshed token cookie
      if (cId === authUser.id) {
        const refreshedUser = { id: nId, name: nName, role: authUser.role };
        const token = createToken(refreshedUser);
        response.cookies.set('fitpulse_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 30 * 24 * 60 * 60,
        });
      }

      return response;
    }

    return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 });
  } catch (error: any) {
    console.error('Error modifying user:', error);
    return NextResponse.json({ error: error?.message || 'Server operation failed' }, { status: 500 });
  }
}
