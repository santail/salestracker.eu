
locals {
    base_repository_names = [
        "ecs-bootstrap",
        "public-portal-api",
        "public-portal-frontend"
    ]
}

resource "aws_ecr_repository" "this" {
  for_each = toset(local.base_repository_names)

  name                = each.value
  force_delete        = true

  image_tag_mutability = "MUTABLE"
}

resource "aws_ecs_cluster" "salestracker-stage" {
  name = "salestracker"
}
