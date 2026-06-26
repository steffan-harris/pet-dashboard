FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY sync_app ./sync_app

ENTRYPOINT ["python", "-m", "sync_app.main"]
