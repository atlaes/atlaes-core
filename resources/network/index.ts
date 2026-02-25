    export const vpc = new sst.aws.Vpc('AtlaesVpc');

    // ECS Cluster for backend services
    export const cluster = new sst.aws.Cluster('AtlaesCluster', { vpc });