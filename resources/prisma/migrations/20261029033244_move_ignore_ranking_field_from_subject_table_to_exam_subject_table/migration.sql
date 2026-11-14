/*
  Warnings:

  - You are about to drop the column `ignoreRanking` on the `Subject` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ExamSubject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "maxMarks" REAL NOT NULL DEFAULT 100,
    "passMark" REAL NOT NULL DEFAULT 35,
    "ignoreRanking" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExamSubject_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExamSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ExamSubject" ("createdAt", "examId", "id", "maxMarks", "passMark", "subjectId", "updatedAt") SELECT "createdAt", "examId", "id", "maxMarks", "passMark", "subjectId", "updatedAt" FROM "ExamSubject";
DROP TABLE "ExamSubject";
ALTER TABLE "new_ExamSubject" RENAME TO "ExamSubject";
CREATE UNIQUE INDEX "ExamSubject_examId_subjectId_key" ON "ExamSubject"("examId", "subjectId");
CREATE TABLE "new_Subject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "category" TEXT NOT NULL DEFAULT 'other',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Subject" ("category", "code", "createdAt", "id", "name", "updatedAt") SELECT "category", "code", "createdAt", "id", "name", "updatedAt" FROM "Subject";
DROP TABLE "Subject";
ALTER TABLE "new_Subject" RENAME TO "Subject";
CREATE UNIQUE INDEX "Subject_code_key" ON "Subject"("code");
CREATE UNIQUE INDEX "Subject_name_category_key" ON "Subject"("name", "category");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
