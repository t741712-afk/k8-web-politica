# K8WebPolitica — Entorno Kubernetes en AWS

Web ficticia del **Partido por el Futuro (PPF)** desplegada en un clúster k3s sobre AWS EC2, protegida con Trend Vision One Container Security.

---

## Arquitectura

```
CloudFormation
  └── EC2 t3.medium (k3s single-node)
        ├── namespace: ingress-nginx
        │     └── Nginx Ingress Controller (NodePort 30080)
        ├── namespace: ppf
        │     ├── ppf-frontend   → http://<IP>:30080/
        │     ├── ppf-backend    → Node.js API (interno)
        │     ├── ppf-admin      → http://<IP>:30080/admin
        │     ├── postgres       → Base de datos (interno)
        │     └── pgadmin        → http://<IP>:30081/
        └── namespace: trendmicro-system
              └── Vision One Container Security (instalación manual)
```

---

## Estructura del repositorio

```
partido-app/
  frontend/           Web pública PPF (HTML/CSS/JS + Nginx)
    src/
      index.html
      style.css
      app.js
    Dockerfile
    nginx.conf
  backend/            API REST Node.js + PostgreSQL
    server.js
    package.json
    Dockerfile
  admin/              Panel de administración privado
    server.js
    package.json
    src/index.html
    Dockerfile
  k8s/                Manifiestos Kubernetes
    ppf.yaml          Deployments: frontend, backend, postgres
    admin.yaml        Deployment: panel admin
    pgadmin.yaml      Deployment: pgAdmin (NodePort 30081)
    ingress.yaml      Ingress rules (web + admin)
  deploy.sh           Script de despliegue completo
  overrides.yaml      Configuración Vision One (sin token)
  VISION-ONE-SETUP.md Guía instalación Vision One
  k8s-single-node.yaml  Plantilla CloudFormation
```

---

## Despliegue desde cero

### Requisitos
- AWS CLI configurado (`aws configure`)
- Key Pair `k3` creado en AWS us-east-1
- Cuenta GitHub con acceso al repo

---

### Paso 1 — Levantar la infraestructura con CloudFormation

```bash
aws cloudformation deploy \
  --region us-east-1 \
  --stack-name k8s-single-node \
  --template-file k8s-single-node.yaml \
  --parameter-overrides KeyPairName=k3
```

CloudFormation crea automáticamente:
- VPC + Subnet pública + Internet Gateway
- Security Group (puertos 22, 6443, 30080, 30081, 80, 443)
- Instancia EC2 t3.medium con Amazon Linux 2023
- Elastic IP fija

El **user-data** ejecuta automáticamente al arrancar:
1. Instala `git`, `docker`, `k3s`
2. Clona este repositorio
3. Ejecuta `deploy.sh` → construye imágenes, despliega en k3s

**Tiempo total: ~7-10 minutos**

Obtén la IP pública en:
> AWS Console → CloudFormation → k8s-single-node → **Salidas** → PublicIP

---

### Paso 2 — Verificar el despliegue

```bash
ssh -i k3.pem ec2-user@<IP>
kubectl get pods -A
```

---

### Paso 3 — Instalar Trend Vision One Container Security (manual)

1. Genera un nuevo Bootstrap Token en:
   > Vision One → Cloud Security → Container Security → K8WebPolitica → Edit → Regenerate token

2. Sigue las instrucciones en [`VISION-ONE-SETUP.md`](./VISION-ONE-SETUP.md)

---

### Paso 4 — Acceder a las aplicaciones

| URL | Aplicación | Credenciales |
|-----|-----------|--------------|
| `http://<IP>:30080/` | Web pública PPF | — |
| `http://<IP>:30080/admin` | Panel de administración | `admin` / `ppf2027` |
| `http://<IP>:30081/` | pgAdmin | `admin@ppf.es` / `ppf2027` |

---

## Flujo de trabajo (cambios en el código)

```bash
# 1. Haz cambios en local
# 2. Sube al repo
git add .
git commit -m "descripción del cambio"
git push

# 3. En la instancia EC2
cd /home/ec2-user/partido-app
git pull
./deploy.sh
```

---

## Aplicaciones

### Web pública PPF (`/`)
Web del Partido por el Futuro orientada a las **elecciones generales de mayo 2027**.
- Hero con contador de afiliados
- Programa electoral por áreas (tabs)
- Noticias y agenda de actos
- Encuesta interactiva
- Formulario de afiliación
- Suscripción a newsletter

### Panel de administración (`/admin`)
Dashboard privado con login para gestionar:
- Listado y búsqueda de afiliados
- Baja de afiliados
- Suscriptores de newsletter
- Distribución geográfica por provincias
- Contador de días para las elecciones

### API Backend (`/api`)
Node.js + Express + PostgreSQL. Endpoints principales:
- `POST /api/affiliates` — registrar afiliado
- `GET /api/affiliates/count` — contador total
- `POST /api/newsletter` — suscripción
- `GET /api/news` — noticias
- `GET /api/events` — agenda

### pgAdmin (`http://<IP>:30081`)
Gestión visual de PostgreSQL. Conéctate al servidor:
- Host: `postgres`
- Puerto: `5432`
- Base de datos: `ppf`
- Usuario: `ppf` / Contraseña: `ppf123`

---

## Seguridad — Trend Vision One Container Security

Protección activa sobre el clúster k3s con **6/6 features**:

| Feature | Descripción |
|---------|-------------|
| Runtime Security | Detección de comportamiento anómalo en contenedores |
| Vulnerability Scanning | Escaneo de vulnerabilidades en imágenes |
| Malware Scanning | Detección de malware en tiempo real |
| Secret Scanning | Detección de secretos expuestos en contenedores |
| File Integrity Monitoring | Monitorización de cambios en ficheros críticos |
| Audit Log Collection | Recolección de logs de auditoría de Kubernetes |

---

## Notas

- El entorno es **volátil** — se destruye cada ~6 horas. Usa `aws cloudformation deploy` para levantarlo de nuevo.
- El Bootstrap Token de Vision One **caduca** — genera uno nuevo en cada despliegue.
- El repo es **público** — no subas tokens ni credenciales reales.
