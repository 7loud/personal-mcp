# Stage 1: Build
FROM node:20-bookworm AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# Stage 2: Runtime
FROM node:20-bookworm

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

# .env from outside (Volume)
CMD ["node", "dist/server.js"]