# K8WebPolitica — Entorno Kubernetes en AWS

Web ficticia del **Partido por el Futuro (PPF)** desplegada en un clúster k3s de **3 nodos (1 master + 2 workers)** sobre AWS EC2, con Network Load Balancer, chatbot con IA y protegida con Trend Vision One.

---

## Arquitectura

```
CloudFormation
  ├── AWS NLB (internet-facing)
  │     ├── Puerto 80   → NodePort 30080 (Web + Admin + Asistente IA)
  │     └── Puerto 5050 → NodePort 30081 (pgAdmin)
  │
  ├── EC2 t3.medium — k3s MASTER (control-plane) — AZ 0 (10.0.1.0/24)
  │     ├── namespace: ingress-nginx
  │     │     └── Nginx Ingress Controller (NodePort 30080)
  │     ├── namespace: ppf
  │     │     ├── ppf-frontend      → http://<NLB>/
  │     │     ├── ppf-backend       → Node.js API (interno)
  │     │     ├── ppf-admin         → http://<NLB>/admin
  │     │     ├── ppf-ai-frontend   → http://<NLB>/asistente  ← NUEVO
  │     │     ├── ppf-ai-backend    → FastAPI + Groq + Trend  ← NUEVO
  │     │     ├── postgres          → Base de datos (interno)
  │     │     └── pgadmin           → http://<NLB>:5050/
  │     └── namespace: trendmicro-system
  │           └── trendmicro-scout
  │
  ├── EC2 t3.medium — k3s WORKER 1 — AZ 0 (10.0.1.0/24)
  │     └── namespace: trendmicro-system
  │           └── trendmicro-scout
  │
  └── EC2 t3.medium — k3s WORKER 2 — AZ 1 (10.0.2.0/24)
        └── namespace: trendmicro-system
              └── trendmicro-scout
```

Los pods se distribuyen automáticamente entre los 3 nodos. Los workers construyen las imágenes Docker localmente al arrancar. El NLB balancea el tráfico entre los 3 nodos.

> Los pods `ppf-ai-backend` y `ppf-ai-frontend` se ejecutan siempre en el **master** (nodeSelector) ya que requieren las API keys inyectadas como Kubernetes Secret.

---

## Estructura del repositorio

```
k8-web-politica/
  k8s-single-node.yaml     Plantilla CloudFormation (master + 2 workers + NLB)
  deploy.sh                Script de despliegue automático en k3s
  overrides.yaml           Configuración Vision One Container Security (sin token)
  README.md                Esta guía
  VISION-ONE-SETUP.md      Instalación manual de Vision One
  AI-SETUP.md              Configuración del módulo de IA (chatbot + file security)
  frontend/                Web pública PPF (HTML/CSS/JS + Nginx)
  backend/                 API REST Node.js + PostgreSQL
  admin/                   Panel de administración privado (Node.js + JWT)
  ai-backend/              Chatbot FastAPI (Groq + Trend AI Guard + File Security)
    main.py
    app/
      routes/              chat.py · files.py · stats.py
      services/            chatbot.py · ai_guard.py · file_security.py · ...
      data/                Base de conocimiento PPF (programa electoral, afiliación...)
    Dockerfile
    requirements.txt
  ai-frontend/             Portal IA React + Vite (servido por Nginx)
    src/
      App.jsx
      index.css
    Dockerfile
    nginx.conf             Proxy /api/ → ppf-ai-backend:8007
    vite.config.js
  k8s/                     Manifiestos Kubernetes
    ppf.yaml               Deployments: frontend, backend, postgres
    admin.yaml             Deployment: panel admin
    pgadmin.yaml           Deployment: pgAdmin (NodePort 30081)
    ai.yaml                Deployments: ppf-ai-backend + ppf-ai-frontend
    ingress.yaml           Ingress rules (web + admin + asistente)
```

---

## Despliegue desde cero

### Requisitos
- AWS CLI configurado (`aws configure`) con acceso a us-east-1
- Key Pair `k3` creado en AWS us-east-1 (archivo `k3.pem` en local)
- Cuenta GitHub con acceso al repo
- Credenciales para el módulo IA (ver [AI-SETUP.md](./AI-SETUP.md))

---

### Paso 1 — Levantar la infraestructura con CloudFormation

Desde la consola de AWS:
> AWS Console → CloudFormation → Crear pila → Con recursos nuevos → Cargar archivo → `k8s-single-node.yaml`

O desde CLI:

