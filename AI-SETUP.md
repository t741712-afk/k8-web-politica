# Módulo IA — Configuración manual

Ejecutar tras levantar el entorno con CloudFormation y conectarse por SSH al master.

> Las credenciales **nunca se guardan en el repo**. Se inyectan como Kubernetes Secret en cada despliegue.

---

## Credenciales necesarias

### 1. Groq API Key
El LLM del chatbot (Llama 3.3 70B).

> https://console.groq.com → API Keys → Create API Key

### 2. Trend Vision One AI Guard
Valida entradas y salidas del chatbot.

> Vision One → AI Security → AI Guard → Applications → Nueva aplicación → Generate API Key

### 3. Trend Vision One File Security
Analiza los ficheros subidos por los usuarios.

> Vision One → Cloud Security → File Security → Storage → Generate API Key

---

## Comando de instalación

```bash
kubectl create secret generic ppf-ai-secrets -n ppf \
  --from-literal=GROQ_API_KEY="PEGA_AQUI_GROQ_KEY" \
  --from-literal=TREND_API_KEY="PEGA_AQUI_V1_AI_GUARD_KEY" \
  --from-literal=FILE_SECURITY_API_KEY="PEGA_AQUI_FILE_SECURITY_KEY"
```

Reiniciar el backend para que lea el Secret:

```bash
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
kubectl rollout restart deployment/ppf-ai-backend -n ppf
kubectl rollout status deployment/ppf-ai-backend -n ppf --timeout=60s
```

---

## Si el Secret ya existe (redeploy)

```bash
kubectl delete secret ppf-ai-secrets -n ppf
kubectl create secret generic ppf-ai-secrets -n ppf \
  --from-literal=GROQ_API_KEY="PEGA_AQUI_GROQ_KEY" \
  --from-literal=TREND_API_KEY="PEGA_AQUI_V1_AI_GUARD_KEY" \
  --from-literal=FILE_SECURITY_API_KEY="PEGA_AQUI_FILE_SECURITY_KEY"

kubectl rollout restart deployment/ppf-ai-backend -n ppf
```

---

## Verificación

```bash
kubectl get pods -n ppf | grep ai
# ppf-ai-backend-xxx   1/1   Running
# ppf-ai-frontend-xxx  1/1   Running

kubectl logs deployment/ppf-ai-backend -n ppf | tail -5
# INFO: Uvicorn running on http://0.0.0.0:8007
```

Accede al asistente:
```
http://<NLB_DNS>/asistente
```

---

## Variables de entorno del backend

| Variable | Origen | Descripción |
|----------|--------|-------------|
| `GROQ_API_KEY` | Secret `ppf-ai-secrets` | API key de Groq |
| `TREND_API_KEY` | Secret `ppf-ai-secrets` | API key de Trend AI Guard |
| `FILE_SECURITY_API_KEY` | Secret `ppf-ai-secrets` | API key de Trend File Security |
| `FILE_SECURITY_REGION` | ai.yaml (hardcoded) | Región del servicio (`eu-central-1`) |
| `UPLOAD_DIR` | ai.yaml (hardcoded) | Directorio de uploads (`/data/uploads`) |
| `TREND_AI_URL` | ai_guard.py (default) | Endpoint de AI Guard |
| `TREND_AI_APP_NAME` | ai_guard.py (default) | Nombre de la app en Vision One (`ppf-partido`) |
