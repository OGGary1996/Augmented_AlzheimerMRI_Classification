FROM node:22-bookworm-slim AS frontend-builder

WORKDIR /app/alzheimerMRI_frontend

COPY alzheimerMRI_frontend/package*.json ./
RUN npm ci

COPY alzheimerMRI_frontend/ ./
RUN npm run build


FROM python:3.10-slim-bookworm

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl nginx \
    && rm -rf /var/lib/apt/lists/*

RUN pip install uv

COPY FastAPIServer/pyproject.toml FastAPIServer/uv.lock ./FastAPIServer/
RUN uv sync --project ./FastAPIServer --frozen

COPY ["Clinical Dataset", "./Clinical Dataset"]
COPY FastAPIServer ./FastAPIServer
COPY alzheimerMRI_frontend ./alzheimerMRI_frontend
COPY --from=frontend-builder /app/alzheimerMRI_frontend/dist ./alzheimerMRI_frontend/dist
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY scripts/start-space.sh /app/scripts/start-space.sh

RUN chmod +x /app/scripts/start-space.sh

EXPOSE 7860

CMD ["/app/scripts/start-space.sh"]
