# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_URL=http://backend:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Monorepo workspace install: use root lockfile and workspace manifests.
COPY package*.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm ci --workspace frontend --include-workspace-root

COPY frontend ./frontend
RUN npm run build --workspace frontend

FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package*.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm ci --omit=dev --workspace frontend --include-workspace-root && npm cache clean --force

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
COPY frontend/package.json ./frontend/package.json
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/frontend/.next ./frontend/.next
COPY --from=builder /app/frontend/public ./frontend/public
COPY --from=builder /app/frontend/next.config.mjs ./frontend/next.config.mjs
COPY --from=builder /app/frontend/next-env.d.ts ./frontend/next-env.d.ts
COPY --from=builder /app/frontend/tsconfig.json ./frontend/tsconfig.json

WORKDIR /app/frontend
EXPOSE 3000
CMD ["npm", "run", "start"]

