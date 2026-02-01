FROM node:18-slim

WORKDIR /app

# Install only production deps
COPY package.json package-lock.json* ./
RUN npm ci --only=production || npm install --only=production

COPY generate-collages.js ./

ENV NODE_ENV=production

CMD ["node", "generate-collages.js"]
