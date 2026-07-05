-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('planning', 'active', 'on_hold', 'complete', 'cancelled');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('pending', 'in_progress', 'complete', 'blocked');

-- CreateEnum
CREATE TYPE "Trade" AS ENUM ('plumbing', 'electrical', 'masonry', 'carpentry', 'finish', 'painting', 'landscaping', 'hvac', 'roofing', 'tiling', 'drywall', 'general');

-- CreateEnum
CREATE TYPE "DecisionType" AS ENUM ('structured', 'freeform');

-- CreateEnum
CREATE TYPE "DecisionStatus" AS ENUM ('pending', 'staged', 'decided', 'locked');

-- CreateEnum
CREATE TYPE "DecisionPriority" AS ENUM ('critical', 'high', 'normal', 'low');

-- CreateEnum
CREATE TYPE "MessageSender" AS ENUM ('gc', 'client');

-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('draft', 'sent', 'in_progress', 'completed', 'needs_revision');

-- CreateEnum
CREATE TYPE "WorkOrderPriority" AS ENUM ('normal', 'urgent');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('sms', 'email', 'push');

-- CreateEnum
CREATE TYPE "NotificationRecipientType" AS ENUM ('gc', 'client', 'contractor');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('sent', 'delivered', 'failed');

-- CreateTable
CREATE TABLE "GCUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pushSubs" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GCUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "notifPrefs" JSONB NOT NULL DEFAULT '{"email":true,"sms":false,"push":false}',
    "portalToken" TEXT,
    "portalTokenExpires" TIMESTAMP(3),
    "pushSubs" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contractor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "trade" "Trade" NOT NULL,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contractor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'planning',
    "templateType" TEXT,
    "startDate" TIMESTAMP(3),
    "targetDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectContractor" (
    "projectId" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "role" TEXT,

    CONSTRAINT "ProjectContractor_pkey" PRIMARY KEY ("projectId","contractorId")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "MilestoneStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "milestoneId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "DecisionType" NOT NULL DEFAULT 'structured',
    "status" "DecisionStatus" NOT NULL DEFAULT 'pending',
    "priority" "DecisionPriority" NOT NULL DEFAULT 'normal',
    "dueDate" TIMESTAMP(3),
    "stagedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "selectedOptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionOption" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "photoS3Key" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecisionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionMessage" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "senderType" "MessageSender" NOT NULL,
    "body" TEXT NOT NULL,
    "attachmentS3Keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecisionMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "milestoneId" TEXT,
    "contractorId" TEXT,
    "trade" "Trade" NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL DEFAULT '',
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'draft',
    "priority" "WorkOrderPriority" NOT NULL DEFAULT 'normal',
    "scheduledDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "magicLinkToken" TEXT NOT NULL,
    "magicLinkExpiresAt" TIMESTAMP(3) NOT NULL,
    "smsSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderPhoto" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "recipientId" TEXT NOT NULL,
    "recipientType" "NotificationRecipientType" NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'sent',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GCUser_email_key" ON "GCUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Client_email_key" ON "Client"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Client_portalToken_key" ON "Client"("portalToken");

-- CreateIndex
CREATE UNIQUE INDEX "Milestone_projectId_order_key" ON "Milestone"("projectId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_magicLinkToken_key" ON "WorkOrder"("magicLinkToken");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectContractor" ADD CONSTRAINT "ProjectContractor_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectContractor" ADD CONSTRAINT "ProjectContractor_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionOption" ADD CONSTRAINT "DecisionOption_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "Decision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionMessage" ADD CONSTRAINT "DecisionMessage_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "Decision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderPhoto" ADD CONSTRAINT "WorkOrderPhoto_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
