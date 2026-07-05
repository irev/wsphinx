FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
RUN npm install -g pm2
WORKDIR /app
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/ecosystem.config.json ./
COPY --from=build /app/worker ./worker
COPY --from=build /app/src/lib ./src/lib
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/tsconfig.json ./

EXPOSE 9696 9494

CMD ["pm2-runtime", "start", "ecosystem.config.json"]
