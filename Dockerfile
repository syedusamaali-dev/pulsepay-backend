FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Compile TypeScript -> dist/
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]