import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

// Configuration
const config = new pulumi.Config();
const image = config.require("image"); // e.g., anicu/vestwise:2026.02.02-abc123f
const replicas = config.getNumber("replicas") || 2;
const host = config.get("host") || "vestwise.co.uk";
const kubeconfigContext = config.get("kubeconfigContext") || "kubernetes-admin@kubernetes";
const imagePullPolicy = config.get("imagePullPolicy") || "Always"; // Use "Never" or "IfNotPresent" for local
const namespaceName = config.get("namespace") || "vestwise"; // e.g., vestwise-dev, vestwise-prod

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
}, { provider: k8sProvider, dependsOn: [namespace, service] });

// Exports
export const k8sNamespace = namespace.metadata.name;
export const k8sDeployment = deployment.metadata.name;
export const k8sImage = image;
export const k8sReplicas = replicas;
export const k8sIngressHost = host;
export const k8sUrl = `https://${host}`;
