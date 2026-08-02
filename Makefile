.PHONY: dev up down build logs clean status local-images minikube-start minikube-stop

# ============================================
# Minikube + Pulumi Development
# ============================================

# Start minikube and deploy everything
dev: minikube-start local-images deploy
	@echo ""
	@echo "=== Vestwise running on minikube ==="
	@echo ""
	@echo "To access the app:"
	@echo "1. Run 'make tunnel' in another terminal"
	@echo "2. Add to /etc/hosts: 127.0.0.1 vestwise.local"
	@echo "3. Open: https://vestwise.local"

# Start minikube
minikube-start:
	@minikube status > /dev/null 2>&1 || minikube start \
		--driver=docker \
		--cpus=2 \
		--memory=4096 \
		--disk-size=20g
	@minikube addons enable ingress
	@echo "Waiting for ingress controller..."
	@sleep 5
	@kubectl wait --namespace ingress-nginx \
		--for=condition=ready pod \
		--selector=app.kubernetes.io/component=controller \
		--timeout=180s 2>/dev/null || echo "Ingress may still be starting..."

# Stop minikube
minikube-stop:
	minikube stop

# Delete minikube cluster
minikube-delete:
	minikube delete

# Build images INSIDE minikube's docker daemon (auto-detects architecture)
local-images:
	@echo "Building images inside minikube..."
	@eval $$(minikube docker-env) && \
		echo "Building frontend image..." && \
		docker build -f Dockerfile.local -t anicu/vestwise:local .
	@echo "Images built in minikube's docker"

# Deploy with Pulumi (local stack)
deploy:
	@cd infrastructure && \
		pulumi stack select vestwise-local 2>/dev/null || pulumi stack init vestwise-local && \
		pulumi config set image anicu/vestwise:local && \
		pulumi config set imagePullPolicy Never && \
		pulumi config set host vestwise.local && \
		pulumi config set kubeconfigContext minikube && \
		pulumi up --yes

# Create minikube tunnel (run in separate terminal)
tunnel:
	@echo "Add to /etc/hosts: $$(minikube ip) vestwise.local"
	@echo "Starting tunnel (requires sudo)..."
	minikube tunnel

# View logs
logs:
	kubectl logs -n vestwise -l app=vestwise -f

# Check status
status:
	@echo "=== Pods ==="
	@kubectl get pods -n vestwise
	@echo ""
	@echo "=== Services ==="
	@kubectl get svc -n vestwise
	@echo ""
	@echo "=== Ingress ==="
	@kubectl get ingress -n vestwise

# Destroy local deployment
down:
	cd infrastructure && pulumi stack select vestwise-local && pulumi destroy --yes

# Full cleanup
clean: down minikube-stop

# ============================================
# Testing
# ============================================

test:
	yarn test

# ============================================
# Production deployment (via CI/CD)
# ============================================

# Manual deploy to production (usually done via GitHub Actions)
deploy-prod:
	@echo "Production deploys should go through GitHub Actions"
	@echo "Push to main branch to trigger deployment"
