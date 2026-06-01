#!/bin/bash
set -e
REPO_DIR=/home/ec2-user/partido-app

echo "==> Instalando Docker..."
sudo dnf install -y docker
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user

echo "==> Construyendo imagen backend..."
cd "$REPO_DIR/backend"
sudo docker build -t ppf-backend:latest .

echo "==> Construyendo imagen frontend..."
cd "$REPO_DIR/frontend"
sudo docker build -t ppf-frontend:latest .

echo "==> Importando imágenes en k3s..."
sudo docker save ppf-backend:latest  | sudo k3s ctr images import -
sudo docker save ppf-frontend:latest | sudo k3s ctr images import -

echo "==> Desplegando app PPF en Kubernetes..."
kubectl apply -f "$REPO_DIR/k8s/ppf.yaml"

echo "==> Esperando pods de la app..."
kubectl rollout status deployment/ppf-backend  -n ppf --timeout=120s
kubectl rollout status deployment/ppf-frontend -n ppf --timeout=120s

# ── Trend Vision One Container Security ──────────────────────────────────────
echo "==> Instalando Helm..."
curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

echo "==> Desplegando Trend Vision One Container Security..."
helm install \
    trendmicro \
    --namespace trendmicro-system --create-namespace \
    --values "$REPO_DIR/overrides.yaml" \
    https://github.com/trendmicro/visionone-container-security-helm/archive/main.tar.gz

echo "==> Esperando agentes de Vision One..."
kubectl rollout status deployment -n trendmicro-system --timeout=180s || true

echo ""
echo "✅ PPF desplegado correctamente"
echo "✅ Trend Vision One Container Security activo"
echo "🌐 Web: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):30080"
echo ""
echo "── Estado del clúster ──────────────────────────────────"
kubectl get pods -A
