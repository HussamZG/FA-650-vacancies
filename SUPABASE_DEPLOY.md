# 🚀 دليل نشر المشروع على Supabase

## 📋 المتطلبات

- حساب Supabase (مجاني من https://supabase.com)
- مشروع Supabase جاهز

---

## 🔧 الخطوة 1: الحصول على بيانات الاتصال

### من لوحة تحكم Supabase:

1. اذهب إلى **Project Settings** → **Database**
2. انسخ **Connection string** (اختر **URI**)
3. استبدل `[YOUR-PASSWORD]` بكلمة مرور قاعدة البيانات

---

## 📝 الخطوة 2: تحديث ملف .env

```env
# Supabase Database
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[YOUR-ANON-KEY]"

# JWT Secret (أنشئ واحداً جديداً للإنتاج)
JWT_SECRET="your-super-secret-key-change-this-in-production"
```

---

## 🗃️ الخطوة 3: تحديث Prisma Schema

غيّر `provider` في `prisma/schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DATABASE_URL")
}
```

---

## 📤 الخطوة 4: رفع قاعدة البيانات

```bash
# توليد Prisma Client
bunx prisma generate

# رفع الـ Schema
bunx prisma db push

# تشغيل الـ Seed
bun run prisma/seed.ts
```

---

## 🔐 الخطوة 5: إعداد Supabase Auth (اختياري)

### تفعيل المصادقة بـ Google:

1. اذهب إلى **Authentication** → **Providers**
2. فعّل **Google**
3. أدخل `Client ID` و `Client Secret`

### تفعيل المصادقة بـ GitHub:

1. اذهب إلى **Authentication** → **Providers**
2. فعّل **GitHub**
3. أدخل `Client ID` و `Client Secret`

---

## 📊 بياناتك الحالية:

| المفتاح | القيمة |
|---------|--------|
| **Project URL** | `https://vnwvipdqeluzpvpgsypu.supabase.co` |
| **Anon Key** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| **Database Password** | `shtayer152889` |

---

## ⚠️ ملاحظات مهمة:

1. **لا تستخدم كلمة المرور الافتراضية في الإنتاج**
2. **غيّر JWT_SECRET إلى قيمة عشوائية قوية**
3. **فعّل Row Level Security (RLS) في Supabase**
4. **استخدم HTTPS فقط في الإنتاج**

---

## 🆘 الدعم

إذا واجهت أي مشاكل:
- توثيق Supabase: https://supabase.com/docs
- توثيق Prisma: https://prisma.io/docs
