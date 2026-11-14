// -----------------------------------------------------------------------------------
// Copy-Paste this file inside resources/server dir because this needs access to better-sqlite3 module
// -----------------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Database = require("better-sqlite3");

const databasePath = process.argv[2];

if (!databasePath) {
  console.error("Database path is required.");
  process.exit(1);
}

let db;

try {
  db = new Database(databasePath, {
    fileMustExist: true,
  });

  const result = db.pragma("quick_check", {
    simple: true,
  });

  if (result !== "ok") {
    throw new Error(`SQLite integrity check failed: ${result}`);
  }

  // Checkpoint any remaining WAL data after successful validation.
  const checkpoint = db.pragma("wal_checkpoint(TRUNCATE)");

  if (checkpoint?.[0]?.busy) {
    throw new Error("Database is busy; WAL checkpoint could not complete.");
  }

  console.log("SQLite integrity check passed.");
} catch (error) {
  console.error(error);
  process.exitCode = 2;
} finally {
  db?.close();
}
