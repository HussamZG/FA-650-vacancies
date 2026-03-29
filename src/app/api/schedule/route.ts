import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { ensureCurrentAppUserProfile, requireAdminUser } from "@/lib/server-auth";

function handleAuthError(error: unknown, forbiddenMessage: string) {
  if (error instanceof Error && error.message === "FORBIDDEN") {
    return NextResponse.json({ success: false, error: forbiddenMessage }, { status: 403 });
  }

  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json({ success: false, error: "يرجى تسجيل الدخول" }, { status: 401 });
  }

  return null;
}

function parseSchedulePayload(value: string | null | undefined) {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
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
    tableName: "Schedule",
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
    const month = parseInt(searchParams.get("month") || "", 10);
    const year = parseInt(searchParams.get("year") || "", 10);

    if (!Number.isInteger(month) || !Number.isInteger(year)) {
      return NextResponse.json(
        { success: false, error: "يرجى تحديد الشهر والسنة" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("Schedule")
      .select('id, month, year, data, updatedBy, createdAt, updatedAt')
      .eq("month", month)
      .eq("year", year)
      .maybeSingle();

    if (error) {
      throw new Error(error.message || "تعذر تحميل الجدول");
    }

    return NextResponse.json({
      success: true,
      schedule: data
        ? {
            ...data,
            data: parseSchedulePayload(data.data),
          }
        : null,
    });
  } catch (error) {
    console.error("[api/schedule][GET]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "حدث خطأ في استرجاع الجدول",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireAdminUser();

    const body = await request.json();
    const month = parseInt(String(body.month || ""), 10);
    const year = parseInt(String(body.year || ""), 10);
    const scheduleData = body.data;

    if (!Number.isInteger(month) || !Number.isInteger(year)) {
      return NextResponse.json(
        { success: false, error: "يرجى تحديد الشهر والسنة" },
        { status: 400 }
      );
    }

    if (!scheduleData || typeof scheduleData !== "object" || Array.isArray(scheduleData)) {
      return NextResponse.json(
        { success: false, error: "بيانات الجدول غير صالحة" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: existing, error: existingError } = await supabase
      .from("Schedule")
      .select('id, month, year, data, updatedBy, createdAt, updatedAt')
      .eq("month", month)
      .eq("year", year)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message || "تعذر التحقق من الجدول الحالي");
    }

    const payload = {
      id: existing?.id ?? crypto.randomUUID(),
      month,
      year,
      data: JSON.stringify(scheduleData),
      updatedBy: user.id,
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("Schedule")
      .upsert(payload, { onConflict: "month,year" })
      .select('id, month, year, data, updatedBy, createdAt, updatedAt')
      .single();

    if (error) {
      throw new Error(error.message || "تعذر حفظ الجدول");
    }

    await writeAuditLog({
      action: existing ? "update" : "create",
      recordId: data.id,
      userId: user.id,
      oldData: existing ? JSON.stringify({ ...existing, data: parseSchedulePayload(existing.data) }) : undefined,
      newData: JSON.stringify({ ...data, data: scheduleData }),
    });

    return NextResponse.json({
      success: true,
      schedule: {
        ...data,
        data: scheduleData,
      },
      message: "تم حفظ الجدول بنجاح",
    });
  } catch (error) {
    console.error("[api/schedule][PUT]", error);
    const authError = handleAuthError(error, "إنشاء الجدول متاح للإدارة فقط");
    if (authError) return authError;
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "حدث خطأ في حفظ الجدول",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAdminUser();

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get("month") || "", 10);
    const year = parseInt(searchParams.get("year") || "", 10);

    if (!Number.isInteger(month) || !Number.isInteger(year)) {
      return NextResponse.json(
        { success: false, error: "يرجى تحديد الشهر والسنة" },
        { status: 400 }
      );
    }

    const { data: existing, error: existingError } = await supabase
      .from("Schedule")
      .select('id, month, year, data, updatedBy, createdAt, updatedAt')
      .eq("month", month)
      .eq("year", year)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message || "تعذر التحقق من الجدول");
    }

    if (!existing) {
      return NextResponse.json({
        success: true,
        message: "لا يوجد جدول محفوظ لهذه الفترة",
      });
    }

    const { error } = await supabase
      .from("Schedule")
      .delete()
      .eq("id", existing.id);

    if (error) {
      throw new Error(error.message || "تعذر حذف الجدول");
    }

    await writeAuditLog({
      action: "delete",
      recordId: existing.id,
      userId: user.id,
      oldData: JSON.stringify({ ...existing, data: parseSchedulePayload(existing.data) }),
    });

    return NextResponse.json({
      success: true,
      message: "تم حذف الجدول بنجاح",
    });
  } catch (error) {
    console.error("[api/schedule][DELETE]", error);
    const authError = handleAuthError(error, "حذف الجدول متاح للإدارة فقط");
    if (authError) return authError;
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "حدث خطأ في حذف الجدول",
      },
      { status: 500 }
    );
  }
}
