import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

// Configuration
const config = new pulumi.Config();
const image = config.require("image"); // e.g., anicu/vestwise:2026.02.02-abc123f
const apiImage = config.require("apiImage"); // e.g., anicu/vestwise-api:2026.02.02-abc123f
const replicas = config.getNumber("replicas") || 2;
const host = config.get("host") || "vestwise.co.uk";
const kubeconfigContext = config.get("kubeconfigContext") || "kubernetes-admin@kubernetes";
const imagePullPolicy = config.get("imagePullPolicy") || "Always"; // Use "Never" or "IfNotPresent" for local
const namespaceName = config.get("namespace") || "vestwise"; // e.g., vestwise-dev, vestwise-prod

// Secrets (encrypted in Pulumi config)
const pgPassword = config.requireSecret("pgPassword");
const supabaseUrl = config.requireSecret("supabaseUrl");
const supabaseAnonKey = config.requireSecret("supabaseAnonKey");
const supabaseJwtSecret = config.requireSecret("supabaseJwtSecret");

// Create Kubernetes provider using local kubeconfig
const k8sProvider = new k8s.Provider("k8s-provider", {
    context: kubeconfigContext,
    enableServerSideApply: true,
});

// Create namespace
const namespace = new k8s.core.v1.Namespace("vestwise-namespace", {
    metadata: {
        name: namespaceName,
    },
}, { provider: k8sProvider });

// ============================================
// PostgreSQL Database
// ============================================

// PostgreSQL credentials secret
const postgresSecret = new k8s.core.v1.Secret("postgres-secret", {
    metadata: {
        name: "postgres-credentials",
        namespace: namespaceName,
    },
    type: "Opaque",
    stringData: {
        "POSTGRES_USER": "vestwise",
        "POSTGRES_PASSWORD": pgPassword,
        "POSTGRES_DB": "vestwise",
    },
}, { provider: k8sProvider, dependsOn: [namespace] });

// PostgreSQL init SQL ConfigMap
const postgresInitConfigMap = new k8s.core.v1.ConfigMap("postgres-init-configmap", {
    metadata: {
        name: "postgres-init",
        namespace: namespaceName,
    },
    data: {
        "init.sql": `
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    config_type VARCHAR(50) NOT NULL CHECK (config_type IN ('rsu', 'pension')),
    name VARCHAR(255),
    config_data JSONB NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_configs_user_id ON user_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_configs_type ON user_configs(user_id, config_type);
`,
    },
}, { provider: k8sProvider, dependsOn: [namespace] });

// PostgreSQL PersistentVolume (hostPath for single-node) - unique per namespace
const postgresPV = new k8s.core.v1.PersistentVolume("postgres-pv", {
    metadata: {
        name: `${namespaceName}-postgres-pv`,
        labels: { type: "local", app: "postgres", namespace: namespaceName },
    },
    spec: {
        storageClassName: `${namespaceName}-manual`,
        capacity: { storage: "2Gi" },
        accessModes: ["ReadWriteOnce"],
        hostPath: { path: `/data/${namespaceName}-postgres` },
        persistentVolumeReclaimPolicy: "Retain",
    },
}, { provider: k8sProvider });

// PostgreSQL PersistentVolumeClaim
const postgresPVC = new k8s.core.v1.PersistentVolumeClaim("postgres-pvc", {
    metadata: {
        name: "postgres-data",
        namespace: namespaceName,
    },
    spec: {
        storageClassName: `${namespaceName}-manual`,
        accessModes: ["ReadWriteOnce"],
        resources: {
            requests: { storage: "2Gi" },
        },
        selector: {
            matchLabels: { type: "local", app: "postgres", namespace: namespaceName },
        },
    },
}, { provider: k8sProvider, dependsOn: [namespace, postgresPV] });

