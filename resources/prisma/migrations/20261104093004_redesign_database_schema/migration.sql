/*
  Warnings:

  - You are about to drop the `Stream` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_StreamToSubject` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `academicYearId` on the `Class` table. All the data in the column will be lost.
  - You are about to drop the column `batchId` on the `Class` table. All the data in the column will be lost.
  - You are about to drop the column `classTeacherId` on the `Class` table. All the data in the column will be lost.
  - You are about to drop the column `defaultMediumId` on the `Class` table. All the data in the column will be lost.
  - You are about to drop the column `streamId` on the `Class` table. All the data in the column will be lost.
  - You are about to drop the column `academicYearId` on the `Enrollment` table. All the data in the column will be lost.
  - You are about to drop the column `subjectId` on the `EnrollmentSubject` table. All the data in the column will be lost.
  - You are about to drop the column `academicYearId` on the `Exam` table. All the data in the column will be lost.
  - You are about to drop the column `number` on the `GradeLevel` table. All the data in the column will be lost.
  - You are about to drop the column `examId` on the `Mark` table. All the data in the column will be lost.
  - You are about to drop the column `subjectId` on the `Mark` table. All the data in the column will be lost.
  - Made the column `mediumId` on table `ClassSubject` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `classSubjectId` to the `EnrollmentSubject` table without a default value. This is not possible if the table is not empty.
  - Made the column `mediumId` on table `EnrollmentSubject` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `academicYearId` to the `GradeLevel` table without a default value. This is not possible if the table is not empty.
  - Added the required column `examSubjectId` to the `Mark` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `UserClass` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `UserSubject` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Stream_name_key";

-- DropIndex
DROP INDEX "_StreamToSubject_B_index";

-- DropIndex
DROP INDEX "_StreamToSubject_AB_unique";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Stream";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_StreamToSubject";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Class" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gradeLevelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "teacherId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Class_gradeLevelId_fkey" FOREIGN KEY ("gradeLevelId") REFERENCES "GradeLevel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Class_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Class" ("createdAt", "gradeLevelId", "id", "name", "updatedAt") SELECT "createdAt", "gradeLevelId", "id", "name", "updatedAt" FROM "Class";
DROP TABLE "Class";
ALTER TABLE "new_Class" RENAME TO "Class";
CREATE UNIQUE INDEX "Class_gradeLevelId_name_key" ON "Class"("gradeLevelId", "name");
CREATE TABLE "new_ClassSubject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "mediumId" TEXT NOT NULL,
    "teacherId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClassSubject_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ClassSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ClassSubject_mediumId_fkey" FOREIGN KEY ("mediumId") REFERENCES "Medium" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ClassSubject_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ClassSubject" ("classId", "createdAt", "id", "mediumId", "subjectId", "teacherId", "updatedAt") SELECT "classId", "createdAt", "id", "mediumId", "subjectId", "teacherId", "updatedAt" FROM "ClassSubject";
DROP TABLE "ClassSubject";
ALTER TABLE "new_ClassSubject" RENAME TO "ClassSubject";
CREATE UNIQUE INDEX "ClassSubject_classId_subjectId_key" ON "ClassSubject"("classId", "subjectId");
CREATE TABLE "new_Enrollment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "classIndex" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "joinedOn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedOn" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Enrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Enrollment" ("classId", "classIndex", "createdAt", "endedOn", "id", "joinedOn", "status", "studentId", "updatedAt") SELECT "classId", "classIndex", "createdAt", "endedOn", "id", "joinedOn", "status", "studentId", "updatedAt" FROM "Enrollment";
DROP TABLE "Enrollment";
ALTER TABLE "new_Enrollment" RENAME TO "Enrollment";
CREATE UNIQUE INDEX "Enrollment_classId_studentId_key" ON "Enrollment"("classId", "studentId");
CREATE TABLE "new_EnrollmentSubject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enrollmentId" TEXT NOT NULL,
    "classSubjectId" TEXT NOT NULL,
    "mediumId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EnrollmentSubject_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EnrollmentSubject_classSubjectId_fkey" FOREIGN KEY ("classSubjectId") REFERENCES "ClassSubject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EnrollmentSubject_mediumId_fkey" FOREIGN KEY ("mediumId") REFERENCES "Medium" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_EnrollmentSubject" ("createdAt", "enrollmentId", "id", "mediumId", "updatedAt") SELECT "createdAt", "enrollmentId", "id", "mediumId", "updatedAt" FROM "EnrollmentSubject";
DROP TABLE "EnrollmentSubject";
ALTER TABLE "new_EnrollmentSubject" RENAME TO "EnrollmentSubject";
CREATE UNIQUE INDEX "EnrollmentSubject_enrollmentId_classSubjectId_key" ON "EnrollmentSubject"("enrollmentId", "classSubjectId");
CREATE TABLE "new_Exam" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gradeLevelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Exam_gradeLevelId_fkey" FOREIGN KEY ("gradeLevelId") REFERENCES "GradeLevel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Exam" ("createdAt", "gradeLevelId", "id", "name", "updatedAt") SELECT "createdAt", "gradeLevelId", "id", "name", "updatedAt" FROM "Exam";
DROP TABLE "Exam";
ALTER TABLE "new_Exam" RENAME TO "Exam";
CREATE UNIQUE INDEX "Exam_gradeLevelId_name_key" ON "Exam"("gradeLevelId", "name");
CREATE TABLE "new_ExamSubject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "maxMarks" REAL NOT NULL DEFAULT 100,
    "passMark" REAL NOT NULL DEFAULT 35,
    "ignoreRanking" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExamSubject_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ExamSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ExamSubject" ("createdAt", "examId", "id", "ignoreRanking", "maxMarks", "passMark", "subjectId", "updatedAt") SELECT "createdAt", "examId", "id", "ignoreRanking", "maxMarks", "passMark", "subjectId", "updatedAt" FROM "ExamSubject";
DROP TABLE "ExamSubject";
ALTER TABLE "new_ExamSubject" RENAME TO "ExamSubject";
CREATE UNIQUE INDEX "ExamSubject_examId_subjectId_key" ON "ExamSubject"("examId", "subjectId");
CREATE TABLE "new_GradeLevel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "academicYearId" TEXT NOT NULL,
    "batchId" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GradeLevel_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GradeLevel_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_GradeLevel" ("createdAt", "id", "name", "updatedAt") SELECT "createdAt", "id", "name", "updatedAt" FROM "GradeLevel";
DROP TABLE "GradeLevel";
ALTER TABLE "new_GradeLevel" RENAME TO "GradeLevel";
CREATE UNIQUE INDEX "GradeLevel_academicYearId_name_key" ON "GradeLevel"("academicYearId", "name");
CREATE TABLE "new_Mark" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enrollmentId" TEXT NOT NULL,
    "examSubjectId" TEXT NOT NULL,
    "marks" REAL,
    "status" TEXT NOT NULL DEFAULT 'present',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Mark_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Mark_examSubjectId_fkey" FOREIGN KEY ("examSubjectId") REFERENCES "ExamSubject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Mark" ("createdAt", "enrollmentId", "id", "marks", "status", "updatedAt") SELECT "createdAt", "enrollmentId", "id", "marks", "status", "updatedAt" FROM "Mark";
DROP TABLE "Mark";
ALTER TABLE "new_Mark" RENAME TO "Mark";
CREATE INDEX "Mark_enrollmentId_idx" ON "Mark"("enrollmentId");
CREATE INDEX "Mark_examSubjectId_idx" ON "Mark"("examSubjectId");
CREATE UNIQUE INDEX "Mark_enrollmentId_examSubjectId_key" ON "Mark"("enrollmentId", "examSubjectId");
CREATE TABLE "new_UserClass" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserClass_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserClass_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_UserClass" ("classId", "id", "userId") SELECT "classId", "id", "userId" FROM "UserClass";
DROP TABLE "UserClass";
ALTER TABLE "new_UserClass" RENAME TO "UserClass";
CREATE TABLE "new_UserSubject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserSubject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_UserSubject" ("id", "subjectId", "userId") SELECT "id", "subjectId", "userId" FROM "UserSubject";
DROP TABLE "UserSubject";
ALTER TABLE "new_UserSubject" RENAME TO "UserSubject";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
