import json
import re
import secrets
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from auth import MIN_PASSWORD_LENGTH, admin_user, hash_password, public_user, staff_user
from db import db, find, find_one, get_setting, insert, set_setting, update
from routes_shop import PAGE_KEY, add_stock, bases_with_counts, order_with_items, payment_methods, tx

router = APIRouter(prefix="/api/admin")


async def must(collection: str, item_id: int) -> dict:
    doc = await find_one(collection, {"id": item_id})
    if not doc:
        raise HTTPException(404, "Not found")
    return doc


def pick(body: dict, keys: list[str]) -> dict:
    return {k: body[k] for k in keys if k in body}


# ---------- Dashboard ----------
@router.get("/dashboard")
async def dashboard(_: dict = Depends(admin_user)):
    sales = await db.orders.aggregate([{"$match": {"status": {"$in": ["fulfilled", "delivering"]}}}, {"$group": {"_id": None, "t": {"$sum": "$total"}}}]).to_list(1)
    total = int(sales[0]["t"]) if sales else 0
    worth = 0
    for s in await find("stock_items", {"isSold": False, "isReserved": False}):
        v = await find_one("variants", {"id": s["variantId"]})
        worth += v["price"] if v else 0
    return {"totalUsers": await db.users.count_documents({}), "totalSales": total, "totalRevenue": total, "storeBalance": 0,
            "itemsInStock": await db.stock_items.count_documents({"isSold": False, "isReserved": False}),
            "itemsSold": await db.stock_items.count_documents({"isSold": True}),
            "totalOrders": await db.orders.count_documents({}),
            "pendingOrders": await db.orders.count_documents({"status": "waiting_payment"}), "stockWorth": worth}


# ---------- Users ----------
@router.get("/users")
async def users(_: dict = Depends(staff_user)):
    return [public_user(u) for u in await find("users", sort=[("id", 1)])]


@router.get("/users/{uid}/history")
async def user_history(uid: int, _: dict = Depends(admin_user)):
    await must("users", uid)
    orders = await find("orders", {"userId": uid}, sort=[("createdAt", -1)])
    return {"balanceHistory": await find("transactions", {"userId": uid}, sort=[("createdAt", -1)]),
            "orderHistory": orders}


async def guarded_target(uid: int, admin: dict) -> dict:
    target = await must("users", uid)
    if target["id"] == admin["id"]:
        raise HTTPException(403, "Cannot modify your own account")
    return target


@router.patch("/users/{uid}")
async def patch_user(uid: int, body: dict, admin: dict = Depends(admin_user)):
    await guarded_target(uid, admin)
    return public_user(await update("users", {"id": uid}, pick(body, ["isBanned", "role", "email"])))


@router.post("/users/{uid}/ban")
async def ban(uid: int, admin: dict = Depends(admin_user)):
    await guarded_target(uid, admin)
    return public_user(await update("users", {"id": uid}, {"isBanned": True}))


@router.post("/users/{uid}/unban")
async def unban(uid: int, _: dict = Depends(admin_user)):
    return public_user(await update("users", {"id": uid}, {"isBanned": False}))


@router.post("/users/{uid}/balance")
async def adjust_balance(uid: int, body: dict, _: dict = Depends(admin_user)):
    amount = int(body.get("amount") or 0)
    await must("users", uid)
    inc = {"balance": amount, **({"protectedBalance": amount} if amount > 0 else {})}
    await db.users.update_one({"id": uid}, {"$inc": inc})
    await tx(uid, amount, "admin_adjustment", "Admin balance adjustment")
    return public_user(await find_one("users", {"id": uid}))


@router.post("/users/{uid}/set-balance")
async def set_balance(uid: int, body: dict, _: dict = Depends(admin_user)):
    user = await must("users", uid)
    new = round(float(body.get("balance") or 0) * 100)
    if new < 0:
        raise HTTPException(400, "Balance cannot be negative")
    await update("users", {"id": uid}, {"balance": new})
    await tx(uid, new - user.get("balance", 0), "admin_adjustment", f"Admin set balance to ${new / 100:.2f}")
    return public_user(await find_one("users", {"id": uid}))


@router.post("/users/{uid}/set-role")
async def set_role(uid: int, body: dict, admin: dict = Depends(admin_user)):
    if body.get("role") not in ("user", "admin"):
        raise HTTPException(400, "Invalid role")
    await guarded_target(uid, admin)
    return public_user(await update("users", {"id": uid}, {"role": body["role"]}))


