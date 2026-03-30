import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getCurrentAppUser } from "@/lib/server-auth";
import { createClient } from "@/utils/supabase/server";
import { normalizeAppRole } from "@/lib/user-access";
import {
  appSessionCookieName,
  createAppSession,
  deleteAppSession,
  getAppSessionCookieOptions,
  readAppSessionToken,
} from "@/lib/app-session";

const isBcryptHash = (value: string) => /^\$2[aby]\$\d{2}\$/.test(value);

async function verifyPassword(candidate: string, storedValue: string) {
  if (!storedValue) return false;

  if (isBcryptHash(storedValue)) {
    return bcrypt.compare(candidate, storedValue);
  }

  return candidate === storedValue;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "يرجى إدخال البريد الإلكتروني وكلمة المرور" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        isActive: true,
        isAdmin: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "بيانات الدخول غير صحيحة." }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ success: false, error: "هذا الحساب معطّل حاليًا." }, { status: 403 });
    }

    let isValid = await verifyPassword(password, user.password);

    if (!isValid && user.password === "supabase-auth") {
      const supabase = await createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error) {
        const hashedPassword = await bcrypt.hash(password, 10);

        await db.user.update({
          where: { id: user.id },
          data: {
            password: hashedPassword,
          },
        });

        await supabase.auth.signOut();
        isValid = true;
      }
    }

    if (!isValid) {
      return NextResponse.json({ success: false, error: "بيانات الدخول غير صحيحة." }, { status: 401 });
    }

    if (!isBcryptHash(user.password) && user.password !== "supabase-auth") {
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });
    }

    const session = await createAppSession(user.id);
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isAdmin: user.isAdmin,
      },
    });

    response.cookies.set(appSessionCookieName, session.token, getAppSessionCookieOptions(session.expiresAt));
    return response;
  } catch (error) {
    console.error("[api/auth][POST]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "تعذر تسجيل الدخول" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const role = normalizeAppRole(body.role) ?? "medic";

    if (!name || !email || !password) {
      return NextResponse.json({ success: false, error: "يرجى تعبئة الاسم والبريد وكلمة المرور" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }, { status: 400 });
    }

    const existingUser = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json({ success: false, error: "هذا البريد الإلكتروني مسجل مسبقاً. جرّب تسجيل الدخول." }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        isActive: true,
        isAdmin: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isAdmin: true,
      },
    });

    const session = await createAppSession(user.id);
    const response = NextResponse.json({
      success: true,
      user,
      message: "تم إنشاء الحساب وتسجيل الدخول مباشرة",
    });

    response.cookies.set(appSessionCookieName, session.token, getAppSessionCookieOptions(session.expiresAt));
    return response;
  } catch (error) {
    console.error("[api/auth][PUT]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "تعذر إنشاء الحساب" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const sessionToken = await readAppSessionToken();

  if (sessionToken) {
    await deleteAppSession(sessionToken);
  }

  const supabase = await createClient();
  await supabase.auth.signOut();

  const response = NextResponse.json({ success: true });
  response.cookies.set(appSessionCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });

  return response;
}

export async function GET() {
  try {
    const user = await getCurrentAppUser();

    if (!user) {
      return NextResponse.json({ success: false, user: null });
    }

    return NextResponse.json({ success: true, user });
  } catch {
    return NextResponse.json({ success: false, user: null });
  }
}
