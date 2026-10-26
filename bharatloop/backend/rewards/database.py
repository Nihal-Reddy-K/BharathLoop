import sqlite3
from pathlib import Path
from datetime import datetime, timedelta, timezone
import json
import secrets
import pandas as pd

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "rewards.db"
DATA_DIR = BASE_DIR / "data"

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    """
    Initializes the BharatLoop persistent SQLite database with full deposit-return
    models, ledger entries, vouchers, deposit rules, collection points, and audit events.
    Seeds initial catalog and rules from CSV if empty.
    """
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = get_connection()

    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS wallets (
            user_id TEXT PRIMARY KEY,
            balance_inr REAL NOT NULL DEFAULT 0.0,
            deposits_held_inr REAL NOT NULL DEFAULT 0.0,
            total_refunded_inr REAL NOT NULL DEFAULT 0.0,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS products (
            gtin TEXT PRIMARY KEY,
            brand TEXT NOT NULL,
            product TEXT NOT NULL,
            category TEXT,
            material TEXT NOT NULL,
            weight_g REAL NOT NULL,
            layers TEXT,
            epr_category TEXT,
            recyclability_pct REAL,
            image_url TEXT,
            product_identity_source TEXT NOT NULL,
            product_identity_verified_at TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS deposit_rules (
            id TEXT PRIMARY KEY,
            material TEXT,
            category TEXT,
            gtin TEXT,
            deposit_inr REAL NOT NULL,
            deposit_minor INTEGER NOT NULL,
            currency TEXT NOT NULL DEFAULT 'INR',
            active INTEGER NOT NULL DEFAULT 1,
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL,
            notes TEXT
        );

        CREATE TABLE IF NOT EXISTS packaging_instances (
            id TEXT PRIMARY KEY,
            public_token TEXT UNIQUE NOT NULL,
            user_id TEXT NOT NULL,
            gtin TEXT NOT NULL,
            brand TEXT,
            product_name TEXT,
            material TEXT,
            deposit_inr REAL NOT NULL,
            deposit_minor INTEGER NOT NULL,
            status TEXT NOT NULL, -- 'deposit_recorded', 'returned', 'cancelled'
            purchase_mode TEXT NOT NULL DEFAULT 'simulated',
            created_at TEXT NOT NULL,
            returned_at TEXT,
            collection_point_id TEXT,
            collection_point_name TEXT,
            collection_agent_id TEXT,
            reward_method TEXT
        );

        CREATE TABLE IF NOT EXISTS rewards (
            reward_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            gtin TEXT NOT NULL,
            material TEXT NOT NULL,
            weight_g REAL NOT NULL,
            amount_inr REAL NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            verified_at TEXT,
            credited_at TEXT
        );

        CREATE TABLE IF NOT EXISTS vouchers (
            voucher_id TEXT PRIMARY KEY,
            voucher_code TEXT UNIQUE NOT NULL,
            reward_id TEXT,
            packaging_instance_id TEXT,
            user_id TEXT NOT NULL,
            provider TEXT NOT NULL,
            amount_inr REAL NOT NULL,
            status TEXT NOT NULL, -- 'issued', 'redeemed', 'expired'
            created_at TEXT NOT NULL,
            expires_at TEXT,
            redeemed_at TEXT,
            redeemed_by TEXT
        );

        CREATE TABLE IF NOT EXISTS transactions (
            transaction_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            reward_id TEXT,
            voucher_id TEXT,
            packaging_instance_id TEXT,
            type TEXT NOT NULL, -- 'DEPOSIT_PAID', 'REFUND', 'VOUCHER_ISSUED', 'VOUCHER_REDEEMED'
            amount_inr REAL NOT NULL,
            reference_type TEXT,
            reference_id TEXT,
            idempotency_key TEXT UNIQUE,
            created_at TEXT NOT NULL,
            description TEXT
        );

        CREATE TABLE IF NOT EXISTS collection_points (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            address TEXT,
            lat REAL,
            lon REAL,
            type TEXT,
            accepts TEXT,
            active INTEGER DEFAULT 1,
            verification_status TEXT
        );

        CREATE TABLE IF NOT EXISTS audit_events (
            id TEXT PRIMARY KEY,
            actor_user_id TEXT,
            action TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            metadata TEXT
        );
        """
    )
    conn.commit()

    # Run safe column migrations for any pre-existing tables
    migrations = [
        ("wallets", "deposits_held_inr", "REAL NOT NULL DEFAULT 0.0"),
        ("wallets", "total_refunded_inr", "REAL NOT NULL DEFAULT 0.0"),
        ("transactions", "packaging_instance_id", "TEXT"),
        ("transactions", "reference_type", "TEXT"),
        ("transactions", "reference_id", "TEXT"),
        ("transactions", "idempotency_key", "TEXT"),
        ("vouchers", "packaging_instance_id", "TEXT"),
        ("vouchers", "redeemed_by", "TEXT"),
    ]
    for tbl, col, ctype in migrations:
        try:
            conn.execute(f"ALTER TABLE {tbl} ADD COLUMN {col} {ctype}")
            conn.commit()
        except Exception:
            pass

    # Seed products from products.csv if products table is empty
    count = conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
    if count == 0 and (DATA_DIR / "products.csv").exists():
        try:
            df = pd.read_csv(DATA_DIR / "products.csv")
            now = now_iso()
            for _, row in df.iterrows():
                recyclability = 85.0 if str(row.get("material", "")).upper() in ["PET", "ALUMINIUM", "ALUMINUM", "GLASS"] else 60.0
                conn.execute(
                    """
                    INSERT OR IGNORE INTO products (
                        gtin, brand, product, category, material, weight_g,
                        layers, epr_category, recyclability_pct, image_url,
                        product_identity_source, product_identity_verified_at, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        str(row["gtin"]).strip(),
                        str(row["brand"]),
                        str(row["product"]),
                        str(row.get("category", "packaged goods")),
                        str(row["material"]).strip(),
                        float(row["weight_g"]),
                        str(row.get("layers", "mono")),
                        str(row.get("epr_category", "Cat I")),
                        recyclability,
                        None,
                        "GS1 India / BharatLoop Seed",
                        now,
                        now,
                    )
                )
            conn.commit()
            print("[BharatLoop] Seeded products catalog from products.csv")
        except Exception as e:
            print(f"[BharatLoop] Notice seeding products: {e}")

    # Seed deposit rules if empty
    rule_count = conn.execute("SELECT COUNT(*) FROM deposit_rules").fetchone()[0]
    if rule_count == 0:
        default_rules = [
            ("PET", "bottled water", 5.0, 500, "Standard PET water bottle deposit"),
            ("PET", "soft drinks", 5.0, 500, "Standard PET soft drink deposit"),
            ("PET", None, 5.0, 500, "General PET rigid container deposit"),
            ("Aluminium", "soft drinks", 10.0, 1000, "High-value Aluminium beverage can deposit"),
            ("Aluminium", None, 10.0, 1000, "General Aluminium can/container deposit"),
            ("Glass", "soft drinks", 5.0, 500, "Returnable glass bottle deposit"),
            ("Glass", None, 5.0, 500, "General glass packaging deposit"),
            ("HDPE", "milk/dairy", 5.0, 500, "HDPE milk & dairy container deposit"),
            ("HDPE", "personal care", 10.0, 1000, "HDPE personal care & home cleaning deposit"),
            ("HDPE", None, 5.0, 500, "General HDPE rigid container deposit"),
            ("PP", None, 5.0, 500, "PP rigid cups & containers deposit"),
            ("LDPE", None, 2.0, 200, "LDPE mono pouches deposit"),
            ("Multilayer", None, 2.0, 200, "Multilayer packaging take-back incentive"),
        ]
        now = now_iso()
        for i, (mat, cat, inr, minor, notes) in enumerate(default_rules):
            rule_id = f"DRULE-{i+1:03d}"
            conn.execute(
                """
                INSERT OR IGNORE INTO deposit_rules (
                    id, material, category, gtin, deposit_inr, deposit_minor,
                    currency, active, created_by, created_at, notes
                ) VALUES (?, ?, ?, ?, ?, ?, 'INR', 1, 'system_admin', ?, ?)
                """,
                (rule_id, mat, cat, None, inr, minor, now, notes)
            )
        conn.commit()
        print("[BharatLoop] Seeded default deposit rules")

    # Seed or synchronize collection points from dropoff_points.csv
    if (DATA_DIR / "dropoff_points.csv").exists():
        try:
            df_cp = pd.read_csv(DATA_DIR / "dropoff_points.csv")
            for i, row in df_cp.iterrows():
                cp_id = f"CP-{i+1:03d}"
                conn.execute(
                    """
                    INSERT OR REPLACE INTO collection_points (
                        id, name, address, lat, lon, type, accepts, active, verification_status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'Authorized')
                    """,
                    (
                        cp_id,
                        str(row["name"]),
                        f"{row['name']}, Bengaluru, Karnataka",
                        float(row["lat"]),
                        float(row["lon"]),
                        str(row["type"]),
                        str(row["accepts"]),
                    )
                )
            conn.commit()
            print("[BharatLoop] Synchronized collection points from dropoff_points.csv")
        except Exception as e:
            print(f"[BharatLoop] Notice seeding collection points: {e}")

    conn.close()
    print(f"[BharatLoop] Database ready at {DB_PATH}")


# =========================================================
# WALLET & LEDGER
# =========================================================

def ensure_wallet(user_id: str):
    conn = get_connection()
    row = conn.execute("SELECT * FROM wallets WHERE user_id = ?", (user_id,)).fetchone()
    if row is None:
        conn.execute(
            """
            INSERT INTO wallets (user_id, balance_inr, deposits_held_inr, total_refunded_inr, created_at)
            VALUES (?, 0.0, 0.0, 0.0, ?)
            """,
            (user_id, now_iso())
        )
        conn.commit()
    conn.close()

def get_wallet(user_id: str):
    ensure_wallet(user_id)
    conn = get_connection()
    row = conn.execute("SELECT * FROM wallets WHERE user_id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(row)

def record_transaction(
    user_id: str,
    tx_type: str,
    amount_inr: float,
    description: str,
    reference_type: str = None,
    reference_id: str = None,
    idempotency_key: str = None,
    reward_id: str = None,
    voucher_id: str = None,
    packaging_instance_id: str = None,
):
    conn = get_connection()
    tx_id = f"TXN-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{secrets.token_hex(3).upper()}"
    conn.execute(
        """
        INSERT INTO transactions (
            transaction_id, user_id, reward_id, voucher_id, packaging_instance_id,
            type, amount_inr, reference_type, reference_id, idempotency_key,
            created_at, description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            tx_id,
            user_id,
            reward_id,
            voucher_id,
            packaging_instance_id,
            tx_type,
            round(amount_inr, 2),
            reference_type,
            reference_id,
            idempotency_key or tx_id,
            now_iso(),
            description,
        )
    )
    conn.commit()
    conn.close()
    return tx_id

def get_transactions(user_id: str, limit: int = 50):
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
        (user_id, limit)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# =========================================================
# PRODUCTS & DEPOSIT RULES
# =========================================================

def get_db_product(gtin: str):
    conn = get_connection()
    row = conn.execute("SELECT * FROM products WHERE gtin = ?", (str(gtin).strip(),)).fetchone()
    conn.close()
    return dict(row) if row else None

def save_db_product(product_dict: dict):
    conn = get_connection()
    now = now_iso()
    conn.execute(
        """
        INSERT INTO products (
            gtin, brand, product, category, material, weight_g,
            layers, epr_category, recyclability_pct, image_url,
            product_identity_source, product_identity_verified_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(gtin) DO UPDATE SET
            brand=excluded.brand,
            product=excluded.product,
            category=excluded.category,
            material=excluded.material,
            weight_g=excluded.weight_g,
            layers=excluded.layers,
            epr_category=excluded.epr_category,
            recyclability_pct=excluded.recyclability_pct,
            image_url=excluded.image_url,
            product_identity_source=excluded.product_identity_source,
            product_identity_verified_at=excluded.product_identity_verified_at
        """,
        (
            str(product_dict["gtin"]).strip(),
            str(product_dict.get("brand", "Unknown Brand")),
            str(product_dict.get("product", "Unknown Product")),
            str(product_dict.get("category", "Packaged goods")),
            str(product_dict.get("material", "PET")),
            float(product_dict.get("weight_g", 25.0)),
            str(product_dict.get("layers", "mono")),
            str(product_dict.get("epr_category", "Cat I")),
            float(product_dict.get("recyclability_pct", 80.0)),
            product_dict.get("image_url"),
            str(product_dict.get("product_identity_source", "Open Food Facts API")),
            now,
            now,
        )
    )
    conn.commit()
    conn.close()
    return get_db_product(product_dict["gtin"])

def get_all_products(limit: int = 100):
    conn = get_connection()
    rows = conn.execute("SELECT * FROM products ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_deposit_rule(gtin: str, material: str = None, category: str = None):
    conn = get_connection()
    # 1. Exact GTIN rule
    row = conn.execute(
        "SELECT * FROM deposit_rules WHERE gtin = ? AND active = 1",
        (str(gtin).strip(),)
    ).fetchone()

    # 2. Material + Category rule
    if not row and material and category:
        row = conn.execute(
            """
            SELECT * FROM deposit_rules
            WHERE LOWER(material) = LOWER(?) AND LOWER(category) = LOWER(?) AND active = 1
            """,
            (material.strip(), category.strip())
        ).fetchone()

    # 3. Material general rule
    if not row and material:
        row = conn.execute(
            """
            SELECT * FROM deposit_rules
            WHERE LOWER(material) = LOWER(?) AND active = 1
            ORDER BY deposit_inr DESC
            """,
            (material.strip(),)
        ).fetchone()

    conn.close()

    if row:
        return {
            "eligible": True,
            "rule_id": row["id"],
            "deposit_inr": float(row["deposit_inr"]),
            "deposit_minor": int(row["deposit_minor"]),
            "currency": row["currency"],
            "notes": row["notes"],
            "source": f"BharatLoop Deposit Rule ({row['id']})",
        }

    # Sensible fallback for recognized packaging materials
    mat_lower = (material or "").lower()
    if any(m in mat_lower for m in ["pet", "glass", "hdpe", "pp"]):
        return {
            "eligible": True,
            "rule_id": "FALLBACK-R1",
            "deposit_inr": 5.0,
            "deposit_minor": 500,
            "currency": "INR",
            "notes": "Standard rigid container refundable deposit",
            "source": "BharatLoop Standard Pilot Deposit",
        }
    elif any(m in mat_lower for m in ["aluminium", "aluminum"]):
        return {
            "eligible": True,
            "rule_id": "FALLBACK-AL",
            "deposit_inr": 10.0,
            "deposit_minor": 1000,
            "currency": "INR",
            "notes": "Aluminium can high-recovery deposit",
            "source": "BharatLoop Standard Pilot Deposit",
        }
    elif any(m in mat_lower for m in ["ldpe", "multilayer", "paper"]):
        return {
            "eligible": True,
            "rule_id": "FALLBACK-FLEX",
            "deposit_inr": 2.0,
            "deposit_minor": 200,
            "currency": "INR",
            "notes": "Flexible packaging take-back incentive",
            "source": "BharatLoop Standard Pilot Deposit",
        }

    return {
        "eligible": False,
        "rule_id": None,
        "deposit_inr": 0.0,
        "deposit_minor": 0,
        "currency": "INR",
        "notes": "Material not covered by current deposit scheme",
        "source": "No deposit rule",
    }

def get_all_deposit_rules():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM deposit_rules ORDER BY deposit_inr DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]

def update_deposit_rule(rule_id: str, deposit_inr: float, active: bool, notes: str = None):
    conn = get_connection()
    deposit_minor = int(round(deposit_inr * 100))
    conn.execute(
        """
        UPDATE deposit_rules
        SET deposit_inr = ?, deposit_minor = ?, active = ?, notes = COALESCE(?, notes)
        WHERE id = ?
        """,
        (deposit_inr, deposit_minor, 1 if active else 0, notes, rule_id)
    )
    conn.commit()
    conn.close()
    return {"success": True, "rule_id": rule_id, "deposit_inr": deposit_inr, "active": active}


# =========================================================
# SIMULATED PURCHASE / PACKAGING INSTANCES (DEPOSIT RECORDING)
# =========================================================

def create_packaging_purchase(
    user_id: str,
    gtin: str,
    idempotency_key: str = None,
):
    """
    Creates a unique packaging instance record for a simulated purchase,
    generates a tamper-proof public return token, and records the refundable
    deposit in the user ledger.
    """
    ensure_wallet(user_id)
    conn = get_connection()

    # Check idempotency
    if idempotency_key:
        existing_tx = conn.execute(
            "SELECT * FROM transactions WHERE idempotency_key = ?",
            (idempotency_key,)
        ).fetchone()
        if existing_tx and existing_tx["packaging_instance_id"]:
            pkg = conn.execute(
                "SELECT * FROM packaging_instances WHERE id = ?",
                (existing_tx["packaging_instance_id"],)
            ).fetchone()
            conn.close()
            if pkg:
                return dict(pkg), dict(existing_tx)

    # Get product
    prod_row = conn.execute("SELECT * FROM products WHERE gtin = ?", (gtin,)).fetchone()
    if prod_row:
        brand = prod_row["brand"]
        product_name = prod_row["product"]
        material = prod_row["material"]
        category = prod_row["category"]
    else:
        brand = "Partner Product"
        product_name = f"Packaged Item ({gtin})"
        material = "PET"
        category = "Beverage"

    # Get deposit rule
    rule = get_deposit_rule(gtin, material, category)
    deposit_inr = rule["deposit_inr"]
    deposit_minor = rule["deposit_minor"]

    instance_id = f"PKG-{secrets.token_hex(6).upper()}"
    public_token = f"BLP-{secrets.token_hex(4).upper()}"
    now = now_iso()

    # Execute purchase and ledger entry in a single atomic SQLite transaction
    try:
        conn.execute("BEGIN TRANSACTION")

        conn.execute(
            """
            INSERT INTO packaging_instances (
                id, public_token, user_id, gtin, brand, product_name, material,
                deposit_inr, deposit_minor, status, purchase_mode, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'deposit_recorded', 'simulated', ?)
            """,
            (
                instance_id,
                public_token,
                user_id,
                gtin,
                brand,
                product_name,
                material,
                deposit_inr,
                deposit_minor,
                now,
            )
        )

        # Update wallet: increment deposits held
        conn.execute(
            """
            UPDATE wallets
            SET deposits_held_inr = deposits_held_inr + ?
            WHERE user_id = ?
            """,
            (deposit_inr, user_id)
        )

        # Ledger transaction
        tx_id = f"TXN-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{secrets.token_hex(3).upper()}"
        conn.execute(
            """
            INSERT INTO transactions (
                transaction_id, user_id, packaging_instance_id,
                type, amount_inr, reference_type, reference_id,
                idempotency_key, created_at, description
            ) VALUES (?, ?, ?, 'DEPOSIT_PAID', ?, 'packaging_instance', ?, ?, ?, ?)
            """,
            (
                tx_id,
                user_id,
                instance_id,
                -deposit_inr,
                instance_id,
                idempotency_key or tx_id,
                now,
                f"Simulated deposit paid on {brand} {product_name} (Refundable upon return)",
            )
        )

        # Audit event
        conn.execute(
            """
            INSERT INTO audit_events (
                id, actor_user_id, action, entity_type, entity_id, created_at, metadata
            ) VALUES (?, ?, 'SIMULATED_PURCHASE', 'packaging_instance', ?, ?, ?)
            """,
            (
                f"AUD-{secrets.token_hex(5).upper()}",
                user_id,
                instance_id,
                now,
                json.dumps({"gtin": gtin, "deposit_inr": deposit_inr, "public_token": public_token}),
            )
        )

        conn.commit()

        pkg_row = conn.execute("SELECT * FROM packaging_instances WHERE id = ?", (instance_id,)).fetchone()
        tx_row = conn.execute("SELECT * FROM transactions WHERE transaction_id = ?", (tx_id,)).fetchone()
        wallet_row = conn.execute("SELECT * FROM wallets WHERE user_id = ?", (user_id,)).fetchone()
        conn.close()

        return dict(pkg_row), dict(tx_row), dict(wallet_row)

    except Exception as e:
        conn.rollback()
        conn.close()
        raise e

def get_user_packagings(user_id: str, status: str = None):
    conn = get_connection()
    if status:
        rows = conn.execute(
            "SELECT * FROM packaging_instances WHERE user_id = ? AND status = ? ORDER BY created_at DESC",
            (user_id, status)
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM packaging_instances WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,)
        ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_packaging_by_token(token: str):
    conn = get_connection()
    cleaned_token = token.strip()
    row = conn.execute(
        "SELECT * FROM packaging_instances WHERE public_token = ? OR id = ?",
        (cleaned_token, cleaned_token)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


# =========================================================
# RETURN & VERIFICATION (ANTI-FRAUD DEPOSIT REFUND)
# =========================================================

def verify_and_refund_return(
    token: str,
    collection_point_id: str,
    agent_id: str = "agent-demo",
    reward_method: str = "cashback",
):
    """
    Validates physical return of a packaging instance by an authorized collection agent.
    Safeguards:
    1. Checks if packaging exists.
    2. Validates status is 'deposit_recorded'.
    3. Rejects if already returned (prevents duplicate refund).
    4. Single atomic transaction: updates status to 'returned', credits wallet balance,
       records REFUND ledger entry, creates single-use voucher if chosen, and logs audit event.
    """
    conn = get_connection()
    cleaned_token = token.strip()

    pkg = conn.execute(
        "SELECT * FROM packaging_instances WHERE public_token = ? OR id = ?",
        (cleaned_token, cleaned_token)
    ).fetchone()

    if pkg is None:
        conn.close()
        raise ValueError("Invalid return token. Packaging instance was not found.")

    pkg_dict = dict(pkg)

    # ANTI-FRAUD: Check if already returned!
    if pkg_dict["status"] == "returned":
        returned_time = pkg_dict.get("returned_at", "earlier")
        cp = pkg_dict.get("collection_point_name") or pkg_dict.get("collection_point_id", "Collection Point")
        conn.close()
        raise ValueError(
            f"Duplicate return rejected: This item was already returned on {returned_time} at {cp}. "
            "A deposit refund has already been disbursed."
        )

    if pkg_dict["status"] != "deposit_recorded":
        conn.close()
        raise ValueError(f"Packaging is not eligible for refund (Current status: {pkg_dict['status']}).")

    # Get collection point name
    cp_row = conn.execute("SELECT * FROM collection_points WHERE id = ?", (collection_point_id,)).fetchone()
    cp_name = cp_row["name"] if cp_row else f"Collection Point {collection_point_id}"

    user_id = pkg_dict["user_id"]
    refund_amount = pkg_dict["deposit_inr"]
    now = now_iso()
    pkg_id = pkg_dict["id"]

    voucher_obj = None

    try:
        conn.execute("BEGIN TRANSACTION")

        # 1. Update packaging status to returned
        conn.execute(
            """
            UPDATE packaging_instances
            SET status = 'returned',
                returned_at = ?,
                collection_point_id = ?,
                collection_point_name = ?,
                collection_agent_id = ?,
                reward_method = ?
            WHERE id = ?
            """,
            (now, collection_point_id, cp_name, agent_id, reward_method, pkg_id)
        )

        # 2. Update wallet: decrease deposits_held, increase total_refunded and balance
        conn.execute(
            """
            UPDATE wallets
            SET deposits_held_inr = MAX(0.0, deposits_held_inr - ?),
                balance_inr = balance_inr + ?,
                total_refunded_inr = total_refunded_inr + ?
            WHERE user_id = ?
            """,
            (refund_amount, refund_amount, refund_amount, user_id)
        )

        # 3. Create single immutable ledger transaction for the refund
        tx_id = f"TXN-REF-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{secrets.token_hex(3).upper()}"
        conn.execute(
            """
            INSERT INTO transactions (
                transaction_id, user_id, packaging_instance_id,
                type, amount_inr, reference_type, reference_id,
                idempotency_key, created_at, description
            ) VALUES (?, ?, ?, 'REFUND', ?, 'packaging_return', ?, ?, ?, ?)
            """,
            (
                tx_id,
                user_id,
                pkg_id,
                refund_amount,
                pkg_id,
                f"REFUND-{pkg_id}",
                now,
                f"Deposit refund for returned {pkg_dict.get('brand')} {pkg_dict.get('product_name')} at {cp_name}",
            )
        )

        # 4. If reward_method == "voucher", automatically generate and issue a voucher code
        if reward_method.lower() == "voucher":
            voucher_id = f"VCH-{secrets.token_hex(5).upper()}"
            voucher_code = f"BHARAT-{secrets.token_hex(4).upper()}"
            expires_at = (datetime.now(timezone.utc) + timedelta(days=90)).isoformat()

            conn.execute(
                """
                INSERT INTO vouchers (
                    voucher_id, voucher_code, packaging_instance_id, user_id,
                    provider, amount_inr, status, created_at, expires_at
                ) VALUES (?, ?, ?, ?, 'BharatLoop Demo Partner', ?, 'issued', ?, ?)
                """,
                (voucher_id, voucher_code, pkg_id, user_id, refund_amount, now, expires_at)
            )

            # Deduct from balance since it was converted into a voucher
            conn.execute(
                """
                UPDATE wallets
                SET balance_inr = balance_inr - ?
                WHERE user_id = ?
                """,
                (refund_amount, user_id)
            )

            v_tx_id = f"TXN-VCH-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{secrets.token_hex(3).upper()}"
            conn.execute(
                """
                INSERT INTO transactions (
                    transaction_id, user_id, voucher_id, packaging_instance_id,
                    type, amount_inr, reference_type, reference_id,
                    idempotency_key, created_at, description
                ) VALUES (?, ?, ?, ?, 'VOUCHER_ISSUED', ?, 'voucher', ?, ?, ?, ?)
                """,
                (
                    v_tx_id,
                    user_id,
                    voucher_id,
                    pkg_id,
                    -refund_amount,
                    voucher_id,
                    f"VCH-ISSUE-{voucher_id}",
                    now,
                    f"Converted ₹{refund_amount:.2f} deposit refund into redeemable voucher {voucher_code}",
                )
            )

            voucher_obj = {
                "voucher_id": voucher_id,
                "voucher_code": voucher_code,
                "amount_inr": refund_amount,
                "provider": "BharatLoop Demo Partner (GyFTR / Retail)",
                "status": "issued",
                "expires_at": expires_at,
            }

        # 5. Audit event
        conn.execute(
            """
            INSERT INTO audit_events (
                id, actor_user_id, action, entity_type, entity_id, created_at, metadata
            ) VALUES (?, ?, 'RETURN_VERIFIED', 'packaging_instance', ?, ?, ?)
            """,
            (
                f"AUD-{secrets.token_hex(5).upper()}",
                agent_id,
                pkg_id,
                now,
                json.dumps({
                    "consumer_user_id": user_id,
                    "collection_point_id": collection_point_id,
                    "refund_amount": refund_amount,
                    "reward_method": reward_method,
                }),
            )
        )

        conn.commit()

        updated_pkg = conn.execute("SELECT * FROM packaging_instances WHERE id = ?", (pkg_id,)).fetchone()
        wallet_row = conn.execute("SELECT * FROM wallets WHERE user_id = ?", (user_id,)).fetchone()
        conn.close()

        return {
            "success": True,
            "refund_amount_inr": refund_amount,
            "packaging": dict(updated_pkg),
            "wallet": dict(wallet_row),
            "collection_point": cp_name,
            "returned_at": now,
            "reward_method": reward_method,
            "voucher": voucher_obj,
            "message": f"Successfully verified return! ₹{refund_amount:.2f} refunded to {user_id}.",
        }

    except Exception as e:
        conn.rollback()
        conn.close()
        raise e


# =========================================================
# VOUCHERS (ISSUANCE & SINGLE-USE REDEMPTION)
# =========================================================

def create_voucher(
    reward_id: str,
    user_id: str,
    provider: str,
    amount_inr: float,
    voucher_code: str,
    voucher_id: str = None,
    expires_at: str = None,
):
    ensure_wallet(user_id)
    conn = get_connection()
    wallet = conn.execute("SELECT * FROM wallets WHERE user_id = ?", (user_id,)).fetchone()

    if wallet["balance_inr"] < amount_inr:
        conn.close()
        raise ValueError(f"Insufficient wallet balance (Available: ₹{wallet['balance_inr']:.2f}, Requested: ₹{amount_inr:.2f})")

    v_id = voucher_id or f"BLV-{secrets.token_hex(4).upper()}"
    exp = expires_at or (datetime.now(timezone.utc) + timedelta(days=90)).isoformat()
    now = now_iso()

    try:
        conn.execute("BEGIN TRANSACTION")

        # Deduct wallet balance
        conn.execute(
            "UPDATE wallets SET balance_inr = balance_inr - ? WHERE user_id = ?",
            (amount_inr, user_id)
        )

        # Create voucher
        conn.execute(
            """
            INSERT INTO vouchers (
                voucher_id, voucher_code, reward_id, user_id, provider,
                amount_inr, status, created_at, expires_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'issued', ?, ?)
            """,
            (v_id, voucher_code, reward_id, user_id, provider, amount_inr, now, exp)
        )

        # Ledger record
        tx_id = f"TXN-VCH-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{secrets.token_hex(3).upper()}"
        conn.execute(
            """
            INSERT INTO transactions (
                transaction_id, user_id, voucher_id, type, amount_inr,
                reference_type, reference_id, idempotency_key, created_at, description
            ) VALUES (?, ?, ?, 'VOUCHER_ISSUED', ?, 'voucher', ?, ?, ?, ?)
            """,
            (
                tx_id,
                user_id,
                v_id,
                -amount_inr,
                v_id,
                f"VCH-ISSUE-{v_id}",
                now,
                f"Generated {provider} voucher code {voucher_code} for ₹{amount_inr:.2f}",
            )
        )

        conn.commit()
        conn.close()

        return {
            "voucher_id": v_id,
            "voucher_code": voucher_code,
            "amount_inr": amount_inr,
            "provider": provider,
            "status": "issued",
            "expires_at": exp,
        }

    except Exception as e:
        conn.rollback()
        conn.close()
        raise e

def redeem_voucher(voucher_code: str, user_id: str = "demo_shopper"):
    """
    Redeems a voucher code server-side exactly once.
    Rejects already redeemed, expired, or non-existent vouchers.
    """
    conn = get_connection()
    code_clean = voucher_code.strip()

    row = conn.execute("SELECT * FROM vouchers WHERE voucher_code = ?", (code_clean,)).fetchone()
    if row is None:
        conn.close()
        raise ValueError(f"Voucher code '{voucher_code}' not found.")

    v = dict(row)

    if v["status"] == "redeemed":
        redeemed_at = v.get("redeemed_at", "previously")
        conn.close()
        raise ValueError(f"This voucher was already redeemed on {redeemed_at}. Vouchers are single-use only.")

    if v["status"] != "issued":
        conn.close()
        raise ValueError(f"Voucher is not valid for redemption (Status: {v['status']}).")

    now = now_iso()
    try:
        conn.execute("BEGIN TRANSACTION")

        conn.execute(
            """
            UPDATE vouchers
            SET status = 'redeemed',
                redeemed_at = ?,
                redeemed_by = ?
            WHERE voucher_id = ?
            """,
            (now, user_id, v["voucher_id"])
        )

        # Ledger transaction for redemption
        tx_id = f"TXN-RDM-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{secrets.token_hex(3).upper()}"
        conn.execute(
            """
            INSERT INTO transactions (
                transaction_id, user_id, voucher_id, type, amount_inr,
                reference_type, reference_id, idempotency_key, created_at, description
            ) VALUES (?, ?, ?, 'VOUCHER_REDEEMED', ?, 'voucher_redemption', ?, ?, ?, ?)
            """,
            (
                tx_id,
                v["user_id"],
                v["voucher_id"],
                v["amount_inr"],
                v["voucher_id"],
                f"VCH-REDEEM-{v['voucher_id']}",
                now,
                f"Voucher {code_clean} successfully redeemed for ₹{v['amount_inr']:.2f} demo shopping credit",
            )
        )

        # Audit
        conn.execute(
            """
            INSERT INTO audit_events (
                id, actor_user_id, action, entity_type, entity_id, created_at, metadata
            ) VALUES (?, ?, 'VOUCHER_REDEEMED', 'voucher', ?, ?, ?)
            """,
            (
                f"AUD-{secrets.token_hex(5).upper()}",
                user_id,
                v["voucher_id"],
                now,
                json.dumps({"voucher_code": code_clean, "amount_inr": v["amount_inr"]}),
            )
        )

        conn.commit()
        updated = conn.execute("SELECT * FROM vouchers WHERE voucher_id = ?", (v["voucher_id"],)).fetchone()
        conn.close()

        return {
            "success": True,
            "voucher": dict(updated),
            "message": f"Voucher {code_clean} successfully redeemed for ₹{v['amount_inr']:.2f} demo discount/credit!",
        }

    except Exception as e:
        conn.rollback()
        conn.close()
        raise e

def get_vouchers(user_id: str):
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM vouchers WHERE user_id = ? ORDER BY created_at DESC",
        (user_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def withdraw_wallet_funds(
    user_id: str,
    amount_inr: float,
    payout_method: str = "UPI",
    payout_target: str = "",
    account_name: str = "",
):
    """
    Disburses wallet funds to the user's UPI ID or Bank Account.
    Atomically verifies balance, deducts balance, and writes immutable ledger entry.
    """
    ensure_wallet(user_id)
    conn = get_connection()
    wallet = conn.execute("SELECT * FROM wallets WHERE user_id = ?", (user_id,)).fetchone()

    if wallet["balance_inr"] < amount_inr:
        conn.close()
        raise ValueError(
            f"Insufficient redeemable balance (Available: ₹{wallet['balance_inr']:.2f}, Requested: ₹{amount_inr:.2f})"
        )

    if amount_inr <= 0:
        conn.close()
        raise ValueError("Withdrawal amount must be greater than zero.")

    now = now_iso()
    ref_id = f"PAY-{payout_method.upper()}-{secrets.token_hex(4).upper()}"
    utr_number = f"UTR{secrets.token_hex(6).upper()}"

    try:
        conn.execute("BEGIN TRANSACTION")

        # Deduct wallet balance
        conn.execute(
            "UPDATE wallets SET balance_inr = balance_inr - ? WHERE user_id = ?",
            (amount_inr, user_id)
        )

        # Ledger record
        tx_id = f"TXN-WDL-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{secrets.token_hex(3).upper()}"
        target_display = payout_target or "Primary Bank/UPI"
        conn.execute(
            """
            INSERT INTO transactions (
                transaction_id, user_id, type, amount_inr,
                reference_type, reference_id, idempotency_key, created_at, description
            ) VALUES (?, ?, 'CASH_WITHDRAWAL', ?, ?, ?, ?, ?, ?)
            """,
            (
                tx_id,
                user_id,
                -amount_inr,
                payout_method,
                ref_id,
                f"WDL-{ref_id}",
                now,
                f"Instant {payout_method} payout of ₹{amount_inr:.2f} to {target_display} (UTR: {utr_number})",
            )
        )

        # Audit event
        conn.execute(
            """
            INSERT INTO audit_events (
                id, actor_user_id, action, entity_type, entity_id, created_at, metadata
            ) VALUES (?, ?, 'WALLET_WITHDRAWAL', 'wallet', ?, ?, ?)
            """,
            (
                f"AUD-{secrets.token_hex(5).upper()}",
                user_id,
                user_id,
                now,
                json.dumps({
                    "amount_inr": amount_inr,
                    "payout_method": payout_method,
                    "payout_target": payout_target,
                    "account_name": account_name,
                    "utr": utr_number,
                }),
            )
        )

        conn.commit()
        updated_wallet = conn.execute("SELECT * FROM wallets WHERE user_id = ?", (user_id,)).fetchone()
        conn.close()

        return {
            "success": True,
            "reference_id": ref_id,
            "utr_number": utr_number,
            "amount_inr": amount_inr,
            "payout_method": payout_method,
            "payout_target": payout_target,
            "timestamp": now,
            "new_balance_inr": updated_wallet["balance_inr"],
            "message": f"Successfully disbursed ₹{amount_inr:.2f} via {payout_method} to {target_display}!",
        }
    except Exception as e:
        conn.rollback()
        conn.close()
        raise e


# =========================================================
# COLLECTION POINTS
# =========================================================

def get_collection_points():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM collection_points WHERE active = 1 ORDER BY name ASC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


# =========================================================
# CIRCULAR METRICS & AUDIT LOGS (ADMIN / MANUFACTURER)
# =========================================================

def get_circular_metrics():
    conn = get_connection()

    total_pkg = conn.execute("SELECT COUNT(*) FROM packaging_instances").fetchone()[0]
    returned_pkg = conn.execute("SELECT COUNT(*) FROM packaging_instances WHERE status = 'returned'").fetchone()[0]
    active_pkg = conn.execute("SELECT COUNT(*) FROM packaging_instances WHERE status = 'deposit_recorded'").fetchone()[0]

    deposits_held_sum = conn.execute("SELECT COALESCE(SUM(deposit_inr), 0.0) FROM packaging_instances WHERE status = 'deposit_recorded'").fetchone()[0]
    refunds_paid_sum = conn.execute("SELECT COALESCE(SUM(deposit_inr), 0.0) FROM packaging_instances WHERE status = 'returned'").fetchone()[0]
    vouchers_issued_count = conn.execute("SELECT COUNT(*) FROM vouchers").fetchone()[0]
    vouchers_redeemed_count = conn.execute("SELECT COUNT(*) FROM vouchers WHERE status = 'redeemed'").fetchone()[0]

    # Material breakdown of returned items
    material_breakdown_rows = conn.execute(
        """
        SELECT material, COUNT(*) as count, SUM(deposit_inr) as total_refund
        FROM packaging_instances
        WHERE status = 'returned'
        GROUP BY material
        """
    ).fetchall()
    material_breakdown = [dict(r) for r in material_breakdown_rows]

    recovery_rate_pct = round((returned_pkg / total_pkg * 100), 1) if total_pkg > 0 else 0.0
    estimated_co2e_saved_kg = round(returned_pkg * 0.065, 2)
    estimated_plastic_kg = round(returned_pkg * 0.024, 2)

    conn.close()

    return {
        "total_packaging_issued": total_pkg,
        "returned_packaging": returned_pkg,
        "active_packaging_in_circulation": active_pkg,
        "recovery_rate_pct": recovery_rate_pct,
        "deposits_held_inr": round(float(deposits_held_sum), 2),
        "refunds_paid_inr": round(float(refunds_paid_sum), 2),
        "vouchers_issued": vouchers_issued_count,
        "vouchers_redeemed": vouchers_redeemed_count,
        "co2e_saved_kg": estimated_co2e_saved_kg,
        "plastic_recovered_kg": estimated_plastic_kg,
        "material_breakdown": material_breakdown,
    }

def get_audit_logs(limit: int = 50):
    conn = get_connection()
    rows = conn.execute("SELECT * FROM audit_events ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# =========================================================
# LEGACY REWARD ADAPTERS (For backward compatibility)
# =========================================================

def create_reward(reward_id, user_id, gtin, material, weight_g, amount):
    conn = get_connection()
    conn.execute(
        """
        INSERT INTO rewards (reward_id, user_id, gtin, material, weight_g, amount_inr, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'collection_pending', ?)
        """,
        (reward_id, user_id, gtin, material, weight_g, amount, now_iso())
    )
    conn.commit()
    row = conn.execute("SELECT * FROM rewards WHERE reward_id = ?", (reward_id,)).fetchone()
    conn.close()
    return dict(row)

def get_reward(reward_id):
    conn = get_connection()
    row = conn.execute("SELECT * FROM rewards WHERE reward_id = ?", (reward_id,)).fetchone()
    conn.close()
    return dict(row) if row else None

def get_rewards(user_id):
    conn = get_connection()
    rows = conn.execute("SELECT * FROM rewards WHERE user_id = ? ORDER BY created_at DESC", (user_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def verify_reward(reward_id):
    conn = get_connection()
    conn.execute("UPDATE rewards SET status = 'verified', verified_at = ? WHERE reward_id = ?", (now_iso(), reward_id))
    conn.commit()
    row = conn.execute("SELECT * FROM rewards WHERE reward_id = ?", (reward_id,)).fetchone()
    conn.close()
    return dict(row)

def credit_reward(reward_id):
    conn = get_connection()
    r = conn.execute("SELECT * FROM rewards WHERE reward_id = ?", (reward_id,)).fetchone()
    if not r:
        conn.close()
        raise ValueError("Reward not found")
    user_id = r["user_id"]
    amount = r["amount_inr"]

    ensure_wallet(user_id)
    conn.execute("UPDATE wallets SET balance_inr = balance_inr + ?, total_refunded_inr = total_refunded_inr + ? WHERE user_id = ?", (amount, amount, user_id))
    conn.execute("UPDATE rewards SET status = 'credited', credited_at = ? WHERE reward_id = ?", (now_iso(), reward_id))
    conn.commit()

    wallet = conn.execute("SELECT * FROM wallets WHERE user_id = ?", (user_id,)).fetchone()
    conn.close()

    record_transaction(user_id, "CREDIT", amount, f"Reward {reward_id} credited", reference_type="reward", reference_id=reward_id)
    return dict(wallet)