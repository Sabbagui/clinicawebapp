// User and Authentication
export enum UserRole {
  ADMIN = 'ADMIN',
  DOCTOR = 'DOCTOR',
  NURSE = 'NURSE',
  RECEPTIONIST = 'RECEPTIONIST',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

// Patient
export interface Patient {
  id: string;
  name: string;
  cpf: string;
  birthDate: Date;
  phone: string;
  whatsapp?: string;
  email?: string;
  address: Address;
  emergencyContact?: EmergencyContact;
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

// Appointment
export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export interface Appointment {
  id: string;
  patientId: string;
  patient?: Patient;
  doctorId: string;
  doctor?: User;
  scheduledDate: Date;
  duration: number; // in minutes
  status: AppointmentStatus;
  type: string;
  notes?: string;
  reminderSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Medical Record
export interface MedicalRecord {
  id: string;
  patientId: string;
  patient?: Patient;
  appointmentId?: string;
  doctorId: string;
  doctor?: User;
  date: Date;
  chiefComplaint: string;
  historyOfPresentIllness: string;
  physicalExamination: string;
  diagnosis: string;
  treatment: string;
  prescriptions?: Prescription[];
  labOrders?: LabOrder[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Prescription {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface LabOrder {
  id: string;
  testName: string;
  notes?: string;
  result?: string;
  resultDate?: Date;
}

// Payments
export enum PaymentMethod {
  CASH = 'CASH',
  PIX = 'PIX',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  HEALTH_INSURANCE = 'HEALTH_INSURANCE',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export interface Payment {
  id: string;
  appointmentId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
