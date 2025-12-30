FROM python:3.10-slim

WORKDIR /app

# 1. System dependencies (STAYS)
RUN apt-get update && apt-get install -y \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# 2. Python dependencies (STAYS)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    --extra-index-url https://download.pytorch.org/whl/cpu

RUN docling-tools models download --all
# 3. Heavy models (STAYS - avoids re-downloading)
RUN python -m spacy download en_core_web_lg


COPY . .

