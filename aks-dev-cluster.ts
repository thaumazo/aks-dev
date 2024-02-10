import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";
import * as azuredevops from "@pulumi/azuredevops";

const region="canadacentral";
const 

#registry = azure_native.containerregistry.Registry("registry",
#    admin_user_enabled=True,
#    location= region,
#    registry_name="aks-dev-registry",
#    resource_group_name="myResourceGroup",
#    sku=azure_native.containerregistry.SkuArgs(
#        name="Standard",
#    ),
#    tags={
#        "key": "value",
#    })

// Create an AKS cluster.
const aksCluster = new azure.containerservice.ManagedCluster("aksCluster", {
    // Required arguments
    resourceGroupName: pulumi.interpolate`${azure.core.getResourceGroup().name}`,
	agentPoolProfiles: [{
		count: 3,
		maxPods: 110,
		mode: "System",
		name: `aks-dev`, <-- changing this
		osDiskSizeGB:30,
		osType:"Linux",
		type:"VirtualMachineScaleSets",
		vmSize:"Standard_D4_v3"
	}],
    agentPoolProfiles: [{
        count: 3,
        vmSize: "Standard_DS2_v2",
        osDiskSizeGB: 30,
        mode: "System"
    }],
	networkProfile: {
		networkPlugin: "azure",
		serviceCidr: "10.17.0.0/16",
		dnsServiceIP: "10.17.0.10",
		dockerBridgeCidr: "172.17.0.1/16"
	}
    dnsPrefix: "aks-dev",
    kubernetesVersion: "1.27.10",
    // An example of optional arguments
    linuxProfile: {
        adminUsername: "aks-admin-user",
        ssh: {
            publicKeys: [{ keyData: "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCrCwnWTqwUvoWiwAYCA6FKBN5D4vzVgCaIX7SqWMdsgepjEkJ/0TOj1cA9ReJIRMnXY0yG+kHb3bnILJb44xhmzT+ZCQkE2VDrm6RMkjgRyg3ncv+qDjKSitlC1jja1UQ0FC9dmMw03WzQWYozEBkVz/whVLQvV8N5PR9FE3ElYohh0SHjDuHLdsohgpw0a0XiRFFghN8RFDsBxOy1wERn4FK5H+FcokGvsupZmeWF5xctNZkQM09tX7fQjkgPFFRzCBduKjCOc2l66pGDGaf5O3BLkYwa4HGLTQwz9KkRd0vlywcU2cd7H/oJdGiA2A5cUljzcVE45QEcHgIKZYm1rqeMAt0M7+uaqRV6Tr7eedQilbaWTkdNi7mW/xFonA2INL+7TgDoJbBPaTeIvJwRMjKcm764W4+elWEhc8zoE7cgjvmpDlp9ifRezRF8oK3gcWHxepjuvjyiqJok4X/CW3KAhXHOKw/0nTdqpGIpeu+X58pyOD0O1qVL/zgs9gvGLebrax00qbvAUp96C0uzmE9Ss92GJwmMOw2ZdnG3i/3xQulN75X8+sCf0o2zZ883Yv5Fjqo0iMQchjZ8xhvVWlx3Xs18DrmuTJ3LpIlBPz6RAOzifsLOg1oGBgi9Skkm3p1zl1nuAl9PEi+rEA7p6DPT0i0bYYieGJQAVRM7PQ== ssh-root-key@thaumazo" }],
        },
    },
    enableRBAC: true,
    identity: {
        type: "SystemAssigned",
    },
});

// Create a service connection to AKS for Azure DevOps.
const aksServiceEndpoint = new azuredevops.ServiceEndpointAzureEcr("aksServiceConnection", {
    projectId: "aks-dev", // You need to replace this with your Azure DevOps Project ID
    azurecrName: "aksContainerRegistry-dev", // The name of the container registry
    serviceEndpointName: "AKSServiceConnection-dev", // Name of the service connection
    azurecrSubscriptionId: pulumi.interpolate`${azure.core.getSubscription().subscriptionId}`,
    azurecrSubscriptionName: pulumi.interpolate`${azure.core.getSubscription().displayName}`,
    resourceGroup: pulumi.interpolate`${aksCluster.name}`,
    azurecrSpnTenantid: pulumi.interpolate`${aksCluster.identityProfile.apply(p => p["kubeletidentity"].tenantId)}`,
    description: "Service Connection for AKS",
    authorization: {
        parameters: {
            serviceprincipalid: pulumi.interpolate`${aksCluster.identityProfile.apply(p => p["kubeletidentity"].clientId)}`,
            serviceprincipalkey: pulumi.interpolate`${aksCluster.identityProfile.apply(p => p["kubeletidentity"].objectId)}` // Placeholder for secret
        },
        scheme: "ServicePrincipal",
    },
});

// The outputs will provide information that can be used to configure CD pipelines in Azure DevOps.
export const aksClusterName = aksCluster.name;
export const aksServiceEndpointName = aksServiceEndpoint.serviceEndpointName;

