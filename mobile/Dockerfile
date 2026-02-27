FROM node:22-alpine
WORKDIR /app

# Copy lockfile and package.json
COPY package.json package-lock.json* ./

# Install dependencies statically
RUN npm install --legacy-peer-deps

# Copy application layers
COPY . .

# Expose Expo Web port
EXPOSE 8081

# Run Expo Web Dev Server
CMD ["npx", "expo", "start", "--web", "--clear"]
