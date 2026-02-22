import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { UserRole } from '@prisma/client';

export const ACCESS_FORBIDDEN_MESSAGE = 'Sem permissão para acessar este recurso.';

export interface AccessUser {
  id: string;
  role: UserRole;
}

export function isAdmin(user: AccessUser): boolean {
  return user.role === UserRole.ADMIN;
}

export function isReceptionist(user: AccessUser): boolean {
  return user.role === UserRole.RECEPTIONIST;
}

export function isClinician(user: AccessUser): boolean {
  return user.role === UserRole.DOCTOR || user.role === UserRole.NURSE;
}

export function assertAppointmentAccess(
  user: AccessUser,
  appointment: { doctorId: string },
): void {
  if (isAdmin(user) || isReceptionist(user)) return;
  if (isClinician(user) && appointment.doctorId === user.id) return;
  throw new ForbiddenException(ACCESS_FORBIDDEN_MESSAGE);
}

export async function assertPatientAccess(
  user: AccessUser,
  patientId: string,
  prisma: PrismaService,
): Promise<void> {
  if (isAdmin(user) || isReceptionist(user)) return;
  if (!isClinician(user)) {
    throw new ForbiddenException(ACCESS_FORBIDDEN_MESSAGE);
  }

  const hasAccess = await prisma.appointment.findFirst({
    where: { patientId, doctorId: user.id },
    select: { id: true },
  });
  if (!hasAccess) {
    throw new ForbiddenException(ACCESS_FORBIDDEN_MESSAGE);
  }
}

export function assertMedicalRecordAccess(
  user: AccessUser,
  record: { doctorId: string; appointment?: { doctorId: string } | null },
): void {
  if (isReceptionist(user)) {
    throw new ForbiddenException(ACCESS_FORBIDDEN_MESSAGE);
  }
  if (isAdmin(user)) return;

  const ownerDoctorId = record.appointment?.doctorId ?? record.doctorId;
  if (isClinician(user) && ownerDoctorId === user.id) return;

  throw new ForbiddenException(ACCESS_FORBIDDEN_MESSAGE);
}
