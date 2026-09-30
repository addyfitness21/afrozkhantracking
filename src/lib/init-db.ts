import { query } from './db';

export async function initDatabase() {
  try {
    // 1. Create users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('USER', 'ADMIN')),
        age INT,
        initial_weight NUMERIC(5,2),
        height NUMERIC(5,2),
        target_weight NUMERIC(5,2),
        gender VARCHAR(10) DEFAULT 'MALE',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS age INT`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS initial_weight NUMERIC(5,2)`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS height NUMERIC(5,2)`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS target_weight NUMERIC(5,2)`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(10) DEFAULT 'MALE'`);

    // 2. Create daily_logs table (Allows multiple log entries per user)
    await query(`
      CREATE TABLE IF NOT EXISTS daily_logs (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
        log_date DATE NOT NULL,
        weight NUMERIC(5,2) NOT NULL,
        age INT,
        image_url TEXT,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await query(`ALTER TABLE daily_logs DROP CONSTRAINT IF EXISTS daily_logs_user_id_log_date_key`);
    await query(`ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS age INT`);

    // 3. Create plans table
    await query(`
      CREATE TABLE IF NOT EXISTS plans (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        diet_plan TEXT,
        workout_plan TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Create messages table
    await query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
        sender_role VARCHAR(20) NOT NULL,
        sender_name TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Create payment_reminders table
    await query(`
      CREATE TABLE IF NOT EXISTS payment_reminders (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        amount NUMERIC(10,2) NOT NULL,
        due_date DATE NOT NULL,
        notes TEXT,
        status VARCHAR(20) DEFAULT 'PENDING',
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Remove any demo client user '1' if present
    await query(`DELETE FROM users WHERE id = '1'`);

    // Seed Admin ID: 2, Password: 2
    const admin2 = await query(`SELECT id FROM users WHERE id = '2'`);
    if (admin2.rows.length === 0) {
      await query(
        `INSERT INTO users (id, password, name, role) VALUES ($1, $2, $3, $4)`,
        ['2', '2', 'Coach Afroz Khan (Admin)', 'ADMIN']
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to initialize database:', error);
    return { success: false, error };
  }
}
