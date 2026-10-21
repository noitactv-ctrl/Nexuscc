# Test Credentials

All test data was deleted at the owner's request (2026-06). No test accounts exist.

## Owner / admin
- Email: noitactv@gmail.com (role: admin). The password belongs to the owner and is NOT stored here.
- backend/.env ADMIN_EMAIL=noitactv@gmail.com: on startup and on registration this email is given role "admin".
  No admin password is stored in env.

## For future testing
Create temporary accounts (passwords 12+ chars) via POST /api/register. To get a temporary admin:
`mongosh gorillacc --eval 'db.users.updateOne({email:"<temp>"},{$set:{role:"admin"}})'`
Delete them afterwards (users + their orders/transactions) so production data stays clean.

## Auth endpoints (cookie `access_token`, httpOnly JWT)
POST /api/register {email,password,agreedToTerms:true} · POST /api/login · POST /api/logout · GET /api/user
Login UI captcha is client-side only (chars are in the captcha SVG <text> nodes).
