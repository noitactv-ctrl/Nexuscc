# Phase 1 regression tests for FastAPI + Mongo backend (auth, admin, shop, cards, ACH, wallet, VIP)
import os
import uuid

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN = ("admin@gorillacc.at", "GorillaAdmin!2026")
BUYER1 = ("buyer1@example.com", "BuyerPass123!")


def session_login(email, pw):
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


@pytest.fixture(scope="module")
def admin():
    return session_login(*ADMIN)


def redeem_amount(admin, user_s, cents):
    r = admin.post(f"{API}/admin/codes", json={"amount": cents, "count": 1})
    assert r.status_code == 200, r.text
    code = r.json()["codes"][0]["code"]
    r = user_s.post(f"{API}/wallet/redeem", json={"code": code})
    assert r.status_code == 200, r.text
    return code, r.json()


@pytest.fixture(scope="module")
def product_variant(admin):
    p = admin.post(f"{API}/products", json={"name": "TEST_Logs " + uuid.uuid4().hex[:4], "description": "t"})
    assert p.status_code == 201, p.text
    v = admin.post(f"{API}/variants", json={"productId": p.json()["id"], "name": "TEST_1x", "price": 1000})
    assert v.status_code == 201, v.text
    tag = uuid.uuid4().hex[:6]
    raw = "\n\n".join(f"log-{tag}-{i}\nline2" for i in range(6))
    r = admin.post(f"{API}/admin/stock/bulk", json={"variantId": v.json()["id"], "rawContent": raw})
    assert r.status_code == 200, r.text
    yield p.json(), v.json(), tag
    admin.delete(f"{API}/admin/products/{p.json()['id']}")


# ---------- Auth ----------
class TestAuth:
    def test_register_cookie_and_no_password(self):
        s = requests.Session()
        email = f"test_{uuid.uuid4().hex[:10]}@example.com"
        r = s.post(f"{API}/register", json={"email": email, "password": "TestPass123!", "agreedToTerms": True})
        assert r.status_code == 201
        assert "password" not in r.json() and r.json()["email"] == email
        sc = r.headers.get("set-cookie", "")
        assert "access_token=" in sc and "httponly" in sc.lower()
        assert s.get(f"{API}/user").json()["email"] == email
        dup = requests.post(f"{API}/register", json={"email": email, "password": "TestPass123!", "agreedToTerms": True})
        assert dup.status_code == 400
        assert s.post(f"{API}/logout").status_code == 200
        assert s.get(f"{API}/user").status_code == 401

    def test_register_validation(self):
        r = requests.post(f"{API}/register", json={"email": "x_short@example.com", "password": "short", "agreedToTerms": True})
        assert r.status_code == 400
        r = requests.post(f"{API}/register", json={"email": "x_terms@example.com", "password": "LongEnough1", "agreedToTerms": False})
        assert r.status_code == 400

    def test_login_wrong_and_lockout(self):
        s, u = new_user()
        codes = [requests.post(f"{API}/login", json={"email": u["email"], "password": "wrong"}).status_code for _ in range(6)]
        assert codes[0] == 401
        assert codes[-1] == 429, codes

    def test_foreign_origin_blocked(self):
        r = requests.post(f"{API}/login", json={"email": ADMIN[0], "password": ADMIN[1]}, headers={"Origin": "https://evil.example.com"})
        assert r.status_code == 403

    def test_non_admin_admin_routes(self):
        s, _ = new_user()
        for path in ["/admin/users", "/admin/orders", "/admin/codes", "/admin/discount-codes"]:
            assert s.get(f"{API}{path}").status_code == 401, path
        assert s.post(f"{API}/admin/codes", json={"amount": 100, "count": 1}).status_code == 401


