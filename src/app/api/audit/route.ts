import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'ambulance-650-secret-key-2024';

// الحصول على المستخدم الحالي
async function getCurrentUser() {
  const token = (await cookies()).get('auth-token')?.value;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, role: true }
    });
    return user;
  } catch {
    return null;
  }
}

// GET - سجل التعديلات
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'يرجى تسجيل الدخول' },
        { status: 401 }
      );
    }

    // فقط الأدمن والقائد يمكنهم رؤية سجل التعديلات
    if (user.role !== 'admin' && user.role !== 'commander') {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك بالوصول' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const tableName = searchParams.get('table');

    const where: { tableName?: string } = {};
    if (tableName) where.tableName = tableName;

    const logs = await db.auditLog.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        user: {
          select: { name: true, email: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    // تنسيق البيانات
    const formattedLogs = logs.map((log) => ({
      id: log.id,
      action: log.action,
      tableName: log.tableName,
      recordId: log.recordId,
      oldData: log.oldData ? JSON.parse(log.oldData) : null,
      newData: log.newData ? JSON.parse(log.newData) : null,
      user: log.user,
      createdAt: log.createdAt
    }));

    return NextResponse.json({ success: true, logs: formattedLogs });
  } catch {
    return NextResponse.json(
      { success: false, error: 'حدث خطأ في استرجاع السجل' },
      { status: 500 }
    );
  }
}
