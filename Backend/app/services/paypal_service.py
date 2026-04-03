import base64
import json
from decimal import Decimal
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fastapi import HTTPException

from app.core.config import get_settings


class PayPalService:
    def __init__(self):
        self.settings = get_settings()

    @property
    def base_url(self) -> str:
        return (
            "https://api-m.paypal.com"
            if self.settings.PAYPAL_MODE == "live"
            else "https://api-m.sandbox.paypal.com"
        )

    def _ensure_configured(self) -> None:
        if not self.settings.PAYPAL_ENABLED:
            raise HTTPException(503, "PayPal integration not configured")

        if not self.settings.PAYPAL_CLIENT_ID or not self.settings.PAYPAL_CLIENT_SECRET:
            raise HTTPException(503, "PayPal integration not configured")

    def _request(
        self,
        method: str,
        path: str,
        headers: dict[str, str],
        payload: dict | None = None,
        is_form: bool = False,
    ) -> dict:
        url = f"{self.base_url}{path}"

        if payload is None:
            data: bytes | None = None
        elif is_form:
            data = urlencode(payload).encode("utf-8")
        else:
            data = json.dumps(payload).encode("utf-8")

        request = Request(url=url, data=data, method=method)
        for key, value in headers.items():
            request.add_header(key, value)

        try:
            with urlopen(request, timeout=30) as response:
                raw = response.read().decode("utf-8")
                if not raw:
                    return {}
                return json.loads(raw)
        except HTTPError as exc:
            body = exc.read().decode("utf-8", errors="ignore") if exc.fp else ""
            detail = "PayPal request failed"
            if body:
                try:
                    parsed = json.loads(body)
                    message = parsed.get("message") or parsed.get("error_description")
                    if isinstance(message, str) and message.strip():
                        detail = f"PayPal request failed: {message}"
                except json.JSONDecodeError:
                    detail = "PayPal request failed"
            raise HTTPException(502, detail) from exc
        except URLError as exc:
            raise HTTPException(502, "PayPal request failed") from exc

    def get_access_token(self) -> str:
        self._ensure_configured()

        credentials = f"{self.settings.PAYPAL_CLIENT_ID}:{self.settings.PAYPAL_CLIENT_SECRET}"
        auth = base64.b64encode(credentials.encode("utf-8")).decode("utf-8")

        response = self._request(
            method="POST",
            path="/v1/oauth2/token",
            headers={
                "Authorization": f"Basic {auth}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            payload={"grant_type": "client_credentials"},
            is_form=True,
        )

        token = response.get("access_token")
        if not isinstance(token, str) or not token:
            raise HTTPException(502, "Could not authenticate PayPal client")

        return token

    def create_order(self, settlement_id: int, amount: Decimal, currency: str, description: str) -> dict:
        token = self.get_access_token()
        return_url = self.settings.PAYPAL_RETURN_URL or f"{self.settings.FRONTEND_URL}/paypal/return"
        cancel_url = self.settings.PAYPAL_CANCEL_URL or f"{self.settings.FRONTEND_URL}/dashboard?paypal=cancelled"

        response = self._request(
            method="POST",
            path="/v2/checkout/orders",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Prefer": "return=representation",
            },
            payload={
                "intent": "CAPTURE",
                "purchase_units": [
                    {
                        "reference_id": str(settlement_id),
                        "description": description,
                        "custom_id": str(settlement_id),
                        "amount": {
                            "currency_code": currency,
                            "value": f"{amount:.2f}",
                        },
                    }
                ],
                "application_context": {
                    "return_url": return_url,
                    "cancel_url": cancel_url,
                    "user_action": "PAY_NOW",
                },
            },
        )

        order_id = response.get("id")
        links = response.get("links")

        approve_url = None
        if isinstance(links, list):
            for link in links:
                if not isinstance(link, dict):
                    continue
                if link.get("rel") == "approve":
                    href = link.get("href")
                    if isinstance(href, str) and href:
                        approve_url = href
                        break

        if not isinstance(order_id, str) or not order_id or not approve_url:
            raise HTTPException(502, "Could not create PayPal order")

        return {
            "order_id": order_id,
            "approve_url": approve_url,
            "raw": response,
        }

    def capture_order(self, order_id: str) -> dict:
        token = self.get_access_token()

        return self._request(
            method="POST",
            path=f"/v2/checkout/orders/{order_id}/capture",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Prefer": "return=representation",
            },
            payload={},
        )

    def verify_webhook_event(self, headers: dict[str, str | None], event: dict) -> bool:
        token = self.get_access_token()

        required_headers = [
            "paypal-auth-algo",
            "paypal-cert-url",
            "paypal-transmission-id",
            "paypal-transmission-sig",
            "paypal-transmission-time",
        ]

        if not self.settings.PAYPAL_WEBHOOK_ID:
            return False

        for header in required_headers:
            value = headers.get(header)
            if value is None or value == "":
                return False

        response = self._request(
            method="POST",
            path="/v1/notifications/verify-webhook-signature",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            payload={
                "auth_algo": headers["paypal-auth-algo"],
                "cert_url": headers["paypal-cert-url"],
                "transmission_id": headers["paypal-transmission-id"],
                "transmission_sig": headers["paypal-transmission-sig"],
                "transmission_time": headers["paypal-transmission-time"],
                "webhook_id": self.settings.PAYPAL_WEBHOOK_ID,
                "webhook_event": event,
            },
        )

        return response.get("verification_status") == "SUCCESS"
