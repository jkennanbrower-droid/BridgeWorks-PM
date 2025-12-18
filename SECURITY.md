# Security Guidelines

## Environment Variables

### ⚠️ NEVER COMMIT SECRETS

- **DO NOT** commit `.env.local` or any file containing real credentials
- The `.gitignore` is configured to exclude `.env*` files (except `.env.example`)
- Use `.env.local.template` as a reference for required variables

### Local Development Setup

1. Copy the template:
   ```bash
   cp .env.local.template .env.local
   ```

2. Fill in your actual credentials in `.env.local`

3. Verify `.env.local` is not tracked:
   ```bash
   git status
   # .env.local should NOT appear in the output
   ```

## Secrets Management

### Database Credentials
- Obtain from [Neon Console](https://console.neon.tech/)
- Use pooled connection (`-pooler`) for runtime
- Use direct connection (no `-pooler`) for migrations

### Cloudflare R2
- Obtain from Cloudflare Dashboard > R2 > Manage R2 API Tokens
- Create API tokens with minimal required permissions
- Rotate tokens regularly

### Upload Protection
- Set `R2_UPLOAD_TOKEN` to protect the upload endpoint
- Use a cryptographically random token (at least 32 characters)
- Pass token in `x-upload-token` header when uploading

## Reporting Security Issues

If you discover a security vulnerability, please email the repository owner directly rather than opening a public issue.
