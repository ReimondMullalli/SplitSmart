// Creates prototype/.env with the default SQLite DATABASE_URL if it does not
// exist yet (.env files are git-ignored, so a fresh clone has none).
// An existing .env is never modified.
import { existsSync, writeFileSync } from "node:fs";

if (existsSync(".env")) {
  console.log(".env already exists - leaving it unchanged.");
} else {
  writeFileSync(".env", 'DATABASE_URL="file:./dev.db"\n');
  console.log('Created .env with DATABASE_URL="file:./dev.db"');
}
