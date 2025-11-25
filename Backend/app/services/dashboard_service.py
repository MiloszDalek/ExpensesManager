from sqlalchemy.orm import Session
from app.repositories import ExpenseRepository, ExpenseShareRepository, SettlementRepository


class DashboardService:
    def __init__(self, db: Session):
        self.expense_repo = ExpenseRepository(db)
        self.share_repo = ExpenseShareRepository(db)
        self.settlement_repo = SettlementRepository(db)


    # 1. Ile ja komuś wiszę
    def get_total_owed(self, user_id: int) -> float:
        owed = self.share_repo.sum_user_owed(user_id)
        paid_back = self.settlement_repo.sum_payments_made_by(user_id)
        return round(owed - paid_back, 2)


    # 2. Ile ktoś mi wisi
    def get_total_receivable(self, user_id: int) -> float:
        receivable = self.share_repo.sum_user_is_owed(user_id)
        received = self.settlement_repo.sum_payments_received_by(user_id)
        return round(receivable - received, 2)


    # 3. Wydatki personalne
    def get_personal_spending(self, user_id: int) -> float:
        return self.expense_repo.sum_personal_expenses(user_id)


    # 4. Bilans na poziomie par użytkowników
    def get_group_balances(self, user_id: int):
        balances = {}

        # Kto komu ile powinien
        shares = self.share_repo.list_user_balances(user_id)
        for s in shares:
            key = (s.from_user, s.to_user)
            balances[key] = balances.get(key, 0) + s.amount

        # Odejmujemy settlementy
        settlements = self.settlement_repo.list_user_settlements(user_id)
        for st in settlements:
            key = (st.from_user, st.to_user)
            if key in balances:
                balances[key] -= st.amount

        return balances
