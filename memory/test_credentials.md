# Test Credentials (FastAPI + MongoDB backend)

## Admin (seeded on startup from backend/.env ADMIN_EMAIL / ADMIN_PASSWORD)
- Email: admin@gorillacc.at
- Password: GorillaAdmin!2026
- Role: admin

## Test buyer (created during smoke test; VIP via a $600 redeem code)
- Email: buyer1@example.com
- Password: BuyerPass123!
- Role: user

## Auth endpoints (cookie `access_token`, httpOnly JWT)
- POST /api/register {email,password,agreedToTerms:true}
- POST /api/login {email,password,rememberMe?}
- POST /api/logout
- GET /api/user
- POST /api/password/forgot, POST /api/password/reset {token,password}

Login UI captcha is client-side only (chars are in the captcha SVG <text> nodes); the API does not require it.
