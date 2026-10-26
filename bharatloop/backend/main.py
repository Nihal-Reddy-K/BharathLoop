from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List

from advisor import (
    consumer_advise,
    get_product,
    manufacturer_analyze,
)

from rewards.database import (
    init_db,
    get_wallet,
    get_transactions,
    get_db_product,
    save_db_product,
    get_all_products,
    get_deposit_rule,
    get_all_deposit_rules,
    update_deposit_rule,
    create_packaging_purchase,
    get_user_packagings,
    get_packaging_by_token,
    verify_and_refund_return,
    create_voucher,
    redeem_voucher,
    get_vouchers,
    get_collection_points,
    get_circular_metrics,
    get_audit_logs,
    # Legacy methods
    create_reward,
    get_reward,
    get_rewards,
    verify_reward,
    credit_reward,
)

from rewards.engine import calculate_reward
from rewards.providers import get_provider
import secrets


app = FastAPI(
    title="BharatLoop API",
    description="GTIN-anchored Pfand Deposit-Return System & Packaging Intelligence for India",
    version="2.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize SQLite database with all tables and seed data
init_db()


# =========================================================
# REQUEST SCHEMAS
# =========================================================

class SimulatedPurchaseRequest(BaseModel):
    user_id: str
    gtin: str
    idempotency_key: Optional[str] = None


class ReturnVerifyRequest(BaseModel):
    token: str
    collection_point_id: str = "CP-001"
    agent_id: str = "agent-demo"
    reward_method: str = "cashback"  # "cashback" or "voucher"


class VoucherRedeemRequest(BaseModel):
    voucher_code: str
    user_id: str = "demo_shopper"


class VoucherIssueRequest(BaseModel):
    user_id: str
    amount: Optional[float] = None
    reward_id: Optional[str] = None
    provider: str = "GyFTR Partner"


class DepositRuleUpdateRequest(BaseModel):
    rule_id: str
    deposit_inr: float
    active: bool = True
    notes: Optional[str] = None


class ProductCreateRequest(BaseModel):
    gtin: str
    brand: str
    product: str
    category: str = "Packaged goods"
    material: str = "PET"
    weight_g: float = 25.0
    layers: str = "mono"
    epr_category: str = "Cat I"
    recyclability_pct: float = 85.0
    image_url: Optional[str] = None


class RewardClaimRequest(BaseModel):
    user_id: str
    gtin: str


class RewardVerifyRequest(BaseModel):
    user_id: str


# =========================================================
# SYSTEM & HEALTH
# =========================================================

@app.get("/")
def root():
    return {
        "name": "BharatLoop",
        "system": "Pfand Deposit-Return & Packaging Intelligence",
        "status": "online",
        "version": "2.1.0",
        "pilot_location": "Bengaluru, India",
    }


@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "service": "bharatloop-api",
        "database": "sqlite_persistent",
    }


# =========================================================
# 1. PRODUCT LOOKUP (PERSISTENT DB + OPEN FOOD FACTS + HONEST NOT FOUND)
# =========================================================

@app.get("/api/products/lookup")
def product_lookup_query(code: str = Query(..., description="GTIN or barcode")):
    product = get_product(code)
    if product is None:
        return {
            "found": False,
            "gtin": code,
            "message": "Product not found in GS1 seed or Open Food Facts. You can register it manually.",
        }

    # Resolve deposit rule
    material = product.get("material", "PET")
    category = product.get("category", "")
    rule = get_deposit_rule(code, material, category)

    return {
        "found": True,
        "product": product,
        "deposit_rule": rule,
    }


@app.get("/api/product/{gtin}")
def product_lookup_path(gtin: str):
    return product_lookup_query(code=gtin)


@app.get("/api/products")
def list_products(limit: int = 100):
    return {
        "count": len(get_all_products(limit)),
        "products": get_all_products(limit),
    }


@app.post("/api/admin/products")
def create_or_update_product(req: ProductCreateRequest):
    data = req.dict()
    data["product_identity_source"] = "Admin / Brand Catalog"
    saved = save_db_product(data)
    return {"success": True, "product": saved}


# =========================================================
# 2. CONSUMER VERDICT & PACKAGING INTELLIGENCE
# =========================================================

