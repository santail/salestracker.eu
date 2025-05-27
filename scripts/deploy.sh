#!/bin/bash

# Exit on error
set -e

# Load environment variables
if [ -f .env ]; then
    source .env
fi

# Default values
AWS_REGION=${AWS_REGION:-"us-west-2"}
AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID:-""}
ENVIRONMENT=${ENVIRONMENT:-"development"}

# Check required environment variables
if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo "Error: AWS_ACCOUNT_ID is not set"
    exit 1
fi

# Function to build and push Docker image
build_and_push() {
    local service=$1
    local dockerfile=$2
    local tag=${3:-"latest"}

    echo "Building $service..."
    docker build -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/salestracker-$service:$tag \
        -f $dockerfile .

    echo "Pushing $service to ECR..."
    docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/salestracker-$service:$tag
}

# Function to update ECS service
update_service() {
    local service=$1
    local cluster=${2:-"salestracker-cluster"}

    echo "Updating $service service..."
    aws ecs update-service \
        --cluster $cluster \
        --service salestracker-$service \
        --force-new-deployment
}

# Main deployment process
case "$1" in
    "build")
        # Build all services
        build_and_push "public-portal-frontend" "infra/dockerfiles/public-portal-frontend.Dockerfile"
        build_and_push "public-portal-api" "infra/dockerfiles/public-portal-api.Dockerfile"
        build_and_push "scraper-service" "infra/dockerfiles/scraper-service.Dockerfile"
        ;;
    "deploy")
        # Deploy all services
        update_service "public-portal-frontend"
        update_service "public-portal-api"
        update_service "scraper-service"
        ;;
    "build-and-deploy")
        # Build and deploy all services
        $0 build
        $0 deploy
        ;;
    "infrastructure")
        # Apply infrastructure changes
        cd infra/terraform
        terraform init
        terraform plan
        terraform apply -auto-approve
        ;;
    *)
        echo "Usage: $0 {build|deploy|build-and-deploy|infrastructure}"
        exit 1
        ;;
esac

echo "Done!" 