import path from 'node:path';
import { config } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
});
