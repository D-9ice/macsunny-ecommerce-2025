import bcrypt from 'bcrypt';
import { connectDB } from './mongodb';
import Admin from '@/src/models/Admin';

const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'admin123'; // Only used for first-time setup

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
    
    // If no admin exists, create default one
    if (!admin) {
      const defaultPasswordHash = await hashPassword(DEFAULT_PASSWORD);
      admin = await Admin.create({
        email: 'admin@macsunny.com',
        passwordHash: defaultPasswordHash,
      });
      console.log('✅ Default admin created. Password: admin123 (Please change this!)');
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