@app.get("/api/consumer/verdict/{gtin}")
def consumer_verdict(
    gtin: str,
    lat: float | None = None,
    lon: float | None = None,
):
    result = consumer_advise(
        gtin,
        lat=lat,
        lon=lon,
    )

    if not result.get("found"):
        return result

    # Calculate material recovery incentive
    material = result["product"].get("material", "PET")
    weight_g = result["product"].get("weight_g", 25.0)

    reward = calculate_reward(material, weight_g)
    result["reward"] = reward

    # Attach Pfand Deposit Rule
    rule = get_deposit_rule(gtin, material, result["product"].get("category"))
    result["pfand_deposit"] = rule

    return result


@app.get("/api/manufacturer/analyze/{gtin}")
def manufacturer_analysis(gtin: str):
    return manufacturer_analyze(gtin)


# =========================================================
# 3. PFAND DEPOSIT RULES CONFIGURATION
# =========================================================

@app.get("/api/deposit-rules")
def list_deposit_rules():
    return {
        "rules": get_all_deposit_rules(),
    }


@app.get("/api/deposit-rules/{gtin}")
def get_rule_for_gtin(gtin: str):
    prod = get_product(gtin)
    material = prod.get("material") if prod else None
    cat = prod.get("category") if prod else None
    return get_deposit_rule(gtin, material, cat)


@app.post("/api/deposit-rules")
def update_rule(req: DepositRuleUpdateRequest):
    return update_deposit_rule(
        rule_id=req.rule_id,
        deposit_inr=req.deposit_inr,
        active=req.active,
        notes=req.notes,
    )


# =========================================================
# 4. SIMULATED PURCHASE / PACKAGING INSTANCES (PFAND CHARGE)
# =========================================================

