import re
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request

from auth import current_user, staff_user
from db import db, find, find_one, get_setting, insert, now
from pricing import apply_pct, charge, rank_discount_pct

router = APIRouter(prefix="/api")

PAGES = ["home", "deposit", "myDeposits", "redeem", "ranks", "freeCard", "cards", "banks", "logs", "reseller",
         "orders", "reviews", "myCode", "cart", "checker", "games", "dice", "mines", "plinko", "support", "profile"]
PAGE_KEY = {p: "feature_" + re.sub(r"([A-Z])", r"_\1", p).lower() for p in PAGES}
PAYMENT_DEFAULTS = {"wallet": True, "cashapp": True, "crypto": True, "stars": True, "venmo": True,
                    "zelle": True, "chime": True, "applepay": False}


def public_id(prefix: str = "") -> str:
    return prefix + secrets.token_hex(6)


async def payment_methods() -> dict:
    cfg = dict(PAYMENT_DEFAULTS)
    async for row in db.site_settings.find({"key": {"$regex": "^payment_method_"}}):
        cfg[row["key"].replace("payment_method_", "")] = row["value"] == "true"
    return cfg


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.get("/settings/features")
async def features():
    pages = {p: (await get_setting(PAGE_KEY[p], "true")) != "false" for p in PAGES}
    return {**pages, "pages": pages}


@router.get("/payment-methods")
async def get_payment_methods():
    return await payment_methods()


@router.get("/site-settings/min-deposits")
async def min_deposits():
    return {m: float(await get_setting(f"min_deposit_{m}", "0") or 0) for m in ["cashapp", "venmo", "zelle", "chime", "crypto"]}


@router.get("/site-settings/manual-payments")
async def manual_payments():
    m = await payment_methods()

    async def entry(name, handle_key, fee_key=None, default_on=False):
        enabled = m.get(name) is not False if not default_on else m.get(name) is True
        fee = float(await get_setting(fee_key, "0") or 0) if fee_key else 0
        return {"enabled": enabled, "handle": await get_setting(handle_key, ""), "fee": fee}

    cashapp = await entry("cashapp", "cashapp_tag", "cashapp_fee")
    cashapp["tag"] = cashapp.pop("handle")
    return {
        "cashapp": cashapp,
        "chime": await entry("chime", "chime_handle", "chime_fee", True),
        "zelle": await entry("zelle", "zelle_handle", "zelle_fee", True),
        "venmo": await entry("venmo", "venmo_handle", None, True),
        "applepay": await entry("applepay", "applepay_handle", None, True),
    }


@router.get("/site-settings/cashapp-tag")
async def cashapp_tag():
    return {"tag": await get_setting("cashapp_tag", "")}


@router.get("/announcements")
async def announcements():
    color = await get_setting("announcement_banner_color", "#5a0000")
    rows = await find("announcements", {"active": True}, sort=[("createdAt", -1)])
    return [{**a, "bannerColor": color} for a in rows]


# ---------- Products / logs shop ----------
async def stock_count(variant_id: int) -> int:
    return await db.stock_items.count_documents({"variantId": variant_id, "isSold": False, "isReserved": False})


async def enrich_product(p: dict) -> dict:
    variants = await find("variants", {"productId": p["id"]}, sort=[("id", 1)])
    return {**p, "variants": [{**v, "stockCount": await stock_count(v["id"])} for v in variants]}


async def list_products(active_only: bool = True) -> list[dict]:
    rows = await find("products", {"active": True} if active_only else {}, sort=[("createdAt", -1)])
    return [await enrich_product(p) for p in rows]


@router.get("/products")
async def products():
    return await list_products()


@router.get("/products/top-selling")
async def top_selling():
    return []


@router.get("/products/{product_id}")
async def product(product_id: int):
    p = await find_one("products", {"id": product_id})
    if not p:
        raise HTTPException(404, "Product not found")
    return await enrich_product(p)


@router.post("/products", status_code=201)
async def create_product(body: dict, _: dict = Depends(staff_user)):
    return await insert("products", {"name": body.get("name", ""), "description": body.get("description", ""),
                                     "image": body.get("image", ""), "active": body.get("active", True),
                                     "pinned": body.get("pinned", False)})


