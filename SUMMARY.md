# Gynecology Practice Management System - Project Summary

## Overview

A full-stack web application for managing a gynecology practice, built with **Next.js 14** (frontend) and **NestJS** (backend), using **PostgreSQL** with **Prisma ORM**. All UI text is in **Brazilian Portuguese**.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React, TypeScript, Tailwind CSS |
| State Management | Zustand |
| Form Validation | React Hook Form + Zod |
| UI Components | Custom shadcn/ui-style components, Lucide icons |
| Backend | NestJS, TypeScript |
| Database | PostgreSQL 15 |
| ORM | Prisma |
| Auth | JWT (passport-jwt + passport-local) |
| Infrastructure | Docker Compose (dev environment) |

---

## Implemented Features

### 1. Authentication System
- JWT-based login with email/password
- Protected routes with `AuthProvider` component
- Role-based access (ADMIN, DOCTOR, NURSE, RECEPTIONIST)
- Persistent auth state via Zustand + localStorage
- Seeded users: admin, doctor, receptionist

### 2. Patient Management (CRUD)
- **23 fields** organized into 4 sections: Basic Info, Contact, Address, Emergency Contact
- **Data transformation layer**: Backend stores flat fields, frontend uses nested objects (address, emergencyContact)
- **Brazilian-specific**: CPF validation (11 digits), phone formatting, CEP/ZIP lookup via ViaCEP API, all 27 state codes
- **Auto-formatting**: CPF (###.###.###-##), phone ((##) #####-####), ZIP (#####-###) on blur
- **Search**: Debounced search by name or CPF on patient list
- **Validation**: Zod schemas with Portuguese error messages matching backend rules

### 3. Appointments System (CRUD)
- **Create/edit/view appointments** with patient, doctor, date, time, duration, type
- **Conflict detection**: Backend checks for overlapping appointments per doctor
- **Status workflow**: SCHEDULED -> CONFIRMED -> IN_PROGRESS -> COMPLETED (or CANCELLED/NO_SHOW)
- **Status transitions** validated on both frontend (button visibility) and backend (transition rules)
- **Day view**: Visual grid 08:00-18:00 with 30-minute time slots
- **List view**: Table alternative with sortable columns
- **Date navigation**: Previous/Next day buttons, "Today" shortcut
- **Color-coded status badges**: Blue (scheduled), Green (confirmed), Yellow (in progress), etc.
- **Doctor dropdown**: Filtered from users with role=DOCTOR

### 4. Navigation & Layout
- **Global navigation bar** in dashboard layout (DashboardNav component)
- Links: Dashboard, Pacientes, Agendamentos with active state highlighting
- User name display + logout button
- Responsive: icons-only on mobile, full labels on desktop

---

## Key Architectural Decisions

1. **Data transformation layer** (frontend API endpoints): Backend uses flat Prisma fields; frontend transforms to/from nested TypeScript objects. This keeps the backend simple while giving the frontend clean types.

2. **UTC timezone handling**: All dates stored as UTC in PostgreSQL. Display functions use `timeZone: 'UTC'` to prevent off-by-one errors in Brazilian timezone (UTC-3).

3. **Separate date + time fields** in appointment form: Better UX than datetime-local input; constrains time selection to office hours (08:00-18:00 in 30-min slots).

4. **Conflict detection in application code**: Prisma can't compute `scheduledDate + duration` in WHERE clauses. Service fetches same-day appointments and checks overlap in TypeScript (~20 appointments/day max, so efficient enough).

5. **Status transitions validated on both sides**: Frontend shows only valid transition buttons; backend independently validates. Defense in depth.

6. **Zustand for state management**: Lightweight, follows simple pattern across all stores (auth, patient, appointment). Each store has: data, loading, error states + CRUD actions.

7. **No pagination**: Patient list returns all (small practice scale); appointment list filtered by date range which naturally limits results.

---

## File Structure

```
gynecology-practice-app/
├── docker-compose.yml              # PostgreSQL, pgAdmin, backend-dev, frontend-dev
├── Dockerfile.dev                  # Development Docker image
├── package.json                    # Monorepo root
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma           # 6 models: User, Patient, Appointment, MedicalRecord, Payment + enums
│   │   └── seed.ts                 # Seeds 3 users (admin, doctor, receptionist)
│   └── src/
│       ├── main.ts                 # NestJS bootstrap (port 3001, CORS, Swagger, validation pipe)
│       ├── app.module.ts           # Root module importing all feature modules
│       ├── common/prisma/          # PrismaModule (global) + PrismaService
│       └── modules/
│           ├── auth/               # Login, JWT strategy, guards, roles decorator
│           ├── users/              # User CRUD + role filter (?role=DOCTOR)
│           ├── patients/           # Patient CRUD (23 fields, flat structure)
│           ├── appointments/       # Appointment CRUD + status transitions + conflict detection
│           └── medical-records/    # Skeleton (not yet implemented)
│
└── frontend/
    └── src/
        ├── app/
        │   ├── globals.css
        │   ├── layout.tsx              # Root HTML layout
        │   ├── (public)/
        │   │   ├── page.tsx            # Landing page with "Acessar Sistema" button
        │   │   ├── layout.tsx
        │   │   └── login/page.tsx      # Login form
        │   └── (dashboard)/
        │       ├── layout.tsx          # AuthProvider + DashboardNav wrapper
        │       └── dashboard/
        │           ├── page.tsx        # Dashboard home (profile card, feature cards)
        │           ├── patients/       # List, New, [id] detail, [id]/edit
        │           └── appointments/   # List (day/list views), New, [id] detail, [id]/edit
        ├── components/
        │   ├── ui/                     # Button, Input, Label, Alert, Card, Skeleton, Table, Select, Dialog
        │   ├── auth/                   # LoginForm, AuthProvider
        │   ├── layout/                 # DashboardNav
        │   ├── patients/               # PatientTable, PatientForm, PatientSearch, EmptyState, DetailSection
        │   └── appointments/           # DayView, ListView, AppointmentCard, Form, StatusBadge, StatusActions, PatientSelect, EmptyState
        ├── lib/
        │   ├── utils.ts                # cn(), formatCPF/Phone/Date/Time, stripFormatting, calculateAge
        │   ├── api/
        │   │   ├── client.ts           # Axios instance with JWT interceptor + Next.js rewrites
        │   │   └── endpoints/          # auth.ts, patients.ts, appointments.ts, users.ts
        │   ├── constants/              # brazilian-states.ts, appointment-constants.ts
        │   ├── validation/             # patient-schema.ts, appointment-schema.ts (Zod)
        │   └── stores/                 # auth-store.ts, patient-store.ts, appointment-store.ts (Zustand)
        ├── hooks/
        │   └── use-auth.ts
        └── types/
            ├── index.ts
            └── api.ts
```

---

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login with email/password, returns JWT |

### Users
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users?role=DOCTOR` | List users (optional role filter) |
| GET | `/api/users/:id` | Get user by ID |
| POST | `/api/users` | Create user (Admin only) |
| DELETE | `/api/users/:id` | Delete user (Admin only) |

### Patients
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/patients` | List all patients (ordered by name) |
| GET | `/api/patients/:id` | Get patient with appointments and records |
| POST | `/api/patients` | Create patient (23 flat fields) |
| PATCH | `/api/patients/:id` | Update patient |
| DELETE | `/api/patients/:id` | Delete patient |

### Appointments
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/appointments?startDate=&endDate=&doctorId=` | List by date range |
| GET | `/api/appointments/:id` | Get appointment with patient/doctor |
| POST | `/api/appointments` | Create (with conflict detection) |
| PATCH | `/api/appointments/:id` | Update (with conflict re-check) |
| PATCH | `/api/appointments/:id/status` | Change status (validated transitions) |

---

## Database Models (Prisma)

- **User**: id, email, password, name, role (ADMIN/DOCTOR/NURSE/RECEPTIONIST), isActive
- **Patient**: id, name, cpf (unique), birthDate, phone, whatsapp?, email?, address fields (7), emergency contact fields (3)
- **Appointment**: id, patientId, doctorId, scheduledDate, duration (default 30min), status (6 states), type, notes?, reminderSent
- **MedicalRecord**: id, patientId, appointmentId?, doctorId, SOAP notes (5 fields), prescriptions (JSON), labOrders (JSON), notes
- **Payment**: id, appointmentId, amount, method (5 types), status (4 states), paidAt?

---

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | admin123 |
| Doctor | doctor@example.com | doctor123 |
| Receptionist | reception@example.com | reception123 |

---

## Running the Application

```bash
# Start all services (PostgreSQL, backend, frontend, pgAdmin)
docker-compose up -d

# Setup database (first time only)
cd backend && npx prisma db push && npx prisma db seed

# Access the app
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
# Swagger docs: http://localhost:3001/api/docs
# pgAdmin: http://localhost:5050
```

---

## Next Steps

1. **Medical Records (Prontuarios)** - SOAP notes system linked to appointments. Backend skeleton exists, needs full implementation.
2. **WhatsApp Integration** - Appointment reminders and patient communication (reminderSent field already in schema).
3. **Reports & Dashboard Analytics** - Patient counts, appointment statistics, revenue tracking.
4. **Payment Management** - Payment model exists in schema, needs CRUD implementation.
5. **Calendar Week/Month Views** - Currently only day view; add week and month calendar views.
6. **Print/Export** - PDF generation for medical records and receipts.