// PostgreSQL StatefulSet
const postgresStatefulSet = new k8s.apps.v1.StatefulSet("postgres-statefulset", {
    metadata: {
        name: "postgres",
        namespace: namespaceName,
    },
    spec: {
        serviceName: "postgres",
        replicas: 1,
        selector: {
            matchLabels: { app: "postgres" },
        },
        template: {
            metadata: {
                labels: { app: "postgres" },
            },
            spec: {
                containers: [{
                    name: "postgres",
                    image: "postgres:16-alpine",
                    ports: [{ containerPort: 5432 }],
                    envFrom: [{
                        secretRef: { name: "postgres-credentials" },
                    }],
                    volumeMounts: [
                        {
                            name: "postgres-data",
                            mountPath: "/var/lib/postgresql/data",
                        },
                        {
                            name: "init-scripts",
                            mountPath: "/docker-entrypoint-initdb.d",
                        },
                    ],
                    resources: {
                        requests: { memory: "128Mi", cpu: "100m" },
                        limits: { memory: "256Mi", cpu: "200m" },
                    },
                    livenessProbe: {
                        exec: { command: ["pg_isready", "-U", "vestwise"] },
                        initialDelaySeconds: 30,
                        periodSeconds: 10,
                    },
                    readinessProbe: {
                        exec: { command: ["pg_isready", "-U", "vestwise"] },
                        initialDelaySeconds: 5,
                        periodSeconds: 5,
                    },
                }],
                volumes: [
                    {
                        name: "postgres-data",
                        persistentVolumeClaim: { claimName: "postgres-data" },
                    },
                    {
                        name: "init-scripts",
                        configMap: { name: "postgres-init" },
                    },
                ],
            },
        },
    },
}, { provider: k8sProvider, dependsOn: [namespace, postgresSecret, postgresPVC, postgresInitConfigMap] });

// PostgreSQL Service
const postgresService = new k8s.core.v1.Service("postgres-service", {
    metadata: {
        name: "postgres",
        namespace: namespaceName,
    },
    spec: {
        type: "ClusterIP",
        selector: { app: "postgres" },
        ports: [{
            port: 5432,
            targetPort: 5432,
        }],
    },
}, { provider: k8sProvider, dependsOn: [namespace] });

// PostgreSQL Backup CronJob
const postgresBackupCronJob = new k8s.batch.v1.CronJob("postgres-backup-cronjob", {
    metadata: {
        name: "postgres-backup",
        namespace: namespaceName,
    },
    spec: {
        schedule: "0 2 * * *", // Daily at 2 AM
        jobTemplate: {
            spec: {
                template: {
                    spec: {
                        restartPolicy: "OnFailure",
                        containers: [{
                            name: "backup",
                            image: "postgres:16-alpine",
                            command: ["/bin/sh", "-c"],
                            args: [
                                `pg_dump -h postgres -U vestwise -d vestwise > /backups/vestwise-$(date +%Y%m%d-%H%M%S).sql && find /backups -name "vestwise-*.sql" -mtime +7 -delete`,
                            ],
                            env: [{
                                name: "PGPASSWORD",
                                valueFrom: {
                                    secretKeyRef: { name: "postgres-credentials", key: "POSTGRES_PASSWORD" },
                                },
                            }],
                            volumeMounts: [{
                                name: "backup-volume",
                                mountPath: "/backups",
                            }],
                        }],
                        volumes: [{
                            name: "backup-volume",
                            hostPath: { path: `/data/${namespaceName}-backups`, type: "DirectoryOrCreate" },
                        }],
                    },
                },
            },
        },
    },
}, { provider: k8sProvider, dependsOn: [namespace, postgresService] });

// ============================================
// API Backend
// ============================================

// API credentials secret
const apiSecret = new k8s.core.v1.Secret("api-secret", {
    metadata: {
        name: "api-credentials",
        namespace: namespaceName,
    },
    type: "Opaque",
    stringData: {
        "DATABASE_URL": pulumi.interpolate`postgresql://vestwise:${pgPassword}@postgres:5432/vestwise`,
        "SUPABASE_URL": supabaseUrl,
        "SUPABASE_ANON_KEY": supabaseAnonKey,
        "SUPABASE_JWT_SECRET": supabaseJwtSecret,
    },
}, { provider: k8sProvider, dependsOn: [namespace] });

