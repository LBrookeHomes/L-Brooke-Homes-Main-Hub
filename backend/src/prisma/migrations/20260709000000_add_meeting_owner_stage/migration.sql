-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "attendees" TEXT,
ADD COLUMN     "confirmed" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "FollowUp" ADD COLUMN     "owner" TEXT NOT NULL DEFAULT 'rob',
ADD COLUMN     "stage" TEXT NOT NULL DEFAULT 'interior_finishes';
