import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // إنشاء المستخدم الافتراضي للأدمن
  const adminPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ambulance650.com' },
    update: {},
    create: {
      name: 'مدير النظام',
      email: 'admin@ambulance650.com',
      password: adminPassword,
      role: 'admin',
      isActive: true
    }
  });

  console.log('✅ تم إنشاء المستخدم الافتراضي:');
  console.log('📧 البريد: admin@ambulance650.com');
  console.log('🔑 كلمة المرور: admin123');
  console.log('👤 الدور: مدير النظام');

  // إنشاء بعض المستخدمين التجريبيين
  const demoUsers = [
    { name: 'أحمد محمد', email: 'ahmed@ambulance650.com', role: 'medic' },
    { name: 'محمد علي', email: 'mohammed@ambulance650.com', role: 'medic' },
    { name: 'خالد حسن', email: 'khaled@ambulance650.com', role: 'commander' },
    { name: 'سعيد عمر', email: 'saeed@ambulance650.com', role: 'scout' },
  ];

  for (const userData of demoUsers) {
    const password = await bcrypt.hash('123456', 10);
    await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        name: userData.name,
        email: userData.email,
        password,
        role: userData.role,
        isActive: true
      }
    });
  }

  console.log('✅ تم إنشاء المستخدمين التجريبيين (كلمة المرور: 123456)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
