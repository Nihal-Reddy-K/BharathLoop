import pandas as pd
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
RULES_PATH = BASE_DIR / "data" / "reward_rules.csv"


def load_reward_rules():
    return pd.read_csv(RULES_PATH)


def calculate_reward(material, weight_g):
    """
    Calculate the BharatLoop recycling reward.

    Reward is determined from the configurable reward_rules.csv
    rather than being hardcoded in the API.
    """

    rules = load_reward_rules()

    material = str(material).strip()

    # Case-insensitive material matching
    matches = rules[
        (rules["material"].astype(str).str.strip().str.lower() == material.lower())
        & (
            rules["active"]
            .astype(str)
            .str.lower()
            .isin(["true", "1", "yes"])
        )
    ]

    if matches.empty:
        return {
            "eligible": False,
            "material": material,
            "weight_g": float(weight_g),
            "reason": "No active reward rule exists for this material.",
        }

    rule = matches.iloc[0]

    weight_g = float(weight_g)
    weight_kg = weight_g / 1000

    base_rate = float(rule["base_reward_inr_per_kg"])

    raw_reward = weight_kg * base_rate

    min_reward = float(rule["min_reward_inr"])
    max_reward = float(rule["max_reward_inr"])

    # Clamp reward between configured minimum and maximum
    reward = max(min_reward, min(raw_reward, max_reward))

    return {
        "eligible": True,
        "material": material,
        "weight_g": weight_g,
        "weight_kg": round(weight_kg, 4),
        "base_rate_inr_per_kg": base_rate,
        "raw_reward_inr": round(raw_reward, 2),
        "reward_inr": round(reward, 2),
        "min_reward_inr": min_reward,
        "max_reward_inr": max_reward,
        "verification_required": str(
            rule["verification_required"]
        ).lower() in ["true", "1", "yes"],
        "source": "BharatLoop reward rules",
    }