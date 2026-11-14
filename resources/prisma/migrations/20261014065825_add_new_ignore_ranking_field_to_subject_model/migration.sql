-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Subject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "category" TEXT NOT NULL DEFAULT 'other',
    "ignoreRanking" BOOLEAN NOT NULL DEFAULT false,
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
