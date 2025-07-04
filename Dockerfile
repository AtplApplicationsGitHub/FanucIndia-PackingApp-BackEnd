# Stage 1: Build the NestJS application
FROM node:22-alpine AS builder
WORKDIR /app
# Install dependencies
COPY package*.json ./
RUN npm install
# Copy all the source files
COPY . .
# Run prisma generate to create Prisma client
RUN npx prisma generate
# Build the NestJS app (this will generate the dist/ folder)
RUN npm run build
# Stage 2: Production image
FROM node:22-alpine
WORKDIR /app
# Install only the production dependencies
COPY --from=builder /app/package*.json ./
RUN npm install --only=production
# Run prisma generate to create Prisma client in the production environment
RUN npx prisma generate
# Copy the built app (including dist/ folder) from the builder stage
COPY --from=builder /app/dist /app/dist
# Debugging step: Verify the contents of the dist folder
RUN ls -l /app/dist
# Expose the port the app will run on
EXPOSE 3010
# Start the application using the compiled main.js file
CMD ["node", "dist/src/main.js"]