```bash
aws cloudformation deploy \
  --region us-east-1 \
  --stack-name k8s-single-node \
  --template-file k8s-single-node.yaml \
  --parameter-overrides KeyPairName=k3
```

**Parámetros de la plantilla:**

| Parámetro | Default | Descripción |
|-----------|---------|-------------|
| `KeyPairName` | `k3` | Key Pair para SSH |
| `InstanceType` | `t3.medium` | Tipo de instancia (todos los nodos) |
| `K3sToken` | `ppf-k3s-cluster-token-2027` | Token para unir nodos al clúster |
| `AllowedSSHCidr` | `0.0.0.0/0` | CIDR permitido para SSH |

**Lo que hace CloudFormation automáticamente:**

```
Master:
  1. Instala git, docker, k3s
  2. Clona este repositorio
  3. Ejecuta deploy.sh:
     - Construye las 5 imágenes Docker
     - Instala Helm + Nginx Ingress Controller
     - Despliega todos los manifiestos k8s (ppf, admin, pgadmin, ai)
     - Instala Vision One Container Security (con token placeholder)

Worker 1 y Worker 2 (en paralelo):
  1. Instala git, docker
  2. Clona este repositorio
  3. Construye las 5 imágenes Docker (backend, frontend, admin, ai-backend, ai-frontend)
  4. Espera a que el master esté listo (/healthz)
  5. Se une al clúster k3s como worker
  6. Importa las 5 imágenes en k3s

NLB:
  - Se crea automáticamente con listeners en puertos 80 y 5050
  - Balancea a los 3 nodos (master + worker1 + worker2)
```

**Tiempo total: ~15-18 minutos**

El DNS del NLB y las IPs aparecen en:
> AWS Console → CloudFormation → k8s-single-node → **Salidas**

---

### Paso 2 — Verificar el clúster

```bash
ssh -i k3.pem ec2-user@<MASTER_IP>
kubectl get nodes
kubectl get pods -n ppf
```

Resultado esperado (3 nodos Ready, 8 pods Running):
```
NAME                         STATUS   ROLES           AGE   VERSION
ip-10-0-1-xxx.ec2.internal   Ready    control-plane   5m    v1.35.x+k3s1
ip-10-0-1-yyy.ec2.internal   Ready    <none>          3m    v1.35.x+k3s1
ip-10-0-2-zzz.ec2.internal   Ready    <none>          3m    v1.35.x+k3s1
```

---

### Paso 3 — Configurar el módulo de IA

> ⚠️ Este paso es **manual** — las credenciales no se guardan en el repo.

```bash
kubectl create secret generic ppf-ai-secrets -n ppf \
  --from-literal=GROQ_API_KEY="TU_GROQ_KEY" \
  --from-literal=TREND_API_KEY="TU_V1_AI_GUARD_KEY" \
  --from-literal=FILE_SECURITY_API_KEY="TU_FILE_SECURITY_KEY"

kubectl rollout restart deployment/ppf-ai-backend -n ppf
```

Ver [AI-SETUP.md](./AI-SETUP.md) para obtener cada credencial.

---

### Paso 4 — Instalar Trend Vision One Container Security

> ⚠️ Este paso es **manual** — el bootstrap token caduca en cada despliegue.

Sigue las instrucciones en [VISION-ONE-SETUP.md](./VISION-ONE-SETUP.md).

Verificación:
```bash
kubectl get pods -n trendmicro-system
# Deben aparecer 3 trendmicro-scout (uno por nodo)
```

---

### Paso 5 — Acceder a las aplicaciones

| URL | Aplicación | Credenciales |
|-----|-----------|--------------|
| `http://<NLB_DNS>/` | Web pública PPF | — |
| `http://<NLB_DNS>/admin` | Panel de administración | `admin` / `ppf2027` |
| `http://<NLB_DNS>/asistente` | Asistente IA + File Security | — |
| `http://<NLB_DNS>:5050/` | pgAdmin | `admin@ppf.es` / `ppf2027` |

> Las URLs completas aparecen en los **Outputs** de CloudFormation.

En pgAdmin, conecta el servidor:
- Host: `postgres` · Puerto: `5432` · BD: `ppf` · Usuario: `ppf` · Password: `ppf123`

---

## Aplicaciones

### Web pública PPF (`/`)
Web del Partido por el Futuro para las **elecciones generales de mayo 2027**:
- Hero con contador animado de afiliados
- Programa electoral por áreas (tabs interactivos)
- Noticias y agenda de actos
- Encuesta interactiva con resultados en tiempo real
- Formulario de afiliación (guarda en PostgreSQL)
- Suscripción a newsletter

