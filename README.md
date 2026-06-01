# K8WebPolitica — Entorno Kubernetes en AWS

Web ficticia del **Partido por el Futuro (PPF)** desplegada en un clúster k3s de 2 nodos sobre AWS EC2, protegida con Trend Vision One Container Security.

---

## Arquitectura

```
CloudFormation
  └── EC2 t3.medium — k3s MASTER (control-plane)
  │     ├── namespace: ingress-nginx
  │     │     └── Nginx Ingress Controller (NodePort 30080)
  │     ├── namespace: ppf
  │     │     ├── ppf-frontend   → http://<IP>:30080/
  │     │     ├── ppf-backend    → Node.js API (interno)
  │     │     ├── ppf-admin      → http://<IP>:30080/admin
  │     │     ├── postgres       → Base de datos (interno)
  │     │     └── pgadmin        → http://<IP>:30081/
  │     └── namespace: trendmicro-system
  │           └── Vision One Container Security
  │                 └── trendmicro-scout (nodo master)
  │
  └── EC2 t3.medium — k3s WORKER
        └── namespace: trendmicro-system
              └── trendmicro-scout (nodo worker)
```

Los pods se distribuyen automáticamente entre master y worker. El worker construye las imágenes Docker localmente al arrancar y se une al clúster usando un token estático.

---

## Estructura del repositorio

```
k8-web-politica/
  k8s-single-node.yaml   Plantilla CloudFormation (master + worker)
  deploy.sh              Script de despliegue de la app en k3s
  overrides.yaml         Configuración Vision One (sin token)
  README.md              Esta guía
  VISION-ONE-SETUP.md    Instalación manual de Vision One
  frontend/              Web pública PPF (HTML/CSS/JS + Nginx)
    src/
      index.html
      style.css
      app.js
    Dockerfile
    nginx.conf
  backend/               API REST Node.js + PostgreSQL
    server.js
    package.json
    Dockerfile
  admin/                 Panel de administración privado
    server.js
    package.json
    src/index.html
    Dockerfile
  k8s/                   Manifiestos Kubernetes
    ppf.yaml             Deployments: frontend, backend, postgres
    admin.yaml           Deployment: panel admin
    pgadmin.yaml         Deployment: pgAdmin (NodePort 30081)
    ingress.yaml         Ingress rules (web + admin)
```

---

## Despliegue desde cero

### Requisitos
- AWS CLI configurado (`aws configure`) con acceso a us-east-1
- Key Pair `k3` creado en AWS us-east-1 (archivo `k3.pem` en local)
- Cuenta GitHub con acceso al repo

---

### Paso 1 — Levantar la infraestructura con CloudFormation

Sube la plantilla `k8s-single-node.yaml` desde la consola de AWS:

> AWS Console → CloudFormation → Crear pila → Con recursos nuevos → Cargar archivo

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
| `InstanceType` | `t3.medium` | Tipo de instancia (master y worker) |
| `K3sToken` | `ppf-k3s-cluster-token-2027` | Token para unir nodos al clúster |
| `AllowedSSHCidr` | `0.0.0.0/0` | CIDR permitido para SSH |

**Lo que hace CloudFormation automáticamente:**

```
Master:
  1. Instala git, docker, k3s
  2. Clona este repositorio
  3. Ejecuta deploy.sh → construye imágenes, despliega app + Ingress

Worker:
  1. Instala git, docker
  2. Clona este repositorio
  3. Construye las imágenes Docker (backend, frontend, admin)
  4. Espera a que el master esté listo
  5. Se une al clúster k3s como worker
  6. Importa las imágenes en k3s
```

**Tiempo total: ~10-12 minutos**

Las IPs públicas aparecen en:
> AWS Console → CloudFormation → k8s-single-node → **Salidas**

---

### Paso 2 — Verificar el clúster

```bash
ssh -i k3.pem ec2-user@<MASTER_IP>
kubectl get nodes
```

Resultado esperado:
```
NAME                         STATUS   ROLES           AGE   VERSION
ip-10-0-1-xxx.ec2.internal   Ready    control-plane   5m    v1.35.x+k3s1
ip-10-0-1-yyy.ec2.internal   Ready    <none>          3m    v1.35.x+k3s1
```

---

### Paso 3 — Instalar Trend Vision One Container Security

