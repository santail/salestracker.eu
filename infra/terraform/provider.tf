terraform {
  required_version = ">= 1.10.1"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "5.92.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "3.6.3"
    }
  }

  backend "s3" {
    bucket  = "salestracker-terraform-state"
    key     = "terraform-state"
    region  = "eu-central-1"
    encrypt = true
  }
}

provider "aws" {
  region = var.aws_region
}
