# Database Backup & Restore Strategy

This document outlines the backup configuration, point-in-time recovery strategy, and the monthly restore drill protocol for the SplitLedger database.

## 1. Automated Daily Backups

We have configured a GitHub Actions workflow (`.github/workflows/db-backup.yml`) that runs a daily cron job at 2:00 AM UTC.
This job uses `pg_dump` to create a custom-format backup (`-F c`) and securely pushes it to an S3 bucket.

**Secrets Required in GitHub:**
- `PROD_DATABASE_URL`: Connection string for production DB.
- `AWS_ACCESS_KEY_ID`: AWS access key for the S3 bucket.
- `AWS_SECRET_ACCESS_KEY`: AWS secret key.
- `AWS_REGION`: Target S3 region.
- `S3_BACKUP_BUCKET`: Target S3 bucket name.

---

## 2. Point-in-Time Recovery (PITR) Configuration

To achieve Point-in-Time Recovery (PITR), logical backups (`pg_dump`) alone are insufficient. We must enable WAL (Write-Ahead Logging) archiving on our Postgres instance.

If hosting on **Supabase** or **AWS RDS**:
- PITR is available as a managed service feature. Ensure it is enabled in your provider dashboard (e.g., Supabase Pro plan provides up to 7 days of PITR; AWS RDS enables it when automated backups are enabled).
- If self-hosting, use [WAL-G](https://github.com/wal-g/wal-g) or [pgBackRest](https://pgbackrest.org/) to archive WAL files to S3 every 60 seconds.

### Steps to Recover (Managed Service):
1. Navigate to the database provider dashboard (RDS/Supabase).
2. Select **Restore to Point in Time**.
3. Specify the exact date, time, and timezone to restore to.
4. The provider will spawn a new database instance recovered to that timestamp.
5. Update your `PROD_DATABASE_URL` environment secret to point to the new instance.

---

## 3. Monthly Restore Drill

To ensure our backups are valid and the recovery procedure is well-understood, a restore drill must be conducted on the **first Tuesday of every month**.

### Restore Drill Procedure:
1. **Download the latest backup:**
   Retrieve the latest `pg_dump` file from the S3 backup bucket.
   ```bash
   aws s3 cp s3://<S3_BACKUP_BUCKET>/db-backups/backup-YYYY-MM-DD.dump .
   ```

2. **Spin up a staging/local database:**
   Start a clean PostgreSQL container locally or spin up a temporary staging database.
   ```bash
   docker run --name pg-drill -e POSTGRES_PASSWORD=drill -p 5432:5432 -d postgres:16-alpine
   ```

3. **Restore the database:**
   Use `pg_restore` to load the custom-format dump into the drill database.
   ```bash
   pg_restore -U postgres -d postgres -h localhost -1 backup-YYYY-MM-DD.dump
   ```

4. **Verify Data Integrity:**
   - Run sample queries against critical tables (e.g., `users`, `expenses`, `groups`).
   - Run the application's E2E tests against this restored database to verify schema and data compatibility.

5. **Document the Drill:**
   Record the time taken to restore, any anomalies found, and verify success in a team log.
