-- CreateEnum
CREATE TYPE "MilestonePhase" AS ENUM ('onboarding', 'preconstruction', 'construction', 'closeout');

-- AlterTable
ALTER TABLE "Milestone" ADD COLUMN     "phase" "MilestonePhase" NOT NULL DEFAULT 'construction';

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "fromDecisionId" TEXT;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_fromDecisionId_fkey" FOREIGN KEY ("fromDecisionId") REFERENCES "Decision"("id") ON DELETE SET NULL ON UPDATE CASCADE;
