import crypto from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { AppRole } from "@/lib/user-access";

export interface SessionAppUser {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  isActive: boolean;
  isAdmin: boolean;
}

const APP_SESSION_COOKIE_NAME = "fa650_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export const appSessionCookieName = APP_SESSION_COOKIE_NAME;

export function mapDbUserToSessionAppUser(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  isAdmin: boolean;
}): SessionAppUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as AppRole,
    isActive: user.isActive,
    isAdmin: user.isAdmin,
  };
}

export async function readAppSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get(APP_SESSION_COOKIE_NAME)?.value ?? null;
}

export async function createAppSession(userId: string) {
  const token = crypto.randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.session.create({
    data: {
      id: crypto.randomUUID(),
      userId,
      token,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function deleteAppSession(token: string) {
  await db.session.deleteMany({
    where: { token },
  });
}

export async function getCurrentSessionUser() {
  const token = await readAppSessionToken();
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          isAdmin: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    await deleteAppSession(token);
    return null;
  }

  if (!session.user.isActive) {
    return null;
  }

  return mapDbUserToSessionAppUser(session.user);
}

export function getAppSessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  };
}

