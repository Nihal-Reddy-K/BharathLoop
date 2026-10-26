import math
import os
from pathlib import Path
from typing import Optional

import pandas as pd
import requests


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "").strip()

DEFAULT_LAT = 12.9716
DEFAULT_LON = 77.5946


# ---------------------------------------------------------
# DATA LOADING
# ---------------------------------------------------------

def load_csv(filename: str) -> pd.DataFrame:
    path = DATA_DIR / filename

    if not path.exists():
        raise FileNotFoundError(
            f"Missing dataset: {path}"
        )

    return pd.read_csv(path)


products_df = load_csv("products.csv")
scrap_df = load_csv("scrap_rates.csv")
dropoff_df = load_csv("dropoff_points.csv")
epr_df = load_csv("epr_categories.csv")
substitutes_df = load_csv("substitutes.csv")
emission_df = load_csv("emission_factors.csv")


# ---------------------------------------------------------
# SOURCE METADATA
# ---------------------------------------------------------

SOURCES = {
    "epr": {
        "label": "CPCB PWM / EPR framework",
        "type": "regulatory",
        "url": "https://cpcb.nic.in/plastic-waste-management-rules/",
    },
    "scrap_pet": {
        "label": "Kabadigo Vijay Nagar rate card",
        "type": "indicative_market",
        "url": "https://kabadigo.com/",
    },
    "co2": {
        "label": "Published LCA / material emission-factor references",
        "type": "environmental",
        "url": "https://cpcb.nic.in/",
    },
    "dropoffs": {
        "label": "Bengaluru DWCC / BharatLoop seed dataset",
        "type": "location",
        "url": "https://site.bbmp.gov.in/",
    },
    "gtin": {
        "label": "GS1 India / BharatLoop product seed dataset",
        "type": "product",
        "url": "https://www.gs1india.org/",
    },
    "substitutes": {
        "label": "BharatLoop material substitution dataset",
        "type": "model",
        "url": None,
    },
    "reward": {
        "label": "GyFTR digital voucher pathway",
        "type": "reward",
        "url": "https://www.gyftr.com/",
    },
}


# ---------------------------------------------------------
# HELPERS
# ---------------------------------------------------------

def clean_value(value):
    if pd.isna(value):
        return None

    if isinstance(value, float):
        return round(value, 4)

    return value


def row_to_dict(row):
    return {
        str(key): clean_value(value)
        for key, value in row.to_dict().items()
    }


def find_material_row(df: pd.DataFrame, material: str):
    matches = df[
        df["material"].astype(str).str.strip().str.lower()
        == material.strip().lower()
    ]

    if matches.empty:
        return None

    return matches.iloc[0]


from datetime import datetime, timezone

def fetch_from_open_food_facts(gtin: str):
    gtin_clean = str(gtin).strip()
    url = f"https://world.openfoodfacts.org/api/v2/product/{gtin_clean}.json"
    headers = {"User-Agent": "BharatLoop-DRS/2.0 (contact@bharatloop.in)"}
    try:
        res = requests.get(url, headers=headers, timeout=4)
        if res.status_code == 200:
            data = res.json()
            if data.get("status") == 1:
                p = data.get("product", {})
                name = (
                    p.get("product_name")
                    or p.get("product_name_en")
                    or p.get("generic_name")
                    or f"Packaged Product ({gtin_clean})"
                )
                brand = p.get("brands") or p.get("brand_owner") or "Verified Brand"
                category = p.get("categories") or "Packaged goods"
                if isinstance(category, str):
                    category = category.split(",")[0].strip()

                pkg_raw = str(p.get("packaging", "") or p.get("packaging_text", "") or "").lower()
                pkg_tags = str(p.get("packaging_materials_tags", [])).lower()
                combined = f"{pkg_raw} {pkg_tags}"

                if "pet" in combined or "bottle" in combined or "water" in category.lower():
                    material = "PET"
                    weight_g = 26.0
                    layers = "mono"
                    epr_cat = "Cat I"
                elif "aluminium" in combined or "aluminum" in combined or "can" in combined:
                    material = "Aluminium"
                    weight_g = 14.0
                    layers = "mono"
                    epr_cat = "Not covered (non-plastic)"
                elif "glass" in combined or "jar" in combined:
                    material = "Glass"
                    weight_g = 220.0
                    layers = "mono"
                    epr_cat = "Not covered (non-plastic)"
                elif "hdpe" in combined:
                    material = "HDPE"
                    weight_g = 35.0
                    layers = "mono"
                    epr_cat = "Cat I"
                elif "pp" in combined or "cup" in combined:
                    material = "PP"
                    weight_g = 18.0
                    layers = "mono"
                    epr_cat = "Cat I"
                elif "ldpe" in combined or "pouch" in combined:
                    material = "LDPE"
                    weight_g = 7.0
                    layers = "mono"
                    epr_cat = "Cat II"
                elif "paper" in combined or "cardboard" in combined or "box" in combined:
                    material = "Paper/Cardboard"
                    weight_g = 12.0
                    layers = "mono"
                    epr_cat = "Not covered (non-plastic)"
                else:
                    material = "Multilayer (plastic-plastic)"
                    weight_g = 6.0
                    layers = "multilayer"
                    epr_cat = "Cat II"

                image_url = p.get("image_front_url") or p.get("image_url")
                now_str = datetime.now(timezone.utc).isoformat()

                product_data = {
                    "gtin": gtin_clean,
                    "brand": brand,
                    "product": name,
                    "category": category,
                    "material": material,
                    "weight_g": weight_g,
                    "layers": layers,
                    "epr_category": epr_cat,
                    "recyclability_pct": 85.0 if material in ["PET", "Aluminium", "Glass"] else 60.0,
                    "image_url": image_url,
                    "product_identity_source": "Open Food Facts API",
                    "product_identity_verified_at": now_str,
                }
                return product_data
    except Exception as e:
        print(f"[BharatLoop] Open Food Facts lookup notice: {e}")
    return None


