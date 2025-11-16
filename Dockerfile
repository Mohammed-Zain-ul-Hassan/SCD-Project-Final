# Use Node 18 Alpine (Lightweight and standard)
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files first (optimizes build cache)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your code
COPY . .

# The app uses a CLI menu, so we just run main.js
CMD ["node", "main.js"]