#!/bin/bash
set -Eeuo pipefail

REPO_DIR=/home/ubuntu/partido-app
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
export KUBECONFIG="${KUBECONFIG}"

echo "==> Verificando entorno..."
if [[ ! -d "$REPO_DIR" ]]; then
  echo "ERROR: No existe $REPO_DIR"
  exit 1
fi

echo "==> Instalando Docker..."
sudo apt-get update
sudo apt-get install -y docker.io
sudo systemctl enable --now docker

echo "==> Construyendo imágenes..."
sudo docker build -t ppf-backend:latest     "$REPO_DIR/backend"
sudo docker build -t ppf-frontend:latest    "$REPO_DIR/frontend"
sudo docker build -t ppf-admin:latest       "$REPO_DIR/admin"
sudo docker build -t ppf-ai-backend:latest  "$REPO_DIR/ai-backend"
sudo docker build -t ppf-ai-frontend:latest "$REPO_DIR/ai-frontend"

echo "==> Importando imágenes en k3s..."
sudo docker save ppf-backend:latest     | sudo k3s ctr images import -
sudo docker save ppf-frontend:latest    | sudo k3s ctr images import -
sudo docker save ppf-admin:latest       | sudo k3s ctr images import -
sudo docker save ppf-ai-backend:latest  | sudo k3s ctr images import -
sudo docker save ppf-ai-frontend:latest | sudo k3s ctr images import -

echo "==> Instalando Helm si no existe..."
if ! command -v helm >/dev/null 2>&1; then
  curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
fi

echo "==> Configurando Nginx Ingress Controller..."
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx --force-update
helm repo update

helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace \
  --set controller.service.type=NodePort \
  --set controller.service.nodePorts.http=30080 \
  --set controller.service.nodePorts.https=30443 \
  --wait --timeout=180s

echo "==> Desplegando aplicación PPF..."
kubectl apply -f "$REPO_DIR/k8s/ppf.yaml"
kubectl apply -f "$REPO_DIR/k8s/admin.yaml"
kubectl apply -f "$REPO_DIR/k8s/pgadmin.yaml"
kubectl apply -f "$REPO_DIR/k8s/ai.yaml"
kubectl apply -f "$REPO_DIR/k8s/ingress.yaml"

echo "==> Esperando deployments..."
kubectl rollout status deployment/ppf-backend -n ppf --timeout=180s
kubectl rollout status deployment/ppf-frontend -n ppf --timeout=180s
kubectl rollout status deployment/ppf-admin -n ppf --timeout=180s
kubectl rollout status deployment/ppf-ai-backend -n ppf --timeout=180s || true
kubectl rollout status deployment/ppf-ai-frontend -n ppf --timeout=180s || true

echo "==> Estado de la aplicación..."
kubectl get pods,svc,ingress -n ppf -o wide
kubectl get pods -n ingress-nginx -o wide

echo "==> Despliegue de la aplicación finalizado."
echo "Trend Micro no se ha modificado."
echo "Comprueba el DNS del NLB y sus target groups en AWS."