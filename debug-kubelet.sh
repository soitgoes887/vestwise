#!/bin/bash

echo "=== Kubelet Connectivity Debug ==="
echo ""

echo "1. Node IPs (InternalIP vs ExternalIP):"
kubectl get nodes -o wide
echo ""

echo "2. Node addresses in detail:"
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{range .status.addresses[*]}  {.type}: {.address}{"\n"}{end}{"\n"}{end}'
echo ""

echo "3. Check if port 10250 is listening on this node:"
echo "   Run on each worker node: ss -tlnp | grep 10250"
echo ""

echo "4. Test connectivity from control plane to worker kubelet:"
# Get worker node IPs
WORKER_IPS=$(kubectl get nodes -o jsonpath='{.items[*].status.addresses[?(@.type=="InternalIP")].address}')
echo "Worker IPs (internal): $WORKER_IPS"
echo ""

echo "5. Kubelet config (check --node-ip if set):"
echo "   Run on worker: cat /var/lib/kubelet/kubeadm-flags.env"
echo ""

echo "6. Firewall status on worker nodes:"
echo "   Run on each worker:"
echo "   - ufw status (Ubuntu)"
echo "   - iptables -L -n | grep 10250"
echo "   - firewall-cmd --list-all (if firewalld)"
echo ""

echo "7. Quick fix - open port 10250 on workers:"
echo "   ufw allow 10250/tcp"
echo "   # or"
echo "   iptables -A INPUT -p tcp --dport 10250 -j ACCEPT"
echo ""

echo "=== Commands to run ON THE WORKER NODE (91.98.32.186) ==="
echo ""
echo "# Check kubelet is listening:"
echo "ss -tlnp | grep 10250"
echo ""
echo "# Check firewall:"
echo "ufw status"
echo "iptables -L INPUT -n | head -20"
echo ""
echo "# Open port if needed:"
echo "ufw allow 10250/tcp"
echo ""