# ---------- Shop / orders ----------
class TestShop:
    def test_products_have_stock(self, product_variant):
        _, v, _ = product_variant
        prods = requests.get(f"{API}/products").json()
        found = [x for p in prods for x in p["variants"] if x["id"] == v["id"]]
        assert found and found[0]["stockCount"] == 6

    def test_bulk_duplicate_skip(self, admin, product_variant):
        _, v, tag = product_variant
        r = admin.post(f"{API}/admin/stock/bulk", json={"variantId": v["id"], "rawContent": f"log-{tag}-0\nline2\n\nnew-{tag}"})
        assert r.status_code == 200
        body = r.json()
        assert body.get("addedCount", body.get("added")) == 1, body

    def test_order_insufficient_then_success(self, admin, product_variant):
        _, v, _ = product_variant
        s, _ = new_user()
        r = s.post(f"{API}/orders", json={"items": [{"variantId": v["id"], "quantity": 1}]})
        assert r.status_code == 400 and "Insufficient" in r.json()["message"]
        before = [x for p in requests.get(f"{API}/products").json() for x in p["variants"] if x["id"] == v["id"]][0]["stockCount"]
        redeem_amount(admin, s, 1500)
        r = s.post(f"{API}/orders", json={"items": [{"variantId": v["id"], "quantity": 1}]})
        assert r.status_code == 201, r.text
        assert r.json()["total"] == 1000
        assert "log-" in r.json()["deliveryContent"] or "new-" in r.json()["deliveryContent"]
        assert s.get(f"{API}/user").json()["balance"] == 500
        after = [x for p in requests.get(f"{API}/products").json() for x in p["variants"] if x["id"] == v["id"]][0]["stockCount"]
        assert after == before - 1
        orders = s.get(f"{API}/orders").json()
        assert len(orders) == 1 and orders[0]["items"][0]["variantId"] == v["id"]

    def test_out_of_stock_no_charge(self, admin):
        p = admin.post(f"{API}/products", json={"name": "TEST_Empty"}).json()
        v = admin.post(f"{API}/variants", json={"productId": p["id"], "name": "x", "price": 200}).json()
        s, _ = new_user()
        redeem_amount(admin, s, 1000)
        r = s.post(f"{API}/orders", json={"items": [{"variantId": v["id"], "quantity": 1}]})
        assert r.status_code == 400 and "Out of stock" in r.json()["message"]
        assert s.get(f"{API}/user").json()["balance"] == 1000
        admin.delete(f"{API}/admin/products/{p['id']}")

    def test_negative_quantity_rejected(self, admin, product_variant):
        """Security: negative quantity must not reduce the price of other items"""
        _, v, _ = product_variant
        p2 = admin.post(f"{API}/products", json={"name": "TEST_Neg"}).json()
        v2 = admin.post(f"{API}/variants", json={"productId": p2["id"], "name": "neg", "price": 900}).json()
        s, _ = new_user()
        redeem_amount(admin, s, 500)
        r = s.post(f"{API}/orders", json={"items": [{"variantId": v["id"], "quantity": 1}, {"variantId": v2["id"], "quantity": -1}]})
        admin.delete(f"{API}/admin/products/{p2['id']}")
        assert r.status_code == 400, f"Exploit: order created for total={r.json().get('total')} body={r.text[:200]}"

    def test_rank_discount_2pct(self, admin, product_variant):
        _, v, _ = product_variant
        s, _ = new_user()
        redeem_amount(admin, s, 10000)
        rank = s.get(f"{API}/user/rank").json()
        assert rank["discountPct"] == 2 and rank["rank"] == "regular"
        assert rank["dailyAllowance"] == 1 and rank["isVip"] is False
        assert isinstance(rank["poolResetAt"], str) and "T" in rank["poolResetAt"]
        r = s.post(f"{API}/orders", json={"items": [{"variantId": v["id"], "quantity": 1}]})
        assert r.status_code == 201 and r.json()["total"] == 980

    def test_discount_code_flow(self, admin, product_variant):
        _, v, _ = product_variant
        code = "TEST" + uuid.uuid4().hex[:6].upper()
        r = admin.post(f"{API}/admin/discount-codes", json={"code": code, "type": "percent", "value": 10, "minOrder": 5})
        assert r.status_code == 201, r.text
        did = r.json()["id"]
        s, _ = new_user()
        redeem_amount(admin, s, 2000)
        r = s.post(f"{API}/discount/validate", json={"code": code, "cartTotal": 1000})
        assert r.status_code == 200 and r.json()["discountAmount"] == 100
        assert s.post(f"{API}/discount/validate", json={"code": code, "cartTotal": 100}).status_code == 400
        r = s.post(f"{API}/orders", json={"items": [{"variantId": v["id"], "quantity": 1}], "discountCodeId": did})
        assert r.status_code == 201 and r.json()["total"] == 900
        lst = admin.get(f"{API}/admin/discount-codes").json()
        assert [d for d in lst if d["id"] == did][0]["usedCount"] == 1
        assert admin.patch(f"{API}/admin/discount-codes/{did}", json={"isActive": False}).json()["isActive"] is False
        assert s.post(f"{API}/discount/validate", json={"code": code, "cartTotal": 1000}).status_code == 404
        assert admin.delete(f"{API}/admin/discount-codes/{did}").status_code == 200

    def test_admin_refund_credits_wallet(self, admin, product_variant):
        _, v, _ = product_variant
        s, u = new_user()
        redeem_amount(admin, s, 1000)
        o = s.post(f"{API}/orders", json={"items": [{"variantId": v["id"], "quantity": 1}]}).json()
        assert s.get(f"{API}/user").json()["balance"] == 0
        r = admin.post(f"{API}/admin/orders/{o['id']}/refund")
        assert r.status_code == 200 and r.json()["status"] == "refunded"
        assert s.get(f"{API}/user").json()["balance"] == 1000
        assert admin.post(f"{API}/admin/orders/{o['id']}/refund").status_code == 400
        assert any(x["id"] == o["id"] for x in admin.get(f"{API}/admin/orders").json())


