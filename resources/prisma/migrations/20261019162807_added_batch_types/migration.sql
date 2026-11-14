-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Batch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'al',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Batch" ("createdAt", "id", "name", "updatedAt") SELECT "createdAt", "id", "name", "updatedAt" FROM "Batch";
DROP TABLE "Batch";
ALTER TABLE "new_Batch" RENAME TO "Batch";
CREATE UNIQUE INDEX "Batch_name_key" ON "Batch"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
