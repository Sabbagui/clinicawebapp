import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCPF(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
}

export function formatPhone(phone: string): string {
  return phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
}

const CLINIC_TZ = 'America/Sao_Paulo';

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: CLINIC_TZ
  })
}

// Use this for date-only fields (birthDate, etc.) — avoids UTC-3 rollback
export function formatDateOnly(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: CLINIC_TZ
  })
}

export function formatTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: CLINIC_TZ
  })
}

export function formatBRLFromCents(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100)
}

// São Paulo is UTC-3 year-round (Brazil ended DST in 2019)
export function getTodayYmdInSaoPaulo(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const year = parts.find((p) => p.type === 'year')?.value
  const month = parts.find((p) => p.type === 'month')?.value
  const day = parts.find((p) => p.type === 'day')?.value

  return `${year}-${month}-${day}`
}

const SAO_PAULO_OFFSET_HOURS = 3;

export function getClinicHoursMinutes(date: Date | string): { hour: number; minute: number } {
  const d = new Date(date)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d)

  const hour = Number(parts.find((p) => p.type === 'hour')!.value)
  const minute = Number(parts.find((p) => p.type === 'minute')!.value)
  return { hour, minute }
}

export function clinicDayRange(date: Date | string): { start: string; end: string } {
  const d = new Date(date)
  // Extract the São Paulo local date components
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)
  const y = Number(parts.find((p) => p.type === 'year')!.value)
  const m = Number(parts.find((p) => p.type === 'month')!.value)
  const day = Number(parts.find((p) => p.type === 'day')!.value)

  // 00:00 BRT = 03:00 UTC, 23:59:59 BRT = next day 02:59:59 UTC
  const start = new Date(Date.UTC(y, m - 1, day, SAO_PAULO_OFFSET_HOURS, 0, 0)).toISOString()
  const end = new Date(Date.UTC(y, m - 1, day + 1, SAO_PAULO_OFFSET_HOURS - 1, 59, 59, 999)).toISOString()
  return { start, end }
}

export function stripFormatting(value: string): string {
  return value.replace(/\D/g, '') // Remove all non-digit characters
}

export function formatZipCode(zipCode: string): string {
  const cleaned = zipCode.replace(/\D/g, '')
  if (cleaned.length !== 8) return zipCode
  return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2') // 01234-567
}

export function calculateAge(birthDate: Date | string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getUTCFullYear()
  const monthDiff = today.getMonth() - birth.getUTCMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getUTCDate())) {
    age--
  }
  return age
}