# ---------- Cards ----------
class TestCards:
    def test_cards_masked_and_purchase(self, admin):
        b = admin.post(f"{API}/admin/card-bases", json={"name": "TEST_Base " + uuid.uuid4().hex[:4]})
        assert b.status_code == 201, b.text
        bid = b.json()["id"]
        lines = "4111111111111111|12/28|123|John Doe|NY\n5500000000000004|11/27|456|Jane|CA"
        r = admin.post(f"{API}/cards", json={"baseId": bid, "price": "3.00", "extras": lines})
        assert r.status_code == 201 and r.json()["count"] == 2
        s, _ = new_user()
        cards = [c for c in s.get(f"{API}/cards", params={"baseId": bid}).json()]
        assert len(cards) == 2
        for c in cards:
            assert len(c["cardNumber"]) <= 6 and c["cvv"] == "" and c["extras"] == "" and c["expiry"] == ""
            assert "4111111111111111" not in str(c) and "|123|" not in str(c)
        cid = cards[0]["id"]
        assert s.post(f"{API}/cards/{cid}/purchase").status_code == 400  # insufficient
        redeem_amount(admin, s, 500)
        r = s.post(f"{API}/cards/{cid}/purchase")
        assert r.status_code == 200, r.text
        assert s.get(f"{API}/user").json()["balance"] == 200
        orders = s.get(f"{API}/orders").json()
        assert len(orders) == 1 and "|" in orders[0]["deliveryContent"] and len(orders[0]["deliveryContent"]) > 20
        assert s.post(f"{API}/cards/{cid}/purchase").status_code == 400
        admin.delete(f"{API}/admin/card-bases/{bid}")


# ---------- ACH ----------
class TestAch:
    def test_ach_bulk_and_purchase(self, admin):
        tag = uuid.uuid4().hex[:5]
        r = admin.post(f"{API}/admin/ach/bulk", json={"rawContent": f"TEST_Chase{tag}|$5,000|4.00|acct 123|routing 456"})
        assert r.status_code == 201 and r.json()["addedCount"] == 1
        s, _ = new_user()
        lst = [a for a in s.get(f"{API}/ach").json() if a["bankName"] == f"TEST_Chase{tag}"]
        assert lst and "fullItem" not in lst[0] and lst[0]["price"] == 400
        redeem_amount(admin, s, 500)
        r = s.post(f"{API}/ach/{lst[0]['id']}/purchase")
        assert r.status_code == 200 and "acct 123" in r.json()["deliveryContent"]
        assert s.get(f"{API}/user").json()["balance"] == 100
        assert s.post(f"{API}/ach/{lst[0]['id']}/purchase").status_code == 404

    def test_ach_single_create(self, admin):
        """Admin UI uses POST /api/ach {bankName,balance,fullItem,price(dollars)}"""
        r = admin.post(f"{API}/ach", json={"bankName": "TEST_Single", "balance": "1000", "fullItem": "x|y", "price": "2.50"})
        assert r.status_code == 201, f"{r.status_code} {r.text}"
        admin.delete(f"{API}/admin/ach/{r.json()['id']}")


