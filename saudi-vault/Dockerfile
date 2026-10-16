FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi
COPY . .
EXPOSE 4000
# نفّذ التهجير ثم ابدأ الخادم
CMD ["sh", "-c", "node src/migrate.js && node src/server.js"]