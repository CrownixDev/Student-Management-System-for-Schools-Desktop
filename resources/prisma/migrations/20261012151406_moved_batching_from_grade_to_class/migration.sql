/*
  Warnings:

  - You are about to drop the column `batchId` on the `GradeLevel` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Class" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "academicYearId" TEXT NOT NULL,
    "gradeLevelId" TEXT NOT NULL,
    "streamId" TEXT,
    "name" TEXT NOT NULL,
    "defaultMediumId" TEXT,
    "classTeacherId" TEXT,
    "batchId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Class_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Class_gradeLevelId_fkey" FOREIGN KEY ("gradeLevelId") REFERENCES "GradeLevel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Class_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Class_defaultMediumId_fkey" FOREIGN KEY ("defaultMediumId") REFERENCES "Medium" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Class_classTeacherId_fkey" FOREIGN KEY ("classTeacherId") REFERENCES "Teacher" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Class_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Class" ("academicYearId", "classTeacherId", "createdAt", "defaultMediumId", "gradeLevelId", "id", "name", "streamId", "updatedAt") SELECT "academicYearId", "classTeacherId", "createdAt", "defaultMediumId", "gradeLevelId", "id", "name", "streamId", "updatedAt" FROM "Class";
DROP TABLE "Class";
ALTER TABLE "new_Class" RENAME TO "Class";
CREATE INDEX "Class_gradeLevelId_idx" ON "Class"("gradeLevelId");
CREATE UNIQUE INDEX "Class_academicYearId_gradeLevelId_name_key" ON "Class"("academicYearId", "gradeLevelId", "name");
CREATE TABLE "new_GradeLevel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_GradeLevel" ("createdAt", "id", "name", "number", "updatedAt") SELECT "createdAt", "id", "name", "number", "updatedAt" FROM "GradeLevel";
DROP TABLE "GradeLevel";
ALTER TABLE "new_GradeLevel" RENAME TO "GradeLevel";
CREATE UNIQUE INDEX "GradeLevel_number_key" ON "GradeLevel"("number");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
