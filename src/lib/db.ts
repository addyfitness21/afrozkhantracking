import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || '';

// Deduplicate users by clean user ID
function deduplicateUsers(users: any[]) {
  const map = new Map();
  for (const u of users) {
    if (u && u.id) {
      map.set(String(u.id).trim(), u);
    }
  }
  return Array.from(map.values());
}

// Serverless-safe directory determination (defaults to process.cwd()/.data, falls back to /tmp/.data)
function getStoragePaths() {
  let dataDir = path.join(process.cwd(), '.data');
  let dbFile = path.join(dataDir, 'store.json');
  return { dataDir, dbFile };
}

function ensureLocalStore() {
  try {
    const { dataDir, dbFile } = getStoragePaths();
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (e) {
        // Fallback to /tmp if process.cwd() is read-only (e.g., Vercel serverless)
        const tmpDir = path.join('/tmp', '.data');
        if (!fs.existsSync(tmpDir)) {
          fs.mkdirSync(tmpDir, { recursive: true });
        }
        const tmpFile = path.join(tmpDir, 'store.json');
        if (!fs.existsSync(tmpFile)) {
          const initialData = {
            users: [{ id: '2', password: '2', name: 'Coach Afroz Khan (Admin)', role: 'ADMIN', created_at: new Date().toISOString() }],
            daily_logs: [],
            plans: [],
            messages: [],
            payment_reminders: []
          };
          fs.writeFileSync(tmpFile, JSON.stringify(initialData, null, 2));
        }
        return { dataDir: tmpDir, dbFile: tmpFile };
      }
    }

    if (!fs.existsSync(dbFile)) {
      const initialData = {
        users: [{ id: '2', password: '2', name: 'Coach Afroz Khan (Admin)', role: 'ADMIN', created_at: new Date().toISOString() }],
        daily_logs: [],
        plans: [],
        messages: [],
        payment_reminders: []
      };
      fs.writeFileSync(dbFile, JSON.stringify(initialData, null, 2));
    }
    return { dataDir, dbFile };
  } catch (err) {
    const tmpDir = path.join('/tmp', '.data');
    const tmpFile = path.join(tmpDir, 'store.json');
    try {
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
      if (!fs.existsSync(tmpFile)) {
        fs.writeFileSync(tmpFile, JSON.stringify({
          users: [{ id: '2', password: '2', name: 'Coach Afroz Khan (Admin)', role: 'ADMIN', created_at: new Date().toISOString() }],
          daily_logs: [], plans: [], messages: [], payment_reminders: []
        }, null, 2));
      }
    } catch (e) {}
    return { dataDir: tmpDir, dbFile: tmpFile };
  }
}

export function readLocalStore() {
  const { dbFile } = ensureLocalStore();
  try {
    if (fs.existsSync(dbFile)) {
      const content = fs.readFileSync(dbFile, 'utf-8');
      const data = JSON.parse(content);
      if (data.users) data.users = deduplicateUsers(data.users);
      if (!data.messages) data.messages = [];
      if (!data.payment_reminders) data.payment_reminders = [];
      return data;
    }
  } catch (e) {}
  return {
    users: [{ id: '2', password: '2', name: 'Coach Afroz Khan (Admin)', role: 'ADMIN', created_at: new Date().toISOString() }],
    daily_logs: [], plans: [], messages: [], payment_reminders: []
  };
}

export function writeLocalStore(data: any) {
  const { dbFile } = ensureLocalStore();
  try {
    if (data.users) data.users = deduplicateUsers(data.users);
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
  } catch (e) {}
}

let useLocalFallback = false;

