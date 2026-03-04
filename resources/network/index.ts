    export const vpc = new sst.aws.Vpc('AtlaesVpc', { bastion: true });

    // ECS Cluster for backend services
    export const cluster = new sst.aws.Cluster('AtlaesCluster', { vpc });