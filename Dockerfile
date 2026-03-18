# ---------- BASE ----------
FROM node:20-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# ---------- DEPENDENCIES & BUILD ----------
# On regroupe pour profiter du cache pnpm
FROM base AS builder

# Installation des dépendances Backend
COPY backend/package.json backend/pnpm-lock.yaml ./backend/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    cd backend && pnpm install

# Installation des dépendances Frontend
COPY frontend/package.json frontend/pnpm-lock.yaml ./frontend/
RUN  cd frontend && pnpm install

# Build Backend
COPY backend ./backend
RUN cd backend && pnpm prisma generate && pnpm build

# Build Frontend
COPY frontend ./frontend
RUN cd frontend && pnpm build

# Nettoyage : On ne garde que les modules de prod pour le backend
RUN cd backend && pnpm prune --prod

# ---------- FINAL IMAGE ----------
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# On ne récupère que le strict nécessaire
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/package.json ./backend/package.json
COPY --from=builder /app/frontend/dist ./frontend/dist

# Optimisation système et permissions en une seule couche
RUN apk add --no-cache postgresql-client && \
    mkdir -p /app/backend/logs /app/backend/backups && \
    chown -R node:node /app/backend

USER node
EXPOSE 10000

CMD ["node", "backend/dist/src/main.js"]