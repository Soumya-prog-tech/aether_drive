# 1. Base Image
FROM python:3.11-slim

# 2. Environment Variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 3. Work Directory
WORKDIR /app

# 4. Install System Dependencies
# Required for: psycopg2 (Postgres driver) and grpcio compilation
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 5. Install Python Dependencies
# Copy only requirements first to leverage Docker caching
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 6. Copy Application Code
COPY . .

# 7. Expose Port
EXPOSE 8000

# 8. Default Command
# (This is usually overridden by docker-compose, but good to have as fallback)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]