@router.post("/variants", status_code=201)
async def create_variant(body: dict, _: dict = Depends(staff_user)):
    return await insert("variants", {"productId": int(body["productId"]), "name": body.get("name", ""),
                                     "price": int(body.get("price", 0)), "comparePrice": body.get("comparePrice"),
                                     "minQuantity": int(body.get("minQuantity") or 1)})


async def add_stock(variant_id: int, content: str, seller_id: int | None = None) -> dict:
    blocks = [b.strip() for b in re.split(r"\n\s*\n", content or "") if b.strip()]
    added = skipped = 0
    for block in blocks:
        if await db.stock_items.find_one({"variantId": variant_id, "content": block}):
            skipped += 1
            continue
        await insert("stock_items", {"variantId": variant_id, "sellerId": seller_id, "content": block,
                                     "isSold": False, "isReserved": False, "orderId": None, "replacementForId": None})
        added += 1
    return {"added": added, "skipped": skipped}


@router.post("/stock")
async def stock_add(body: dict, _: dict = Depends(staff_user)):
    res = await add_stock(int(body["variantId"]), body.get("rawContent", ""), body.get("sellerId"))
    return {"addedCount": res["added"]}


# ---------- Orders ----------
async def order_with_items(o: dict, with_product: bool = True) -> dict:
    items = []
    for i in await find("order_items", {"orderId": o["id"]}, sort=[("id", 1)]):
        stock = await find_one("stock_items", {"id": i["stockItemId"]}) if i.get("stockItemId") else None
        variant = await find_one("variants", {"id": i["variantId"]}) if i.get("variantId") else None
        prod = await find_one("products", {"id": variant["productId"]}) if variant and with_product else None
        card = await find_one("cards", {"id": i["cardId"]}) if i.get("cardId") else None
        items.append({**i, "stockItem": stock, "variant": variant, "card": card,
                      "productName": prod["name"] if prod else None})
    return {**o, "items": items}


async def new_order(user_id: int, total: int, delivery: str, prefix: str = "", status: str = "fulfilled",
                    method: str = "wallet") -> dict:
    return await insert("orders", {"orderId": public_id(prefix), "userId": user_id, "status": status, "total": total,
                                   "paidAmount": total, "deliveryContent": delivery, "paymentMethod": method,
                                   "paymentNote": ""})


async def add_item(order_id: int, item_type: str, price: int, **refs) -> dict:
    return await insert("order_items", {"orderId": order_id, "variantId": refs.get("variantId"),
                                        "stockItemId": refs.get("stockItemId"), "cardId": refs.get("cardId"),
                                        "achId": refs.get("achId"), "itemType": item_type, "price": price,
                                        "quantity": 1})


async def tx(user_id: int, amount: int, kind: str, description: str, method: str | None = None,
             order_id: int | None = None) -> dict:
    return await insert("transactions", {"userId": user_id, "amount": amount, "type": kind,
                                         "description": description, "paymentMethod": method,
                                         "vouchId": None, "orderId": order_id})


async def valid_discount(code_id: int | None, total: int) -> tuple[dict | None, int]:
    if not code_id:
        return None, 0
    dc = await find_one("discount_codes", {"id": int(code_id)})
    if not dc or not dc.get("isActive"):
        return None, 0
    if dc.get("maxUses") is not None and dc.get("usedCount", 0) >= dc["maxUses"]:
        return None, 0
    if dc.get("expiresAt") and dc["expiresAt"] < now():
        return None, 0
    off = round(total * dc["value"] / 100) if dc["type"] == "percent" else min(dc["value"], total)
    return dc, off


