import { cookies, headers } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fitpulse_secret_key_2026_super_secure';

export interface AuthUser {
  id: string;
  name: string;
  role: 'USER' | 'ADMIN';
}

export function createToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '12h' });
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch (err) {
    return null;
  }
}

export async function getAuthUser(): Promise<AuthUser | null> {
  // Check Authorization header first (tab-isolated session token)
  try {
    const headerList = await headers();
    const authHeader = headerList.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (token) {
        return verifyToken(token);
      }
    }
  } catch (e) {}

  // Fallback to cookie if present
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fitpulse_token')?.value;
    if (token) {
      return verifyToken(token);
    }
  } catch (e) {}

  return null;
}
