FROM nginx:alpine

LABEL maintainer="christman-runner"
LABEL version="1.0.0"
LABEL description="Santa Speed Runner - A Christmas themed endless runner game"

# Copy game files and set permissions
COPY --chmod=644 src/ /usr/share/nginx/html/

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Run nginx
CMD ["nginx", "-g", "daemon off;"]
