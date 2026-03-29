import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // إنشاء المستخدم الافتراضي للقائد
  const leaderPassword = await bcrypt.hash('leader123', 10);
  
  const leader = await prisma.user.upsert({
    where: { email: 'leader@ambulance650.com' },
    update: {},
    create: {
      name: 'قائد الفريق',
      email: 'leader@ambulance650.com',
      password: leaderPassword,
      role: 'leader',
      isActive: true,
      isAdmin: true
    }
  });

  console.log('✅ تم إنشاء المستخدم الافتراضي:');
  console.log('📧 البريد: leader@ambulance650.com');
  console.log('🔑 كلمة المرور: leader123');
  console.log('👤 الدور: قائد');

  // إنشاء بعض المستخدمين التجريبيين
  const demoUsers = [
    { name: 'أحمد محمد', email: 'ahmed@ambulance650.com', role: 'medic', isAdmin: false },
    { name: 'محمد علي', email: 'mohammed@ambulance650.com', role: 'medic', isAdmin: false },
    { name: 'خالد حسن', email: 'khaled@ambulance650.com', role: 'leader', isAdmin: true },
    { name: 'سعد السبيعي', email: 'leader2@ambulance650.com', role: 'leader', isAdmin: false },
    { name: 'سعيد عمر', email: 'saeed@ambulance650.com', role: 'scout', isAdmin: false },
    { name: 'علي العتيبي', email: 'scout@ambulance650.com', role: 'scout', isAdmin: false },
    { name: 'خالد القرني', email: 'medic@ambulance650.com', role: 'medic', isAdmin: false },
    { name: 'مروان صالح', email: 'sector@ambulance650.com', role: 'sector_lead', isAdmin: false },
    { name: 'رامي خضر', email: 'operations@ambulance650.com', role: 'operations', isAdmin: false },
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
        isActive: true,
        isAdmin: userData.isAdmin,
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
