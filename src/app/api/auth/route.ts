import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/server-auth";
import { createClient } from "@/utils/supabase/server";

export async function POST() {
  return NextResponse.json(
    { success: false, error: "استخدم Supabase Auth من الواجهة لتسجيل الدخول" },
    { status: 405 }
  );
}

export async function DELETE() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ success: true });
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