@app.post("/api/demo/purchases")
def simulate_purchase(req: SimulatedPurchaseRequest):
    """
    Simulates consumer buying a deposit-bearing product.
    Generates a unique packaging instance with tamper-proof Return QR token
    and records the refundable deposit in the user ledger.
    """
    try:
        pkg, tx, wallet = create_packaging_purchase(
            user_id=req.user_id,
            gtin=req.gtin,
            idempotency_key=req.idempotency_key,
        )
        return {
            "success": True,
            "packaging": pkg,
            "transaction": tx,
            "wallet": wallet,
            "message": f"Simulated purchase recorded. Refundable deposit of ₹{pkg['deposit_inr']:.2f} held.",
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/packaging/user/{user_id}")
def user_packagings(user_id: str, status: Optional[str] = None):
    items = get_user_packagings(user_id, status=status)
    return {
        "user_id": user_id,
        "count": len(items),
        "packagings": items,
    }


@app.get("/api/packaging/token/{token}")
def packaging_by_token(token: str):
    pkg = get_packaging_by_token(token)
    if not pkg:
        raise HTTPException(status_code=404, detail="Packaging instance not found for this token.")
    return pkg


# =========================================================
# 5. RETURN & VERIFICATION (COLLECTION AGENT ANTI-FRAUD)
# =========================================================

@app.post("/api/returns/verify")
def verify_return(req: ReturnVerifyRequest):
    """
    Collection point agent verifies physical return of a packaging instance.
    Enforces atomic duplicate check, marks packaging returned, credits demo wallet,
    or issues single-use voucher code.
    """
    try:
        receipt = verify_and_refund_return(
            token=req.token,
            collection_point_id=req.collection_point_id,
            agent_id=req.agent_id,
            reward_method=req.reward_method,
        )
        return receipt
    except ValueError as e:
        # Business logic errors (e.g. duplicate return, invalid token)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Return verification failed: {str(e)}")


# =========================================================
# 6. WALLET & LEDGER TRANSACTIONS
# =========================================================

@app.get("/api/wallet/{user_id}")
def get_user_wallet(user_id: str):
    wallet_data = get_wallet(user_id)
    packagings = get_user_packagings(user_id)
    active_count = sum(1 for p in packagings if p["status"] == "deposit_recorded")
    returned_count = sum(1 for p in packagings if p["status"] == "returned")
    vouchers_list = get_vouchers(user_id)

    return {
        "wallet": wallet_data,
        "active_packagings_count": active_count,
        "returned_packagings_count": returned_count,
        "vouchers": vouchers_list,
        "disclaimer": "Demo in-app balance for prototype demonstration. Not real bank money.",
    }


@app.get("/api/wallet/{user_id}/transactions")
def list_transactions(user_id: str, limit: int = 50):
    return {
        "user_id": user_id,
        "transactions": get_transactions(user_id, limit=limit),
    }


# =========================================================
# 7. VOUCHER ISSUANCE & REDEMPTION
# =========================================================

@app.post("/api/vouchers/issue")
def issue_user_voucher(req: VoucherIssueRequest):
    """
    Converts a portion of the user's verified demo balance into a brand voucher.
    """
    amount = req.amount or 10.0
    code = f"BHARAT-{secrets.token_hex(4).upper()}"
    try:
        voucher = create_voucher(
            reward_id=req.reward_id or f"RWD-{secrets.token_hex(4).upper()}",
            user_id=req.user_id,
            provider=req.provider,
            amount_inr=amount,
            voucher_code=code,
        )
        return {"success": True, "voucher": voucher}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/vouchers/redeem")
def redeem_voucher_endpoint(req: VoucherRedeemRequest):
    """
    Redeems a single-use voucher code server-side.
    Rejects already redeemed or expired codes.
    """
    try:
        result = redeem_voucher(
            voucher_code=req.voucher_code,
            user_id=req.user_id,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Redemption error: {str(e)}")


@app.post("/api/vouchers/{code}/redeem")
def redeem_voucher_by_code(code: str, user_id: str = "demo_shopper"):
    return redeem_voucher_endpoint(VoucherRedeemRequest(voucher_code=code, user_id=user_id))


# =========================================================
# 8. COLLECTION POINTS
# =========================================================

@app.get("/api/collection-points")
def list_collection_points():
    points = get_collection_points()
    return {
        "count": len(points),
        "collection_points": points,
    }


# =========================================================
# 9. ADMIN CIRCULAR METRICS & AUDIT LOGS
# =========================================================

@app.get("/api/admin/metrics")
def get_metrics():
    return get_circular_metrics()


@app.get("/api/admin/audit-logs")
def get_audit_trail(limit: int = 50):
    return {
        "logs": get_audit_logs(limit=limit),
    }


# =========================================================
# 10. LEGACY REWARD FLOWS (Backward Compatibility)
# =========================================================

@app.get("/api/rewards/estimate/{gtin}")
def reward_estimate(gtin: str):
    product = get_product(gtin)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found.")
    return calculate_reward(product["material"], product["weight_g"])


@app.post("/api/rewards/claim")
def claim_reward(request: RewardClaimRequest):
    product = get_product(request.gtin)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found.")

    reward = calculate_reward(product["material"], product["weight_g"])
    if not reward["eligible"]:
        raise HTTPException(status_code=400, detail=reward["reason"])

    reward_id = "RWD-" + secrets.token_hex(6).upper()
    created = create_reward(
        user_id=request.user_id,
        gtin=request.gtin,
        material=product["material"],
        weight_g=float(product["weight_g"]),
        amount=reward["reward_inr"],
        reward_id=reward_id,
    )
    return {"success": True, "reward": created, "calculation": reward}


@app.post("/api/rewards/{reward_id}/verify")
def verify_collection(reward_id: str, request: RewardVerifyRequest):
    reward = get_reward(reward_id)
    if reward is None:
        raise HTTPException(status_code=404, detail="Reward not found.")
    if reward["user_id"] != request.user_id:
        raise HTTPException(status_code=403, detail="Reward belongs to another user.")

    verified = verify_reward(reward_id)
    wallet = credit_reward(reward_id)
    return {"success": True, "reward": verified, "wallet": wallet}


@app.post("/api/rewards/{reward_id}/voucher")
def issue_voucher(reward_id: str, request: VoucherIssueRequest):
    reward = get_reward(reward_id)
    if reward is None:
        raise HTTPException(status_code=404, detail="Reward not found.")
    if reward["user_id"] != request.user_id:
        raise HTTPException(status_code=403, detail="Reward belongs to another user.")

    provider = get_provider()
    voucher = provider.issue_voucher(
        reward_id=reward_id,
        user_id=request.user_id,
        amount=float(reward["amount_inr"]),
    )
    return {"success": True, "provider": provider.name, "voucher": voucher}