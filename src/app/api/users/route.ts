import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'ambulance-650-secret-key-2024';

// التحقق من صلاحيات الأدمن
async function checkAdmin() {
  const token = (await cookies()).get('auth-token')?.value;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
    if (decoded.role !== 'admin') return null;
    return decoded;
  } catch {
    return null;
  }
}

// الحصول على جميع المستخدمين
export async function GET() {
  try {
    const admin = await checkAdmin();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك بالوصول' },
        { status: 403 }
      );
    }

    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, users });
  } catch {
    return NextResponse.json(
      { success: false, error: 'حدث خطأ في استرجاع البيانات' },
      { status: 500 }
    );
  }
}

// إنشاء مستخدم جديد (أدمن فقط)
export async function POST(request: Request) {
  try {
    const admin = await checkAdmin();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك بإنشاء مستخدمين' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { success: false, error: 'يرجى ملء جميع الحقول' },
        { status: 400 }
      );
    }

    // التحقق من عدم وجود المستخدم
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'البريد الإلكتروني مستخدم مسبقاً' },
        { status: 400 }
      );
    }

    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await db.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    return NextResponse.json({ success: true, user });
  } catch {
    return NextResponse.json(
      { success: false, error: 'حدث خطأ في إنشاء المستخدم' },
      { status: 500 }
    );
  }
}

// تحديث مستخدم
export async function PUT(request: Request) {
  try {
    const admin = await checkAdmin();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك بتعديل المستخدمين' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, name, email, role, isActive, password } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'معرف المستخدم مطلوب' },
        { status: 400 }
      );
    }

    const updateData: {
      name?: string;
      email?: string;
      role?: string;
      isActive?: boolean;
      password?: string;
    } = {};
    
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase();
    if (role) updateData.role = role;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (password) updateData.password = await bcrypt.hash(password, 10);

    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    return NextResponse.json({ success: true, user });
  } catch {
    return NextResponse.json(
      { success: false, error: 'حدث خطأ في تحديث المستخدم' },
      { status: 500 }
    );
  }
}

// حذف مستخدم
export async function DELETE(request: Request) {
  try {
    const admin = await checkAdmin();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك بحذف المستخدمين' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'معرف المستخدم مطلوب' },
        { status: 400 }
      );
    }

    await db.user.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: 'حدث خطأ في حذف المستخدم' },
      { status: 500 }
    );
  }
}
