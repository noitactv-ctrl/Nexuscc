from datetime import timedelta

from db import db, now

DEPOSIT_TYPES = ["deposit", "manual_deposit"]


def month_start():
    n = now()
    return n.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def day_start():
    return now().replace(hour=0, minute=0, second=0, microsecond=0)


def week_start():
    d = day_start()
    return d - timedelta(days=d.weekday())


async def deposit_sum(user_id: int, since=None) -> int:
    match = {"userId": user_id, "amount": {"$gt": 0}, "type": {"$in": DEPOSIT_TYPES}}
    if since:
        match["createdAt"] = {"$gte": since}
    rows = await db.transactions.aggregate([{"$match": match}, {"$group": {"_id": None, "t": {"$sum": "$amount"}}}]).to_list(1)
    return int(rows[0]["t"]) if rows else 0


def rank_for(total: int) -> tuple[str, int, int | None]:
    if total >= 100000:
        return "nyc", 10, None
    if total >= 50000:
        return "vip", 5, 100000
    if total >= 10000:
        return "regular", 2, 50000
    return "newbie", 0, 10000


async def rank_discount_pct(user_id: int) -> int:
    return rank_for(await deposit_sum(user_id))[1]


def apply_pct(price: int, pct: int) -> int:
    return max(0, round(price * (1 - pct / 100))) if pct else price


async def charge(user_id: int, amount: int) -> bool:
    if amount <= 0:
        return True
    res = await db.users.update_one({"id": user_id, "balance": {"$gte": amount}}, {"$inc": {"balance": -amount}})
    return res.modified_count == 1


async def credit(user_id: int, amount: int):
    await db.users.update_one({"id": user_id}, {"$inc": {"balance": amount}})
