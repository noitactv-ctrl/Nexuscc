from dotenv import load_dotenv

load_dotenv()

import os  # noqa: E402
from urllib.parse import urlparse  # noqa: E402

from fastapi import FastAPI, Request  # noqa: E402
from fastapi.exceptions import RequestValidationError  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402
from starlette.exceptions import HTTPException as StarletteHTTPException  # noqa: E402

import auth  # noqa: E402
import routes_admin  # noqa: E402
import routes_pending  # noqa: E402
import routes_shop  # noqa: E402
import routes_user  # noqa: E402
from db import create_indexes  # noqa: E402

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=[os.environ["FRONTEND_URL"]], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])


@app.exception_handler(StarletteHTTPException)
async def http_error(_: Request, exc: StarletteHTTPException):
    return JSONResponse({"message": exc.detail}, status_code=exc.status_code)


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    first = exc.errors()[0] if exc.errors() else {}
    return JSONResponse({"message": first.get("msg", "Invalid request")}, status_code=400)


@app.middleware("http")
async def same_origin_guard(request: Request, call_next):
    if request.method in ("POST", "PUT", "PATCH", "DELETE") and request.url.path.startswith("/api"):
        source = request.headers.get("origin") or request.headers.get("referer")
        allowed = {request.headers.get("host", ""), urlparse(os.environ["FRONTEND_URL"]).netloc}
        allowed.update(h.strip() for h in request.headers.get("x-forwarded-host", "").split(",") if h.strip())
        if source and urlparse(source).netloc not in allowed:
            return JSONResponse({"message": "Invalid request origin"}, status_code=403)
    return await call_next(request)


@app.get("/health")
async def health():
    return {"status": "ok"}


for module in (auth, routes_shop, routes_user, routes_admin, routes_pending):
    app.include_router(module.router)


@app.on_event("startup")
async def startup():
    await create_indexes()
    await auth.seed_admin()
