import mysql, { Pool } from "mysql2/promise";

let pool: Pool | null = null;

export function getPool(): Pool | null {
  // Check if we have the required env vars
  const hasDbConfig =
    process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD && process.env.DB_NAME;

  if (!hasDbConfig) {
    console.warn("Database not configured. Using demo mode with in-memory data.");
    return null;
  }

  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  return pool;
}
