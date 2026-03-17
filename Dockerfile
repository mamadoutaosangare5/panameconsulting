# ---------- BASE ----------
FROM node:20-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app


# ---------- INSTALL DEPENDENCIES ----------
FROM base AS dependencies

COPY frontend/package.json ./frontend/package.json
COPY frontend/pnpm-lock.yaml ./frontend/pnpm-lock.yaml

COPY backend/package.json ./backend/package.json
COPY backend/pnpm-lock.yaml ./backend/pnpm-lock.yaml


# frontend deps
WORKDIR /app/frontend
RUN pnpm install --no-frozen-lockfile


# backend deps
WORKDIR /app/backend
RUN pnpm install --no-frozen-lockfile


# ---------- BUILD FRONTEND ----------
FROM base AS frontend-builder

COPY --from=dependencies /app/frontend/node_modules ./frontend/node_modules
COPY frontend ./frontend

WORKDIR /app/frontend
RUN pnpm build


# ---------- BUILD BACKEND ----------
FROM base AS backend-builder

COPY --from=dependencies /app/backend/node_modules ./backend/node_modules
COPY backend ./backend

WORKDIR /app/backend

RUN pnpm prisma generate
RUN pnpm build


# ---------- FINAL IMAGE ----------
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /app/backend/package.json ./backend/package.json

COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

RUN apk add --no-cache postgresql-client

# créer le dossier logs et donner la permission
# créer les dossiers logs et backups dans le backend
# créer logs et backups dans le backend
RUN mkdir -p /app/backend/logs /app/backend/backups \
    && chown -R node:node /app/backend



USER node

EXPOSE 10000

CMD ["node", "backend/dist/src/main.js"]