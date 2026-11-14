/*
  Warnings:

  - You are about to drop the column `previousEnrollmentId` on the `Enrollment` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Enrollment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "classIndex" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "joinedOn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedOn" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Enrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Enrollment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Enrollment" ("academicYearId", "classId", "classIndex", "createdAt", "endedOn", "id", "joinedOn", "status", "studentId", "updatedAt") SELECT "academicYearId", "classId", "classIndex", "createdAt", "endedOn", "id", "joinedOn", "status", "studentId", "updatedAt" FROM "Enrollment";
DROP TABLE "Enrollment";
ALTER TABLE "new_Enrollment" RENAME TO "Enrollment";
CREATE INDEX "Enrollment_classId_idx" ON "Enrollment"("classId");
CREATE UNIQUE INDEX "Enrollment_studentId_academicYearId_key" ON "Enrollment"("studentId", "academicYearId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
