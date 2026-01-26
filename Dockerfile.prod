# Production Dockerfile - packages pre-built React assets
# Build is done in GitHub Actions, this just creates the nginx image

FROM nginx:alpine

# Copy pre-built assets from GitHub Actions build
COPY build /usr/share/nginx/html

# Copy custom nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
