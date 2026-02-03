import mysql from 'mysql2/promise';
import { config } from './config.js';

export const pool = mysql.createPool({
  host: config.database.host,
  user: config.database.user,
  password: config.database.password,
  database: config.database.database,
  port: config.database.port,
  connectionLimit: 10,
  namedPlaceholders: true
});

export async function query<T>(sql: string, params?: Record<string, unknown>) {
  const [rows] = await pool.execute<T[]>(sql, params);
  return rows;
}
