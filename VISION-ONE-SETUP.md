# Vision One Container Security — Instalación manual

Ejecutar tras levantar el entorno desde CloudFormation y conectarse por SSH.

## Requisito previo

Generar un nuevo **Bootstrap Token** en:
> Vision One → Cloud Security → Container Security → K8WebPolitica → Edit → Regenerate token

## Comando

```bash
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

cat > /home/ubuntu/overrides.yaml << 'EOF'
visionOne:
  bootstrapToken: <TOKEN>
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
  --values /home/ubuntu/overrides.yaml \
  https://github.com/trendmicro/visionone-container-security-helm/archive/main.tar.gz
```

## Verificar que está activo

```bash
kubectl get pods -n trendmicro-system
```

## Borrar instalación

```bash
helm uninstall trendmicro -n trendmicro-system
```

Todos los pods deben estar en `Running` y `READY`.

Una vez levantado, el acceso al Máster es a través del IP-Publica y el puerto 30080 y el PgAdmin el puerto 30081, accesos de administración mediante SSH (puerto 22) y la API de Kubernetes (puerto 6443)

###### Verificar Política - descargar previamente el Eicar ######

kubectl cp /home/ubuntu/eicar.txt ppf/ppf-frontend-5cf9cb87b9-cvcn7:/tmp/eicar.txt && \
kubectl cp /home/ubuntu/eicar.txt ppf/ppf-frontend-5cf9cb87b9-lnphb:/tmp/eicar.txt

kubectl exec -n ppf ppf-frontend-5cf9cb87b9-cvcn7 -- ls -l /tmp/eicar.txt
kubectl exec -n ppf ppf-frontend-5cf9cb87b9-lnphb -- ls -l /tmp/eicar.txt
