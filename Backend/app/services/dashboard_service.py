from sqlalchemy.orm import Session
from app.repositories import ExpenseRepository, ExpenseShareRepository, SettlementRepository, GroupRepository
from app.models import Group


class DashboardService:
    def __init__(self, db: Session):
        self.expense_repo = ExpenseRepository(db)
        self.share_repo = ExpenseShareRepository(db)
        self.settlement_repo = SettlementRepository(db)
        self.group_repo = GroupRepository(db)


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


    def count_user_groups(self, user_id: int) -> int:
        return self.group_repo.count_user_groups(user_id)


    def get_user_groups(self, user_id: int) -> list[Group]:
        return self.group_repo.get_groups_by_user(user_id)


    def get_recent_expenses(self, user_id: int, limit: int = 5):
        return self.expense_repo.get_recent_expenses(user_id, limit)
    

    def get_category_spending(self, user_id: int):
        return self.expense_repo.get_recent_expenses(user_id)
    

    def get_full_dashboard(self, user_id: int, limit: int = 5):
        return {
            "statistics": {
                "total_owed": self.get_total_owed(user_id),
                "total_receivable": self.get_total_receivable(user_id),
                "personal_spending": self.get_personal_spending(user_id),
                "active_groups": self.count_user_groups(user_id),
            },
            "recent_expenses": self.get_recent_expenses(user_id, limit),
            "category_spending": self.get_category_spending(user_id),
            "group_list": self.get_user_groups(user_id),
            "group_balances": self.get_group_balances(user_id),
        }