import hashlib
import os
import secrets
from datetime import timedelta

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel

from db import db, find_one, insert, now, update

router = APIRouter(prefix="/api")
JWT_ALGORITHM = "HS256"
COOKIE = "access_token"
MIN_PASSWORD_LENGTH = 12


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except ValueError:
        return False


def public_user(user: dict) -> dict:
    return {k: v for k, v in user.items() if k not in ("password", "loginCode", "_id")}


def set_session(response: Response, user: dict, remember: bool = False):
    days = 30 if remember else 7
    token = jwt.encode(
        {"sub": str(user["id"]), "exp": now() + timedelta(days=days), "type": "access"},
        os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM,
    )
    response.set_cookie(COOKIE, token, httponly=True, secure=True, samesite="lax",
                        max_age=days * 86400, path="/")


async def optional_user(request: Request) -> dict | None:
    token = request.cookies.get(COOKIE)
    if not token:
        return None
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
    except jwt.InvalidTokenError:
        return None
    if payload.get("type") != "access":
        return None
    user = await find_one("users", {"id": int(payload["sub"])})
    if not user or user.get("isBanned"):
        return None
    return user


async def current_user(request: Request) -> dict:
    user = await optional_user(request)
    if not user:
        raise HTTPException(401, "Unauthorized")
    return user


async def admin_user(user: dict = Depends(current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(401, "Unauthorized")
    return user


async def staff_user(user: dict = Depends(current_user)) -> dict:
    if user.get("role") != "admin" and not user.get("isWorker"):
        raise HTTPException(401, "Unauthorized")
    return user


class LoginBody(BaseModel):
    email: str = ""
    password: str = ""
    rememberMe: bool = False


class RegisterBody(BaseModel):
    email: str = ""
    password: str = ""
    agreedToTerms: bool = False


async def check_lockout(identifier: str):
    doc = await db.login_attempts.find_one({"identifier": identifier})
    if not doc or not doc.get("lockedUntil"):
        return
    if doc["lockedUntil"] > now():
        raise HTTPException(429, "Too many login attempts. Try again in 15 minutes.")
    await db.login_attempts.delete_one({"identifier": identifier})


async def record_failure(identifier: str, limit: int = 5):
    doc = await db.login_attempts.find_one_and_update(
        {"identifier": identifier}, {"$inc": {"count": 1}}, upsert=True, return_document=True
    )
    if doc and doc.get("count", 0) >= limit:
        await db.login_attempts.update_one(
            {"identifier": identifier}, {"$set": {"lockedUntil": now() + timedelta(minutes=15)}}
        )


@router.post("/login")
async def login(body: LoginBody, request: Request, response: Response):
    email = body.email.strip().lower()
    forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    identifier = f"{forwarded or (request.client.host if request.client else 'unknown')}:{email}"
    email_key = f"email:{email}"
    await check_lockout(identifier)
    await check_lockout(email_key)
    user = await find_one("users", {"email": email})
    if not user or user.get("isBanned") or not verify_password(body.password, user.get("password", "")):
        await record_failure(identifier)
        await record_failure(email_key, limit=10)
        raise HTTPException(401, "Invalid email or password")
    await db.login_attempts.delete_many({"identifier": {"$in": [identifier, email_key]}})
    set_session(response, user, body.rememberMe)
    return public_user(user)


@router.post("/register", status_code=201)
async def register(body: RegisterBody, response: Response):
    email = body.email.strip().lower()
    if "@" not in email:
        raise HTTPException(400, "Valid email required")
    if not body.agreedToTerms:
        raise HTTPException(400, "You must accept the Terms of Service and Privacy Policy")
    if len(body.password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(400, f"Password must be at least {MIN_PASSWORD_LENGTH} characters")
    if await find_one("users", {"email": email}):
        raise HTTPException(400, "Unable to create account with these details")
    user = await insert("users", new_user_doc(email, body.password))
    set_session(response, user)
    return public_user(user)


def new_user_doc(email: str, password: str, role: str = "user") -> dict:
    return {
        "username": "anon-" + secrets.token_hex(4), "email": email, "password": hash_password(password),
        "loginCode": "", "telegramUsername": "", "role": role, "isBanned": False, "isWorker": False,
        "termsAcceptedAt": now(), "balance": 0, "protectedBalance": 0, "lastDailySpin": None,
    }


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(COOKIE, path="/")
    return {"ok": True}


@router.get("/user")
async def get_user(user: dict = Depends(current_user)):
    return public_user(user)


class ForgotBody(BaseModel):
    email: str = ""


class ResetBody(BaseModel):
    token: str = ""
    password: str = ""


@router.post("/password/forgot")
async def forgot_password(body: ForgotBody):
    user = await find_one("users", {"email": body.email.strip().lower()})
    if user:
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "tokenHash": hashlib.sha256(token.encode()).hexdigest(), "userId": user["id"],
            "expiresAt": now() + timedelta(hours=1), "usedAt": None,
        })
        base = os.environ.get("FRONTEND_URL", "")
        print(f"[auth] password reset link for user {user['id']}: {base}/reset-password?token={token}")
    return {"message": "If an account exists for that email, a reset link has been sent."}


@router.post("/password/reset")
async def reset_password(body: ResetBody):
    if len(body.password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(400, f"Password must be at least {MIN_PASSWORD_LENGTH} characters")
    token_hash = hashlib.sha256(body.token.encode()).hexdigest()
    doc = await db.password_reset_tokens.find_one_and_update(
        {"tokenHash": token_hash, "usedAt": None, "expiresAt": {"$gt": now()}}, {"$set": {"usedAt": now()}}
    )
    if not doc:
        raise HTTPException(400, "This reset link is invalid or has expired")
    await update("users", {"id": doc["userId"]}, {"password": hash_password(body.password)})
    return {"message": "Password updated. You can now log in."}


async def seed_admin():
    email = os.environ["ADMIN_EMAIL"].strip().lower()
    password = os.environ["ADMIN_PASSWORD"]
    existing = await find_one("users", {"email": email})
    if not existing:
        await insert("users", new_user_doc(email, password, role="admin"))
    elif not verify_password(password, existing.get("password", "")) or existing.get("role") != "admin":
        await update("users", {"email": email}, {"password": hash_password(password), "role": "admin"})
