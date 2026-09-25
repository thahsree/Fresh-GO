# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

# Install build dependencies
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code and build
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY src ./src

RUN npm run build

# Prune dev dependencies for lean production container
RUN npm prune --production

# Stage 2: Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production

# Security: Run as unprivileged non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

# Copy built application and production dependencies
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

USER nestjs

EXPOSE 4000

CMD ["node", "dist/main"]
