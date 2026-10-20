import os
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument

client = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)
db = client[os.environ["DB_NAME"]]

NO_ID = {"_id": 0}


def now():
    return datetime.now(timezone.utc)


async def next_id(name: str) -> int:
    doc = await db.counters.find_one_and_update(
        {"_id": name}, {"$inc": {"seq": 1}}, upsert=True, return_document=ReturnDocument.AFTER
    )
    return doc["seq"]


async def insert(collection: str, data: dict) -> dict:
    doc = {"id": await next_id(collection), "createdAt": now(), **data}
    await db[collection].insert_one(doc)
    doc.pop("_id", None)
    return doc


async def find(collection: str, query: dict | None = None, sort=None, limit: int = 0) -> list[dict]:
    cursor = db[collection].find(query or {}, NO_ID)
    if sort:
        cursor = cursor.sort(sort)
    if limit:
        cursor = cursor.limit(limit)
    return await cursor.to_list(None)


async def find_one(collection: str, query: dict) -> dict | None:
    return await db[collection].find_one(query, NO_ID)


async def update(collection: str, query: dict, changes: dict) -> dict | None:
    return await db[collection].find_one_and_update(
        query, {"$set": changes}, projection=NO_ID, return_document=ReturnDocument.AFTER
    )


async def get_setting(key: str, default: str = "") -> str:
    doc = await db.site_settings.find_one({"key": key})
    return doc["value"] if doc else default


async def set_setting(key: str, value: str):
    await db.site_settings.update_one({"key": key}, {"$set": {"value": value}}, upsert=True)


async def create_indexes():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    for name in ["products", "variants", "stock_items", "orders", "order_items", "transactions",
                 "cards", "card_bases", "achs", "redeem_codes", "discount_codes", "announcements"]:
        await db[name].create_index("id", unique=True)
    await db.redeem_codes.create_index("code", unique=True)
    await db.discount_codes.create_index("code", unique=True)
    await db.stock_items.create_index([("variantId", 1), ("isSold", 1), ("isReserved", 1)])
    await db.cards.create_index([("isSold", 1), ("baseId", 1)])
    await db.transactions.create_index([("userId", 1), ("createdAt", -1)])
    await db.orders.create_index([("userId", 1), ("createdAt", -1)])
    await db.order_items.create_index("orderId")
    await db.login_attempts.create_index("identifier")
    await db.password_reset_tokens.create_index("expiresAt", expireAfterSeconds=0)
    await db.site_settings.create_index("key", unique=True)
