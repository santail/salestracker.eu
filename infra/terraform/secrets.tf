# Database credentials secret
resource "aws_secretsmanager_secret" "db-configuration" {
  name                    = "${var.project_name}/db-configuration"
  description             = "Database configuration for ${var.project_name}"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "db-configuration" {
  secret_id = aws_secretsmanager_secret.db-configuration.id
  secret_string = jsonencode({
    username = "postgres"
    password = "${random_password.database_password[0].result}"
    dbname   = "salestracker"
  })
}

resource "random_password" "database_password" {
  count = 1

  length           = 16
  special          = true
  override_special = "_"
}
