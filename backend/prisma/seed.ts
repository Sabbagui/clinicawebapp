import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Criar usuário administrador
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'Administrador',
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  console.log('✅ Usuário admin criado:', {
    email: admin.email,
    name: admin.name,
    role: admin.role,
  });

  // Criar um médico de exemplo
  const doctorPassword = await bcrypt.hash('doctor123', 10);

  const doctor = await prisma.user.upsert({
    where: { email: 'doctor@example.com' },
    update: {},
    create: {
      email: 'doctor@example.com',
      password: doctorPassword,
      name: 'Dra. Maria Silva',
      role: UserRole.DOCTOR,
      isActive: true,
    },
  });

  console.log('✅ Médica criada:', {
    email: doctor.email,
    name: doctor.name,
    role: doctor.role,
  });

  // Criar recepcionista de exemplo
  const receptionistPassword = await bcrypt.hash('reception123', 10);

  const receptionist = await prisma.user.upsert({
    where: { email: 'reception@example.com' },
    update: {},
    create: {
      email: 'reception@example.com',
      password: receptionistPassword,
      name: 'Ana Costa',
      role: UserRole.RECEPTIONIST,
      isActive: true,
    },
  });

  console.log('✅ Recepcionista criada:', {
    email: receptionist.email,
    name: receptionist.name,
    role: receptionist.role,
  });

  console.log('\n🎉 Seed concluído com sucesso!');
  console.log('\n📝 Credenciais de acesso:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Admin:');
  console.log('  Email: admin@example.com');
  console.log('  Senha: admin123');
  console.log('\nMédica:');
  console.log('  Email: doctor@example.com');
  console.log('  Senha: doctor123');
  console.log('\nRecepcionista:');
  console.log('  Email: reception@example.com');
  console.log('  Senha: reception123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n⚠️  IMPORTANTE: Altere estas senhas em produção!');
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
