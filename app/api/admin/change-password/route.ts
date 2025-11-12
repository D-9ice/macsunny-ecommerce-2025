import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { validateAdminCredentials, hashPassword } from '@/app/lib/auth';
import { connectDB } from '@/app/lib/mongodb';
import Admin from '@/src/models/Admin';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get('ms_admin')?.value === '1';

    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: 'New password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Verify current password using bcrypt
    const isValid = await validateAdminCredentials(currentPassword);
    
    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Connect to database and update password
    await connectDB();
    
    // Try to find existing admin or create new one
    let admin = await Admin.findOne({ email: 'admin@macsunny.com' });
    
    if (admin) {
      admin.passwordHash = newPasswordHash;
      await admin.save();
    } else {
      // Create new admin with hashed password
      admin = new Admin({
        email: 'admin@macsunny.com',
        passwordHash: newPasswordHash,
      });
      await admin.save();
    }
    
    return NextResponse.json({
      success: true,
      message: 'Password changed successfully! Your new password is now active.',
    });

  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to change password' },
      { status: 500 }
    );
  }
}