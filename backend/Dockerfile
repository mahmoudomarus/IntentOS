FROM node:22-alpine
WORKDIR /app

# Copy lockfile and package.json
COPY package.json package-lock.json* ./

# Install dependencies statically
RUN npm install --legacy-peer-deps

# Copy application layers
COPY . .

# Expose Next.js port
EXPOSE 3000

# Run Next.js Dev Server mapped to host 0.0.0.0 to allow container bindings
CMD ["npm", "run", "dev"]
