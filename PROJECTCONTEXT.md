# PROJECT CONTEXT

## Project Name

Employee Leave Management System

## Description

A web application that allows employees to submit leave requests while managers and HR can review, approve, or reject them. The system tracks leave balances, leave history, and approval status.

---

## Goal

Build a secure and responsive leave management system using Next.js, Prisma, PostgreSQL (Supabase), and TypeScript.

---

## Tech Stack

- Next.js App Router
- TypeScript
- Prisma ORM
- PostgreSQL (Supabase)
- Tailwind CSS
- Server Components
- REST API

---

## User Roles

### Employee

- Login
- View profile
- Submit leave request
- View leave history
- Cancel pending request

### Manager

- Approve leave
- Reject leave
- View team leave requests
- View employee leave balances

### HR / Admin

- Manage employees
- Manage leave types
- View reports
- Configure company leave policies

---

## Core Features

- User authentication
- Role-based authorization
- Dashboard
- Leave request submission
- Leave approval workflow
- Leave balance tracking
- Leave history
- Email notifications
- Admin panel

---

## Database Entities

- User
- Department
- LeaveType
- LeaveRequest
- LeaveBalance
- Approval

---

## Relationships

Department
└── Users (1:M)

User
└── LeaveRequest (1:M)

LeaveType
└── LeaveRequest (1:M)

User
└── LeaveBalance (1:M)

LeaveRequest
└── Approval (1:M)

---

## API Endpoints

### Authentication

POST /api/auth/login

POST /api/auth/logout

GET /api/auth/me

---

### Users

GET /api/users

GET /api/users/:id

PATCH /api/users/:id

---

### Leave Requests

GET /api/leave

POST /api/leave

GET /api/leave/:id

PATCH /api/leave/:id

DELETE /api/leave/:id

---

### Leave Types

GET /api/leave-types

POST /api/leave-types

PATCH /api/leave-types/:id

DELETE /api/leave-types/:id

---

### Leave Balance

GET /api/balance

PATCH /api/balance

---

## Authentication

Role-Based Access Control (RBAC)

Roles:

- Employee
- Manager
- HR
- Admin

---

## Business Rules

- Employees cannot approve their own leave.
- Managers can only approve employees in their department.
- HR/Admin can manage all leave requests.
- Leave balance must be checked before approval.
- Cancelled leave restores leave balance.
- Annual leave cannot exceed remaining balance.

---

## Current Progress

Planning

---

## TODO

- Design database schema
- Build authentication
- Create Prisma models
- Create API routes
- Build employee dashboard
- Build manager dashboard
- Build admin dashboard
- Implement approval workflow
- Add notifications
- Testing

---

## Notes

This project is intended to demonstrate:

- Clean architecture
- Secure authentication
- Role-based authorization
- Proper database design
- Scalable API design
- Responsive UI