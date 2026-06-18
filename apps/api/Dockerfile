FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl

# ── Install dependencies ───────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
RUN npm ci

# ── Build ──────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate Prisma client (binary targets for Alpine Linux)
RUN cd packages/database && npx prisma generate
# Compile NestJS to /app/apps/api/dist
RUN cd apps/api && npm run build

# ── Production runner ──────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nestjs

# Compiled app
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./dist

# All node_modules (includes Prisma client + binaries)
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

# Prisma schema + migrations (needed for prisma migrate deploy)
COPY --from=builder --chown=nestjs:nodejs /app/packages/database/prisma ./prisma

# Root package.json (needed so node can resolve packages)
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./

# Uploads dir (Railway can mount a persistent volume here)
RUN mkdir -p /app/uploads && chown nestjs:nodejs /app/uploads

USER nestjs

# Railway injects $PORT; default to 3001 locally
ENV PORT=3001
EXPOSE 3001

# Run migrations then start — if migrate fails, container exits (safe)
CMD ["sh", "-c", "npx prisma migrate deploy --schema ./prisma/schema.prisma && node dist/main"]
