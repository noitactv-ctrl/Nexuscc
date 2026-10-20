# Iteration 6 retest: quantity validation, lockout, deposits stub, ACH single, upload/image, replace,
# password min 12, discount minOrder at order time, atomic refund, dashboard totalSales
import base64
import os
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN = ("admin@gorillacc.at", "GorillaAdmin!2026")
BUYER1 = ("buyer1@example.com", "BuyerPass123!")


def login(email, pw):
    s = requests.Session()
    r = s.post(f"{API}/login", json={"email": email, "password": pw})
    assert r.status_code == 200, r.text
    return s


def new_user():
    s = requests.Session()
    email = f"test_{uuid.uuid4().hex[:10]}@example.com"
    r = s.post(f"{API}/register", json={"email": email, "password": "TestPass123!", "agreedToTerms": True})
    assert r.status_code == 201, r.text
    return s, r.json()


def fund(admin, s, cents):
    code = admin.post(f"{API}/admin/codes", json={"amount": cents, "count": 1}).json()["codes"][0]["code"]
    assert s.post(f"{API}/wallet/redeem", json={"code": code}).status_code == 200


@pytest.fixture(scope="module")
def admin():
    return login(*ADMIN)


@pytest.fixture(scope="module")
def pv(admin):
    p = admin.post(f"{API}/products", json={"name": "TEST_It6 " + uuid.uuid4().hex[:4]}).json()
    v = admin.post(f"{API}/variants", json={"productId": p["id"], "name": "TEST_v", "price": 1000}).json()
    vmin = admin.post(f"{API}/variants", json={"productId": p["id"], "name": "TEST_min3", "price": 100, "minQuantity": 3}).json()
    tag = uuid.uuid4().hex[:6]
    admin.post(f"{API}/admin/stock/bulk", json={"variantId": v["id"], "rawContent": "\n\n".join(f"it6-{tag}-{i}" for i in range(8))})
    admin.post(f"{API}/admin/stock/bulk", json={"variantId": vmin["id"], "rawContent": "\n\n".join(f"min-{tag}-{i}" for i in range(5))})
    yield p, v, vmin
    admin.delete(f"{API}/admin/products/{p['id']}")


# ---------- Quantity validation ----------
class TestQuantity:
    @pytest.mark.parametrize("qty", [0, -1, -5, 1.5, "2", 1001, True, None])
    def test_invalid_quantity(self, admin, pv, qty):
        _, v, _ = pv
        s, _ = new_user()
        fund(admin, s, 2000)
        r = s.post(f"{API}/orders", json={"items": [{"variantId": v["id"], "quantity": qty}]})
        assert r.status_code == 400, f"qty={qty!r} -> {r.status_code} {r.text[:200]}"
        assert "Invalid quantity" in r.json().get("message", ""), r.text
        assert s.get(f"{API}/user").json()["balance"] == 2000

    def test_neg_exploit_mixed(self, admin, pv):
        _, v, vmin = pv
        s, _ = new_user()
        fund(admin, s, 500)
        r = s.post(f"{API}/orders", json={"items": [{"variantId": v["id"], "quantity": 1}, {"variantId": vmin["id"], "quantity": -7}]})
        assert r.status_code == 400
        assert s.get(f"{API}/user").json()["balance"] == 500

    def test_min_quantity(self, admin, pv):
        _, _, vmin = pv
        s, _ = new_user()
        fund(admin, s, 1000)
        r = s.post(f"{API}/orders", json={"items": [{"variantId": vmin["id"], "quantity": 2}]})
        assert r.status_code == 400 and "Invalid quantity" in r.json()["message"]
        r = s.post(f"{API}/orders", json={"items": [{"variantId": vmin["id"], "quantity": 3}]})
        assert r.status_code == 201, r.text
        assert r.json()["total"] == 300
        assert s.get(f"{API}/user").json()["balance"] == 700


