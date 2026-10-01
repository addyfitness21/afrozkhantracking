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

    // 2. Change User Password (simple)
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

      // Prevent deleting the only ADMIN account
      const adminRows = await query('SELECT id FROM users WHERE role = $1', ['ADMIN']);
      if (adminRows.rows.length <= 1 && adminRows.rows[0]?.id === cleanUserId) {
        return NextResponse.json({ error: 'You cannot delete the only admin account.' }, { status: 400 });
      }

      await query('DELETE FROM users WHERE TRIM(id) = $1', [cleanUserId]);
      return NextResponse.json({ success: true, message: `User ${cleanUserId} deleted successfully.` });
    }

    // 4. Update Credentials & Body Metrics
    if (action === 'updateCredentials') {
      const { currentUserId, newUserId, newName, newPassword: newPass, newAge, newInitialWeight, newHeight, newTargetWeight, newGender } = body;

      if (!currentUserId || !newUserId || !newName || !newPass) {
        return NextResponse.json({ error: 'User ID, Name, and Password are required' }, { status: 400 });
      }

      const cId = String(currentUserId).trim();
      const nId = String(newUserId).trim();
      const nName = String(newName).trim();
      const nPass = String(newPass).trim();
      const pAge = newAge !== undefined && newAge !== null && newAge !== '' ? parseInt(String(newAge), 10) : null;
      const pInitialWeight = newInitialWeight !== undefined && newInitialWeight !== null && newInitialWeight !== '' ? parseFloat(String(newInitialWeight)) : null;
      const pHeight = newHeight !== undefined && newHeight !== null && newHeight !== '' ? parseFloat(String(newHeight)) : null;
      const pTargetWeight = newTargetWeight !== undefined && newTargetWeight !== null && newTargetWeight !== '' ? parseFloat(String(newTargetWeight)) : null;
      const pGender = newGender ? String(newGender).trim().toUpperCase() : null;

      // Verify the user being updated actually exists in the DB
      const existingUser = await query('SELECT id, role FROM users WHERE TRIM(id) = $1', [cId]);
      if (existingUser.rows.length === 0) {
        // currentUserId doesn't exist — try to find admin by role as fallback
        const adminFallback = await query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['ADMIN']);
        if (adminFallback.rows.length === 0) {
          return NextResponse.json({ error: 'Could not locate admin account in database.' }, { status: 404 });
        }
        // Redirect to the real admin ID found in the database
        return NextResponse.json({ 
          error: `Session is out of sync. Your actual Admin ID in the database is "${adminFallback.rows[0].id}". Please refresh the page and try again.` 
        }, { status: 409 });
      }

      // If the ID is changing, make sure the new ID doesn't conflict with a DIFFERENT user
      if (cId !== nId) {
        const conflict = await query('SELECT id FROM users WHERE TRIM(id) = $1', [nId]);
        if (conflict.rows.length > 0 && String(conflict.rows[0].id).trim() !== cId) {
          return NextResponse.json({ error: 'New User ID is already taken by another account.' }, { status: 400 });
        }

        // Update child table FK references before changing primary key
        await query('UPDATE daily_logs SET user_id = $1 WHERE TRIM(user_id) = $2', [nId, cId]);
        await query('UPDATE plans SET user_id = $1 WHERE TRIM(user_id) = $2', [nId, cId]);
        await query('UPDATE messages SET user_id = $1 WHERE TRIM(user_id) = $2', [nId, cId]);
        await query('UPDATE payment_reminders SET user_id = $1 WHERE TRIM(user_id) = $2', [nId, cId]);
      }

      // Perform the update — use COALESCE to preserve optional fields if not provided
      await query(
        `UPDATE users SET 
          id = $1, 
          name = $2, 
          password = $3, 
          age = COALESCE($4, age), 
          initial_weight = COALESCE($5, initial_weight), 
          height = COALESCE($6, height), 
          target_weight = COALESCE($7, target_weight), 
          gender = COALESCE($8, gender) 
        WHERE TRIM(id) = $9`,
        [nId, nName, nPass, pAge, pInitialWeight, pHeight, pTargetWeight, pGender, cId]
      );

      // Issue a refreshed JWT cookie for the admin with updated identity
      const isAdminSelf = existingUser.rows[0]?.role === 'ADMIN';
      const response = NextResponse.json({ success: true, message: 'Credentials updated successfully.', newUserId: nId, isAdminSelf });

      if (isAdminSelf) {
        const refreshedUser = { id: nId, name: nName, role: 'ADMIN' as const };
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
