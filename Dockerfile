FROM node:24-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Chromium sin interfaz y sus librerías de sistema, para el login en Endesa
RUN npx playwright install --with-deps --only-shell chromium

COPY . .
RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

CMD ["node", "server/index.js"]
