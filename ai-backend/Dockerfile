FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

RUN mkdir -p /data/uploads/incoming /data/uploads/clean /data/uploads/quarantine

EXPOSE 8007

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8007"]
