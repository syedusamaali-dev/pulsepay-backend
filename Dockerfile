FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

# Explicitly set PORT environment variable for the runtime container
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]