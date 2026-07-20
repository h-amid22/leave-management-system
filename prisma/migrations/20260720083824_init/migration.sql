-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('EMPLOYEE', 'MANAGER', 'HR', 'ADMIN');

-- CreateEnum
CREATE TYPE "LeaveRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SKIPPED');

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'EMPLOYEE',
    "employeeNumber" TEXT,
    "authProviderId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "departmentId" TEXT,
    "managerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isPaid" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeavePolicy" (
    "id" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "allowanceDays" DECIMAL(6,2) NOT NULL,
    "maximumCarryOver" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "allowNegative" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeavePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveBalance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "entitledDays" DECIMAL(6,2) NOT NULL,
    "carriedDays" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "usedDays" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "requestedDays" DECIMAL(6,2) NOT NULL,
    "reason" TEXT,
    "status" "LeaveRequestStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "leaveRequestId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "step" INTEGER NOT NULL DEFAULT 1,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeNumber_key" ON "User"("employeeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_authProviderId_key" ON "User"("authProviderId");

-- CreateIndex
CREATE INDEX "User_departmentId_idx" ON "User"("departmentId");

-- CreateIndex
CREATE INDEX "User_managerId_idx" ON "User"("managerId");

-- CreateIndex
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveType_code_key" ON "LeaveType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveType_name_key" ON "LeaveType"("name");

-- CreateIndex
CREATE INDEX "LeavePolicy_leaveTypeId_effectiveFrom_effectiveTo_idx" ON "LeavePolicy"("leaveTypeId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "LeavePolicy_leaveTypeId_effectiveFrom_key" ON "LeavePolicy"("leaveTypeId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "LeaveBalance_leaveTypeId_year_idx" ON "LeaveBalance"("leaveTypeId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveBalance_userId_leaveTypeId_year_key" ON "LeaveBalance"("userId", "leaveTypeId", "year");

-- CreateIndex
CREATE INDEX "LeaveRequest_requesterId_status_idx" ON "LeaveRequest"("requesterId", "status");

-- CreateIndex
CREATE INDEX "LeaveRequest_leaveTypeId_idx" ON "LeaveRequest"("leaveTypeId");

-- CreateIndex
CREATE INDEX "LeaveRequest_status_submittedAt_idx" ON "LeaveRequest"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "LeaveRequest_startDate_endDate_idx" ON "LeaveRequest"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "Approval_approverId_status_idx" ON "Approval"("approverId", "status");

-- CreateIndex
CREATE INDEX "Approval_leaveRequestId_status_idx" ON "Approval"("leaveRequestId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Approval_leaveRequestId_step_key" ON "Approval"("leaveRequestId", "step");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeavePolicy" ADD CONSTRAINT "LeavePolicy_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
