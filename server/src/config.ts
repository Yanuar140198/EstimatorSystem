import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret',
  database: {
    host: process.env.DB_HOST ?? 'mysql',
    user: process.env.DB_USER ?? 'ahsp_user',
    password: process.env.DB_PASSWORD ?? 'ahsp_pass',
    database: process.env.DB_NAME ?? 'ahsp_estimator',
    port: Number(process.env.DB_PORT ?? 3306)
  }
};
