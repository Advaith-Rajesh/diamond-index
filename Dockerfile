# Multi-stage build: compile the React frontend with Node, then run the
# FastAPI backend with Python. The backend serves both the API and the
# built frontend from a single process on a single port (see main.py).

FROM node:22-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App code + model files + Lahman names data (all needed at runtime)
COPY main.py engine.py helpers.py feature_columns.json ./
COPY *.joblib ./
COPY player_stats.csv ./
COPY lahman_1871-2024_csv/ ./lahman_1871-2024_csv/

# Built frontend (includes the precomputed constellation.json)
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

EXPOSE 5000
ENV PORT=5000
CMD ["python3", "main.py"]
