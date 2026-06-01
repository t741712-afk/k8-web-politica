#!/bin/bash
set -e
echo "==> Instalando Docker..."
sudo dnf install -y docker
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user

echo "==> Construyendo imagen backend..."
cd /home/ec2-user/partido-app/backend
sudo docker build -t ppf-backend:latest .

echo "==> Construyendo imagen frontend..."
cd /home/ec2-user/partido-app/frontend
sudo docker build -t ppf-frontend:latest .

echo "==> Importando imágenes en k3s..."
sudo docker save ppf-backend:latest | sudo k3s ctr images import -
sudo docker save ppf-frontend:latest | sudo k3s ctr images import -

echo "==> Desplegando en Kubernetes..."
kubectl apply -f /home/ec2-user/partido-app/k8s/ppf.yaml

echo "==> Esperando pods..."
kubectl rollout status deployment/ppf-backend  -n ppf --timeout=120s
kubectl rollout status deployment/ppf-frontend -n ppf --timeout=120s

echo ""
echo "✅ PPF desplegado correctamente"
echo "🌐 Abre en el navegador: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):30080"
