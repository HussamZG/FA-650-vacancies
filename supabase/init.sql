-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'medic',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Availability" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "sunday" TEXT NOT NULL DEFAULT '[]',
    "monday" TEXT NOT NULL DEFAULT '[]',
    "tuesday" TEXT NOT NULL DEFAULT '[]',
    "wednesday" TEXT NOT NULL DEFAULT '[]',
    "thursday" TEXT NOT NULL DEFAULT '[]',
    "friday" TEXT NOT NULL DEFAULT '[]',
    "saturday" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "oldData" TEXT,
    "newData" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Availability_userId_idx" ON "Availability"("userId");

-- CreateIndex
CREATE INDEX "Availability_month_year_idx" ON "Availability"("month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Availability_userId_month_year_key" ON "Availability"("userId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_tableName_idx" ON "AuditLog"("tableName");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Availability" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- User policies
CREATE POLICY "Users can view own profile"
ON "User"
FOR SELECT
TO authenticated
USING (
  id = auth.uid()::text
);

CREATE POLICY "Authenticated users can view all users"
ON "User"
FOR SELECT
TO authenticated
USING (
  true
);

CREATE POLICY "Users can insert own profile"
ON "User"
FOR INSERT
TO authenticated
WITH CHECK (
  id = auth.uid()::text
);

CREATE POLICY "Users can update own profile"
ON "User"
FOR UPDATE
TO authenticated
USING (
  id = auth.uid()::text
)
WITH CHECK (
  id = auth.uid()::text
);

-- Availability policies
CREATE POLICY "Authenticated users can view all availabilities"
ON "Availability"
FOR SELECT
TO authenticated
USING (
  true
);

CREATE POLICY "Users can insert own availabilities"
ON "Availability"
FOR INSERT
TO authenticated
WITH CHECK (
  "userId" = auth.uid()::text
);

CREATE POLICY "Users can update own availabilities"
ON "Availability"
FOR UPDATE
TO authenticated
USING (
  "userId" = auth.uid()::text
)
WITH CHECK (
  "userId" = auth.uid()::text
);

CREATE POLICY "Users can delete own availabilities"
ON "Availability"
FOR DELETE
TO authenticated
USING (
  "userId" = auth.uid()::text
);

-- Session policies
CREATE POLICY "Users can view own sessions"
ON "Session"
FOR SELECT
TO authenticated
USING (
  "userId" = auth.uid()::text
);

CREATE POLICY "Users can insert own sessions"
ON "Session"
FOR INSERT
TO authenticated
WITH CHECK (
  "userId" = auth.uid()::text
);

CREATE POLICY "Users can delete own sessions"
ON "Session"
FOR DELETE
TO authenticated
USING (
  "userId" = auth.uid()::text
);

-- Audit log policies
CREATE POLICY "Authenticated users can view audit logs"
ON "AuditLog"
FOR SELECT
TO authenticated
USING (
  true
);

CREATE POLICY "Authenticated users can insert audit logs for themselves"
ON "AuditLog"
FOR INSERT
TO authenticated
WITH CHECK (
  "userId" = auth.uid()::text
);

CREATE POLICY "Authenticated users can delete own audit logs"
ON "AuditLog"
FOR DELETE
TO authenticated
USING (
  "userId" = auth.uid()::text
);
