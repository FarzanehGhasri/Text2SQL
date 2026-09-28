-- Audit log written by the n8n "Microsoft SQL" node after every successful answer
-- (columns: username, question, generated_sql, understood_query, thinking, attempt,
-- status, row_count). It does not exist on the new SA_DataWarehouse server.
--
-- Why a separate login: the query login runs SQL written by the model. Keep it
-- strictly read-only (db_datareader) so that even a query that slipped past the
-- Security node cannot write anything. Give INSERT on this one table to a second
-- login and select that login's credential on the n8n "Microsoft SQL" node only.
--
-- Until this is set up the audit node fails on every run. That is harmless for
-- users (the node is set to continue on error and the answer has already been
-- sent), but nothing is audited. Run as a DBA; replace the placeholders.

-- 1) Table - in SA_DataWarehouse or a small separate database of your choice.
USE [SA_DataWarehouse];
GO
IF OBJECT_ID(N'[dbo].[NLSQL_AuditLog]', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[NLSQL_AuditLog] (
    [id]               BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_NLSQL_AuditLog] PRIMARY KEY,
    [created_at]       DATETIME2(0)   NOT NULL CONSTRAINT [DF_NLSQL_AuditLog_created_at] DEFAULT (SYSDATETIME()),
    [username]         NVARCHAR(256)  NULL,
    [question]         NVARCHAR(MAX)  NULL,
    [generated_sql]    NVARCHAR(MAX)  NULL,
    [understood_query] NVARCHAR(MAX)  NULL,
    [thinking]         NVARCHAR(MAX)  NULL,
    [attempt]          INT            NULL,
    [status]           NVARCHAR(32)   NULL,
    [row_count]        INT            NULL
  );
END
GO

-- 2) Write-only audit login: INSERT on this table and nothing else.
-- CREATE LOGIN [nlsql_audit] WITH PASSWORD = N'<strong password>';
-- CREATE USER  [nlsql_audit] FOR LOGIN [nlsql_audit];
-- GRANT INSERT ON [dbo].[NLSQL_AuditLog] TO [nlsql_audit];
-- GO

-- 3) In n8n: create a new "Microsoft SQL" credential for nlsql_audit and select it on
--    the "Microsoft SQL" (audit) node only. "execute query" and "Retry: execute query"
--    keep the read-only credential.
