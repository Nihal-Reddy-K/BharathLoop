import os
import secrets
from datetime import datetime, timedelta, timezone

from .database import create_voucher


class RewardProvider:
    name = "base"

    def issue_voucher(
        self,
        reward_id,
        user_id,
        amount,
    ):
        raise NotImplementedError


class DemoProvider(RewardProvider):
    name = "bharatloop_demo"

    def issue_voucher(
        self,
        reward_id,
        user_id,
        amount,
    ):
        voucher_id = (
            "BLV-"
            + secrets.token_hex(4).upper()
        )

        voucher_code = (
            "BHARAT-"
            + secrets.token_hex(4).upper()
        )

        expires_at = (
            datetime.now(
                timezone.utc
            )
            + timedelta(days=90)
        ).isoformat()

        return create_voucher(
            reward_id=reward_id,
            user_id=user_id,
            provider=self.name,
            amount=amount,
            voucher_code=voucher_code,
            voucher_id=voucher_id,
            expires_at=expires_at,
        )


class GyFTRProvider(RewardProvider):
    name = "gyftr"

    def issue_voucher(
        self,
        reward_id,
        user_id,
        amount,
    ):
        """
        Production integration boundary.

        This is intentionally not pretending to issue
        a real GyFTR voucher without credentials/API
        access.
        """

        api_key = os.getenv(
            "GYFTR_API_KEY"
        )

        if not api_key:
            raise RuntimeError(
                "GYFTR_API_KEY is not configured."
            )

        raise NotImplementedError(
            "Connect the GyFTR corporate voucher "
            "issuance endpoint here once API credentials "
            "and endpoint documentation are available."
        )


def get_provider():
    provider_name = os.getenv(
        "REWARD_PROVIDER",
        "demo",
    ).lower()

    if provider_name == "gyftr":
        return GyFTRProvider()

    return DemoProvider()