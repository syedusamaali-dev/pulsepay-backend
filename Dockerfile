FROM node:18-alpine

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including TypeScript devDependencies)
RUN npm install

# Copy source code
COPY . .

# Build TypeScript source code -> generates dist/ directory
RUN npm run build

# Expose port (Back4App will map this)
EXPOSE 3000

CMD ["npm", "start"]