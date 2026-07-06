-- CreateTable
CREATE TABLE "Worker" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Worker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobLocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkItem" (
    "id" TEXT NOT NULL,
    "jobDetails" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Planning',
    "timeline" TEXT,
    "jobDate" TIMESTAMP(3),
    "day" TEXT,
    "notes" TEXT,
    "materialRequired" BOOLEAN NOT NULL DEFAULT false,
    "startTime" TEXT,
    "endTime" TEXT,
    "plannedHours" DOUBLE PRECISION,
    "paymentStatus" TEXT,
    "purchasingItems" TEXT,
    "firstStop" BOOLEAN NOT NULL DEFAULT false,
    "endOfDay" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkItemWorker" (
    "workItemId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,

    CONSTRAINT "WorkItemWorker_pkey" PRIMARY KEY ("workItemId","workerId")
);

-- CreateTable
CREATE TABLE "WorkItemLocation" (
    "workItemId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,

    CONSTRAINT "WorkItemLocation_pkey" PRIMARY KEY ("workItemId","locationId")
);

-- AddForeignKey
ALTER TABLE "WorkItemWorker" ADD CONSTRAINT "WorkItemWorker_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkItemWorker" ADD CONSTRAINT "WorkItemWorker_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkItemLocation" ADD CONSTRAINT "WorkItemLocation_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkItemLocation" ADD CONSTRAINT "WorkItemLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "JobLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
