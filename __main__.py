# Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

import base64

import pulumi
from pulumi_azure_native import resources, containerservice
import pulumi_azuread as azuread
import pulumi_random as random
import pulumi_tls as tls

config = pulumi.Config()

k8sVersion = "1.27"

# Create new resource group
resource_group = resources.ResourceGroup("azure-native-py-aks")

# Create an AD service principal
ad_app = azuread.Application("aks-dev", display_name="aks")
ad_sp = azuread.ServicePrincipal("aks-dev-principal", client_id=ad_app.client_id)

# random.RandomPassword("password", length=20, special=True)

# Create the Service Principal Password
ad_sp_password = azuread.ServicePrincipalPassword("aksSpPassword",
                                                  service_principal_id=ad_sp.id,
                                                  end_date="2099-01-01T00:00:00Z")

# capture AD generated password
password = ad_sp_password.value

# Generate an SSH key
ssh_key = tls.PrivateKey("ssh-key", algorithm="RSA", rsa_bits=4096)

# Create cluster
managed_cluster_name = config.get("managedClusterName")
if managed_cluster_name is None:
    managed_cluster_name = "azure-native-aks"

managed_cluster = containerservice.ManagedCluster(
    managed_cluster_name,
    resource_group_name=resource_group.name,
    agent_pool_profiles=[{
        "count": 2,
        "max_pods": 110,
        "mode": "System",
        "enableNodePublicIP": True,
        "enableFIPS": True,
        "name": "agentpool",
        "node_labels": {},
        "os_disk_size_gb": 30,
        "os_type": "Linux",
        "type": "VirtualMachineScaleSets",
        "vm_size": "Standard_DS2_v2",
    }],
    auto_scaler_profile=containerservice.ManagedClusterPropertiesAutoScalerProfileArgs(
        scale_down_delay_after_add="15m",
        scan_interval="20s",
    ),
    enable_rbac=True,
    enable_pod_security_policy=False,
    kubernetes_version=k8sVersion,
    linux_profile={
        "admin_username": "aks-admin",
        "ssh": {
            "public_keys": [{
                "key_data": ssh_key.public_key_openssh,
            }],
        },
    },
    network_profile=containerservice.ContainerServiceNetworkProfileArgs(
        network_plugin="azure",
        network_policy="azure",
        service_cidr="10.17.0.0/16",
        dns_service_ip="10.17.0.10"
    ),
    tags={
        "archv2": "",
        "tier": "development",
    },
    dns_prefix=resource_group.name,
    node_resource_group=f"MC_azure-native-go_{managed_cluster_name}_canadacentral",
    service_principal_profile={
        "client_id": ad_app.client_id,
        "secret": ad_sp_password.value
    })

creds = containerservice.list_managed_cluster_user_credentials_output(
    resource_group_name=resource_group.name,
    resource_name=managed_cluster.name)

# Export kubeconfig
encoded = creds.kubeconfigs[0].value
kubeconfig = encoded.apply(
    lambda enc: base64.b64decode(enc).decode())
pulumi.export("kubeconfig", kubeconfig)