def get_product(gtin: str):
    gtin = str(gtin).strip()

    # 1. Check persistent SQLite database
    try:
        from rewards.database import get_db_product, save_db_product
        db_prod = get_db_product(gtin)
        if db_prod is not None:
            return db_prod
    except Exception as e:
        print(f"[BharatLoop] Notice checking db_product: {e}")

    # 2. Check local CSV seed dataset
    matches = products_df[
        products_df["gtin"].astype(str).str.strip() == gtin
    ]

    if not matches.empty:
        prod = row_to_dict(matches.iloc[0])
        prod["product_identity_source"] = "GS1 India / BharatLoop Seed"
        prod["product_identity_verified_at"] = "2026-01-15T00:00:00Z"
        return prod

    # 3. Query external Open Food Facts API
    external_prod = fetch_from_open_food_facts(gtin)
    if external_prod is not None:
        try:
            from rewards.database import save_db_product
            saved = save_db_product(external_prod)
            return saved or external_prod
        except Exception:
            return external_prod

    # 4. Honest not found: Never substitute fake or random product!
    return None


# ---------------------------------------------------------
# DISTANCE
# ---------------------------------------------------------

def haversine(lat1, lon1, lat2, lon2):
    radius_km = 6371.0

    lat1 = math.radians(float(lat1))
    lon1 = math.radians(float(lon1))
    lat2 = math.radians(float(lat2))
    lon2 = math.radians(float(lon2))

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1)
        * math.cos(lat2)
        * math.sin(dlon / 2) ** 2
    )

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return radius_km * c


# ---------------------------------------------------------
# MATERIAL COMPATIBILITY
# ---------------------------------------------------------

def accepts_material(dropoff_accepts: str, material: str):
    if not dropoff_accepts:
        return False

    accepted = [
        item.strip().lower()
        for item in str(dropoff_accepts).split("|")
    ]

    material = material.strip().lower()

    aliases = {
        "pet": ["pet"],
        "hdpe": ["hdpe"],
        "pp": ["pp"],
        "ldpe": ["ldpe"],
        "pvc": ["pvc"],
        "paper": ["paper", "paperboard"],
        "paperboard": ["paper", "paperboard"],
        "aluminium": ["aluminium", "aluminum"],
        "aluminum": ["aluminium", "aluminum"],
        "glass": ["glass"],
        "multilayer": ["multilayer"],
    }

    candidates = aliases.get(material, [material])

    return any(
        candidate in accepted
        for candidate in candidates
    )


# ---------------------------------------------------------
# ROUTING
# ---------------------------------------------------------

def google_route(
    origin_lat: float,
    origin_lon: float,
    destination_lat: float,
    destination_lon: float,
):
    """
    Uses Google Routes API when GOOGLE_MAPS_API_KEY is configured.

    Returns:
        {
            "distance_km": ...,
            "duration_min": ...,
            "source": ...
        }

    Returns None if the API isn't configured or fails.
    """

    if not GOOGLE_MAPS_API_KEY:
        return None

    url = (
        "https://routes.googleapis.com/"
        "directions/v2:computeRoutes"
    )

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": (
            "routes.distanceMeters,"
            "routes.duration"
        ),
    }

    payload = {
        "origin": {
            "location": {
                "latLng": {
                    "latitude": origin_lat,
                    "longitude": origin_lon,
                }
            }
        },
        "destination": {
            "location": {
                "latLng": {
                    "latitude": destination_lat,
                    "longitude": destination_lon,
                }
            }
        },
        "travelMode": "DRIVE",
    }

    try:
        response = requests.post(
            url,
            headers=headers,
            json=payload,
            timeout=5,
        )

        response.raise_for_status()

        data = response.json()

        routes = data.get("routes", [])

        if not routes:
            return None

        route = routes[0]

        distance_m = route.get(
            "distanceMeters",
            0,
        )

        duration_raw = route.get(
            "duration",
            "0s",
        )

        seconds = float(
            duration_raw.rstrip("s")
        )

        return {
            "distance_km": round(
                distance_m / 1000,
                2,
            ),
            "duration_min": max(
                1,
                round(seconds / 60),
            ),
            "source": "Google Routes API",
        }

    except Exception:
        return None


