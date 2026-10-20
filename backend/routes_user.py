from fastapi import APIRouter, Depends, HTTPException

from auth import MIN_PASSWORD_LENGTH, current_user, hash_password, public_user, verify_password
from db import db, find, find_one, update
from pricing import credit, day_start, deposit_sum, month_start, rank_for, week_start
from routes_shop import add_item, new_order, public_id, tx

router = APIRouter(prefix="/api")


@router.post("/wallet/redeem")
async def redeem(body: dict, user: dict = Depends(current_user)):
    code = str(body.get("code") or "").strip().upper()
    if code.startswith("GIFT-"):
        raise HTTPException(400, "Telegram store-credit rewards are no longer available")
    rc = await db.redeem_codes.find_one_and_update({"code": code, "isUsed": False},
                                                   {"$set": {"isUsed": True, "usedBy": user["id"]}}, projection={"_id": 0})
    if not rc:
        raise HTTPException(400, "Invalid or used code")
    await credit(user["id"], rc["amount"])
    await tx(user["id"], rc["amount"], "deposit", f"Redeemed code: {rc['code']}")
    fresh = await find_one("users", {"id": user["id"]})
    return {"newBalance": fresh["balance"], "amountAdded": rc["amount"]}


@router.get("/wallet/transactions")
async def transactions(user: dict = Depends(current_user)):
    return await find("transactions", {"userId": user["id"]}, sort=[("createdAt", -1)])


async def free_card_status(uid: int) -> dict:
    total = await deposit_sum(uid)
    month = await deposit_sum(uid, month_start())
    claimed = await db.transactions.count_documents({"userId": uid, "type": "free_card_claim", "createdAt": {"$gte": day_start()}})
    rank, pct, next_at = rank_for(total)
    is_vip, eligible = month >= 50000, month >= 10000
    allowance = 2 if is_vip else 1 if eligible else 0
    from datetime import timedelta
    return {
        "totalDeposited": total, "rank": rank, "discountPct": pct, "nextRankAt": next_at,
        "paidDepositsMonth": month, "paidDepositsWeek": await deposit_sum(uid, week_start()),
        "isVip": is_vip, "eligible": eligible, "dailyAllowance": allowance, "claimedToday": claimed,
        "remainingToday": max(0, allowance - claimed), "poolLeft": await db.cards.count_documents({"isSold": False}),
        "poolResetAt": day_start() + timedelta(days=1),
    }


@router.get("/user/rank")
async def rank(user: dict = Depends(current_user)):
    return await free_card_status(user["id"])


@router.get("/user/free-card/status")
async def free_status(user: dict = Depends(current_user)):
    return await free_card_status(user["id"])


@router.get("/user/free-card/history")
async def free_history(user: dict = Depends(current_user)):
    out = []
    for t in await find("transactions", {"userId": user["id"], "type": "free_card_claim"}, sort=[("createdAt", -1)], limit=50):
        order = await find_one("orders", {"id": t.get("orderId")}) if t.get("orderId") else None
        out.append({"id": t["id"], "description": t["description"], "createdAt": t["createdAt"],
                    "orderId": order["orderId"] if order else None})
    return out


