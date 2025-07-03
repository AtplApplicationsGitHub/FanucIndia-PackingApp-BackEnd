# Stage 1: Build the NestJS application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy the package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Build the NestJS app (output goes to dist/)
RUN npm run build

# Stage 2: Production image
FROM node:18-alpine

WORKDIR /app

# Install only the production dependencies
COPY --from=builder /app/package*.json ./
RUN npm install --only=production

# Copy the dist folder from the builder stage
COPY --from=builder /app/dist /app/dist

# Expose the port
EXPOSE 3000

# Start the app using the compiled main.js file
CMD ["node", "dist/main"]
