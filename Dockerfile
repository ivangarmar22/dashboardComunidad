FROM node:20-slim

# Dependencias del sistema para Playwright Chromium
RUN apt-get update && apt-get install -y \
    libnss3 libnspr4 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxkbcommon0 libatspi2.0-0 libxcomposite1 \
    libxdamage1 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 \
    libcairo2 libasound2 libwayland-client0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar package.json e instalar dependencias
COPY package.json package-lock.json* ./
RUN npm install

# Instalar solo Chromium para Playwright
RUN npx playwright install chromium

# Copiar el resto del proyecto
COPY . .

# Build del frontend
RUN npm run build

# Crear directorio de datos
RUN mkdir -p server/data

EXPOSE 4000

ENV NODE_ENV=production
ENV PORT=4000

CMD ["node", "server/index.js"]
