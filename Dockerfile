# Fase di compilazione
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Immagine finale: solo ciò che serve per funzionare
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/build ./build
COPY migrations ./migrations
RUN mkdir -p /app/data && chown -R node:node /app
# Non si gira mai come amministratore del sistema. Vedi audit.md §1.5
USER node
EXPOSE 3000
CMD ["node", "build/index.js"]
