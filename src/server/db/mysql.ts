import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export function getMysqlPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.LS_DB_HOST!,
      database: process.env.LS_DB_NAME!,
      user: process.env.LS_DB_USER!,
      password: process.env.LS_DB_PASSWORD!,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    });
  }
  return pool;
}
