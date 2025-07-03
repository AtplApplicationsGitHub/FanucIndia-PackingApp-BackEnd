# Stage 1: Build the NestJS application
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy all the source files
COPY . .

# Build the NestJS app (this will generate the dist/ folder)
RUN npm run build

# Stage 2: Production image
FROM node:18-alpine

WORKDIR /app

# Install only the production dependencies
COPY --from=builder /app/package*.json ./
RUN npm install

# Copy the built app (including dist/ folder) from the builder stage
COPY --from=builder /app/dist /app/dist

# Debugging step: Verify the contents of the dist folder
RUN ls -l /app/dist

# Expose the port the app will run on
EXPOSE 3010

# Start the application
CMD ["node", "dist/main.js"]
