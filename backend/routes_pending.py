from fastapi import APIRouter, Depends, HTTPException

from auth import current_user

router = APIRouter(prefix="/api")

# Phase 2 endpoints (payments, vouches, Telegram, support, reviews, sellers) are not migrated yet.
# Read-only lists return empty data so pages render; actions return 501.
EMPTY_LISTS = ["/reviews", "/reviews/eligible", "/support", "/mails", "/user/crypto-addresses",
               "/worker/orders", "/worker/card-bases", "/admin/support",
               "/admin/reviews", "/admin/deposits", "/admin/seller-applications", "/admin/telegram-drops",
               "/admin/verifications", "/admin/sellers", "/admin/logs", "/admin/profits"]
EMPTY_OBJECTS = {"/verification/me": None, "/seller/me": None, "/vouches/status": None,
                 "/checker/config": {"enabled": False}, "/payments/crypto/currencies": {"currencies": []}, "/admin/smtp": {}}


def _list_route(path):
    async def handler(_: dict = Depends(current_user)):
        return []
    router.add_api_route(path, handler, methods=["GET"])


def _obj_route(path, value):
    async def handler(_: dict = Depends(current_user)):
        return value
    router.add_api_route(path, handler, methods=["GET"])


for p in EMPTY_LISTS:
    _list_route(p)
for p, v in EMPTY_OBJECTS.items():
    _obj_route(p, v)


@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def not_migrated(path: str):
    raise HTTPException(501, "This feature is coming soon.")
