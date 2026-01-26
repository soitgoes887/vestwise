# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Build arguments for React environment variables
ARG REACT_APP_SAVE_CONFIG_URL
ARG REACT_APP_LOAD_CONFIG_URL
ARG REACT_APP_ALPHA_VANTAGE_API_KEY
ARG REACT_APP_FMP_API_KEY

# Set as environment variables for the build
ENV REACT_APP_SAVE_CONFIG_URL=$REACT_APP_SAVE_CONFIG_URL
ENV REACT_APP_LOAD_CONFIG_URL=$REACT_APP_LOAD_CONFIG_URL
ENV REACT_APP_ALPHA_VANTAGE_API_KEY=$REACT_APP_ALPHA_VANTAGE_API_KEY
ENV REACT_APP_FMP_API_KEY=$REACT_APP_FMP_API_KEY

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
