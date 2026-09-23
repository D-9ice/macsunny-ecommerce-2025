import { NextResponse } from 'next/server';
import { validateAdminCredentials, hashPassword } from '@/app/lib/auth';
import { connectDB } from '@/app/lib/mongodb';
import Admin from '@/src/models/Admin';
import { isAdminAuthenticated } from '@/app/lib/adminAuth';
import { rateAllowed, readBoundedJson, sameOrigin } from '@/app/lib/requestSecurity';

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) {
      return NextResponse.json({ success: false, message: 'Unexpected request origin.' }, { status: 403 });
    }

    if (!rateAllowed(request, 'admin-change-password', 5, 15 * 60_000)) {
      return NextResponse.json({ success: false, message: 'Too many password-change attempts. Try again later.' }, { status: 429 });
    }

    const isAuthenticated = await isAdminAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const parsed = await readBoundedJson(request, 8 * 1024);
    if (!parsed.ok) {
      return NextResponse.json({ success: false, message: parsed.message }, { status: parsed.status });
    }

    const currentPassword = String(parsed.value?.currentPassword || '').slice(0, 256);
    const newPassword = String(parsed.value?.newPassword || '').slice(0, 256);

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 12) {
      return NextResponse.json(
        { success: false, message: 'New password must be at least 12 characters' },
        { status: 400 }
      );
    }

    if (newPassword === currentPassword) {
      return NextResponse.json(
        { success: false, message: 'Choose a new password that is different from the current password.' },
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