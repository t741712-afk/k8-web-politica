#!/bin/bash
set -e
REPO_DIR=/home/ec2-user/partido-app
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

echo "==> Instalando Docker..."
sudo dnf install -y docker
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user

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

echo "==> Instalando Helm..."
curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

echo "==> Instalando Nginx Ingress Controller..."
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace \
  --set controller.service.type=NodePort \
  --set controller.service.nodePorts.http=30080 \
  --set controller.service.nodePorts.https=30443 \
  --wait --timeout=120s

echo "==> Desplegando app PPF..."
kubectl apply -f "$REPO_DIR/k8s/ppf.yaml"
kubectl apply -f "$REPO_DIR/k8s/admin.yaml"
kubectl apply -f "$REPO_DIR/k8s/pgadmin.yaml"
kubectl apply -f "$REPO_DIR/k8s/ai.yaml"
kubectl apply -f "$REPO_DIR/k8s/ingress.yaml"

echo "==> Esperando pods..."
kubectl rollout status deployment/ppf-backend     -n ppf --timeout=120s
kubectl rollout status deployment/ppf-frontend    -n ppf --timeout=120s
kubectl rollout status deployment/ppf-admin       -n ppf --timeout=120s
kubectl rollout status deployment/ppf-ai-backend  -n ppf --timeout=180s || true
kubectl rollout status deployment/ppf-ai-frontend -n ppf --timeout=120s || true

echo "==> Desplegando Trend Vision One Container Security..."
helm upgrade --install trendmicro \
  --namespace trendmicro-system --create-namespace \
  --values "$REPO_DIR/overrides.yaml" \
  https://github.com/trendmicro/visionone-container-security-helm/archive/main.tar.gz

echo ""
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
echo "✅ Despliegue completo"
echo ""
echo "🌐 Web pública:   http://$PUBLIC_IP:30080/"
echo "🔐 Panel admin:   http://$PUBLIC_IP:30080/admin   (admin / ppf2027)"
echo "🗄️  pgAdmin:       http://$PUBLIC_IP:30080/pgadmin (admin@ppf.es / ppf2027)"
echo ""
kubectl get pods -A --field-selector=metadata.namespace!=kube-system
