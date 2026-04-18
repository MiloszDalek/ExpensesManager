from sqlalchemy.orm import Session
from app.repositories import SettlementRepository
from .group_service import GroupService
from .balance_service import BalanceService
from .paypal_service import PayPalService
from app.schemas import (
    SettlementCreate,
    PayPalSettlementInitiateCreate,
    PayPalSettlementInitiateResponse,
    PayPalTotalSettlementInitiateCreate,
    PayPalTotalSettlementInitiateResponse,
)
from app.models import Settlement
from app.enums import PaymentMethod, SettlementStatus
from fastapi import HTTPException
from decimal import Decimal
from collections import defaultdict


class SettlementService:
    def __init__(self, db: Session):
        self.settlement_repo = SettlementRepository(db)
        self.group_service = GroupService(db)
        self.balance_service = BalanceService(db)
        self.paypal_service = PayPalService()

    def _resolve_group_currency(self, group_id: int):
        group = self.group_service.group_repo.get_by_id(group_id)
        if group is None:
            raise HTTPException(404, "Group not found")
        return group.currency

    def _resolve_group_settlement_amount(self, to_user_id: int, group_id: int, from_user_id: int):
        if from_user_id == to_user_id:
            raise HTTPException(400, "Cannot settle with yourself")

        group = self.group_service.get_group(group_id, from_user_id)

        self.group_service.get_member(group.id, from_user_id)
        self.group_service.get_member(group.id, to_user_id)

        balances = self.balance_service.get_group_balances(group.id, from_user_id)

        balance_with_user = None
        for item in balances.balances:
            if item.user_id == to_user_id:
                balance_with_user = item.amount
                break

        if balance_with_user is None:
            raise HTTPException(400, "No balance with this user")

        if balance_with_user == 0:
            raise HTTPException(400, "No debt between users")

        if balance_with_user > 0:
            raise HTTPException(400, "This user owes you money")

        return group, abs(balance_with_user)

    def _extract_capture_id(self, capture_response: dict) -> str | None:
        purchase_units = capture_response.get("purchase_units")
        if not isinstance(purchase_units, list) or not purchase_units:
            return None

        first_unit = purchase_units[0]
        if not isinstance(first_unit, dict):
            return None

        payments = first_unit.get("payments")
        if not isinstance(payments, dict):
            return None

        captures = payments.get("captures")
        if not isinstance(captures, list) or not captures:
            return None

        first_capture = captures[0]
        if not isinstance(first_capture, dict):
            return None

        capture_id = first_capture.get("id")
        return capture_id if isinstance(capture_id, str) else None

    def _extract_webhook_order_id(self, event_type: str, resource: dict) -> str | None:
        if event_type == "CHECKOUT.ORDER.APPROVED":
            order_id = resource.get("id")
            return order_id if isinstance(order_id, str) else None

        supplementary_data = resource.get("supplementary_data")
        if not isinstance(supplementary_data, dict):
            return None

        related_ids = supplementary_data.get("related_ids")
        if not isinstance(related_ids, dict):
            return None

        order_id = related_ids.get("order_id")
        return order_id if isinstance(order_id, str) else None

    def _mark_order_settlements_completed(
        self,
        settlements: list[Settlement],
        capture_id: str | None,
        fallback_order_id: str,
    ) -> Settlement:
        if not settlements:
            raise HTTPException(404, "Settlement not found for this PayPal order")

        for settlement in settlements:
            settlement.status = SettlementStatus.COMPLETED
            if settlement.payment_method == PaymentMethod.PAYPAL:
                settlement.paypal_capture_id = capture_id
                settlement.transaction_id = capture_id or fallback_order_id

        self.settlement_repo.save_all()
        primary = next((s for s in settlements if s.payment_method == PaymentMethod.PAYPAL), settlements[0])
        return primary
    

    def create_group_settlement(self, settlement_in: SettlementCreate, from_user_id: int) -> Settlement:
        if settlement_in.group_id is None:
            raise HTTPException(400, "Group id is required")

        group, amount_to_settle = self._resolve_group_settlement_amount(
            to_user_id=settlement_in.to_user_id,
            group_id=settlement_in.group_id,
            from_user_id=from_user_id,
        )
        
        settlement = Settlement(
            from_user_id=from_user_id,
            to_user_id=settlement_in.to_user_id,
            group_id=group.id,
            amount=amount_to_settle,
            currency=group.currency,
            payment_method=PaymentMethod.CASH,
            transaction_id=settlement_in.transaction_id,
        )

        self.settlement_repo.create(settlement)
        self.settlement_repo.save_all()

        return settlement

    def initiate_group_paypal_settlement(
        self,
        settlement_in: PayPalSettlementInitiateCreate,
        from_user_id: int,
    ) -> PayPalSettlementInitiateResponse:
        self.paypal_service.ensure_available()

        group, amount_to_settle = self._resolve_group_settlement_amount(
            to_user_id=settlement_in.to_user_id,
            group_id=settlement_in.group_id,
            from_user_id=from_user_id,
        )

        settlement = Settlement(
            from_user_id=from_user_id,
            to_user_id=settlement_in.to_user_id,
            group_id=group.id,
            amount=amount_to_settle,
            currency=group.currency,
            payment_method=PaymentMethod.PAYPAL,
            status=SettlementStatus.PENDING_PAYPAL,
        )

        self.settlement_repo.create(settlement)
        self.settlement_repo.save_all()

        currency_code = group.currency.value if hasattr(group.currency, "value") else str(group.currency)

        try:
            order_data = self.paypal_service.create_order(
                settlement_id=settlement.id,
                amount=Decimal(settlement.amount),
                currency=currency_code,
                description=f"Expenses Manager group settlement #{group.id}",
            )
            settlement.paypal_order_id = order_data["order_id"]
            self.settlement_repo.save_all()
        except HTTPException:
            settlement.status = SettlementStatus.FAILED
            self.settlement_repo.save_all()
            raise

        return PayPalSettlementInitiateResponse(
            settlement_id=settlement.id,
            order_id=order_data["order_id"],
            approve_url=order_data["approve_url"],
            status=settlement.status,
        )

    def initiate_total_paypal_settlement(
        self,
        settlement_in: PayPalTotalSettlementInitiateCreate,
        from_user_id: int,
    ) -> PayPalTotalSettlementInitiateResponse:
        self.paypal_service.ensure_available()

        if from_user_id == settlement_in.to_user_id:
            raise HTTPException(400, "Cannot settle with yourself")

        balances_by_group = self.balance_service.get_contacts_balances_by_group(
            current_user_id=from_user_id,
            other_user_id=settlement_in.to_user_id,
        )

        balances_by_currency = defaultdict(list)
        for item in balances_by_group:
            currency = self._resolve_group_currency(item.group_id)
            balances_by_currency[currency].append({
                "group_id": item.group_id,
                "balance": Decimal(item.balance),
            })

        payable_currencies: list[dict] = []

        for currency, items in balances_by_currency.items():
            debt_buckets = [
                {"group_id": item["group_id"], "remaining": abs(item["balance"])}
                for item in items
                if item["balance"] < 0
            ]
            credit_buckets = [
                {"group_id": item["group_id"], "remaining": item["balance"]}
                for item in items
                if item["balance"] > 0
            ]

            total_debt = sum((bucket["remaining"] for bucket in debt_buckets), Decimal("0.00"))
            total_credit = sum((bucket["remaining"] for bucket in credit_buckets), Decimal("0.00"))

            if total_debt <= 0:
                continue

            offset_amount = min(total_debt, total_credit)
            net_cash_amount = total_debt - offset_amount

            if net_cash_amount > 0:
                payable_currencies.append(
                    {
                        "currency": currency,
                        "debt_buckets": debt_buckets,
                        "credit_buckets": credit_buckets,
                        "offset_amount": offset_amount,
                        "net_cash_amount": net_cash_amount,
                    }
                )

        if len(payable_currencies) == 0:
            raise HTTPException(400, "No payable amount for PayPal settlement")

        if len(payable_currencies) > 1:
            raise HTTPException(400, "Total PayPal settlement supports one currency at a time")

        plan = payable_currencies[0]
        currency = plan["currency"]
        debt_buckets = plan["debt_buckets"]
        credit_buckets = plan["credit_buckets"]
        offset_amount = plan["offset_amount"]
        net_cash_amount = plan["net_cash_amount"]

        settlements: list[Settlement] = []

        def create_pending_record(
            payer_user_id: int,
            receiver_user_id: int,
            group_id: int,
            amount: Decimal,
            payment_method: PaymentMethod,
        ):
            if amount <= 0:
                return

            settlement = Settlement(
                from_user_id=payer_user_id,
                to_user_id=receiver_user_id,
                group_id=group_id,
                amount=amount,
                currency=currency,
                payment_method=payment_method,
                status=SettlementStatus.PENDING_PAYPAL,
            )
            self.settlement_repo.create(settlement)
            settlements.append(settlement)

        remaining_cash = net_cash_amount
        for bucket in debt_buckets:
            if remaining_cash <= 0:
                break

            chunk = min(bucket["remaining"], remaining_cash)
            create_pending_record(
                payer_user_id=from_user_id,
                receiver_user_id=settlement_in.to_user_id,
                group_id=bucket["group_id"],
                amount=chunk,
                payment_method=PaymentMethod.PAYPAL,
            )
            bucket["remaining"] -= chunk
            remaining_cash -= chunk

        remaining_offset = offset_amount
        for bucket in debt_buckets:
            if remaining_offset <= 0:
                break

            chunk = min(bucket["remaining"], remaining_offset)
            create_pending_record(
                payer_user_id=from_user_id,
                receiver_user_id=settlement_in.to_user_id,
                group_id=bucket["group_id"],
                amount=chunk,
                payment_method=PaymentMethod.OFFSET_APPLIED,
            )
            bucket["remaining"] -= chunk
            remaining_offset -= chunk

        remaining_forgiven = offset_amount
        for bucket in credit_buckets:
            if remaining_forgiven <= 0:
                break

            chunk = min(bucket["remaining"], remaining_forgiven)
            create_pending_record(
                payer_user_id=settlement_in.to_user_id,
                receiver_user_id=from_user_id,
                group_id=bucket["group_id"],
                amount=chunk,
                payment_method=PaymentMethod.OFFSET_FORGIVEN,
            )
            bucket["remaining"] -= chunk
            remaining_forgiven -= chunk

        self.settlement_repo.save_all()

        primary_settlement = next((s for s in settlements if s.payment_method == PaymentMethod.PAYPAL), None)
        if primary_settlement is None:
            raise HTTPException(400, "No payable amount for PayPal settlement")

        currency_code = currency.value if hasattr(currency, "value") else str(currency)

        try:
            order_data = self.paypal_service.create_order(
                settlement_id=primary_settlement.id,
                amount=Decimal(net_cash_amount),
                currency=currency_code,
                description=f"Expenses Manager total settlement with user #{settlement_in.to_user_id}",
            )
            order_id = order_data["order_id"]
            for settlement in settlements:
                settlement.paypal_order_id = order_id
            self.settlement_repo.save_all()
        except HTTPException:
            for settlement in settlements:
                settlement.status = SettlementStatus.FAILED
            self.settlement_repo.save_all()
            raise

        return PayPalTotalSettlementInitiateResponse(
            settlement_ids=[s.id for s in settlements],
            order_id=order_data["order_id"],
            approve_url=order_data["approve_url"],
            status=SettlementStatus.PENDING_PAYPAL,
        )

    def finalize_paypal_settlement(self, order_id: str, user_id: int) -> Settlement:
        self.paypal_service.ensure_available()

        settlements = self.settlement_repo.get_all_by_paypal_order_id(order_id)
        if len(settlements) == 0:
            raise HTTPException(404, "Settlement not found for this PayPal order")

        if any(s.from_user_id != user_id and s.to_user_id != user_id for s in settlements):
            raise HTTPException(403, "Not authorized")

        if all(s.status == SettlementStatus.COMPLETED for s in settlements):
            return next((s for s in settlements if s.payment_method == PaymentMethod.PAYPAL), settlements[0])

        capture_response = self.paypal_service.capture_order(order_id)
        capture_status = capture_response.get("status")

        if capture_status != "COMPLETED":
            for settlement in settlements:
                settlement.status = SettlementStatus.FAILED
            self.settlement_repo.save_all()
            raise HTTPException(400, "PayPal capture was not completed")

        capture_id = self._extract_capture_id(capture_response)
        return self._mark_order_settlements_completed(settlements, capture_id, order_id)

    def handle_paypal_webhook(self, headers: dict[str, str | None], event: dict):
        is_verified = self.paypal_service.verify_webhook_event(headers, event)
        if not is_verified:
            raise HTTPException(401, "Invalid PayPal webhook signature")

        event_type = event.get("event_type")
        if not isinstance(event_type, str):
            return {"status": "ignored", "reason": "missing_event_type"}

        resource = event.get("resource")
        if not isinstance(resource, dict):
            return {"status": "ignored", "reason": "missing_resource"}

        order_id = self._extract_webhook_order_id(event_type, resource)
        if not order_id:
            return {"status": "ignored", "reason": "missing_order_id"}

        settlements = self.settlement_repo.get_all_by_paypal_order_id(order_id)
        if len(settlements) == 0:
            return {"status": "ignored", "reason": "settlement_not_found"}

        if all(s.status == SettlementStatus.COMPLETED for s in settlements):
            return {"status": "ignored", "reason": "already_completed"}

        if event_type == "CHECKOUT.ORDER.APPROVED":
            capture_response = self.paypal_service.capture_order(order_id)
            capture_status = capture_response.get("status")
            if capture_status != "COMPLETED":
                for settlement in settlements:
                    settlement.status = SettlementStatus.FAILED
                self.settlement_repo.save_all()
                return {"status": "processed", "result": "capture_not_completed"}

            capture_id = self._extract_capture_id(capture_response)
            self._mark_order_settlements_completed(settlements, capture_id, order_id)
            return {"status": "processed", "result": "completed"}

        if event_type == "PAYMENT.CAPTURE.COMPLETED":
            capture_id = resource.get("id")
            capture_id_str = capture_id if isinstance(capture_id, str) else None
            self._mark_order_settlements_completed(settlements, capture_id_str, order_id)
            return {"status": "processed", "result": "completed"}

        if event_type in {"PAYMENT.CAPTURE.DENIED", "PAYMENT.CAPTURE.DECLINED"}:
            for settlement in settlements:
                settlement.status = SettlementStatus.FAILED
            self.settlement_repo.save_all()
            return {"status": "processed", "result": "failed"}

        return {"status": "ignored", "reason": "unsupported_event"}


    def create_total_settlement(self, settlement_in: SettlementCreate, from_user_id: int) -> list[Settlement]:
        if from_user_id == settlement_in.to_user_id:
            raise HTTPException(400, "Cannot settle with yourself")
        
        balances_by_group = self.balance_service.get_contacts_balances_by_group(
            current_user_id=from_user_id,
            other_user_id=settlement_in.to_user_id
        )

        balances_by_currency = defaultdict(list)
        for item in balances_by_group:
            currency = self._resolve_group_currency(item.group_id)
            balances_by_currency[currency].append({
                "group_id": item.group_id,
                "balance": Decimal(item.balance),
            })

        settlements = []

        for currency, items in balances_by_currency.items():
            debt_buckets = [
                {"group_id": item["group_id"], "remaining": abs(item["balance"]) }
                for item in items
                if item["balance"] < 0
            ]
            credit_buckets = [
                {"group_id": item["group_id"], "remaining": item["balance"] }
                for item in items
                if item["balance"] > 0
            ]

            total_debt = sum((bucket["remaining"] for bucket in debt_buckets), Decimal("0.00"))
            total_credit = sum((bucket["remaining"] for bucket in credit_buckets), Decimal("0.00"))

            if total_debt <= 0:
                continue

            offset_amount = min(total_debt, total_credit)
            net_cash_amount = total_debt - offset_amount

            def create_settlement_record(
                payer_user_id: int,
                receiver_user_id: int,
                group_id: int,
                amount: Decimal,
                payment_method: PaymentMethod = PaymentMethod.CASH,
                transaction_id: str | None = None,
            ):
                if amount <= 0:
                    return

                settlement = Settlement(
                    from_user_id=payer_user_id,
                    to_user_id=receiver_user_id,
                    group_id=group_id,
                    amount=amount,
                    currency=currency,
                    payment_method=payment_method,
                    transaction_id=transaction_id,
                )
                self.settlement_repo.create(settlement)
                settlements.append(settlement)

            remaining_cash = net_cash_amount
            for bucket in debt_buckets:
                if remaining_cash <= 0:
                    break

                chunk = min(bucket["remaining"], remaining_cash)
                create_settlement_record(
                    payer_user_id=from_user_id,
                    receiver_user_id=settlement_in.to_user_id,
                    group_id=bucket["group_id"],
                    amount=chunk,
                    transaction_id=settlement_in.transaction_id,
                )

                bucket["remaining"] -= chunk
                remaining_cash -= chunk

            remaining_offset = offset_amount
            for bucket in debt_buckets:
                if remaining_offset <= 0:
                    break

                chunk = min(bucket["remaining"], remaining_offset)
                create_settlement_record(
                    payer_user_id=from_user_id,
                    receiver_user_id=settlement_in.to_user_id,
                    group_id=bucket["group_id"],
                    amount=chunk,
                    payment_method=PaymentMethod.OFFSET_APPLIED,
                )

                bucket["remaining"] -= chunk
                remaining_offset -= chunk

            remaining_forgiven = offset_amount
            for bucket in credit_buckets:
                if remaining_forgiven <= 0:
                    break

                chunk = min(bucket["remaining"], remaining_forgiven)
                create_settlement_record(
                    payer_user_id=settlement_in.to_user_id,
                    receiver_user_id=from_user_id,
                    group_id=bucket["group_id"],
                    amount=chunk,
                    payment_method=PaymentMethod.OFFSET_FORGIVEN,
                )

                bucket["remaining"] -= chunk
                remaining_forgiven -= chunk

        if not settlements:
            raise HTTPException(400, "No debts to settle")

        self.settlement_repo.save_all()

        return settlements


    def get_settlements_by_group(self, group_id: int, limit: int, offset: int, user_id: int):
        group = self.group_service.get_group(group_id, user_id)

        return self.settlement_repo.get_by_group_id(group.id, limit, offset)
    

    def get_settlements_by_user(self, limit: int, offset: int, user_id: int):
        return self.settlement_repo.get_by_user_id(limit, offset, user_id)