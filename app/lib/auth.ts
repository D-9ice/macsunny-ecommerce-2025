import bcrypt from 'bcrypt';
import { connectDB } from './mongodb';
import Admin from '@/src/models/Admin';

const SALT_ROUNDS = 10;
/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Get admin credentials from database
 * Creates default admin if none exists
 */
export async function getAdminCredentials(): Promise<{
  username: string;
  passwordHash: string;
} | null> {
  try {
    await connectDB();
    
    let admin = await Admin.findOne({ email: 'admin@macsunny.com' });
    
    if (!admin) {
      console.error('Admin account is not initialized. Refusing insecure default-account creation.');
      return null;
    }
    
    return {
      username: 'admin',
      passwordHash: admin.passwordHash,
    };
  } catch (error) {
    console.error('Failed to get admin credentials:', error);
    return null;
  }
}

/**
 * Validate admin credentials against database
 */
export async function validateAdminCredentials(
  password: string
): Promise<boolean> {
  const admin = await getAdminCredentials();
  if (!admin) return false;
  
  return verifyPassword(password, admin.passwordHash);
}