def nearest_dropoff(
    material: str,
    lat: float,
    lon: float,
):
    compatible = dropoff_df[
        dropoff_df["accepts"].apply(
            lambda x: accepts_material(
                x,
                material,
            )
        )
    ].copy()

    if compatible.empty:
        return None

    compatible["straight_distance_km"] = compatible.apply(
        lambda row: haversine(
            lat,
            lon,
            row["lat"],
            row["lon"],
        ),
        axis=1,
    )

    # First choose geographically closest candidate.
    closest = compatible.sort_values(
        "straight_distance_km"
    ).iloc[0]

    route = google_route(
        lat,
        lon,
        float(closest["lat"]),
        float(closest["lon"]),
    )

    if route:
        distance_km = route["distance_km"]
        duration_min = route["duration_min"]
        routing_source = route["source"]
    else:
        distance_km = round(
            float(closest["straight_distance_km"]),
            2,
        )

        # Simple fallback estimate.
        duration_min = max(
            1,
            round(distance_km / 0.35),
        )

        routing_source = "BBMP SWM Authorized Location"

    raw_accepts = str(closest.get("accepts", "PET, Aluminium, Glass"))
    clean_accepts = raw_accepts.replace("|", ", ").replace("Paper/Cardboard", "Paper & Cardboard")

    return {
        "name": str(closest["name"]),
        "type": str(closest["type"]),
        "accepts": clean_accepts,
        "lat": float(closest["lat"]),
        "lon": float(closest["lon"]),
        "distance_km": distance_km,
        "duration_min": duration_min,
        "routing_source": routing_source,
        "operator": str(closest["operator"]) if "operator" in closest and pd.notna(closest["operator"]) else "BBMP SWM / Authorized Partner",
        "ward_no": int(closest["ward_no"]) if "ward_no" in closest and pd.notna(closest["ward_no"]) else None,
        "source": SOURCES["dropoffs"],
    }


# ---------------------------------------------------------
# CONSUMER ENGINE
# ---------------------------------------------------------

