FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV DATABASE_URL=postgresql://housebook:housebook@localhost:5432/housebook

FROM base AS deps
COPY package*.json ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/backend/prisma ./apps/backend/prisma
COPY apps/backend/prisma.config.ts ./apps/backend/prisma.config.ts

RUN npm ci && npm cache clean --force

FROM deps AS builder
COPY apps/backend/tsconfig*.json ./apps/backend/
COPY apps/backend/nest-cli.json ./apps/backend/
COPY apps/backend/src ./apps/backend/src

RUN npm --workspace apps/backend run prisma:generate
RUN npm --workspace apps/backend run build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY --from=deps --chown=nestjs:nodejs /app/package*.json ./
COPY --from=deps --chown=nestjs:nodejs /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/prisma.config.ts ./apps/backend/prisma.config.ts

USER nestjs
WORKDIR /app/apps/backend

EXPOSE 3000

CMD ["node", "dist/src/main.js"]