export async function query(text: string, params: any[] = []) {
  if (!useLocalFallback && connectionString) {
    try {
      const sql = neon(connectionString);
      const rows = await sql.query(text, params);
      return { rows: rows as any[] };
    } catch (neonError: any) {
      console.warn('Neon DB query failed, switching to local store fallback:', neonError?.message);
      useLocalFallback = true;
    }
  }

  // Local fallback engine for queries
  ensureLocalStore();
  const store = readLocalStore();
  const normalizedText = text.trim().toUpperCase();

  // 1. SELECT users WHERE id = $1
  if (normalizedText.includes('FROM USERS WHERE ID =') || normalizedText.includes('FROM USERS WHERE TRIM(ID) =')) {
    const userId = String(params[0]).trim();
    const user = store.users.find((u: any) => String(u.id).trim() === userId);
    return { rows: user ? [user] : [] };
  }

  // 2. SELECT users (ALL ADMIN LIST)
  if (normalizedText.includes('FROM USERS U') || normalizedText.includes('SELECT U.ID')) {
    const result = store.users.map((u: any) => {
      const userLogs = store.daily_logs.filter((l: any) => String(l.user_id).trim() === String(u.id).trim());
      const sortedLogs = [...userLogs].sort((a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime());
      return {
        ...u,
        total_logs: userLogs.length,
        last_log_date: sortedLogs[0]?.log_date || null,
        latest_weight: sortedLogs[0]?.weight ? parseFloat(String(sortedLogs[0].weight)) : null
      };
    });
    return { rows: result };
  }

  // 3. INSERT INTO users
  if (normalizedText.startsWith('INSERT INTO USERS')) {
    const [id, password, name, role, age, initial_weight, height, target_weight, gender] = params;
    const cleanId = String(id).trim();
    const existingIndex = store.users.findIndex((u: any) => String(u.id).trim() === cleanId);
    const newUser = {
      id: cleanId,
      password: String(password).trim(),
      name: String(name).trim(),
      role: role || 'USER',
      age: age ? parseInt(String(age), 10) : null,
      initial_weight: initial_weight ? parseFloat(String(initial_weight)) : null,
      height: height ? parseFloat(String(height)) : null,
      target_weight: target_weight ? parseFloat(String(target_weight)) : null,
      gender: gender || 'MALE',
      created_at: new Date().toISOString()
    };
    if (existingIndex >= 0) {
      store.users[existingIndex] = { ...store.users[existingIndex], ...newUser };
    } else {
      store.users.push(newUser);
    }
    writeLocalStore(store);
    return { rows: [] };
  }

  // 4. UPDATE users SET password / UPDATE users SET id, name, password
  if (normalizedText.startsWith('UPDATE USERS SET')) {
    if (normalizedText.includes('SET ID =') || normalizedText.includes('SET NAME =') || normalizedText.includes('INITIAL_WEIGHT')) {
      const [newId, newName, newPass, newAge, newInitialWeight, newHeight, newTargetWeight, newGender, currentId] = params;
      const cId = String(currentId || params[params.length - 1]).trim();
      const nId = String(newId).trim();

      const user = store.users.find((u: any) => String(u.id).trim() === cId);
      if (user) {
        user.id = nId;
        user.name = String(newName).trim();
        user.password = String(newPass).trim();
        if (newAge !== undefined) user.age = newAge ? parseInt(String(newAge), 10) : null;
        if (newInitialWeight !== undefined) user.initial_weight = newInitialWeight ? parseFloat(String(newInitialWeight)) : null;
        if (newHeight !== undefined) user.height = newHeight ? parseFloat(String(newHeight)) : null;
        if (newTargetWeight !== undefined) user.target_weight = newTargetWeight ? parseFloat(String(newTargetWeight)) : null;
        if (newGender) user.gender = String(newGender).toUpperCase();

        if (cId !== nId) {
          store.daily_logs.forEach((l: any) => { if (String(l.user_id).trim() === cId) l.user_id = nId; });
          store.plans.forEach((p: any) => { if (String(p.user_id).trim() === cId) p.user_id = nId; });
          store.messages.forEach((m: any) => { if (String(m.user_id).trim() === cId) m.user_id = nId; });
          store.payment_reminders.forEach((pr: any) => { if (String(pr.user_id).trim() === cId) pr.user_id = nId; });
        }
        writeLocalStore(store);
      }
      return { rows: [] };
    }

    const [newPass, userId] = params;
    const user = store.users.find((u: any) => String(u.id).trim() === String(userId).trim());
    if (user) {
      user.password = String(newPass).trim();
      writeLocalStore(store);
    }
    return { rows: [] };
  }

  // 5. DELETE FROM users
  if (normalizedText.startsWith('DELETE FROM USERS')) {
    const userId = String(params[0]).trim();
    store.users = store.users.filter((u: any) => String(u.id).trim() !== userId);
    store.daily_logs = store.daily_logs.filter((l: any) => String(l.user_id).trim() !== userId);
    store.plans = store.plans.filter((p: any) => String(p.user_id).trim() !== userId);
    store.messages = store.messages.filter((m: any) => String(m.user_id).trim() !== userId);
    store.payment_reminders = store.payment_reminders.filter((pr: any) => String(pr.user_id).trim() !== userId);
    writeLocalStore(store);
    return { rows: [] };
  }

  // 6. SELECT plans WHERE user_id = $1
  if (normalizedText.includes('FROM PLANS WHERE USER_ID =')) {
    const userId = String(params[0]).trim();
    const plan = store.plans.find((p: any) => String(p.user_id).trim() === userId);
    return { rows: plan ? [plan] : [] };
  }

  // 7. INSERT / UPDATE plans
  if (normalizedText.includes('INTO PLANS') || normalizedText.includes('UPDATE SET DIET_PLAN')) {
    const [userId, dietPlan, workoutPlan] = params;
    const existingIndex = store.plans.findIndex((p: any) => String(p.user_id).trim() === String(userId).trim());
    if (existingIndex >= 0) {
      store.plans[existingIndex] = {
        user_id: String(userId).trim(),
        diet_plan: dietPlan || '',
        workout_plan: workoutPlan || '',
        updated_at: new Date().toISOString()
      };
    } else {
      store.plans.push({
        user_id: String(userId).trim(),
        diet_plan: dietPlan || '',
        workout_plan: workoutPlan || '',
        updated_at: new Date().toISOString()
      });
    }
    writeLocalStore(store);
    return { rows: [] };
  }

  // 8. SELECT daily_logs WHERE user_id = $1
  if (normalizedText.includes('FROM DAILY_LOGS WHERE USER_ID =') || normalizedText.includes('FROM DAILY_LOGS WHERE TRIM(USER_ID) =')) {
    const userId = String(params[0]).trim();
    const userLogs = store.daily_logs
      .filter((l: any) => String(l.user_id).trim() === userId)
      .map((l: any) => ({
        ...l,
        log_date: typeof l.log_date === 'string' ? l.log_date.split('T')[0] : l.log_date,
        weight: parseFloat(l.weight)
      }))
      .sort((a: any, b: any) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime());
    return { rows: userLogs };
  }

  // 9. INSERT INTO daily_logs (Always create brand new entry record)
  if (normalizedText.includes('INTO DAILY_LOGS')) {
    const [userId, logDate, weight, imageUrl, notes] = params;
    const cleanUserId = String(userId).trim();
    const cleanDate = typeof logDate === 'string' ? logDate.split('T')[0] : logDate;

    const newLog = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      user_id: cleanUserId,
      log_date: cleanDate,
      weight: parseFloat(weight),
      image_url: (imageUrl && String(imageUrl).trim() !== '') ? imageUrl : null,
      notes: notes !== undefined && notes !== null ? String(notes) : '',
      created_at: new Date().toISOString()
    };
    
    // Always append as a new log entry
    store.daily_logs.push(newLog);
    writeLocalStore(store);
    return { rows: [newLog] };
  }

  // 10. SELECT messages WHERE user_id = $1
  if (normalizedText.includes('FROM MESSAGES WHERE USER_ID =')) {
    const userId = String(params[0]).trim();
    const userMsgs = store.messages
      .filter((m: any) => String(m.user_id).trim() === userId)
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return { rows: userMsgs };
  }

  // 11. INSERT INTO messages
  if (normalizedText.startsWith('INSERT INTO MESSAGES')) {
    const [userId, senderRole, senderName, messageText] = params;
    const newMsg = {
      id: Date.now(),
      user_id: String(userId).trim(),
      sender_role: senderRole,
      sender_name: senderName,
      message: messageText,
      created_at: new Date().toISOString()
    };
    store.messages.push(newMsg);
    writeLocalStore(store);
    return { rows: [newMsg] };
  }

  // 12. SELECT payment_reminders WHERE user_id = $1
  if (normalizedText.includes('FROM PAYMENT_REMINDERS WHERE USER_ID =')) {
    const userId = String(params[0]).trim();
    const reminder = store.payment_reminders.find((pr: any) => String(pr.user_id).trim() === userId);
    return { rows: reminder ? [reminder] : [] };
  }

  // 13. INSERT / UPDATE payment_reminders
  if (normalizedText.includes('INTO PAYMENT_REMINDERS') || normalizedText.includes('UPDATE SET STATUS')) {
    const [userId, amount, dueDate, notes, status] = params;
    const existingIndex = store.payment_reminders.findIndex((pr: any) => String(pr.user_id).trim() === String(userId).trim());
    const newReminder = {
      id: existingIndex >= 0 ? store.payment_reminders[existingIndex].id : Date.now(),
      user_id: String(userId).trim(),
      amount: parseFloat(amount),
      due_date: dueDate,
      notes: notes || '',
      status: status || 'PENDING',
      updated_at: new Date().toISOString()
    };
    if (existingIndex >= 0) {
      store.payment_reminders[existingIndex] = newReminder;
    } else {
      store.payment_reminders.push(newReminder);
    }
    writeLocalStore(store);
    return { rows: [newReminder] };
  }

  return { rows: [] };
}
