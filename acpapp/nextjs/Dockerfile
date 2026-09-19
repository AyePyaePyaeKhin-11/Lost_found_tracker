FROM node:20.17

WORKDIR /src

COPY package.json ./
RUN npm install

COPY . .
RUN npx next telemetry disable
RUN npm run build

CMD ["npm", "run", "start"]
