# Vision One Container Security — Instalación manual

Ejecutar tras levantar el entorno desde CloudFormation y conectarse por SSH.

## Requisito previo

Generar un nuevo **Bootstrap Token** en:
> Vision One → Cloud Security → Container Security → K8WebPolitica → Edit → Regenerate token

## Comando

```bash
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

cat > /home/ec2-user/overrides.yaml << 'EOF'
visionOne:
  bootstrapToken: PEGA_AQUI_EL_TOKEN
  endpoint: https://api.eu.xdr.trendmicro.com/external/v2/direct/vcs/external/vcs
  exclusion:
    namespaces: [kube-system]
  runtimeSecurity:
    enabled: true
  vulnerabilityScanning:
    enabled: true
  malwareScanning:
    enabled: true
  secretScanning:
    enabled: true
  fileIntegrityMonitoring:
    enabled: true
auditLogCollection:
  enabled: true
  provider: selfManaged
EOF

helm install trendmicro \
  --namespace trendmicro-system --create-namespace \
  --values /home/ec2-user/overrides.yaml \
  https://github.com/trendmicro/visionone-container-security-helm/archive/main.tar.gz
```

## Verificar que está activo

```bash
kubectl get pods -n trendmicro-system
```

Todos los pods deben estar en `Running` y `READY`.
