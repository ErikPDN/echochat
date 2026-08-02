import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './apps/auth-service/src/database/schema',
  out: './apps/auth-service/drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.AUTH_DATABASE_URL!,
  },
});