# ---------- Lockout ----------
class TestLockout:
    def test_lockout_6th_429(self):
        _, u = new_user()
        codes = [requests.post(f"{API}/login", json={"email": u["email"], "password": "wrongwrongwrong"}).status_code for _ in range(6)]
        assert codes[:5] == [401] * 5 and codes[5] == 429, codes
        # correct password also blocked while locked
        assert requests.post(f"{API}/login", json={"email": u["email"], "password": "TestPass123!"}).status_code == 429

    def test_lockout_expiry_resets(self):
        _, u = new_user()
        for _ in range(5):
            requests.post(f"{API}/login", json={"email": u["email"], "password": "bad"})
        assert requests.post(f"{API}/login", json={"email": u["email"], "password": "bad"}).status_code == 429
        mc = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
        dbn = os.environ.get("DB_NAME")
        if not dbn:
            pytest.skip("DB_NAME not set")
        col = mc[dbn].login_attempts
        res = col.update_many({"identifier": {"$regex": u["email"].replace(".", r"\.") + "$"}},
                              {"$set": {"lockedUntil": datetime.now(timezone.utc) - timedelta(minutes=1)}})
        assert res.matched_count >= 1
        # After expiry: one wrong attempt -> 401 (not 429), correct -> 200
        assert requests.post(f"{API}/login", json={"email": u["email"], "password": "bad"}).status_code == 401
        assert requests.post(f"{API}/login", json={"email": u["email"], "password": "TestPass123!"}).status_code == 200

    def test_xff_spoof_bypass(self):
        """Informational: does rotating X-Forwarded-For bypass the lockout?"""
        _, u = new_user()
        # per-email cap: 10 failures in 15 min regardless of (spoofable) client IP
        for i in range(10):
            requests.post(f"{API}/login", json={"email": u["email"], "password": "bad"}, headers={"X-Forwarded-For": f"9.9.9.{i}"})
        r = requests.post(f"{API}/login", json={"email": u["email"], "password": "bad"}, headers={"X-Forwarded-For": "8.8.4.4"})
        print("XFF rotated status:", r.status_code)
        assert r.status_code == 429, "Lockout bypassable by spoofing X-Forwarded-For"


# ---------- Deposits / stubs ----------
class TestStubs:
    def test_deposits_and_currencies(self):
        s = login(*BUYER1)
        assert s.get(f"{API}/deposits").json() == []
        assert s.get(f"{API}/payments/crypto/currencies").json() == {"currencies": []}
        txs = s.get(f"{API}/wallet/transactions").json()
        assert isinstance(txs, list) and len(txs) > 0


# ---------- ACH single ----------
class TestAchSingle:
    def test_create_cents_and_listed(self, admin):
        name = "TEST_ACH_" + uuid.uuid4().hex[:5]
        r = admin.post(f"{API}/ach", json={"bankName": name, "balance": "$2,000", "fullItem": "acct|rt", "price": "$3.25"})
        assert r.status_code == 201, r.text
        assert r.json()["price"] == 325 and "_id" not in r.json()
        s, _ = new_user()
        lst = [a for a in s.get(f"{API}/ach").json() if a["bankName"] == name]
        assert lst and lst[0]["price"] == 325 and "fullItem" not in lst[0]
        admin.delete(f"{API}/admin/ach/{r.json()['id']}")

    def test_create_validation(self, admin):
        assert admin.post(f"{API}/ach", json={"bankName": "x", "balance": "1", "fullItem": "y"}).status_code == 400
        assert admin.post(f"{API}/ach", json={"bankName": "x", "balance": "1", "fullItem": "y", "price": "abc"}).status_code == 400
        assert admin.post(f"{API}/ach", json={"bankName": "x", "balance": "1", "fullItem": "y", "price": "-2"}).status_code == 400
        s, _ = new_user()
        assert s.post(f"{API}/ach", json={"bankName": "x", "balance": "1", "fullItem": "y", "price": "2"}).status_code in (401, 403)