@router.post("/users/{uid}/set-worker")
async def set_worker(uid: int, body: dict, _: dict = Depends(admin_user)):
    await must("users", uid)
    return public_user(await update("users", {"id": uid}, {"isWorker": bool(body.get("isWorker"))}))


@router.patch("/users/{uid}/password")
async def set_password(uid: int, body: dict, _: dict = Depends(admin_user)):
    new = str(body.get("newPassword") or "")
    if len(new) < MIN_PASSWORD_LENGTH:
        raise HTTPException(400, f"Password must be at least {MIN_PASSWORD_LENGTH} characters")
    await must("users", uid)
    await update("users", {"id": uid}, {"password": hash_password(new)})
    return {"success": True}


# ---------- Orders ----------
@router.get("/orders")
async def orders(_: dict = Depends(staff_user)):
    out = []
    users_by_id = {u["id"]: u for u in await find("users")}
    for o in await find("orders", sort=[("createdAt", -1)]):
        u = users_by_id.get(o["userId"], {})
        out.append({**(await order_with_items(o)), "paymentMethod": o.get("paymentMethod") or "Wallet",
                    "user": {"id": u.get("id"), "username": u.get("username"), "email": u.get("email"),
                             "telegramUsername": u.get("telegramUsername") or None, "channelName": None}})
    return out


@router.post("/orders/{oid}/deliver")
async def deliver(oid: int, body: dict, _: dict = Depends(admin_user)):
    await must("orders", oid)
    content = json.dumps(body["deliveryContents"]) if isinstance(body.get("deliveryContents"), dict) else body.get("deliveryContent", "")
    return await update("orders", {"id": oid}, {"deliveryContent": content, "status": "fulfilled"})


@router.patch("/orders/{oid}")
async def patch_order(oid: int, body: dict, _: dict = Depends(admin_user)):
    await must("orders", oid)
    return await update("orders", {"id": oid}, pick(body, ["status", "deliveryContent", "paymentNote"]))


@router.post("/orders/{oid}/refund")
async def refund(oid: int, _: dict = Depends(admin_user)):
    await must("orders", oid)
    o = await db.orders.find_one_and_update({"id": oid, "status": {"$ne": "refunded"}}, {"$set": {"status": "refunded"}},
                                            projection={"_id": 0})
    if not o:
        raise HTTPException(400, "Order already refunded")
    if o.get("paidAmount"):
        await db.users.update_one({"id": o["userId"]}, {"$inc": {"balance": o["paidAmount"]}})
        await tx(o["userId"], o["paidAmount"], "refund", f"Refund for order {o['orderId']}", order_id=oid)
    return await find_one("orders", {"id": oid})


@router.post("/orders/{oid}/replace")
async def replace(oid: int, _: dict = Depends(admin_user)):
    o = await must("orders", oid)
    parts = json.loads(o["deliveryContent"]) if (o.get("deliveryContent") or "").startswith("{") else {}
    replaced = 0
    for item in await find("order_items", {"orderId": oid, "itemType": "product"}):
        new = await db.stock_items.find_one_and_update(
            {"variantId": item["variantId"], "isSold": False, "isReserved": False},
            {"$set": {"isSold": True, "orderId": oid, "replacementForId": item.get("stockItemId")}}, projection={"_id": 0})
        if not new:
            raise HTTPException(400, "Not enough stock to replace this order")
        key = str(item["variantId"])
        parts[key] = (parts.get(key, "") + "\n\n[Replacement]\n" + new["content"]).strip()
        replaced += 1
    if not replaced:
        raise HTTPException(400, "Only product orders can be replaced")
    return await update("orders", {"id": oid}, {"deliveryContent": json.dumps(parts), "status": "fulfilled"})


@router.post("/orders/{oid}/mark-unpaid")
async def mark_unpaid(oid: int, _: dict = Depends(admin_user)):
    await must("orders", oid)
    return await update("orders", {"id": oid}, {"status": "waiting_payment", "paidAmount": 0})


# ---------- Products / variants / stock ----------
@router.get("/products")
async def admin_products(_: dict = Depends(staff_user)):
    from routes_shop import list_products
    return await list_products(active_only=False)


@router.patch("/products/{pid}")
async def patch_product(pid: int, body: dict, _: dict = Depends(staff_user)):
    await must("products", pid)
    return await update("products", {"id": pid}, pick(body, ["name", "description", "image", "active", "pinned"]))


