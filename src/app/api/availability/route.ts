import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'ambulance-650-secret-key-2024';

// أنواع الفترات
type Shift = 'morning' | 'evening' | 'night';

// الحصول على المستخدم الحالي
async function getCurrentUser() {
  const token = (await cookies()).get('auth-token')?.value;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, role: true }
    });
    return user;
  } catch {
    return null;
  }
}

// GET - استرجاع جميع التفرغات
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'يرجى تسجيل الدخول' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const userId = searchParams.get('userId');

    const where: { month?: number; year?: number; userId?: string } = {};
    
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);
    
    // المسعف العادي يرى تفرغاته فقط
    if (user.role !== 'admin' && user.role !== 'commander') {
      where.userId = user.id;
    } else if (userId) {
      where.userId = userId;
    }

    const availabilities = await db.availability.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true }
        }
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ]
    });

    // تحويل البيانات من JSON string إلى array
    const formattedAvailabilities = availabilities.map((a) => ({
      ...a,
      sunday: JSON.parse(a.sunday),
      monday: JSON.parse(a.monday),
      tuesday: JSON.parse(a.tuesday),
      wednesday: JSON.parse(a.wednesday),
      thursday: JSON.parse(a.thursday),
      friday: JSON.parse(a.friday),
      saturday: JSON.parse(a.saturday)
    }));

    return NextResponse.json({ success: true, data: formattedAvailabilities });
  } catch {
    return NextResponse.json(
      { success: false, error: 'حدث خطأ في استرجاع البيانات' },
      { status: 500 }
    );
  }
}

// POST - حفظ تفرغ جديد
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'يرجى تسجيل الدخول' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { month, year, sunday, monday, tuesday, wednesday, thursday, friday, saturday, notes } = body;

    // التحقق من البيانات المطلوبة
    if (!month || !year) {
      return NextResponse.json(
        { success: false, error: 'يرجى اختيار الشهر والسنة' },
        { status: 400 }
      );
    }

    // التحقق من عدم وجود تفرغ سابق
    const existing = await db.availability.findUnique({
      where: {
        userId_month_year: {
          userId: user.id,
          month: parseInt(month),
          year: parseInt(year)
        }
      }
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'لديك تفرغ مسجل بالفعل لهذا الشهر. يمكنك تعديله من لوحة التحكم' },
        { status: 400 }
      );
    }

    // إنشاء التفرغ
    const availability = await db.availability.create({
      data: {
        userId: user.id,
        month: parseInt(month),
        year: parseInt(year),
        sunday: JSON.stringify(sunday || []),
        monday: JSON.stringify(monday || []),
        tuesday: JSON.stringify(tuesday || []),
        wednesday: JSON.stringify(wednesday || []),
        thursday: JSON.stringify(thursday || []),
        friday: JSON.stringify(friday || []),
        saturday: JSON.stringify(saturday || []),
        notes: notes || null
      }
    });

    // تسجيل في سجل التعديلات
    await db.auditLog.create({
      data: {
        action: 'create',
        tableName: 'availability',
        recordId: availability.id,
        newData: JSON.stringify(availability),
        userId: user.id
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: availability,
      message: 'تم حفظ التفرغات بنجاح' 
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'حدث خطأ في حفظ البيانات' },
      { status: 500 }
    );
  }
}

// PUT - تعديل تفرغ
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'يرجى تسجيل الدخول' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, sunday, monday, tuesday, wednesday, thursday, friday, saturday, notes } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'معرف التفرغ مطلوب' },
        { status: 400 }
      );
    }

    // الحصول على التفرغ القديم
    const oldAvailability = await db.availability.findUnique({
      where: { id }
    });

    if (!oldAvailability) {
      return NextResponse.json(
        { success: false, error: 'التفرغ غير موجود' },
        { status: 404 }
      );
    }

    // التحقق من الصلاحيات
    if (user.role !== 'admin' && user.role !== 'commander' && oldAvailability.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك بتعديل هذا التفرغ' },
        { status: 403 }
      );
    }

    // تحديث التفرغ
    const availability = await db.availability.update({
      where: { id },
      data: {
        sunday: JSON.stringify(sunday || []),
        monday: JSON.stringify(monday || []),
        tuesday: JSON.stringify(tuesday || []),
        wednesday: JSON.stringify(wednesday || []),
        thursday: JSON.stringify(thursday || []),
        friday: JSON.stringify(friday || []),
        saturday: JSON.stringify(saturday || []),
        notes: notes || null
      }
    });

    // تسجيل في سجل التعديلات
    await db.auditLog.create({
      data: {
        action: 'update',
        tableName: 'availability',
        recordId: availability.id,
        oldData: JSON.stringify(oldAvailability),
        newData: JSON.stringify(availability),
        userId: user.id
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: availability,
      message: 'تم تحديث التفرغات بنجاح' 
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'حدث خطأ في تحديث البيانات' },
      { status: 500 }
    );
  }
}

// DELETE - حذف تفرغ
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'يرجى تسجيل الدخول' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'معرف التفرغ مطلوب' },
        { status: 400 }
      );
    }

    // الحصول على التفرغ
    const availability = await db.availability.findUnique({
      where: { id }
    });

    if (!availability) {
      return NextResponse.json(
        { success: false, error: 'التفرغ غير موجود' },
        { status: 404 }
      );
    }

    // التحقق من الصلاحيات
    if (user.role !== 'admin' && user.role !== 'commander' && availability.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك بحذف هذا التفرغ' },
        { status: 403 }
      );
    }

    // تسجيل في سجل التعديلات قبل الحذف
    await db.auditLog.create({
      data: {
        action: 'delete',
        tableName: 'availability',
        recordId: id,
        oldData: JSON.stringify(availability),
        userId: user.id
      }
    });

    await db.availability.delete({
      where: { id }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'تم حذف التفرغ بنجاح' 
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'حدث خطأ في حذف البيانات' },
      { status: 500 }
    );
  }
}
