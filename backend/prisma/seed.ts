import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import {
  AppointmentStatus,
  AppointmentType,
  PrismaClient,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function toDateOnlyDate(dateOnly: string): Date {
  return new Date(`${dateOnly}T00:00:00.000Z`);
}

function minutesToTimeDate(totalMinutes: number): Date {
  const hh = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, '0');
  const mm = (totalMinutes % 60).toString().padStart(2, '0');
  return new Date(`1970-01-01T${hh}:${mm}:00.000Z`);
}

function toScheduledDate(dateOnly: string, startMinutes: number): Date {
  const hh = Math.floor(startMinutes / 60)
    .toString()
    .padStart(2, '0');
  const mm = (startMinutes % 60).toString().padStart(2, '0');
  return new Date(`${dateOnly}T${hh}:${mm}:00.000Z`);
}

const durationByType: Record<AppointmentType, number> = {
  FIRST_VISIT: 60,
  FOLLOW_UP: 30,
  EXAM: 45,
  PROCEDURE: 60,
  URGENT: 30,
};

async function upsertWeeklyMonToFriSchedule(doctorId: string) {
  for (let day = 0; day <= 6; day += 1) {
    const isWeekday = day >= 1 && day <= 5;
    await prisma.doctorSchedule.upsert({
      where: { doctorId_dayOfWeek: { doctorId, dayOfWeek: day } },
      update: {
        startTime: '08:00',
        endTime: '18:00',
        slotMinutes: 30,
        isActive: isWeekday,
      },
      create: {
        doctorId,
        dayOfWeek: day,
        startTime: '08:00',
        endTime: '18:00',
        slotMinutes: 30,
        isActive: isWeekday,
      },
    });
  }
}

async function upsertAppointment(params: {
  patientId: string;
  doctorId: string;
  createdById: string;
  date: string;
  startMinutes: number;
  type: AppointmentType;
  status: AppointmentStatus;
  notes: string;
  cancelReason?: string;
}) {
  const duration = durationByType[params.type];
  const startTime = minutesToTimeDate(params.startMinutes);
  const endTime = minutesToTimeDate(params.startMinutes + duration);

  await prisma.appointment.upsert({
    where: {
      unique_doctor_slot: {
        doctorId: params.doctorId,
        date: toDateOnlyDate(params.date),
        startTime,
      },
    },
    update: {
      patientId: params.patientId,
      createdById: params.createdById,
      type: params.type,
      status: params.status,
      endTime,
      duration,
      scheduledDate: toScheduledDate(params.date, params.startMinutes),
      notes: params.notes,
      cancelReason: params.cancelReason,
    },
    create: {
      patientId: params.patientId,
      doctorId: params.doctorId,
      createdById: params.createdById,
      type: params.type,
      status: params.status,
      date: toDateOnlyDate(params.date),
      startTime,
      endTime,
      duration,
      scheduledDate: toScheduledDate(params.date, params.startMinutes),
      notes: params.notes,
      cancelReason: params.cancelReason,
    },
  });
}

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@clinica.com' },
    update: {},
    create: {
      email: 'admin@clinica.com',
      password: passwordHash,
      name: 'Administrador',
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  const doctor1 = await prisma.user.upsert({
    where: { email: 'doctor1@clinica.com' },
    update: {},
    create: {
      email: 'doctor1@clinica.com',
      password: await bcrypt.hash('doctor123', 10),
      name: 'Dra. Camila Prado',
      role: UserRole.DOCTOR,
      isActive: true,
    },
  });

  const doctor2 = await prisma.user.upsert({
    where: { email: 'doctor2@clinica.com' },
    update: {},
    create: {
      email: 'doctor2@clinica.com',
      password: await bcrypt.hash('doctor123', 10),
      name: 'Dr. Renato Lima',
      role: UserRole.DOCTOR,
      isActive: true,
    },
  });

  await upsertWeeklyMonToFriSchedule(doctor1.id);
  await upsertWeeklyMonToFriSchedule(doctor2.id);

  const patients = await Promise.all([
    prisma.patient.upsert({
      where: { cpf: '12345678901' },
      update: {},
      create: {
        name: 'Maria Souza',
        cpf: '12345678901',
        birthDate: new Date('1991-06-10T00:00:00.000Z'),
        phone: '11999990001',
        email: 'maria.souza@example.com',
        street: 'Rua A',
        number: '100',
        neighborhood: 'Centro',
        city: 'Sao Paulo',
        state: 'SP',
        zipCode: '01001000',
      },
    }),
    prisma.patient.upsert({
      where: { cpf: '12345678902' },
      update: {},
      create: {
        name: 'Ana Pereira',
        cpf: '12345678902',
        birthDate: new Date('1987-03-21T00:00:00.000Z'),
        phone: '11999990002',
        email: 'ana.pereira@example.com',
        street: 'Rua B',
        number: '200',
        neighborhood: 'Jardins',
        city: 'Sao Paulo',
        state: 'SP',
        zipCode: '01402000',
      },
    }),
    prisma.patient.upsert({
      where: { cpf: '12345678903' },
      update: {},
      create: {
        name: 'Juliana Costa',
        cpf: '12345678903',
        birthDate: new Date('1995-11-04T00:00:00.000Z'),
        phone: '11999990003',
        email: 'juliana.costa@example.com',
        street: 'Rua C',
        number: '300',
        neighborhood: 'Vila Mariana',
        city: 'Sao Paulo',
        state: 'SP',
        zipCode: '04103000',
      },
    }),
  ]);

  await upsertAppointment({
    patientId: patients[0].id,
    doctorId: doctor1.id,
    createdById: admin.id,
    date: '2026-03-10',
    startMinutes: 9 * 60,
    type: AppointmentType.FIRST_VISIT,
    status: AppointmentStatus.SCHEDULED,
    notes: 'Primeira consulta',
  });

  await upsertAppointment({
    patientId: patients[1].id,
    doctorId: doctor1.id,
    createdById: admin.id,
    date: '2026-03-10',
    startMinutes: 10 * 60 + 30,
    type: AppointmentType.FOLLOW_UP,
    status: AppointmentStatus.CONFIRMED,
    notes: 'Retorno de rotina',
  });

  await upsertAppointment({
    patientId: patients[2].id,
    doctorId: doctor2.id,
    createdById: admin.id,
    date: '2026-03-10',
    startMinutes: 14 * 60,
    type: AppointmentType.EXAM,
    status: AppointmentStatus.CHECKED_IN,
    notes: 'Exame solicitado',
  });

  await upsertAppointment({
    patientId: patients[0].id,
    doctorId: doctor2.id,
    createdById: admin.id,
    date: '2026-03-11',
    startMinutes: 11 * 60,
    type: AppointmentType.PROCEDURE,
    status: AppointmentStatus.CANCELLED,
    notes: 'Procedimento reagendado',
    cancelReason: 'Paciente solicitou remarcacao',
  });

  await upsertAppointment({
    patientId: patients[1].id,
    doctorId: doctor1.id,
    createdById: admin.id,
    date: '2026-03-11',
    startMinutes: 16 * 60,
    type: AppointmentType.URGENT,
    status: AppointmentStatus.NO_SHOW,
    notes: 'Atendimento de urgencia',
  });

  console.log('Seed concluido com sucesso.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