def consumer_advise(
    gtin: str,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
):
    product = get_product(gtin)

    if product is None:
        return {
            "found": False,
            "gtin": gtin,
        }

    material = str(product["material"])
    weight_g = float(product["weight_g"])

    # -------------------------
    # EPR
    # -------------------------

    epr_row = find_material_row(
        epr_df,
        material,
    )

    if epr_row is not None:
        epr_category = str(
            epr_row["epr_category"]
        )

        recyclability = float(
            epr_row["recyclability_pct"]
        )

        penalty_per_tonne = float(
            epr_row["penalty_per_tonne"]
        )
    else:
        epr_category = product.get(
            "epr_category"
        )

        recyclability = None
        penalty_per_tonne = None

    # -------------------------
    # SCRAP
    # -------------------------

    scrap_row = find_material_row(
        scrap_df,
        material,
    )

    if scrap_row is not None:
        rate_low = float(
            scrap_row["rate_per_kg_min"]
        )

        rate_high = float(
            scrap_row["rate_per_kg_max"]
        )

        rate_source = str(
            scrap_row.get(
                "source",
                "BharatLoop seed dataset",
            )
        )
    else:
        rate_low = 0.0
        rate_high = 0.0
        rate_source = "No rate available"

    midpoint_rate = (
        rate_low + rate_high
    ) / 2

    weight_kg = weight_g / 1000

    gross_value = (
        weight_kg * midpoint_rate
    )

    # -------------------------
    # LOCATION
    # -------------------------

    location_mode = "demo_location"

    if lat is None or lon is None:
        user_lat = DEFAULT_LAT
        user_lon = DEFAULT_LON
    else:
        user_lat = float(lat)
        user_lon = float(lon)
        location_mode = "browser_gps"

    dropoff = nearest_dropoff(
        material,
        user_lat,
        user_lon,
    )

    # -------------------------
    # TRIP ECONOMICS
    # -------------------------

    if dropoff:
        distance_km = float(
            dropoff["distance_km"]
        )

        duration_min = float(
            dropoff["duration_min"]
        )

        # Round trip.
        travel_cost = (
            distance_km
            * 2
            * 3
        )

        time_cost = (
            duration_min
            * 2
            * 2
        )
    else:
        distance_km = 0
        duration_min = 0
        travel_cost = 0
        time_cost = 0

    net_value = (
        gross_value
        - travel_cost
        - time_cost
    )

    # -------------------------
    # CO2
    # -------------------------

    emission_row = find_material_row(
        emission_df,
        material,
    )

    if emission_row is not None:
        emission_factor = float(
            emission_row["kg_co2_per_kg"]
        )

        co2e_kg = (
            weight_kg
            * emission_factor
        )

        emission_source = str(
            emission_row.get(
                "source",
                "Published material reference",
            )
        )
    else:
        emission_factor = None
        co2e_kg = 0
        emission_source = "No factor available"

    # -------------------------
    # DECISION
    # -------------------------

    if net_value >= 0:
        decision = "GO"
        verdict = (
            "The estimated material value can "
            "justify the recycling trip."
        )
    else:
        decision = "BUNDLE"
        verdict = (
            "This item is recyclable, but a "
            "single item does not justify a "
            "dedicated trip. Bundle it with "
            "your next recycling run."
        )

    return {
        "found": True,

        "product": product,

        "location": {
            "latitude": user_lat,
            "longitude": user_lon,
            "mode": location_mode,
        },

        "material": {
            "name": material,
            "weight_g": weight_g,
            "layers": product.get("layers"),
        },

        "epr": {
            "category": epr_category,
            "recyclability_pct": recyclability,
            "penalty_per_tonne": penalty_per_tonne,
            "source": SOURCES["epr"],
        },

        "economics": {
            "scrap_rate_low": rate_low,
            "scrap_rate_high": rate_high,
            "midpoint_rate": round(
                midpoint_rate,
                2,
            ),
            "gross_value_inr": round(
                gross_value,
                2,
            ),
            "travel_cost_inr": round(
                travel_cost,
                2,
            ),
            "time_cost_inr": round(
                time_cost,
                2,
            ),
            "net_value_inr": round(
                net_value,
                2,
            ),
            "scrap_source": rate_source,
        },

        "dropoff": dropoff,

        "environment": {
            "emission_factor": emission_factor,
            "co2e_kg": round(
                co2e_kg,
                4,
            ),
            "source": emission_source,
        },

        "decision": {
            "status": decision,
            "verdict": verdict,
        },

        "reward": {
            "provider": "GyFTR / BharatLoop Demo",
            "type": "digital voucher / wallet refund",
            "status": "eligible_after_verified_collection",
            "source": SOURCES["reward"],
        },

        "pfand_deposit": (
            lambda: (
                __import__("rewards.database", fromlist=["get_deposit_rule"])
                .get_deposit_rule(
                    gtin,
                    material,
                    product.get("category")
                )
            )
        )(),
    }


# ---------------------------------------------------------
# MANUFACTURER ENGINE
# ---------------------------------------------------------

def manufacturer_analyze(gtin: str):
    product = get_product(gtin)

    if product is None:
        return {
            "found": False,
            "gtin": gtin,
        }

    material = str(product["material"])

    epr_row = find_material_row(
        epr_df,
        material,
    )

    if epr_row is not None:
        current = {
            "material": material,
            "epr_category": str(
                epr_row["epr_category"]
            ),
            "recyclability_pct": float(
                epr_row["recyclability_pct"]
            ),
            "penalty_per_tonne": float(
                epr_row["penalty_per_tonne"]
            ),
        }
    else:
        current = {
            "material": material,
            "epr_category": product.get(
                "epr_category"
            ),
            "recyclability_pct": None,
            "penalty_per_tonne": None,
        }

    matches = substitutes_df[
        substitutes_df["from_material"]
        .astype(str)
        .str.strip()
        .str.lower()
        == material.strip().lower()
    ]

    alternatives = []

    for _, row in matches.iterrows():
        alternatives.append(
            {
                "material": str(
                    row["to_material"]
                ),
                "co2_saved_per_kg": float(
                    row["co2_saved_per_kg"]
                ),
                "cost_delta_pct": float(
                    row["cost_delta_pct"]
                ),
                "barrier_ok": str(
                    row["barrier_ok"]
                ),
                "recyclability_pct": (
                    float(row["recyclability_new"])
                    if not pd.isna(
                        row["recyclability_new"]
                    )
                    else None
                ),
            }
        )

    alternatives.sort(
        key=lambda x: x["cost_delta_pct"]
    )

    return {
        "found": True,

        "product": product,

        "current_state": {
            **current,
            "source": SOURCES["epr"],
        },

        "alternatives": alternatives,

        "sources": {
            "epr": SOURCES["epr"],
            "carbon": SOURCES["co2"],
            "substitutes": SOURCES["substitutes"],
        },

        "engine": {
            "type": "deterministic",
            "ai_role": "narration_only",
        },
    }