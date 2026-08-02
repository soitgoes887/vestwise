#!/bin/bash

echo "=== K8s Debug Script ==="
echo ""

echo "1. Current context:"
kubectl config current-context 2>&1
echo ""

echo "2. Available contexts:"
kubectl config get-contexts 2>&1
echo ""

echo "3. Cluster info:"
kubectl cluster-info 2>&1 | head -5
echo ""

echo "4. Pods in vestwise namespace:"
kubectl get pods -n vestwise -o wide 2>&1
echo ""

echo "5. RBAC - Can view logs?"
kubectl auth can-i get pods/log -n vestwise 2>&1
echo ""

echo "6. RBAC - Can exec?"
kubectl auth can-i create pods/exec -n vestwise 2>&1
echo ""


echo "7. Check if metrics-server is blocking (common issue):"
kubectl top pods -n vestwise 2>&1 | head -5
echo ""

echo "=== End Debug ==="
