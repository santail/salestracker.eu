variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "eu-central-1"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "salestracker"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["eu-central-1a", "eu-central-1b"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24"]
}

variable "db_username" {
  description = "Username for RDS database"
  type        = string
  default     = "postgres"
}

variable "db_password" {
  description = "Password for RDS database"
  type        = string
  sensitive   = true
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default = {
    Environment = "production"
    Project     = "salestracker"
  }
}

variable "container_cpu" {
  description = "CPU units for the container"
  type        = number
  default     = 256
}

variable "container_memory" {
  description = "Memory for the container in MB"
  type        = number
  default     = 512
}

variable "scraper_service_cpu" {
  description = "CPU units for the scraper service"
  type        = number
  default     = 512
}

variable "scraper_service_memory" {
  description = "Memory for the scraper service in MB"
  type        = number
  default     = 1024
}

variable "desired_count" {
  description = "Desired number of tasks for each service"
  type        = number
  default     = 1
}

variable "frontend_desired_count" {
  description = "Desired number of tasks for frontend service"
  type        = number
  default     = 2
}

variable "health_check_path" {
  description = "Path for health check"
  type        = string
  default     = "/"
}

variable "health_check_healthy_threshold" {
  description = "Healthy threshold for health check"
  type        = number
  default     = 2
}

variable "health_check_unhealthy_threshold" {
  description = "Unhealthy threshold for health check"
  type        = number
  default     = 10
}

variable "cloudwatch_alarm_threshold" {
  description = "Threshold for CloudWatch alarms"
  type        = number
  default     = 80
}