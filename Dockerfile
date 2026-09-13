FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PORT=8000 \
    HOST=0.0.0.0

WORKDIR /app

# Create unprivileged system group and user (UID/GID 10001) for rootless execution
RUN groupadd -r -g 10001 appgroup && \
    useradd -r -u 10001 -g appgroup -d /app -s /sbin/nologin appuser

# Install system dependencies (curl for healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy application files
COPY backend /app/backend
COPY frontend /app/frontend
COPY docs /app/docs

# Enforce secure ownership and permissions for unprivileged execution
RUN chown -R appuser:appgroup /app && \
    chmod -R 755 /app

# Switch to non-root unprivileged user
USER appuser

# Expose FastAPI service port
EXPOSE 8000

# Healthcheck (executed as non-root appuser)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

# Run server as unprivileged appuser
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
