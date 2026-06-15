FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
COPY scripts ./scripts
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

COPY --from=build /app/dist ./dist
COPY server.js ./server.js
COPY package.json ./package.json

USER node

EXPOSE 3000

CMD ["npm", "start"]
