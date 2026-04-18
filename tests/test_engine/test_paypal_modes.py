from decimal import Decimal

import pytest
from fastapi import HTTPException

from app.core.config import get_settings
from app.services import PayPalService


@pytest.fixture(autouse=True)
def _clear_settings_cache():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def _set_paypal_env(monkeypatch: pytest.MonkeyPatch, *, enabled: bool, mode: str) -> None:
    monkeypatch.setenv("PAYPAL_ENABLED", "true" if enabled else "false")
    monkeypatch.setenv("PAYPAL_MODE", mode)
    monkeypatch.delenv("PAYPAL_CLIENT_ID", raising=False)
    monkeypatch.delenv("PAYPAL_CLIENT_SECRET", raising=False)
    get_settings.cache_clear()


def test_paypal_disabled_mode_rejects_requests(monkeypatch: pytest.MonkeyPatch):
    _set_paypal_env(monkeypatch, enabled=False, mode="sandbox")

    service = PayPalService()

    with pytest.raises(HTTPException) as exc:
        service.ensure_available()

    assert exc.value.status_code == 503
    assert exc.value.detail == "PayPal integration disabled"



def test_paypal_mock_mode_uses_in_process_flow(monkeypatch: pytest.MonkeyPatch):
    _set_paypal_env(monkeypatch, enabled=True, mode="mock")

    service = PayPalService()

    order = service.create_order(
        settlement_id=123,
        amount=Decimal("25.50"),
        currency="PLN",
        description="Mock settlement",
    )

    assert order["order_id"].startswith("MOCK-123-")
    assert order["approve_url"].startswith("http://localhost:5173/")

    capture = service.capture_order(order["order_id"])
    assert capture["status"] == "COMPLETED"

    assert service.verify_webhook_event(headers={}, event={}) is True
