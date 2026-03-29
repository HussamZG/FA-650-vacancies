import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { ensureCurrentAppUserProfile } from "@/lib/server-auth";

type Shift = "morning" | "evening" | "night";
type AvailabilityRow = {
  id: string;
  userId: string;
  month: number;
  year: number;
  sunday: string;
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

function parseShifts(value: string | null | undefined): Shift[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatAvailability(row: AvailabilityRow, user?: { id: string; name: string; email: string; role: string }) {
  return {
    ...row,
    sunday: parseShifts(row.sunday),
    monday: parseShifts(row.monday),
    tuesday: parseShifts(row.tuesday),
    wednesday: parseShifts(row.wednesday),
    thursday: parseShifts(row.thursday),
    friday: parseShifts(row.friday),
    saturday: parseShifts(row.saturday),
    user,
  };
}

async function getUserProfiles(userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, { id: string; name: string; email: string; role: string }>();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("User")
    .select("id, name, email, role")
    .in("id", userIds);

  if (error) {
    throw new Error(error.message || "تعذر تحميل بيانات المستخدمين");
  }

  return new Map(
    (data || []).map((user) => [user.id, user])
  );
}

async function writeAuditLog(payload: {
  action: "create" | "update" | "delete";
  recordId: string;
  userId: string;
  oldData?: string;
  newData?: string;
}) {
  const supabase = await createClient();

  await supabase.from("AuditLog").insert({
    id: crypto.randomUUID(),
    action: payload.action,
    tableName: "availability",
    recordId: payload.recordId,
    oldData: payload.oldData ?? null,
    newData: payload.newData ?? null,
    userId: payload.userId,
    createdAt: new Date().toISOString(),
  });
}

export async function GET(request: Request) {
  try {
    const user = await ensureCurrentAppUserProfile();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "يرجى تسجيل الدخول" },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const userId = searchParams.get("userId");

    let query = supabase
      .from("Availability")
      .select("id, userId, month, year, sunday, monday, tuesday, wednesday, thursday, friday, saturday, notes, createdAt, updatedAt")
      .order("year", { ascending: false })
      .order("month", { ascending: false });

    if (month) query = query.eq("month", parseInt(month, 10));
    if (year) query = query.eq("year", parseInt(year, 10));

    if (userId) {
      query = query.eq("userId", userId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message || "تعذر تحميل التفرغات");
    }

    const rows = (data || []) as AvailabilityRow[];
    const userProfiles = await getUserProfiles([...new Set(rows.map((row) => row.userId))]);

    return NextResponse.json({
      success: true,
      data: rows.map((row) => formatAvailability(row, userProfiles.get(row.userId))),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "حدث خطأ في استرجاع البيانات",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await ensureCurrentAppUserProfile();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "يرجى تسجيل الدخول" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { month, year, sunday, monday, tuesday, wednesday, thursday, friday, saturday, notes } = body;

    if (!month || !year) {
      return NextResponse.json(
        { success: false, error: "يرجى اختيار الشهر والسنة" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const normalizedMonth = parseInt(month, 10);
    const normalizedYear = parseInt(year, 10);

    const { data: existing, error: existingError } = await supabase
      .from("Availability")
      .select("id")
      .eq("userId", user.id)
      .eq("month", normalizedMonth)
      .eq("year", normalizedYear)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message || "تعذر التحقق من التفرغ الحالي");
    }

    if (existing) {
      return NextResponse.json(
        { success: false, error: "لديك تفرغ مسجل بالفعل لهذا الشهر. يمكنك تعديله من لوحة التحكم" },
        { status: 400 }
      );
    }

    const payload = {
      id: crypto.randomUUID(),
      userId: user.id,
      month: normalizedMonth,
      year: normalizedYear,
      sunday: JSON.stringify((sunday || []) as Shift[]),
      monday: JSON.stringify((monday || []) as Shift[]),
      tuesday: JSON.stringify((tuesday || []) as Shift[]),
      wednesday: JSON.stringify((wednesday || []) as Shift[]),
      thursday: JSON.stringify((thursday || []) as Shift[]),
      friday: JSON.stringify((friday || []) as Shift[]),
      saturday: JSON.stringify((saturday || []) as Shift[]),
      notes: notes || null,
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("Availability")
      .insert(payload)
      .select("id, userId, month, year, sunday, monday, tuesday, wednesday, thursday, friday, saturday, notes, createdAt, updatedAt")
      .single();

    if (error) {
      throw new Error(error.message || "حدث خطأ في حفظ البيانات");
    }

    await writeAuditLog({
      action: "create",
      recordId: data.id,
      userId: user.id,
      newData: JSON.stringify(data),
    });

    return NextResponse.json({
      success: true,
      data: formatAvailability(data as AvailabilityRow, {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }),
      message: "تم حفظ التفرغات بنجاح",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "حدث خطأ في حفظ البيانات",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await ensureCurrentAppUserProfile();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "يرجى تسجيل الدخول" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, sunday, monday, tuesday, wednesday, thursday, friday, saturday, notes } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "معرف التفرغ مطلوب" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: oldAvailability, error: oldAvailabilityError } = await supabase
      .from("Availability")
      .select("id, userId, month, year, sunday, monday, tuesday, wednesday, thursday, friday, saturday, notes, createdAt, updatedAt")
      .eq("id", id)
      .maybeSingle();

    if (oldAvailabilityError) {
      throw new Error(oldAvailabilityError.message || "تعذر تحميل التفرغ");
    }

    if (!oldAvailability) {
      return NextResponse.json(
        { success: false, error: "التفرغ غير موجود" },
        { status: 404 }
      );
    }

    const updatePayload = {
      sunday: JSON.stringify((sunday || []) as Shift[]),
      monday: JSON.stringify((monday || []) as Shift[]),
      tuesday: JSON.stringify((tuesday || []) as Shift[]),
      wednesday: JSON.stringify((wednesday || []) as Shift[]),
      thursday: JSON.stringify((thursday || []) as Shift[]),
      friday: JSON.stringify((friday || []) as Shift[]),
      saturday: JSON.stringify((saturday || []) as Shift[]),
      notes: notes || null,
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("Availability")
      .update(updatePayload)
      .eq("id", id)
      .select("id, userId, month, year, sunday, monday, tuesday, wednesday, thursday, friday, saturday, notes, createdAt, updatedAt")
      .single();

    if (error) {
      throw new Error(error.message || "حدث خطأ في تحديث البيانات");
    }

    await writeAuditLog({
      action: "update",
      recordId: data.id,
      userId: user.id,
      oldData: JSON.stringify(oldAvailability),
      newData: JSON.stringify(data),
    });

    return NextResponse.json({
      success: true,
      data: formatAvailability(data as AvailabilityRow),
      message: "تم تحديث التفرغات بنجاح",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "حدث خطأ في تحديث البيانات",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await ensureCurrentAppUserProfile();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "يرجى تسجيل الدخول" },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "معرف التفرغ مطلوب" },
        { status: 400 }
      );
    }

    const { data: availability, error: availabilityError } = await supabase
      .from("Availability")
      .select("id, userId, month, year, sunday, monday, tuesday, wednesday, thursday, friday, saturday, notes, createdAt, updatedAt")
      .eq("id", id)
      .maybeSingle();

    if (availabilityError) {
      throw new Error(availabilityError.message || "تعذر تحميل التفرغ");
    }

    if (!availability) {
      return NextResponse.json(
        { success: false, error: "التفرغ غير موجود" },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("Availability")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(error.message || "حدث خطأ في حذف البيانات");
    }

    await writeAuditLog({
      action: "delete",
      recordId: id,
      userId: user.id,
      oldData: JSON.stringify(availability),
    });

    return NextResponse.json({
      success: true,
      message: "تم حذف التفرغ بنجاح",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "حدث خطأ في حذف البيانات",
      },
      { status: 500 }
    );
  }
}
