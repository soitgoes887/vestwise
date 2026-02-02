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
		docker build -f Dockerfile.local -t anicu/vestwise:local . && \
		echo "Building API image..." && \
		docker build -t anicu/vestwise-api:local ./api
	@echo "Images built in minikube's docker"

# Deploy with Pulumi (local stack)
deploy:
	@cd infrastructure && \
		pulumi stack select vestwise-local 2>/dev/null || pulumi stack init vestwise-local && \
		pulumi config set image anicu/vestwise:local && \
		pulumi config set apiImage anicu/vestwise-api:local && \
		pulumi config set imagePullPolicy Never && \
		pulumi config set host vestwise.local && \
		pulumi config set kubeconfigContext minikube && \
		pulumi up --yes

# Copy secrets from dev stack to local stack
copy-secrets:
	@echo "Copying secrets from vestwise-dev to vestwise-local..."
	@cd infrastructure && \
		pulumi stack select vestwise-local 2>/dev/null || pulumi stack init vestwise-local && \
		pulumi config set --secret pgPassword "$$(pulumi config get pgPassword --stack vestwise-dev)" && \
		pulumi config set --secret supabaseUrl "$$(pulumi config get supabaseUrl --stack vestwise-dev)" && \
		pulumi config set --secret supabaseAnonKey "$$(pulumi config get supabaseAnonKey --stack vestwise-dev)" && \
		pulumi config set --secret supabaseJwtSecret "$$(pulumi config get supabaseJwtSecret --stack vestwise-dev)"
	@echo "Done! Secrets copied."

# Create minikube tunnel (run in separate terminal)
tunnel:
	@echo "Add to /etc/hosts: $$(minikube ip) vestwise.local"
	@echo "Starting tunnel (requires sudo)..."
	minikube tunnel

# View logs
logs:
	kubectl logs -n vestwise -l app=vestwise-api -f

logs-frontend:
	kubectl logs -n vestwise -l app=vestwise -f

logs-db:
	kubectl logs -n vestwise -l app=postgres -f

# Database shell
db-shell:
	kubectl exec -n vestwise -it postgres-0 -- psql -U vestwise -d vestwise

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
# Quick local dev (no minikube - just backend)
# ============================================

# Run just postgres locally for frontend dev
postgres-local:
	docker run -d --name vestwise-postgres \
		-e POSTGRES_USER=vestwise \
		-e POSTGRES_PASSWORD=localdev \
		-e POSTGRES_DB=vestwise \
		-p 5432:5432 \
		-v $$(pwd)/init.sql:/docker-entrypoint-initdb.d/init.sql \
		postgres:16-alpine
	@echo "Postgres running on localhost:5432"

postgres-stop:
	docker stop vestwise-postgres && docker rm vestwise-postgres

# ============================================
# Testing
# ============================================

test:
	yarn test

test-api:
	cd api && python -m pytest

# ============================================
# Production deployment (via CI/CD)
# ============================================

# Manual deploy to production (usually done via GitHub Actions)
deploy-prod:
	@echo "Production deploys should go through GitHub Actions"
	@echo "Push to main branch to trigger deployment"
