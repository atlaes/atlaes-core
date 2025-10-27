#!/bin/bash
# AWS Environment Setup Script
# Source this file to set up AWS environment variables for the Atlaes project

export AWS_PROFILE=atlaes
export AWS_DEFAULT_REGION=eu-central-1
export AWS_REGION=eu-central-1

echo "AWS environment configured:"
echo "  Profile: $AWS_PROFILE"
echo "  Region: $AWS_REGION"
echo ""
echo "You can now run SST commands without specifying the profile manually."
echo "Example: pnpm sst:dev"
