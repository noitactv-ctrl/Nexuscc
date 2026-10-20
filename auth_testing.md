# Auth Testing Playbook (FastAPI + MongoDB, cookie JWT)

1. MongoDB: `mongosh gorillacc --eval 'db.users.findOne({role:"admin"},{password:1,email:1})'`
   - password is a bcrypt hash starting with `$2b$`
   - indexes: users.email (unique), login_attempts.identifier, password_reset_tokens.expiresAt (TTL)
2. API:
   ```
   B=<REACT_APP_BACKEND_URL>
   curl -c c.txt -H "Content-Type: application/json" -H "Origin: $B" -X POST $B/api/login -d '{"email":"admin@gorillacc.at","password":"GorillaAdmin!2026"}'
   curl -b c.txt $B/api/user
   ```
   - login returns the user (no password field) and sets the `access_token` cookie
   - 5 failed logins for the same ip+email -> 429 for 15 minutes
   - mutating requests with a foreign Origin -> 403 "Invalid request origin"
