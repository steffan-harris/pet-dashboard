FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY scripts ./scripts
COPY db ./db

ENV NODE_ENV=production
EXPOSE 4000

CMD ["sh", "-c", "node scripts/migrate.js && node src/server.js"]
