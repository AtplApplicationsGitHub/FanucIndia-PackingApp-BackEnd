# Stage 1: Build the application
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .
RUN npm run build
RUN npm prune --production
# Stage 2: Create the final, minimal production image
FROM node:22-alpine
WORKDIR /app
COPY --from-builder /app/dist ./dist
COPY --from-builder /app/node_modules ./node_modules
COPY --from-builder /app/package*.json ./

COPY --from-builder /app/prisma ./prisma/
EXPOSE 3011

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
