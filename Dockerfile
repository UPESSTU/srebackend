FROM node:22

WORKDIR /

COPY package.json ./

RUN yarn install --production

COPY . .

EXPOSE 8000

CMD ["node", "src/server.js"]