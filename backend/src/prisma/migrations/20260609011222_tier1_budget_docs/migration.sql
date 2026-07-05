-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('plans', 'permits', 'contracts', 'soils', 'grading', 'plot', 'photos', 'other');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('needed', 'received', 'on_file');

-- AlterTable
ALTER TABLE "Decision" ADD COLUMN     "allowance" DOUBLE PRECISION,
ADD COLUMN     "chosenPrice" DOUBLE PRECISION,
ADD COLUMN     "proposedNote" TEXT,
ADD COLUMN     "proposedPrice" DOUBLE PRECISION,
ADD COLUMN     "proposedUrl" TEXT;

-- AlterTable
ALTER TABLE "DecisionOption" ADD COLUMN     "price" DOUBLE PRECISION,
ADD COLUMN     "vendorUrl" TEXT;

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "milestoneId" TEXT,
    "name" TEXT NOT NULL,
    "kind" "DocumentKind" NOT NULL DEFAULT 'other',
    "status" "DocumentStatus" NOT NULL DEFAULT 'needed',
    "link" TEXT,
    "s3Key" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderDocument" (
    "workOrderId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,

    CONSTRAINT "WorkOrderDocument_pkey" PRIMARY KEY ("workOrderId","documentId")
);

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderDocument" ADD CONSTRAINT "WorkOrderDocument_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderDocument" ADD CONSTRAINT "WorkOrderDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