@router.post("/orders", status_code=201)
async def create_order(body: dict, user: dict = Depends(current_user)):
    uid = user["id"]
    items = [i for i in body.get("items") or [] if not i.get("cardId") and int(i.get("variantId") or 0) > 0]
    card_ids = [int(c) for c in body.get("cardIds") or []]
    raw = 0
    variants = {}
    for it in items:
        v = await find_one("variants", {"id": int(it["variantId"])})
        if not v:
            raise HTTPException(400, "Variant not found")
        variants[v["id"]] = v
        raw += v["price"] * int(it.get("quantity") or 1)
    cards = []
    for cid in card_ids:
        c = await find_one("cards", {"id": cid})
        if not c:
            raise HTTPException(400, "Card not found")
        if c.get("isSold"):
            raise HTTPException(400, "Card already sold")
        cards.append(c)
        raw += c["price"]
    if raw < 100:
        raise HTTPException(400, "Order total must be at least $1.00")
    dc, off = await valid_discount(body.get("discountCodeId"), raw)
    total = apply_pct(max(0, raw - off), await rank_discount_pct(uid))

    reserved = []
    try:
        for it in items:
            v = variants[int(it["variantId"])]
            for _ in range(int(it.get("quantity") or 1)):
                query = {"variantId": v["id"], "isSold": False, "isReserved": False}
                if it.get("sellerId") or body.get("sellerId"):
                    query["sellerId"] = int(it.get("sellerId") or body.get("sellerId"))
                s = await db.stock_items.find_one_and_update(query, {"$set": {"isSold": True}}, projection={"_id": 0})
                if not s:
                    raise HTTPException(400, f"Out of stock: {v['name']}")
                reserved.append((v, s))
        claimed = []
        for c in cards:
            r = await db.cards.update_one({"id": c["id"], "isSold": False}, {"$set": {"isSold": True, "userId": uid}})
            if r.modified_count != 1:
                raise HTTPException(400, "Card already sold")
            claimed.append(c["id"])
        if not await charge(uid, total):
            raise HTTPException(400, "Insufficient balance")
    except HTTPException:
        for _, s in reserved:
            await db.stock_items.update_one({"id": s["id"]}, {"$set": {"isSold": False}})
        for c in cards:
            await db.cards.update_one({"id": c["id"], "userId": uid}, {"$set": {"isSold": False, "userId": None}})
        raise

    parts: dict[str, list[str]] = {}
    for v, s in reserved:
        parts.setdefault(str(v["id"]), []).append(s.get("content", ""))
    import json
    delivery = json.dumps({k: "\n\n".join(v) for k, v in parts.items()})
    order = await new_order(uid, total, delivery, status="delivering")
    await tx(uid, -total, "purchase", "Order purchase", "wallet", order["id"])
    if dc:
        await db.discount_codes.update_one({"id": dc["id"]}, {"$inc": {"usedCount": 1}})
    for v, s in reserved:
        await add_item(order["id"], "product", v["price"], variantId=v["id"], stockItemId=s["id"])
        await db.stock_items.update_one({"id": s["id"]}, {"$set": {"orderId": order["id"]}})
    for c in cards:
        await add_item(order["id"], "card", c["price"], cardId=c["id"])
    return order


@router.get("/orders")
async def my_orders(user: dict = Depends(current_user)):
    rows = await find("orders", {"userId": user["id"]}, sort=[("createdAt", -1)])
    return [{**(await order_with_items(o)), "vouchStatus": None, "vouchRewardAmount": None, "vouchReviewedAt": None}
            for o in rows]


@router.get("/orders/{order_id}")
async def my_order(order_id: int, user: dict = Depends(current_user)):
    o = await find_one("orders", {"id": order_id})
    if not o or o["userId"] != user["id"]:
        raise HTTPException(404, "Order not found")
    return await order_with_items(o, with_product=False)


@router.post("/discount/validate")
async def validate_discount(body: dict, _: dict = Depends(current_user)):
    code = str(body.get("code") or "").strip().upper()
    cart_total = int(body.get("cartTotal") or 0)
    if not code:
        raise HTTPException(400, "Code required")
    dc = await find_one("discount_codes", {"code": code})
    if not dc or not dc.get("isActive"):
        raise HTTPException(404, "Invalid or inactive code")
    if dc.get("expiresAt") and dc["expiresAt"] < now():
        raise HTTPException(400, "This code has expired")
    if dc.get("maxUses") is not None and dc.get("usedCount", 0) >= dc["maxUses"]:
        raise HTTPException(400, "This code has reached its usage limit")
    if dc.get("minOrder") and cart_total < dc["minOrder"]:
        raise HTTPException(400, f"Minimum order of ${dc['minOrder'] / 100:.2f} required")
    off = round(cart_total * dc["value"] / 100) if dc["type"] == "percent" else min(dc["value"], cart_total)
    return {"id": dc["id"], "code": dc["code"], "type": dc["type"], "value": dc["value"], "discountAmount": off}


