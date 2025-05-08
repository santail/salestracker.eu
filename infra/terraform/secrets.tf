# Database credentials secret
resource "aws_secretsmanager_secret" "db_credentials" {
  name = "${var.project_name}/db-credentials"
  description = "Database credentials for ${var.project_name}"
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password
    dbname   = "salestracker"
  })
}

# API keys and other sensitive configuration
resource "aws_secretsmanager_secret" "app_config" {
  name = "${var.project_name}/app-config"
  description = "Application configuration for ${var.project_name}"
}