> ⚠️ Este paso es **manual** — el bootstrap token caduca y debe generarse en cada despliegue.

Sigue las instrucciones en [`VISION-ONE-SETUP.md`](./VISION-ONE-SETUP.md).

**Ejecutar siempre en el MASTER.**

Verificación:
```bash
kubectl get pods -n trendmicro-system
# Deben aparecer 2 trendmicro-scout (uno por nodo)
```

---

### Paso 4 — Acceder a las aplicaciones

| URL | Aplicación | Credenciales |
|-----|-----------|--------------|
| `http://<MASTER_IP>:30080/` | Web pública PPF | — |
| `http://<MASTER_IP>:30080/admin` | Panel de administración | `admin` / `ppf2027` |
| `http://<MASTER_IP>:30081/` | pgAdmin | `admin@ppf.es` / `ppf2027` |

En pgAdmin, conecta el servidor con:
- Host: `postgres` · Puerto: `5432` · BD: `ppf` · Usuario: `ppf` · Password: `ppf123`

---

## Flujo de trabajo (cambios en el código)

```bash
# 1. Haz cambios en local
# 2. Sube al repo
git add .
git commit -m "descripción del cambio"
git push

# 3. En el MASTER
cd /home/ec2-user/partido-app
git pull
./deploy.sh

# 4. Si hay cambios en imágenes, reimportar también en el WORKER
ssh -i k3.pem ec2-user@<WORKER_IP>
cd /home/ec2-user/partido-app
git pull
sudo docker build -t ppf-backend:latest  backend/
sudo docker build -t ppf-frontend:latest frontend/
sudo docker build -t ppf-admin:latest    admin/
sudo docker save ppf-backend:latest  | sudo k3s ctr images import -
sudo docker save ppf-frontend:latest | sudo k3s ctr images import -
sudo docker save ppf-admin:latest    | sudo k3s ctr images import -
```

---

## Aplicaciones

### Web pública PPF (`/`)
Web del Partido por el Futuro orientada a las **elecciones generales de mayo 2027**.
- Hero con contador animado de afiliados
- Programa electoral por áreas (tabs interactivos)
- Noticias y agenda de actos
- Encuesta interactiva con resultados en tiempo real
- Formulario de afiliación (guarda en PostgreSQL)
- Suscripción a newsletter

### Panel de administración (`/admin`)
Dashboard privado con login JWT para gestionar:
- Listado y búsqueda de afiliados
- Baja de afiliados
- Suscriptores de newsletter
- Distribución geográfica por provincias (gráfico de barras)
- Contador de días para las elecciones

### API Backend (`/api`)
Node.js + Express + PostgreSQL. Endpoints:

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/affiliates` | Registrar afiliado |
| `GET` | `/api/affiliates/count` | Contador total |
| `POST` | `/api/newsletter` | Suscripción newsletter |
| `GET` | `/api/news` | Noticias |
| `GET` | `/api/events` | Agenda de actos |

### pgAdmin (`http://<IP>:30081`)
Gestión visual de PostgreSQL. Tablas disponibles: `affiliates`, `newsletter`.

---

## Seguridad — Trend Vision One Container Security

Protección activa sobre el clúster con **6/6 features** y **un agente scout por nodo**:

| Feature | Descripción |
|---------|-------------|
| Runtime Security | Detección de comportamiento anómalo en contenedores |
| Vulnerability Scanning | Escaneo de vulnerabilidades en imágenes |
| Malware Scanning | Detección de malware en tiempo real |
| Secret Scanning | Detección de secretos expuestos en contenedores |
| File Integrity Monitoring | Monitorización de cambios en ficheros críticos |
| Audit Log Collection | Recolección de logs de auditoría de Kubernetes |

---

## Notas importantes

- El entorno es **volátil** — se destruye cada ~6 horas. Usa CloudFormation para levantarlo de nuevo.
- El **Bootstrap Token de Vision One caduca** — genera uno nuevo en cada despliegue desde Vision One → Container Security → K8WebPolitica → Edit → Regenerate token.
- El repo es **público** — no subas tokens ni credenciales reales.
- El token del clúster k3s (`K3sToken`) es estático y está en la plantilla CloudFormation — no es un secreto crítico ya que solo permite unir nodos dentro de la misma VPC.
