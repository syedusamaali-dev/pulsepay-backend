FROM node:18-alpine

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install ALL dependencies (including devDependencies like tsc)
RUN npm install

# Copy source code
COPY . .

# Compile TypeScript -> generates dist/server.js
RUN npm run build

# Expose container port
EXPOSE 3000

# Start server
CMD ["npm", "start"]