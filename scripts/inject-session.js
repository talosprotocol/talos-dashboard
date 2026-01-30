import { createHmac, createHash, randomBytes } from "crypto";
import pkg from "pg";
const { Client } = pkg;

const DATABASE_URL = 'postgresql://talos:talos_dev_password@localhost:5433/talos';
const SECRET_B64 = "b64URLSecretPlaceholder";
const _COOKIE_NAME = "talos.sid"; // Dev mode

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    // 1. Get Admin User
    const userRes = await client.query(
      "SELECT id FROM users WHERE email = 'admin@talos.security'",
    );
    if (userRes.rowCount === 0) {
      console.error("Admin user not found!");
      process.exit(1);
    }
    const userId = userRes.rows[0].id;

    // 2. Derive Secret Bytes
    const secretBytes = Buffer.from(SECRET_B64, "base64url");

    // 3. Generate Token
    const tokenBytes = randomBytes(32);
    const tokenB64 = tokenBytes.toString("base64url");
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 86400 * 7;

    // 4. Sign
    const payload = `v1.${exp}.${tokenB64}`;
    const sigBytes = createHmac("sha256", secretBytes).update(payload).digest();
    const sigB64 = sigBytes.toString("base64url");
    const cookieValue = `${payload}.${sigB64}`;

    // 5. Store Hash
    const tokenHash = createHash("sha256").update(tokenBytes).digest();

    // Postgres bytea storage
    await client.query(
      `INSERT INTO sessions (user_id, token_hash, expires_at, created_at, last_seen_at) 
       VALUES ($1, $2, to_timestamp($3), now(), now())`,
      [userId, tokenHash, exp],
    );

    console.log(cookieValue);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