# ---------- Wallet / VIP ----------
class TestWallet:
    def test_redeem_once(self, admin):
        s, _ = new_user()
        code, body = redeem_amount(admin, s, 750)
        assert body["amountAdded"] == 750 and body["newBalance"] == 750
        r = s.post(f"{API}/wallet/redeem", json={"code": code})
        assert r.status_code == 400 and "Invalid or used code" in r.json()["message"]
        txs = s.get(f"{API}/wallet/transactions").json()
        assert txs[0]["amount"] == 750

    def test_vip_and_free_claim(self, admin):
        s, _ = new_user()
        redeem_amount(admin, s, 50000)
        rank = s.get(f"{API}/user/rank").json()
        assert rank["isVip"] is True and rank["dailyAllowance"] == 2 and rank["discountPct"] == 5
        assert s.post(f"{API}/user/free-card/claim", json={"quantity": 3}).status_code == 400
        # ensure pool has cards
        b = admin.post(f"{API}/admin/card-bases", json={"name": "TEST_Free " + uuid.uuid4().hex[:4]}).json()
        admin.post(f"{API}/cards", json={"baseId": b["id"], "price": "1.00", "extras": "4000000000000002|01/29|111\n4000000000000010|01/29|222"})
        r = s.post(f"{API}/user/free-card/claim", json={"quantity": 1})
        assert r.status_code == 200, r.text
        assert r.json()["orderId"].startswith("FREE-CC-")
        st = s.get(f"{API}/user/free-card/status").json()
        assert st["claimedToday"] == 1 and st["remainingToday"] == 1
        assert s.post(f"{API}/user/free-card/claim", json={"quantity": 2}).status_code == 409
        lb = s.get(f"{API}/leaderboard").json()["entries"]
        assert any(e["isCurrentUser"] and e["isVip"] for e in lb)

    def test_newbie_cannot_claim(self):
        s, _ = new_user()
        assert s.post(f"{API}/user/free-card/claim", json={"quantity": 1}).status_code == 403

    def test_password_change(self):
        s, u = new_user()
        assert s.patch(f"{API}/user/password", json={"currentPassword": "bad", "newPassword": "NewPass12345!"}).status_code == 400
        assert s.patch(f"{API}/user/password", json={"currentPassword": "TestPass123!", "newPassword": "NewPass12345!"}).status_code == 200
        session_login(u["email"], "NewPass12345!")


# ---------- Admin misc ----------
class TestAdminMisc:
    def test_users_management(self, admin):
        s, u = new_user()
        r = admin.post(f"{API}/admin/users/{u['id']}/set-balance", json={"balance": "12.34"})
        assert r.status_code == 200 and r.json()["balance"] == 1234
        assert s.get(f"{API}/user").json()["balance"] == 1234
        assert admin.post(f"{API}/admin/users/{u['id']}/set-worker", json={"isWorker": True}).json()["isWorker"] is True
        assert admin.post(f"{API}/admin/users/{u['id']}/set-role", json={"role": "admin"}).json()["role"] == "admin"
        assert admin.post(f"{API}/admin/users/{u['id']}/set-role", json={"role": "user"}).json()["role"] == "user"
        assert any(x["id"] == u["id"] and "password" not in x for x in admin.get(f"{API}/admin/users").json())
        assert admin.post(f"{API}/admin/users/{u['id']}/ban").json()["isBanned"] is True
        assert s.get(f"{API}/user").status_code == 401

    def test_announcements_and_config(self, admin):
        r = admin.post(f"{API}/admin/announcements", json={"content": "TEST_announce", "active": True})
        assert r.status_code == 201, r.text
        aid = r.json()["id"]
        assert any(a["id"] == aid for a in requests.get(f"{API}/announcements").json())
        assert admin.patch(f"{API}/admin/announcements/{aid}", json={"active": False}).status_code == 200
        assert not any(a["id"] == aid for a in requests.get(f"{API}/announcements").json())
        assert admin.delete(f"{API}/admin/announcements/{aid}").status_code == 200
        cfg = admin.get(f"{API}/admin/announcements/config").json()
        assert admin.patch(f"{API}/admin/announcements/config", json={"bannerColor": cfg.get("bannerColor", "#5a0000")}).status_code == 200

    def test_feature_toggle(self, admin):
        assert admin.post(f"{API}/admin/settings/features", json={"pages": {"checker": False}}).status_code == 200
        assert requests.get(f"{API}/settings/features").json()["checker"] is False
        admin.post(f"{API}/admin/settings/features", json={"pages": {"checker": True}})
        assert requests.get(f"{API}/settings/features").json()["checker"] is True

    def test_phase2_returns_501(self):
        s, _ = new_user()
        assert s.post(f"{API}/payments/crypto/create", json={"amount": 10}).status_code == 501
        assert s.get(f"{API}/support").json() == []
