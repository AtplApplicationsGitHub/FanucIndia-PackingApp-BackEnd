# Stage 1: Build the NestJS application
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy all the source files
COPY . .

# Build the NestJS app
RUN npm run build

# Stage 2: Production image
FROM node:18-alpine

WORKDIR /app

# Install only the production dependencies
COPY --from=builder /app/package*.json ./
RUN npm install --only=production

# Copy the built app from the builder stage
COPY --from=builder /app/dist ./dist

# Expose the port the app will run on
EXPOSE 3000

# Start the application
CMD ["node", "dist/main"]
