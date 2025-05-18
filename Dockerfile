# Build container
FROM node:20-slim AS builder

# Make sure we got brotli
RUN apt-get update && apt-get install -y brotli

WORKDIR /usr
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN cd /usr/dist && find . -type f -exec brotli {} \;

# Actual runtime container
FROM alpine
RUN apk add brotli nginx nginx-mod-http-brotli

# Minimal config
COPY nginx.conf /etc/nginx/http.d/default.conf

# Actual data
COPY --from=builder /usr/dist /usr/share/nginx/html
CMD ["nginx", "-g", "daemon off;"]
# EXPOSE 80