# ---------- Cards ----------
def masked(number: str) -> str:
    if len(number) < 4:
        return number
    return number[:6] + "*" * max(0, len(number) - 10) + number[-4:]


def find_card_number(line: str) -> str:
    tokens = [t for t in re.split(r"[|\t:;,\s]+", line) if t]
    for t in tokens:
        d = re.sub(r"\D", "", t)
        if 13 <= len(d) <= 19 and d[0] in "3456":
            return d
    m = re.search(r"[3456]\d{12,18}", re.sub(r"[\s\-]", "", line))
    if m:
        return m.group(0)
    for t in tokens:
        d = re.sub(r"\D", "", t)
        if len(d) >= 6:
            return d
    return ""


async def base_meta() -> dict[int, dict]:
    bases = {b["id"]: b for b in await find("card_bases")}
    users = {u["id"]: u for u in await find("users", {"id": {"$in": [b.get("createdById") or b.get("ownerId")
                                                                        for b in bases.values() if b.get("createdById") or b.get("ownerId")]}})}
    for b in bases.values():
        creator = users.get(b.get("createdById") or b.get("ownerId"))
        b["_uploader"] = b.get("sellerName") or (creator or {}).get("username")
        b["_type"] = "admin" if not creator or creator.get("role") == "admin" else "seller"
    return bases


def card_out(c: dict, base: dict | None, staff: bool) -> dict:
    out = {
        "id": c["id"], "cardNumber": c.get("cardNumber", "") if staff else c.get("cardNumber", "")[:6],
        "maskedCard": c.get("maskedCard"), "expiry": c.get("expiry", "") if staff else "",
        "cvv": c.get("cvv", "") if staff else "", "country": (c.get("binData") or {}).get("country") or c.get("country"),
        "extras": c.get("extras", "") if staff else "", "price": c["price"],
        "hrPercent": (base or {}).get("hrPercent", c.get("hrPercent", 80)), "isSold": c.get("isSold", False),
        "isFirstHand": c.get("isFirstHand", False), "userId": c.get("userId") if staff else None,
        "createdAt": c.get("createdAt"), "binData": c.get("binData"), "baseId": c.get("baseId"),
        "baseName": (base or {}).get("name"), "baseUploaderName": (base or {}).get("_uploader"),
        "baseUploaderType": (base or {}).get("_type") if base else None,
        "baseRefundable": bool((base or {}).get("refundable")) if staff else False,
    }
    return out


@router.get("/card-bases")
async def card_bases(user: dict = Depends(current_user)):
    if user.get("role") == "admin" or user.get("isWorker"):
        return await bases_with_counts(None if user.get("role") == "admin" else user["id"])
    out = []
    for b in await find("card_bases", sort=[("name", 1)]):
        n = await db.cards.count_documents({"baseId": b["id"], "isSold": False})
        if n:
            out.append({"id": b["id"], "name": b["name"], "count": n})
    return out


async def bases_with_counts(owner_id: int | None = None) -> list[dict]:
    out = []
    for b in await find("card_bases", {"ownerId": owner_id} if owner_id is not None else {}, sort=[("name", 1)]):
        hr = b.get("hrPercent", 80)
        sold = await find("cards", {"baseId": b["id"], "isSold": True})
        out.append({**b, "hrPercent": hr, "count": await db.cards.count_documents({"baseId": b["id"], "isSold": False}),
                    "soldCount": len(sold), "profit": sum(round(c["price"] * hr / 100) for c in sold)})
    return out


@router.get("/cards")
async def cards(request: Request, user: dict = Depends(current_user)):
    staff = user.get("role") == "admin" or bool(user.get("isWorker"))
    query: dict = {"isSold": False}
    base_id = request.query_params.get("baseId")
    if base_id:
        query["baseId"] = int(base_id)
    if user.get("role") != "admin" and user.get("isWorker"):
        owned = await find_one("card_bases", {"ownerId": user["id"]})
        if not owned:
            return []
        if base_id and int(base_id) != owned["id"]:
            raise HTTPException(403, "You do not own this base")
        query["baseId"] = owned["id"]
    bases = await base_meta()
    rows = await find("cards", query, sort=[("createdAt", -1)])
    return [card_out(c, bases.get(c.get("baseId")), staff) for c in rows]


