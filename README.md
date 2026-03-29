# 🚑 نظام إدارة المناوبات - مركز إسعاف 650

نظام متكامل لإدارة جدول مناوبات مركز الإسعاف مع دعم RTL للغة العربية.

## ✨ الميزات

- 📝 **نموذج التفرغات** - تسجيل أوقات التفرغ الشهرية
- 📅 **إنشاء الجدول** - تلقائي ويدوي
- 📆 **التقويم الشهري** - عرض وبحث
- 📊 **لوحة الإحصائيات** - تقارير شاملة
- 🔄 **التبديل والاستبدال** - بين الموظفين
- 🔐 **نظام تسجيل الدخول** - بدون قاعدة بيانات
- 🌙 **الوضع الليلي/النهاري**
- 📱 **تصميم متجاوب** - يعمل على جميع الأجهزة

## 🚀 التثبيت والتشغيل

### 1. متطلبات النظام
- Node.js 18+
- npm أو bun

### 2. التثبيت

```bash
# فك الضغط عن الملف
unzip ambulance650-project.zip

# الدخول للمجلد
cd ambulance650-project

# تثبيت المكتبات
npm install
# أو
bun install
```

### 3. التشغيل

```bash
npm run dev
# أو
bun run dev
```

افتح المتصفح على: `http://localhost:3000`

## 👤 المستخدمين التجريبيين

| الرتبة | البريد الإلكتروني | كلمة المرور |
|--------|------------------|-------------|
| قائد قطاع | admin@ambulance650.com | admin123 |
| قائد فريق | leader@ambulance650.com | leader123 |
| كشاف | scout@ambulance650.com | scout123 |
| مسعف | medic@ambulance650.com | medic123 |

## 📁 هيكل المشروع

```
src/
├── app/
│   ├── page.tsx          # الصفحة الرئيسية
│   ├── layout.tsx        # التخطيط الرئيسي
│   ├── globals.css       # الأنماط العامة
│   └── api/              # API Routes
├── components/
│   ├── auth/
│   │   └── LoginPage.tsx    # صفحة تسجيل الدخول
│   ├── AppContent.tsx       # محتوى التطبيق
│   ├── schedule/            # مكونات الجدول
│   └── ui/                  # مكونات shadcn/ui
├── contexts/
│   ├── AuthContext.tsx      # نظام المصادقة
│   └── ScheduleContext.tsx  # حالة الجدول
├── hooks/                   # Hooks مخصصة
└── lib/                     # مكتبات مساعدة
    ├── schedule/            # منطق الجدول
    ├── animations.ts        # الرسوم المتحركة
    └── utils.ts             # دوال مساعدة
```

## 🛠️ التقنيات المستخدمة

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **UI Components:** shadcn/ui
- **Icons:** Lucide React
- **Animations:** Framer Motion
- **Notifications:** Sonner

## 📋 ملاحظات مهمة

1. **بدون قاعدة بيانات:** البيانات تُخزن في الذاكرة فقط
2. **الجلسات:** تُحفظ في localStorage
3. **RTL:** النظام يدعم اللغة العربية بالكامل

## 🔗 ربط Supabase (اختياري)

لربط المشروع بقاعدة بيانات Supabase:

1. أنشئ مشروع في [supabase.com](https://supabase.com)
2. انسخ `.env.example` إلى `.env.local`
3. أضف بيانات الاتصال:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 📄 الترخيص

© 2024 مركز إسعاف 650 - جميع الحقوق محفوظة