# ---------- Upload ----------
PNG = base64.b64encode(base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==")).decode()


class TestUpload:
    def test_upload_and_fetch(self, admin):
        r = admin.post(f"{API}/upload", json={"filename": "t.png", "mimeType": "image/png", "data": PNG})
        assert r.status_code == 201, r.text
        url = r.json()["url"]
        assert url.startswith("/api/images/")
        g = requests.get(f"{BASE_URL}{url}")
        assert g.status_code == 200 and g.headers["content-type"].startswith("image/png")
        assert g.content[:4] == b"\x89PNG"

    def test_upload_validation(self, admin):
        assert admin.post(f"{API}/upload", json={"mimeType": "text/html", "data": PNG}).status_code == 400
        assert admin.post(f"{API}/upload", json={"mimeType": "image/png", "data": "!!!notb64"}).status_code == 400
        s, _ = new_user()
        assert s.post(f"{API}/upload", json={"mimeType": "image/png", "data": PNG}).status_code in (401, 403)
        assert requests.get(f"{API}/images/99999999").status_code == 404


# ---------- Replace / refund / dashboard ----------
class TestAdminOrders:
    def test_replace_and_refund(self, admin, pv):
        _, v, _ = pv
        s, _ = new_user()
        fund(admin, s, 1000)
        dash0 = admin.get(f"{API}/admin/dashboard").json()["totalSales"]
        o = s.post(f"{API}/orders", json={"items": [{"variantId": v["id"], "quantity": 1}]}).json()
        assert o["status"] == "delivering"
        dash1 = admin.get(f"{API}/admin/dashboard").json()["totalSales"]
        assert dash1 - dash0 == 1000, (dash0, dash1)
        r = admin.post(f"{API}/admin/orders/{o['id']}/replace")
        assert r.status_code == 200, r.text
        assert "[Replacement]" in r.json()["deliveryContent"]
        mine = s.get(f"{API}/orders/{o['id']}").json()
        assert "[Replacement]" in mine["deliveryContent"]
        r1 = admin.post(f"{API}/admin/orders/{o['id']}/refund")
        r2 = admin.post(f"{API}/admin/orders/{o['id']}/refund")
        assert r1.status_code == 200 and r2.status_code == 400
        assert s.get(f"{API}/user").json()["balance"] == 1000

    def test_replace_card_order_400(self, admin):
        s = login(*BUYER1)
        orders = [o for o in s.get(f"{API}/orders").json() if o["orderId"].startswith("CARD-")]
        if not orders:
            pytest.skip("no card order")
        assert admin.post(f"{API}/admin/orders/{orders[0]['id']}/replace").status_code == 400


# ---------- Password min / discount minOrder ----------
class TestPolicies:
    def test_password_min_12(self):
        r = requests.post(f"{API}/register", json={"email": f"t_{uuid.uuid4().hex[:8]}@example.com", "password": "Short12345!", "agreedToTerms": True})
        assert r.status_code == 400 and "12" in r.json()["message"]
        s, _ = new_user()
        r = s.patch(f"{API}/user/password", json={"currentPassword": "TestPass123!", "newPassword": "Short12345!"})
        assert r.status_code == 400, r.text
        assert requests.post(f"{API}/password/reset", json={"token": "x", "password": "short"}).status_code == 400

    def test_discount_min_order_on_create(self, admin, pv):
        _, v, _ = pv
        code = "TEST" + uuid.uuid4().hex[:6].upper()
        did = admin.post(f"{API}/admin/discount-codes", json={"code": code, "type": "percent", "value": 50, "minOrder": 20}).json()["id"]
        s, _ = new_user()
        fund(admin, s, 2000)
        r = s.post(f"{API}/orders", json={"items": [{"variantId": v["id"], "quantity": 1}], "discountCodeId": did})
        print("minOrder order:", r.status_code, r.text[:200])
        assert not (r.status_code == 201 and r.json()["total"] == 500), "discount applied below minOrder"
        lst = [d for d in admin.get(f"{API}/admin/discount-codes").json() if d["id"] == did]
        assert lst[0]["usedCount"] == 0
        admin.delete(f"{API}/admin/discount-codes/{did}")
