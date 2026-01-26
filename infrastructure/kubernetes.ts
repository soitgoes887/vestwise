import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

// Configuration
const config = new pulumi.Config();
const image = config.get("image") || "anicu/vestwise:1.3";
const replicas = config.getNumber("replicas") || 2;
const host = config.get("host") || "vestwise.co.uk";
const kubeconfigContext = config.get("kubeconfigContext") || "personal-k8s";

// Create Kubernetes provider using local kubeconfig
const k8sProvider = new k8s.Provider("k8s-provider", {
    context: kubeconfigContext,
    enableServerSideApply: true,
});

// Create vestwise namespace
const namespace = new k8s.core.v1.Namespace("vestwise-namespace", {
    metadata: {
        name: "vestwise",
    },
}, { provider: k8sProvider });

// Create vestwise deployment
const deployment = new k8s.apps.v1.Deployment("vestwise-deployment", {
    metadata: {
        name: "vestwise",
        namespace: "vestwise",
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
                    imagePullPolicy: "IfNotPresent",
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
        namespace: "vestwise",
    },
    spec: {
        type: "NodePort",
        selector: { app: "vestwise" },
        ports: [{
            port: 80,
            targetPort: 80,
            nodePort: 30080,
        }],
    },
}, { provider: k8sProvider, dependsOn: [namespace] });

// Create vestwise ingress
const ingress = new k8s.networking.v1.Ingress("vestwise-ingress", {
    metadata: {
        name: "vestwise",
        namespace: "vestwise",
    },
    spec: {
        ingressClassName: "nginx",
        rules: [{
            host: host,
            http: {
                paths: [{
                    path: "/",
                    pathType: "Prefix",
                    backend: {
                        service: {
                            name: "vestwise",
                            port: { number: 80 },
                        },
                    },
                }],
            },
        }],
    },
}, { provider: k8sProvider, dependsOn: [namespace, service] });

// Exports
export const k8sNamespace = namespace.metadata.name;
export const k8sDeployment = deployment.metadata.name;
export const k8sImage = image;
export const k8sReplicas = replicas;
export const k8sServiceNodePort = 30080;
export const k8sIngressHost = host;
export const k8sUrl = `https://${host}`;
