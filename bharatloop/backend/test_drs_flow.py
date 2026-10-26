import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_full_deposit_loop():
    print("--- 1. Testing Product Lookup ---")
    # A. Seeded product
    res = client.get("/api/products/lookup?code=8909990000019")
    assert res.status_code == 200, res.text
    d = res.json()
    assert d["found"] is True
    assert d["product"]["brand"] == "Bisleri"
    assert d["deposit_rule"]["eligible"] is True
    assert d["deposit_rule"]["deposit_inr"] == 5.0
    print("✓ Seeded product lookup passed (Bisleri 1L, ₹5.00 deposit)")

    # B. Unknown product
    res_unknown = client.get("/api/products/lookup?code=0000000000000")
    assert res_unknown.status_code == 200
    assert res_unknown.json()["found"] is False
    print("✓ Unknown product honest not-found passed")

    # C. External Open Food Facts product (e.g. Nutella 3017620422003)
    res_ext = client.get("/api/products/lookup?code=3017620422003")
    assert res_ext.status_code == 200
    d_ext = res_ext.json()
    if d_ext.get("found"):
        print(f"✓ Open Food Facts product lookup passed: {d_ext['product']['product']} ({d_ext['product']['product_identity_source']})")
    else:
        print("Notice: External OFF was offline or not found, handled gracefully.")

    print("\n--- 2. Testing Simulated Purchase (Deposit Recording) ---")
    user_id = "test_shopper_01"
    res_buy = client.post("/api/demo/purchases", json={
        "user_id": user_id,
        "gtin": "8909990000019"
    })
    assert res_buy.status_code == 200, res_buy.text
    buy_data = res_buy.json()
    token = buy_data["packaging"]["public_token"]
    assert token.startswith("BLP-")
    assert buy_data["packaging"]["deposit_inr"] == 5.0
    assert buy_data["packaging"]["status"] == "deposit_recorded"
    print(f"✓ Simulated purchase succeeded. Generated Return Token: {token}")

    # Check wallet deposits held
    res_wal = client.get(f"/api/wallet/{user_id}")
    assert res_wal.status_code == 200
    w = res_wal.json()["wallet"]
    assert w["deposits_held_inr"] >= 5.0
    print(f"✓ Wallet updated: deposits_held = ₹{w['deposits_held_inr']:.2f}")

    print("\n--- 3. Testing Collection Agent Return Verification ---")
    res_return = client.post("/api/returns/verify", json={
        "token": token,
        "collection_point_id": "CP-001",
        "agent_id": "agent-demo",
        "reward_method": "cashback"
    })
    assert res_return.status_code == 200, res_return.text
    ret_data = res_return.json()
    assert ret_data["success"] is True
    assert ret_data["refund_amount_inr"] == 5.0
    assert ret_data["packaging"]["status"] == "returned"
    print(f"✓ Return verified. Wallet credited with ₹{ret_data['refund_amount_inr']:.2f} refund.")

    # Check updated wallet balance
    res_wal2 = client.get(f"/api/wallet/{user_id}")
    w2 = res_wal2.json()["wallet"]
    assert w2["balance_inr"] >= 5.0
    print(f"✓ Wallet verified: balance = ₹{w2['balance_inr']:.2f}, total_refunded = ₹{w2['total_refunded_inr']:.2f}")

    print("\n--- 4. Testing Duplicate Return Rejection (Anti-Fraud) ---")
    res_dup = client.post("/api/returns/verify", json={
        "token": token,
        "collection_point_id": "CP-001",
        "agent_id": "agent-demo",
        "reward_method": "cashback"
    })
    assert res_dup.status_code == 400, "Duplicate return must be rejected!"
    print(f"✓ Duplicate return successfully blocked: {res_dup.json()['detail']}")

    print("\n--- 5. Testing Voucher Flow & Single-Use Redemption ---")
    # Issue voucher
    res_vch = client.post("/api/vouchers/issue", json={
        "user_id": user_id,
        "amount": 5.0,
        "provider": "GyFTR Demo"
    })
    assert res_vch.status_code == 200, res_vch.text
    vch_code = res_vch.json()["voucher"]["voucher_code"]
    print(f"✓ Voucher issued: {vch_code}")

    # Redeem voucher
    res_rdm = client.post("/api/vouchers/redeem", json={
        "voucher_code": vch_code,
        "user_id": user_id
    })
    assert res_rdm.status_code == 200, res_rdm.text
    assert res_rdm.json()["voucher"]["status"] == "redeemed"
    print(f"✓ Voucher {vch_code} successfully redeemed.")

    # Try duplicate redemption
    res_rdm_dup = client.post("/api/vouchers/redeem", json={
        "voucher_code": vch_code,
        "user_id": user_id
    })
    assert res_rdm_dup.status_code == 400, "Duplicate voucher redemption must be rejected!"
    print(f"✓ Duplicate redemption successfully blocked: {res_rdm_dup.json()['detail']}")

    print("\n--- 6. Testing Circular Metrics & Collection Points ---")
    res_metrics = client.get("/api/admin/metrics")
    assert res_metrics.status_code == 200
    metrics = res_metrics.json()
    print(f"✓ Circular Metrics: Total Issued={metrics['total_packaging_issued']}, Returned={metrics['returned_packaging']}, Recovery Rate={metrics['recovery_rate_pct']}%, CO2e Saved={metrics['co2e_saved_kg']}kg")

    res_cp = client.get("/api/collection-points")
    assert res_cp.status_code == 200
    print(f"✓ Active collection points: {res_cp.json()['count']}")

    print("\nALL DEPOSIT-RETURN LIFECYCLE TESTS PASSED PERFECTLY!")

if __name__ == "__main__":
    test_full_deposit_loop()
