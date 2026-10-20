# Seed helper for UI tests: creates a funded TEST_ user, a product with stock and a card base with cards
import os
import uuid

import requests

API = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") + "/api"
admin = requests.Session()
admin.post(f"{API}/login", json={"email": "admin@gorillacc.at", "password": "GorillaAdmin!2026"}).raise_for_status()
email = f"test_ui_{uuid.uuid4().hex[:6]}@example.com"
u = requests.Session()
u.post(f"{API}/register", json={"email": email, "password": "TestPass123!", "agreedToTerms": True}).raise_for_status()
codes = admin.post(f"{API}/admin/codes", json={"amount": 5000, "count": 2}).json()["codes"]
u.post(f"{API}/wallet/redeem", json={"code": codes[0]["code"]}).raise_for_status()
p = admin.post(f"{API}/products", json={"name": "TEST_UI Logs", "description": "ui"}).json()
v = admin.post(f"{API}/variants", json={"productId": p["id"], "name": "TEST_UI 1x", "price": 300}).json()
tag = uuid.uuid4().hex[:6]
admin.post(f"{API}/admin/stock/bulk", json={"variantId": v["id"], "rawContent": f"ui-{tag}-a\n\nui-{tag}-b\n\nui-{tag}-c"})
b = admin.post(f"{API}/admin/card-bases", json={"name": "TEST_UI Base"}).json()
admin.post(f"{API}/cards", json={"baseId": b["id"], "price": "2.00", "extras": "4242424242424242|10/29|999|UI Test|TX"})
print({"email": email, "unused_code": codes[1]["code"], "productId": p["id"], "variantId": v["id"], "baseId": b["id"]})
