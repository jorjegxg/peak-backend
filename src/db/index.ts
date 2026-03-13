import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
const MYSQL_HOST = process.env.MYSQL_HOST;
const MYSQL_PORT = process.env.MYSQL_PORT;
const MYSQL_USER = process.env.MYSQL_USER;
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD;
const MYSQL_DATABASE = process.env.MYSQL_DATABASE;

function getPoolConfig(): mysql.PoolOptions {
  if (DATABASE_URL) {
    return {
      uri: DATABASE_URL,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    };
  }
  const missing: string[] = [];
  if (MYSQL_HOST === undefined || MYSQL_HOST === "") missing.push("MYSQL_HOST");
  if (MYSQL_PORT === undefined || MYSQL_PORT === "") missing.push("MYSQL_PORT");
  if (MYSQL_USER === undefined || MYSQL_USER === "") missing.push("MYSQL_USER");
  if (MYSQL_PASSWORD === undefined) missing.push("MYSQL_PASSWORD");
  if (MYSQL_DATABASE === undefined || MYSQL_DATABASE === "")
    missing.push("MYSQL_DATABASE");
  if (missing.length > 0) {
    console.error("[db] Missing required env: " + missing.join(", "));
    throw new Error(
      "Database config incomplete. Set DATABASE_URL or " + missing.join(", "),
    );
  }
  return {
    host: MYSQL_HOST as string,
    port: Number(MYSQL_PORT) || 3306,
    user: MYSQL_USER as string,
    password: MYSQL_PASSWORD as string,
    database: MYSQL_DATABASE as string,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
}

/**
 * Creates the database if it does not exist. Uses a connection without a database.
 */
async function ensureDatabaseExists(): Promise<void> {
  if (DATABASE_URL) {
    try {
      const url = new URL(DATABASE_URL);
      const dbName = url.pathname.replace(/^\//, "").split("?")[0].trim();
      if (!dbName) return;
      url.pathname = "/";
      url.search = "";
      const conn = await mysql.createConnection(url.toString());
      await conn.query(
        `CREATE DATABASE IF NOT EXISTS \`${dbName.replace(/`/g, "``")}\``,
      );
      await conn.end();
    } catch (err) {
      console.error("[db] Failed to create database:", err);
      throw err;
    }
    return;
  }
  const dbName = MYSQL_DATABASE as string;
  if (!dbName) return;
  const conn = await mysql.createConnection({
    host: MYSQL_HOST as string,
    port: Number(MYSQL_PORT) || 3306,
    user: MYSQL_USER as string,
    password: MYSQL_PASSWORD as string,
  });
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbName.replace(/`/g, "``")}\``,
  );
  await conn.end();
}

let poolInstance: mysql.Pool | null = null;

const OTPS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS otps (
    phone VARCHAR(20) PRIMARY KEY,
    code VARCHAR(10) NOT NULL,
    expires_at BIGINT NOT NULL
  )
`;

/**
 * Returns the DB pool, creating it and ensuring the database and otps table exist on first use.
 */
export async function getPool(): Promise<mysql.Pool> {
  if (poolInstance) return poolInstance;
  await ensureDatabaseExists();
  const config = getPoolConfig();
  poolInstance = mysql.createPool(config);
  await poolInstance.query(OTPS_TABLE_SQL);
  return poolInstance;
}
