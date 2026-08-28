FROM node:22-alpine

WORKDIR /app

COPY --chown=node:node package*.json ./

USER node

RUN npm ci

COPY --chown=node:node . .

EXPOSE 3000

CMD ["npm", "run", "dev"]