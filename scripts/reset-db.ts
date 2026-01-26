
import { db } from '../src/db';
import { users, authenticators, sessions, webauthnChallenges } from '../src/db/schema';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
    console.log('Resetting DB...');
    await db.delete(sessions);
    await db.delete(webauthnChallenges);
    await db.delete(authenticators);
    await db.delete(users);
    console.log('DB Reset Complete.');
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