@router.post("/user/free-card/claim")
async def free_claim(body: dict, user: dict = Depends(current_user)):
    uid = user["id"]
    qty = body.get("quantity")
    if not isinstance(qty, int) or not 1 <= qty <= 2:
        raise HTTPException(400, "Choose a quantity from 1 to 2.")
    status = await free_card_status(uid)
    if not status["dailyAllowance"]:
        raise HTTPException(403, "Deposit at least $100 this UTC month to unlock Free CC.")
    if qty > status["remainingToday"]:
        raise HTTPException(409, f"You can claim up to {status['remainingToday']} more Free CC today.")
    picked = []
    for c in await db.cards.aggregate([{"$match": {"isSold": False}}, {"$sample": {"size": qty * 3}}, {"$project": {"_id": 0}}]).to_list(None):
        if len(picked) == qty:
            break
        r = await db.cards.update_one({"id": c["id"], "isSold": False}, {"$set": {"isSold": True, "userId": uid}})
        if r.modified_count:
            picked.append(c)
    if len(picked) < qty:
        for c in picked:
            await db.cards.update_one({"id": c["id"]}, {"$set": {"isSold": False, "userId": None}})
        raise HTTPException(409, "The daily Free CC pool does not have enough cards remaining.")
    delivery = "\n".join("|".join(x for x in [c.get("cardNumber"), c.get("expiry"), c.get("cvv"), c.get("country"),
                                                c.get("extras")] if x) for c in picked)
    order = await new_order(uid, 0, delivery, prefix="FREE-CC-", method="free-card")
    order_id = public_id("FREE-CC-").upper()
    await update("orders", {"id": order["id"]}, {"orderId": order_id})
    for c in picked:
        await add_item(order["id"], "card", 0, cardId=c["id"])
        await tx(uid, 0, "free_card_claim", f"Free CC daily claim ({c.get('maskedCard')})", order_id=order["id"])
    return {"orderId": order_id, "quantity": qty}


@router.get("/leaderboard")
async def leaderboard(user: dict = Depends(current_user)):
    rows = await db.transactions.aggregate([
        {"$match": {"amount": {"$gt": 0}, "type": {"$in": ["deposit", "manual_deposit"]}, "createdAt": {"$gte": month_start()}}},
        {"$group": {"_id": "$userId", "total": {"$sum": "$amount"}}},
        {"$sort": {"total": -1, "_id": 1}}, {"$limit": 50},
    ]).to_list(None)
    entries = []
    for r in rows:
        u = await find_one("users", {"id": r["_id"]})
        if not u or u.get("isBanned"):
            continue
        entries.append({"rank": len(entries) + 1, "userId": u["id"], "username": u["username"],
                        "monthDeposits": int(r["total"]), "isVip": r["total"] >= 50000, "isCurrentUser": u["id"] == user["id"]})
        if len(entries) == 25:
            break
    return {"entries": entries}


@router.patch("/user/password")
async def change_password(body: dict, user: dict = Depends(current_user)):
    full = await find_one("users", {"id": user["id"]})
    if not verify_password(str(body.get("currentPassword") or ""), full.get("password", "")):
        raise HTTPException(400, "Current password is incorrect")
    new = str(body.get("newPassword") or "")
    if len(new) < MIN_PASSWORD_LENGTH:
        raise HTTPException(400, f"Password must be at least {MIN_PASSWORD_LENGTH} characters")
    await update("users", {"id": user["id"]}, {"password": hash_password(new)})
    return {"success": True}


@router.patch("/user/email")
async def change_email(body: dict, user: dict = Depends(current_user)):
    email = str(body.get("email") or "").strip().lower()
    if "@" not in email:
        raise HTTPException(400, "Valid email required")
    if await db.users.find_one({"email": email, "id": {"$ne": user["id"]}}):
        raise HTTPException(400, "Email is already in use")
    return public_user(await update("users", {"id": user["id"]}, {"email": email}))


@router.patch("/user/telegram")
async def change_telegram(body: dict, user: dict = Depends(current_user)):
    handle = str(body.get("telegramUsername") or "").strip().lstrip("@")
    return public_user(await update("users", {"id": user["id"]}, {"telegramUsername": handle}))


@router.get("/deposits")
async def my_deposits(user: dict = Depends(current_user)):
    rows = await find("transactions", {"userId": user["id"], "type": {"$in": ["deposit", "manual_deposit"]}}, sort=[("createdAt", -1)])
    return [{"id": t["id"], "amount": t["amount"], "status": "completed", "method": t.get("paymentMethod") or "Code",
             "description": t["description"], "createdAt": t["createdAt"]} for t in rows]