@router.delete("/products/{pid}")
async def delete_product(pid: int, _: dict = Depends(staff_user)):
    vids = [v["id"] for v in await find("variants", {"productId": pid})]
    await db.stock_items.delete_many({"variantId": {"$in": vids}, "isSold": False})
    await db.variants.delete_many({"productId": pid})
    await db.products.delete_one({"id": pid})
    return {"success": True}


@router.patch("/variants/{vid}")
async def patch_variant(vid: int, body: dict, _: dict = Depends(staff_user)):
    await must("variants", vid)
    return await update("variants", {"id": vid}, pick(body, ["name", "price", "comparePrice", "minQuantity"]))


@router.delete("/variants/{vid}")
async def delete_variant(vid: int, _: dict = Depends(staff_user)):
    await db.stock_items.delete_many({"variantId": vid, "isSold": False})
    await db.variants.delete_one({"id": vid})
    return {"success": True}


@router.post("/stock")
async def stock(body: dict, _: dict = Depends(staff_user)):
    res = await add_stock(int(body["variantId"]), body.get("content") or body.get("rawContent", ""))
    return {"addedCount": res["added"]}


@router.post("/stock/bulk")
async def stock_bulk(body: dict, _: dict = Depends(staff_user)):
    res = await add_stock(int(body["variantId"]), body.get("rawContent", ""), body.get("sellerId"))
    return {"addedCount": res["added"], "skippedCount": res["skipped"]}


@router.get("/stock/{vid}")
async def stock_list(vid: int, _: dict = Depends(staff_user)):
    return await find("stock_items", {"variantId": vid}, sort=[("createdAt", -1)])


@router.delete("/stock/{sid}")
async def stock_delete(sid: int, _: dict = Depends(staff_user)):
    await db.stock_items.delete_one({"id": sid, "isSold": False})
    return {"success": True}


# ---------- Card bases / cards / ACH ----------
@router.post("/card-bases", status_code=201)
async def create_base(body: dict, user: dict = Depends(staff_user)):
    name = str(body.get("name") or "").strip()
    seller = str(body.get("sellerName") or "").strip()
    if not name:
        raise HTTPException(400, "Name required")
    if len(seller) > 60:
        raise HTTPException(400, "Seller name must be 60 characters or fewer")
    return await insert("card_bases", {"name": name, "refundable": bool(body.get("refundable")), "hrPercent": 80,
                                       "ownerId": None if user["role"] == "admin" else user["id"],
                                       "createdById": user["id"], "sellerName": seller or None})


@router.patch("/card-bases/{bid}")
async def patch_base(bid: int, body: dict, _: dict = Depends(admin_user)):
    await must("card_bases", bid)
    return await update("card_bases", {"id": bid}, pick(body, ["name", "refundable", "hrPercent", "sellerName"]))


@router.patch("/card-bases/{bid}/price")
async def base_price(bid: int, body: dict, _: dict = Depends(admin_user)):
    cents = int(body.get("priceCents") or 0)
    if cents <= 0:
        raise HTTPException(400, "Price must be greater than zero")
    res = await db.cards.update_many({"baseId": bid, "isSold": False}, {"$set": {"price": cents}})
    return {"updated": res.modified_count}


@router.delete("/card-bases/{bid}")
async def delete_base(bid: int, _: dict = Depends(admin_user)):
    await db.cards.delete_many({"baseId": bid, "isSold": False})
    await db.card_bases.delete_one({"id": bid})
    return {"success": True}


@router.get("/card-bases/{bid}/cards")
async def base_cards(bid: int, _: dict = Depends(staff_user)):
    return await find("cards", {"baseId": bid}, sort=[("createdAt", -1)])


@router.get("/card-bases")
async def all_bases(_: dict = Depends(admin_user)):
    return await bases_with_counts()


@router.delete("/cards/{cid}")
async def delete_card(cid: int, _: dict = Depends(staff_user)):
    await db.cards.delete_one({"id": cid})
    return {"success": True}


