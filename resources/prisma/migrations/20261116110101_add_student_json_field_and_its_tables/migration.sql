-- AlterTable
ALTER TABLE "Student" ADD COLUMN "json" JSONB;

-- CreateTable
CREATE TABLE "StudentJsonField" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
