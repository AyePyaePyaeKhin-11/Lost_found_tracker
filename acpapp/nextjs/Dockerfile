FROM node:20.17

WORKDIR /src

COPY package.json ./
RUN npm install

COPY . .
RUN npx next telemetry disable
RUN npm run build

# Allow external traffic to reach Next.js inside the container
ENV HOSTNAME="0.0.0.0"
EXPOSE 3000

CMD ["npm", "run", "start"]