### Panel de administración (`/admin`)
Dashboard privado con login JWT:
- Listado y búsqueda de afiliados
- Baja de afiliados
- Suscriptores de newsletter
- Distribución geográfica por provincias
- Contador de días para las elecciones

### API Backend (interno)
Node.js + Express + PostgreSQL:

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/affiliates` | Registrar afiliado |
| `GET` | `/api/affiliates/count` | Contador total |
| `POST` | `/api/newsletter` | Suscripción newsletter |
| `GET` | `/api/news` | Noticias |
| `GET` | `/api/events` | Agenda de actos |

### Asistente IA PPF (`/asistente`) ← NUEVO
Portal React con chatbot electoral y canal seguro de documentación:
- **Chatbot**: Groq Llama 3.3 70B con conocimiento del programa PPF (educación, sanidad, economía, vivienda, medio ambiente, afiliación, encuestas)
- **AI Guard**: Trend Vision One valida entradas y salidas del chatbot (prompt injection, contenido dañino, datos sensibles)
- **File Security**: Análisis antimalware en tiempo real de documentos subidos (Trend File Security SDK)
- **Dashboard**: Métricas en tiempo real de eventos de seguridad IA y ficheros procesados

API endpoints (FastAPI interno):

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/chat` | Chatbot con AI Guard |
| `POST` | `/api/files/upload` | Subida + análisis File Security |
| `GET` | `/api/stats` | Estadísticas del portal IA |

### pgAdmin (`http://<NLB>:5050`)
Gestión visual de PostgreSQL. Tablas: `affiliates`, `newsletter`.

---

## Seguridad — Trend Vision One

### Container Security (clúster completo)
**3 scouts activos** (uno por nodo) con **6/6 features**:

| Feature | Descripción |
|---------|-------------|
| Runtime Security | Detección de comportamiento anómalo en contenedores |
| Vulnerability Scanning | Escaneo de vulnerabilidades en imágenes |
| Malware Scanning | Detección de malware en tiempo real |
| Secret Scanning | Detección de secretos expuestos |
| File Integrity Monitoring | Monitorización de cambios en ficheros críticos |
| Audit Log Collection | Logs de auditoría de Kubernetes |

### AI Guard (chatbot PPF)
Protección del flujo conversacional:
- **Inspección de entrada**: bloquea prompt injection y peticiones maliciosas antes de llegar al LLM
- **Inspección de salida**: valida la respuesta del modelo antes de entregarla al usuario
- Alineado con **OWASP Top 10 for LLM Applications** y **MITRE ATLAS**

### File Security SDK (canal documental)
- Análisis antimalware de cada fichero subido
- Cuarentena automática de archivos maliciosos
- Trazabilidad completa: SHA256, Scan ID, versión del motor, tiempo de análisis

---

## Flujo de trabajo (cambios en el código)

```bash
# 1. Cambios en local + push
git add . && git commit -m "descripción" && git push

# 2. En el MASTER — redeploy completo
cd /home/ec2-user/partido-app
git checkout deploy.sh && git pull
./deploy.sh

# 3. Para cambios en ai-backend o ai-frontend (solo en master)
sudo docker build -t ppf-ai-backend:latest  ai-backend/
sudo docker build -t ppf-ai-frontend:latest ai-frontend/
sudo docker save ppf-ai-backend:latest  | sudo k3s ctr images import -
sudo docker save ppf-ai-frontend:latest | sudo k3s ctr images import -
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
kubectl rollout restart deployment/ppf-ai-backend  -n ppf
kubectl rollout restart deployment/ppf-ai-frontend -n ppf
```

---

## Notas importantes

- El entorno es **volátil** — se destruye cada ~6 horas. CloudFormation levanta todo desde cero.
- **3 pasos manuales** en cada despliegue: Secret IA + Vision One token + helm install.
- El **Bootstrap Token de Vision One caduca** — regenerar en Vision One → Container Security → K8WebPolitica → Edit → Regenerate token.
- Las **credenciales del módulo IA** (Groq, AI Guard, File Security) se inyectan como Kubernetes Secret — nunca en el repo.
- El repo es **público** — no subas tokens ni credenciales reales.
- Los pods `ppf-ai-backend` y `ppf-ai-frontend` tienen `nodeSelector: control-plane` para garantizar que siempre corren en el master donde se importaron las imágenes.
