FROM node:20-alpine
WORKDIR /usr/app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY src ./src
COPY tsconfig.json .
RUN npm run build

FROM node:20-alpine
WORKDIR /usr/app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=0 /usr/app/dist .
COPY ecosystem.config.cjs .
RUN npm install pm2 -g
CMD ["pm2-runtime", "ecosystem.config.cjs"]
