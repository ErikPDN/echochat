import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './apps/chat-service/src/database/schema',
  out: './apps/chat-service/drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.CHAT_DATABASE_URL!,
  },
});
