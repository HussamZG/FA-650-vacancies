import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireAdminUser } from "@/lib/server-auth";
import { normalizeAppRole } from "@/lib/user-access";
import { createClient } from "@/utils/supabase/server";

type ManagedUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  isAdmin: boolean;
  createdAt: string;
};

const userSelect = "id, name, email, role, isActive, isAdmin, createdAt";

function handleAuthError(error: unknown, forbiddenMessage: string) {
  if (error instanceof Error && error.message === "FORBIDDEN") {
    return NextResponse.json({ success: false, error: forbiddenMessage }, { status: 403 });
  }

  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json({ success: false, error: "يرجى تسجيل الدخول" }, { status: 401 });
  }

  return null;
}

function getSupabaseErrorStatus(error: { code?: string | null; message?: string | null }) {
  return error.code === "42501" || error.message === "FORBIDDEN" ? 403 : 400;
}

function getSupabaseErrorMessage(
  error: { message?: string | null } | null,
  fallbackMessage: string
) {
  return error?.message?.trim() || fallbackMessage;
}

async function getUserById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("User")
    .select(userSelect)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "تعذر تحميل بيانات المستخدم");
  }

  return (data as ManagedUserRow | null) ?? null;
}

export async function GET() {
  try {
    await requireAdminUser();

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("User")
      .select(userSelect)
      .order("isActive", { ascending: false })
      .order("createdAt", { ascending: false });

    if (error) {
      throw new Error(error.message || "تعذر تحميل الكوادر");
    }

    return NextResponse.json({
      success: true,
      users: ((data || []) as ManagedUserRow[]).map((user) => ({
        ...user,
        role: normalizeAppRole(user.role) ?? "medic",
      })),
    });
  } catch (error) {
    console.error("[api/users][GET]", error);
    const authError = handleAuthError(error, "غير مصرح لك بالوصول");
    if (authError) return authError;

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "حدث خطأ في استرجاع بيانات الكوادر" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminUser();

    const body = await request.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const role = normalizeAppRole(body.role);
    const isAdmin = typeof body.isAdmin === "boolean" ? body.isAdmin : false;
    const isActive = typeof body.isActive === "boolean" ? body.isActive : true;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { success: false, error: "يرجى تعبئة الاسم والبريد وكلمة المرور والرتبة" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "يجب أن تكون كلمة المرور 6 أحرف على الأقل" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_create_personnel_account", {
      p_name: name,
      p_email: email,
      p_password: password,
      p_role: role,
      p_is_admin: isAdmin,
      p_is_active: isActive,
    });

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: getSupabaseErrorMessage(error, "تعذر إنشاء حساب الكادر"),
        },
        { status: getSupabaseErrorStatus(error) }
      );
    }

    if (data && typeof data === "object" && "id" in data) {
      const hashedPassword = await bcrypt.hash(password, 10);

      await db.user.update({
        where: { id: String((data as { id: string }).id) },
        data: {
          password: hashedPassword,
        },
      });
    }

    return NextResponse.json({
      success: true,
      user: data,
      message: isActive
        ? "تمت إضافة الكادر الجديد بنجاح"
        : "تمت إضافة الكادر الجديد بحالة معطلة",
    });
  } catch (error) {
    console.error("[api/users][POST]", error);
    const authError = handleAuthError(error, "غير مصرح لك بإنشاء مستخدمين");
    if (authError) return authError;

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "حدث خطأ في إنشاء المستخدم" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const adminUser = await requireAdminUser();

    const body = await request.json();
    const id = String(body.id || "");
    const name = typeof body.name === "string" ? body.name.trim() : undefined;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : undefined;
    const role = body.role === undefined ? undefined : normalizeAppRole(body.role);
    const password =
      typeof body.password === "string" && body.password.trim().length > 0 ? body.password.trim() : undefined;
    const isActive = typeof body.isActive === "boolean" ? body.isActive : undefined;
    const isAdmin = typeof body.isAdmin === "boolean" ? body.isAdmin : undefined;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "معرف المستخدم مطلوب" },
        { status: 400 }
      );
    }

    if (body.role !== undefined && !role) {
      return NextResponse.json(
        { success: false, error: "الرتبة المحددة غير صالحة" },
        { status: 400 }
      );
    }

    if (password && password.length < 6) {
      return NextResponse.json(
        { success: false, error: "يجب أن تكون كلمة المرور 6 أحرف على الأقل" },
        { status: 400 }
      );
    }

    const currentUser = await getUserById(id);

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "المستخدم غير موجود" },
        { status: 404 }
      );
    }

    if (adminUser.id === id && isActive === false) {
      return NextResponse.json(
        { success: false, error: "لا يمكن تعطيل حساب الإدارة الحالي" },
        { status: 400 }
      );
    }

    if (adminUser.id === id && isAdmin === false) {
      return NextResponse.json(
        { success: false, error: "لا يمكن سحب صلاحية الإدارة من حسابك الحالي" },
        { status: 400 }
      );
    }

    const hasChanges =
      (name !== undefined && name !== currentUser.name) ||
      (email !== undefined && email !== currentUser.email.toLowerCase()) ||
      (role !== undefined && role !== currentUser.role) ||
      (password !== undefined && password.length > 0) ||
      (isActive !== undefined && isActive !== currentUser.isActive) ||
      (isAdmin !== undefined && isAdmin !== currentUser.isAdmin);

    if (!hasChanges) {
      return NextResponse.json({
        success: true,
        user: currentUser,
        message: "لا توجد تغييرات جديدة للحفظ",
      });
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_update_personnel_account", {
      p_user_id: id,
      p_name: name ?? null,
      p_email: email ?? null,
      p_password: password ?? null,
      p_role: role ?? null,
      p_is_admin: isAdmin ?? null,
      p_is_active: isActive ?? null,
    });

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: getSupabaseErrorMessage(error, "تعذر تحديث بيانات الكادر"),
        },
        { status: getSupabaseErrorStatus(error) }
      );
    }

    if (password && data && typeof data === "object" && "id" in data) {
      const hashedPassword = await bcrypt.hash(password, 10);

      await db.user.update({
        where: { id: String((data as { id: string }).id) },
        data: {
          password: hashedPassword,
        },
      });
    }

    return NextResponse.json({
      success: true,
      user: data,
      message: "تم تحديث بيانات الكادر بنجاح",
    });
  } catch (error) {
    console.error("[api/users][PUT]", error);
    const authError = handleAuthError(error, "غير مصرح لك بتعديل المستخدمين");
    if (authError) return authError;

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "حدث خطأ في تحديث المستخدم" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const adminUser = await requireAdminUser();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "معرف المستخدم مطلوب" },
        { status: 400 }
      );
    }

    if (adminUser.id === id) {
      return NextResponse.json(
        { success: false, error: "لا يمكن حذف حساب الإدارة الحالي" },
        { status: 400 }
      );
    }

    const currentUser = await getUserById(id);

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "المستخدم غير موجود" },
        { status: 404 }
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_update_personnel_account", {
      p_user_id: id,
      p_name: null,
      p_email: null,
      p_password: null,
      p_role: null,
      p_is_admin: false,
      p_is_active: false,
    });

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: getSupabaseErrorMessage(error, "حدث خطأ أثناء تعطيل الكادر"),
        },
        { status: getSupabaseErrorStatus(error) }
      );
    }

    return NextResponse.json({
      success: true,
      user: data,
      message: "تم تعطيل الكادر بنجاح",
    });
  } catch (error) {
    console.error("[api/users][DELETE]", error);
    const authError = handleAuthError(error, "غير مصرح لك بحذف المستخدمين");
    if (authError) return authError;

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "حدث خطأ أثناء تعطيل الكادر" },
      { status: 500 }
    );
  }
}
