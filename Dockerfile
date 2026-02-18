# Use Node.js 20 Alpine as base image
FROM node:20-alpine AS builder

# Install dependencies for building (including openssl for Prisma)
RUN apk add --no-cache libc6-compat openssl openssl-dev

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for building)
RUN npm ci

# Copy source files
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the Next.js app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Production image
FROM node:20-alpine AS runner

# Install OpenSSL 3 and compatibility layer for Prisma
RUN apk add --no-cache openssl openssl-dev

WORKDIR /app

# Create non-root user
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

# Copy package files and install production dependencies
# We need prisma, tsx for database operations and seeding
COPY package*.json ./
RUN npm ci --omit=dev && npm install prisma tsx --save

# Copy built application from builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/start-production.js ./start-production.js

# Switch to non-root user
USER nextjs

# Environment variables
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 8080

# Override any base image entrypoint
ENTRYPOINT []

# Start via production script
CMD ["node", "start-production.js"]