@router.post("/ach/bulk", status_code=201)
async def ach_bulk(body: dict, _: dict = Depends(admin_user)):
    lines = [ln.strip() for ln in str(body.get("rawContent") or "").splitlines() if ln.strip()]
    if not lines:
        raise HTTPException(400, "Paste at least one ACH entry.")
    if len(lines) > 100:
        raise HTTPException(400, "Bulk add is limited to 100 entries at a time.")
    entries = []
    for i, ln in enumerate(lines, 1):
        parts = ln.split("|")
        if len(parts) < 4:
            raise HTTPException(400, f"Line {i} is invalid. Use Bank|Balance|Price|full item.")
        bank, bal, price, rest = parts[0], parts[1], parts[2], parts[3:]
        try:
            cents = round(float(price.strip().replace("$", "").replace(",", "")) * 100)
        except ValueError:
            cents = 0
        if not bank.strip() or not bal.strip() or not "|".join(rest).strip() or cents <= 0:
            raise HTTPException(400, f"Line {i} is invalid. Use Bank|Balance|Price|full item.")
        entries.append({"bankName": bank.strip(), "balance": bal.strip().lstrip("$"), "fullItem": "|".join(rest).strip(),
                        "price": cents, "isSold": False, "sellerId": None})
    for e in entries:
        await insert("achs", e)
    return {"addedCount": len(entries)}


@router.delete("/ach/{aid}")
async def ach_delete(aid: int, _: dict = Depends(admin_user)):
    await db.achs.delete_one({"id": aid})
    return {"success": True}


# ---------- Redeem + discount codes ----------
@router.get("/codes")
async def codes(_: dict = Depends(admin_user)):
    return await find("redeem_codes", sort=[("createdAt", -1)])


@router.post("/codes")
async def generate_codes(body: dict, _: dict = Depends(admin_user)):
    amount, count = body.get("amount"), body.get("count")
    if not isinstance(amount, int) or not 1 <= amount <= 100_000_000:
        raise HTTPException(400, "Amount must be a whole number of cents between 1 and 100,000,000.")
    if not isinstance(count, int) or not 1 <= count <= 100:
        raise HTTPException(400, "Count must be a whole number between 1 and 100.")
    out = []
    for _ in range(count):
        out.append(await insert("redeem_codes", {"code": "VOUCH-" + secrets.token_hex(4).upper(), "amount": amount,
                                                 "isUsed": False, "usedBy": None}))
    return {"codes": out}


@router.get("/discount-codes")
async def discount_codes(_: dict = Depends(admin_user)):
    return await find("discount_codes", sort=[("createdAt", -1)])


@router.post("/discount-codes", status_code=201)
async def create_discount(body: dict, _: dict = Depends(admin_user)):
    code, kind, value = str(body.get("code") or "").strip().upper(), body.get("type"), body.get("value")
    if not code or not kind or not value:
        raise HTTPException(400, "Code, type, and value required")
    if kind not in ("percent", "fixed"):
        raise HTTPException(400, "Type must be percent or fixed")
    value = round(float(value) * 100) if kind == "fixed" else int(value)
    if kind == "percent" and not 1 <= value <= 100:
        raise HTTPException(400, "Percent must be 1–100")
    if await find_one("discount_codes", {"code": code}):
        raise HTTPException(400, "A code with that name already exists")
    expires = datetime.fromisoformat(str(body["expiresAt"]).replace("Z", "+00:00")) if body.get("expiresAt") else None
    return await insert("discount_codes", {"code": code, "type": kind, "value": value,
                                           "minOrder": round(float(body.get("minOrder") or 0) * 100),
                                           "maxUses": int(body["maxUses"]) if body.get("maxUses") else None,
                                           "usedCount": 0, "isActive": True, "expiresAt": expires})


@router.patch("/discount-codes/{did}")
async def patch_discount(did: int, body: dict, _: dict = Depends(admin_user)):
    await must("discount_codes", did)
    return await update("discount_codes", {"id": did}, pick(body, ["isActive"]))


@router.delete("/discount-codes/{did}")
async def delete_discount(did: int, _: dict = Depends(admin_user)):
    await db.discount_codes.delete_one({"id": did})
    return {"success": True}


# ---------- Announcements ----------
@router.get("/announcements")
async def all_announcements(_: dict = Depends(admin_user)):
    return await find("announcements", sort=[("createdAt", -1)])


@router.get("/announcements/config")
async def announcement_config(_: dict = Depends(admin_user)):
    return {"bannerColor": await get_setting("announcement_banner_color", "#5a0000")}


@router.patch("/announcements/config")
async def set_announcement_config(body: dict, _: dict = Depends(admin_user)):
    color = str(body.get("bannerColor") or "").strip().lower()
    if not re.fullmatch(r"#[0-9a-f]{6}", color):
        raise HTTPException(400, "Banner color must be a 6-digit hex color.")
    await set_setting("announcement_banner_color", color)
    return {"bannerColor": color}


