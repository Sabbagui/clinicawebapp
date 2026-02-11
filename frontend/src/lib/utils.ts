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

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC'
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
    timeZone: 'UTC'
  })
}

export function formatTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC'
  })
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
