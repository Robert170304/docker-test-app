# ---- builder stage ----
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# Install minimal build tools if any native modules needed
RUN apk add --no-cache python3 make g++

# Copy package files first for caching
COPY package.json package-lock.json* ./

# Install production deps in builder
RUN npm ci --production

# Copy app source
COPY . .

# ---- runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /usr/src/app

# Copy everything from builder (this includes node_modules)
COPY --from=builder /usr/src/app ./

# Install curl for healthcheck (tiny)
RUN apk add --no-cache curl

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

CMD ["npm", "start"]