@router.post("/announcements", status_code=201)
async def create_announcement(body: dict, _: dict = Depends(admin_user)):
    content = str(body.get("content") or "").strip()
    link = str(body.get("link") or "").strip()
    if not content:
        raise HTTPException(400, "Announcement message is required")
    if len(content) > 300:
        raise HTTPException(400, "Announcement message must be 300 characters or fewer")
    if link and not re.match(r"^https?://", link):
        raise HTTPException(400, "Announcement links must use http or https")
    return await insert("announcements", {"content": content, "link": link or None, "active": body.get("active", True)})


@router.patch("/announcements/{aid}")
async def patch_announcement(aid: int, body: dict, _: dict = Depends(admin_user)):
    await must("announcements", aid)
    return await update("announcements", {"id": aid}, pick(body, ["content", "link", "active"]))


@router.delete("/announcements/{aid}")
async def delete_announcement(aid: int, _: dict = Depends(admin_user)):
    await db.announcements.delete_one({"id": aid})
    return {"success": True}


# ---------- Settings ----------
@router.post("/settings/features")
async def set_features(body: dict, _: dict = Depends(admin_user)):
    pages = body.get("pages") or {}
    if not isinstance(pages, dict):
        raise HTTPException(400, "Page visibility settings must be an object.")
    for page, visible in pages.items():
        if page not in PAGE_KEY or not isinstance(visible, bool):
            raise HTTPException(400, f"Invalid page visibility setting: {page}")
    for page, visible in pages.items():
        await set_setting(PAGE_KEY[page], "true" if visible else "false")
    for page in ["checker", "reseller", "ranks", "logs", "cards", "plinko"]:
        if isinstance(body.get(page), bool):
            await set_setting(PAGE_KEY[page], "true" if body[page] else "false")
    return {"ok": True}


@router.get("/payment-methods")
async def admin_payment_methods(_: dict = Depends(admin_user)):
    return await payment_methods()


@router.patch("/payment-methods/{method}")
async def toggle_payment_method(method: str, body: dict, _: dict = Depends(admin_user)):
    await set_setting(f"payment_method_{method}", "true" if body.get("enabled") else "false")
    return await payment_methods()


HANDLES = {"cashapp-tag": ("cashapp_tag", "tag"), "chime-handle": ("chime_handle", "handle"),
           "zelle-handle": ("zelle_handle", "handle"), "venmo-handle": ("venmo_handle", "handle"),
           "applepay-handle": ("applepay_handle", "handle")}


@router.get("/settings/min-deposits")
async def get_min_deposits(_: dict = Depends(admin_user)):
    return {m: float(await get_setting(f"min_deposit_{m}", "0") or 0) for m in ["cashapp", "venmo", "zelle", "chime", "crypto"]}


@router.post("/settings/min-deposits")
async def set_min_deposit(body: dict, _: dict = Depends(admin_user)):
    method = str(body.get("method") or "")
    if method not in ("cashapp", "venmo", "zelle", "chime", "crypto"):
        raise HTTPException(400, "Invalid method")
    value = max(0.0, float(body.get("min") or 0))
    await set_setting(f"min_deposit_{method}", str(value))
    return {"method": method, "min": value}


@router.get("/settings/{name}")
async def get_handle(name: str, _: dict = Depends(admin_user)):
    if name.endswith("-fee"):
        return {"fee": float(await get_setting(name.replace("-fee", "_fee"), "0") or 0)}
    if name not in HANDLES:
        raise HTTPException(404, "Not found")
    key, field = HANDLES[name]
    return {field: await get_setting(key, "")}


@router.post("/settings/{name}")
async def set_handle(name: str, body: dict, _: dict = Depends(admin_user)):
    if name.endswith("-fee"):
        fee = max(0.0, min(100.0, float(body.get("fee") or 0)))
        await set_setting(name.replace("-fee", "_fee"), str(fee))
        return {"fee": fee}
    if name not in HANDLES:
        raise HTTPException(404, "Not found")
    key, field = HANDLES[name]
    value = str(body.get(field) or "").strip()
    await set_setting(key, value)
    return {field: value}


@router.get("/integrations/status")
async def integrations(_: dict = Depends(admin_user)):
    return {"nowpayments": False, "stripe": False, "telegram": False, "smtp": False, "authorizeNet": False}
