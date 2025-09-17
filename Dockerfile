# Stage 1: Build the NestJS application
FROM node:22-slim AS builder
RUN apt-get update && apt-get install -y openssl --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-slim
RUN apt-get update && apt-get install -y openssl --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/prisma /app/prisma
RUN npx prisma generate

EXPOSE 3010
CMD ["node", "dist/src/main.js"]