// API Deployment
const apiDeployment = new k8s.apps.v1.Deployment("api-deployment", {
    metadata: {
        name: "vestwise-api",
        namespace: namespaceName,
        labels: { app: "vestwise-api" },
        annotations: {
            "pulumi.com/patchForce": "true",
        },
    },
    spec: {
        replicas: 2,
        selector: {
            matchLabels: { app: "vestwise-api" },
        },
        template: {
            metadata: {
                labels: { app: "vestwise-api" },
            },
            spec: {
                containers: [{
                    name: "api",
                    image: apiImage,
                    imagePullPolicy: imagePullPolicy,
                    ports: [{ containerPort: 3001 }],
                    envFrom: [{
                        secretRef: { name: "api-credentials" },
                    }],
                    resources: {
                        requests: { memory: "64Mi", cpu: "50m" },
                        limits: { memory: "256Mi", cpu: "200m" },
                    },
                    livenessProbe: {
                        httpGet: { path: "/api/health", port: 3001 },
                        initialDelaySeconds: 15,
                        periodSeconds: 10,
                    },
                    readinessProbe: {
                        httpGet: { path: "/api/health/ready", port: 3001 },
                        initialDelaySeconds: 5,
                        periodSeconds: 5,
                    },
                }],
            },
        },
    },
}, { provider: k8sProvider, dependsOn: [namespace, apiSecret, postgresStatefulSet] });

// API Service
const apiService = new k8s.core.v1.Service("api-service", {
    metadata: {
        name: "vestwise-api",
        namespace: namespaceName,
    },
    spec: {
        type: "ClusterIP",
        selector: { app: "vestwise-api" },
        ports: [{
            port: 3001,
            targetPort: 3001,
        }],
    },
}, { provider: k8sProvider, dependsOn: [namespace] });

// ============================================
// Frontend
// ============================================

// Create vestwise deployment
const deployment = new k8s.apps.v1.Deployment("vestwise-deployment", {
    metadata: {
        name: "vestwise",
        namespace: namespaceName,
        labels: { app: "vestwise" },
        annotations: {
            "pulumi.com/patchForce": "true",
        },
    },
    spec: {
        replicas: replicas,
        selector: {
            matchLabels: { app: "vestwise" },
        },
        template: {
            metadata: {
                labels: { app: "vestwise" },
            },
            spec: {
                containers: [{
                    name: "vestwise",
                    image: image,
                    imagePullPolicy: imagePullPolicy,
                    ports: [{ containerPort: 80 }],
                    resources: {
                        requests: {
                            memory: "64Mi",
                            cpu: "50m",
                        },
                        limits: {
                            memory: "128Mi",
                            cpu: "100m",
                        },
                    },
                    livenessProbe: {
                        httpGet: {
                            path: "/",
                            port: 80,
                        },
                        initialDelaySeconds: 10,
                        periodSeconds: 10,
                    },
                    readinessProbe: {
                        httpGet: {
                            path: "/",
                            port: 80,
                        },
                        initialDelaySeconds: 5,
                        periodSeconds: 5,
                    },
                }],
            },
        },
    },
}, { provider: k8sProvider, dependsOn: [namespace] });

// Create vestwise service
const service = new k8s.core.v1.Service("vestwise-service", {
    metadata: {
        name: "vestwise",
        namespace: namespaceName,
    },
    spec: {
        type: "ClusterIP",
        selector: { app: "vestwise" },
        ports: [{
            port: 80,
            targetPort: 80,
        }],
    },
}, { provider: k8sProvider, dependsOn: [namespace] });

// Create vestwise ingress with TLS - unique secret name per namespace
const ingress = new k8s.networking.v1.Ingress("vestwise-ingress", {
    metadata: {
        name: "vestwise",
        namespace: namespaceName,
        annotations: {
            "cert-manager.io/cluster-issuer": "letsencrypt-prod",
        },
    },
    spec: {
        ingressClassName: "nginx",
        tls: [{
            hosts: [host],
            secretName: `${namespaceName}-tls`,
        }],
        rules: [{
            host: host,
            http: {
                paths: [
                    {
                        path: "/api",
                        pathType: "Prefix",
                        backend: {
                            service: {
                                name: "vestwise-api",
                                port: { number: 3001 },
                            },
                        },
                    },
                    {
                        path: "/",
                        pathType: "Prefix",
                        backend: {
                            service: {
                                name: "vestwise",
                                port: { number: 80 },
                            },
                        },
                    },
                ],
            },
        }],
    },
}, { provider: k8sProvider, dependsOn: [namespace, service, apiService] });

// Exports
export const k8sNamespace = namespace.metadata.name;
export const k8sDeployment = deployment.metadata.name;
export const k8sApiDeployment = apiDeployment.metadata.name;
export const k8sImage = image;
export const k8sApiImage = apiImage;
export const k8sReplicas = replicas;
export const k8sIngressHost = host;
export const k8sUrl = `https://${host}`;
export const k8sApiUrl = `https://${host}/api`;