@router.post("/cards", status_code=201)
async def add_cards(body: dict, user: dict = Depends(staff_user)):
    entries = [e.strip() for e in re.split(r"\r?\n", body.get("extras") or "") if e.strip()]
    if not entries:
        raise HTTPException(400, "Full item is required")
    base_id = int(body.get("baseId") or 0)
    base = await find_one("card_bases", {"id": base_id}) if base_id > 0 else None
    if not base:
        raise HTTPException(400 if base_id <= 0 else 404, "A valid base is required" if base_id <= 0 else "Base not found")
    if user.get("role") != "admin" and base.get("ownerId") != user["id"]:
        raise HTTPException(403, "Workers can only add cards to their own base")
    price = round(float(body.get("price") or 0) * 100)
    created = []
    for item in entries:
        number = find_card_number(item) or body.get("cardNumber", "")
        created.append(await insert("cards", {
            "cardNumber": number, "maskedCard": masked(number), "expiry": "", "cvv": "", "country": "Unknown",
            "extras": item, "price": price, "hrPercent": 80, "isFirstHand": False, "isSold": False,
            "userId": None, "binData": None, "baseId": base_id}))
    return created[0] if len(created) == 1 else {"cards": created, "count": len(created)}


@router.post("/cards/{card_id}/purchase")
async def purchase_card(card_id: int, user: dict = Depends(current_user)):
    uid = user["id"]
    card = await find_one("cards", {"id": card_id})
    if not card:
        raise HTTPException(404, "Card not found")
    price = apply_pct(card["price"], await rank_discount_pct(uid))
    claimed = await db.cards.update_one({"id": card_id, "isSold": False}, {"$set": {"isSold": True, "userId": uid}})
    if claimed.modified_count != 1:
        raise HTTPException(400, "Card not found or already sold")
    if not await charge(uid, price):
        await db.cards.update_one({"id": card_id}, {"$set": {"isSold": False, "userId": None}})
        raise HTTPException(400, "Insufficient balance")
    delivery = "|".join(x for x in [card.get("cardNumber"), card.get("expiry"), card.get("cvv"),
                                     card.get("country"), card.get("extras")] if x)
    order = await new_order(uid, price, delivery, prefix="CARD-")
    await add_item(order["id"], "card", card["price"], cardId=card_id)
    await tx(uid, -price, "purchase", f"Purchased card {card.get('maskedCard')}", "wallet", order["id"])
    return await find_one("cards", {"id": card_id})


@router.get("/user/cards")
async def my_cards(user: dict = Depends(current_user)):
    return await find("cards", {"userId": user["id"]}, sort=[("createdAt", -1)])


# ---------- ACH ----------
@router.get("/ach")
async def achs(_: dict = Depends(current_user)):
    rows = await find("achs", {"isSold": False}, sort=[("createdAt", -1)])
    return [{k: a.get(k) for k in ["id", "bankName", "balance", "price", "isSold", "sellerId", "createdAt"]} for a in rows]


@router.post("/ach/{ach_id}/purchase")
async def purchase_ach(ach_id: int, user: dict = Depends(current_user)):
    uid = user["id"]
    ach = await find_one("achs", {"id": ach_id, "isSold": False})
    if not ach:
        raise HTTPException(404, "ACH not found or sold")
    price = apply_pct(ach["price"], await rank_discount_pct(uid))
    r = await db.achs.update_one({"id": ach_id, "isSold": False}, {"$set": {"isSold": True}})
    if r.modified_count != 1:
        raise HTTPException(404, "ACH not found or sold")
    if not await charge(uid, price):
        await db.achs.update_one({"id": ach_id}, {"$set": {"isSold": False}})
        raise HTTPException(400, "Insufficient balance")
    order = await new_order(uid, price, ach["fullItem"], prefix="ACH-")
    await add_item(order["id"], "ach", ach["price"], achId=ach_id)
    await tx(uid, -price, "purchase", f"Purchased ACH: {ach['bankName']}", "wallet", order["id"])
    return {"success": True, "deliveryContent": ach["fullItem"]}
