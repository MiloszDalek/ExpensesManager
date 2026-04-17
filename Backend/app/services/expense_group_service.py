from sqlalchemy.orm import Session
from app.repositories import ExpenseRepository, ExpenseShareRepository
from .category_service import CategoryService
from .group_service import GroupService
from app.models import Expense, ExpenseShare
from app.schemas import GroupExpenseCreate, ExpenseShareSchema, GroupExpenseUpdate
from app.enums import CurrencyEnum, SplitType, GroupMemberRole
from fastapi import HTTPException
from decimal import Decimal

from .budget_service import BudgetService


class ExpenseGroupService:
    def __init__(self, db: Session):
        self.expense_repo = ExpenseRepository(db)
        self.share_repo = ExpenseShareRepository(db)
        self.category_service = CategoryService(db)
        self.group_service = GroupService(db)
        self.budget_service = BudgetService(db)

    def _sync_budget_state_for_users(
        self,
        user_ids: set[int],
        currency: CurrencyEnum,
        check_date,
    ):
        for current_user_id in user_ids:
            self.budget_service.sync_budget_state_for_date(
                user_id=current_user_id,
                currency=currency,
                check_date=check_date,
                enforce_overspending=False,
            )


    def get_group_expense(self, expense_id: int, group_id: int):
        expense = self.expense_repo.get_by_id(expense_id)
        
        if not expense:
            raise HTTPException(status_code=404, detail="Expense not found")
        if expense.group_id is None:
            raise HTTPException(status_code=400, detail="Not a group expense")
        if expense.group_id != group_id:
            raise HTTPException(status_code=404, detail="Expense not found")
        
        return expense


    def validate_participants(self, participants: list[ExpenseShareSchema], group_id: int):
        participant_ids = []

        for participant in participants:
            if not self.group_service.get_member(group_id, participant.user_id):
                raise HTTPException(status_code=404, detail="Participant not found in group")
            participant_ids.append(participant.user_id)
        
        if len(participant_ids) != len(set(participant_ids)):
            raise HTTPException(status_code=400, detail="Duplicate participants")


    def validate_payer_in_participants(self, participants: list[ExpenseShareSchema], user_id: int):
        payer_in_participants = any(p.user_id == user_id for p in participants)

        if not payer_in_participants:
            raise HTTPException(status_code=400, detail="Payer must be included in participants")


    def validate_split_amounts(self, shares: list[ExpenseShareSchema], amount: Decimal):
        if not shares:
            raise HTTPException(status_code=400, detail="Expense must have at least one participant")
        
        if any(s.share_amount <= 0 for s in shares):
            raise HTTPException(status_code=400, detail="Share amounts must be positive")

        total_split = sum(p.share_amount for p in shares)

        if total_split != amount:
            raise HTTPException(status_code=400, detail="Split amounts must add up to total expense amount")
        

    def validate_edit_permission(self, group_id: int, expense: Expense, user_id: int):
        member = self.group_service.get_member(group_id, user_id)
        if member.role != GroupMemberRole.ADMIN and expense.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized admin group role required or being expense creator")


    def create_group_expense(self, expense_in: GroupExpenseCreate, group_id: int, user_id: int) -> Expense:
        group = self.group_service.get_group(group_id, user_id)

        category = self.category_service.validate_available_for_group_expense(expense_in.category_id, group_id)

        if expense_in.currency != group.currency:
            raise HTTPException(status_code=400, detail="Expense currency must match group currency")

        self.validate_participants(expense_in.shares, group.id)
            
        # self.validate_payer_in_participants(expense_in.participants, user_id)

        self.validate_split_amounts(expense_in.shares, expense_in.amount)
        
        try: 
            expense = Expense(
                group_id = group.id,
                user_id=user_id,
                title=expense_in.title,
                amount=expense_in.amount,
                currency=CurrencyEnum(expense_in.currency.value),
                split_type=SplitType(expense_in.split_type.value),
                category_id=category.id,
                expense_date=expense_in.expense_date,
                notes=expense_in.notes,
                receipt_image_url=expense_in.receipt_image_url,
                receipt_text=expense_in.receipt_text
            )
            self.expense_repo.create(expense)

            for share in expense_in.shares:
                expenseShare = ExpenseShare(
                    expense_id=expense.id,
                    user_id=share.user_id,
                    share_amount=share.share_amount
                ) 
                self.share_repo.create(expenseShare)

            affected_user_ids = {share.user_id for share in expense_in.shares}
            self._sync_budget_state_for_users(
                user_ids=affected_user_ids,
                currency=expense.currency,
                check_date=expense.expense_date.date(),
            )

            self.expense_repo.save_all()

            return expense

        except Exception:
            self.expense_repo.db.rollback()
            raise


    def get_group_expenses(self, group_id: int, limit: int, offset: int, user_id: int) -> list[Expense]:
        group = self.group_service.get_group(group_id, user_id)

        return self.expense_repo.get_all_group_by_group_id(group.id, limit, offset)


    def update_group_expense(self, expense_in: GroupExpenseUpdate, group_id: int, expense_id: int, user_id: int) -> Expense:
        group = self.group_service.get_group(group_id, user_id)

        expense = self.get_group_expense(expense_id, group_id)

        self.validate_edit_permission(group.id, expense, user_id)

        next_currency = expense_in.currency if expense_in.currency is not None else expense.currency
        if next_currency != group.currency:
            raise HTTPException(status_code=400, detail="Expense currency must match group currency")
        
        if expense_in.amount and not expense_in.shares:
            raise HTTPException(status_code=400, detail="Updating amount requires expense shares")

        old_expense_date = expense.expense_date.date()
        old_currency = expense.currency
        old_share_user_ids = set(self.share_repo.list_user_ids_by_expense_id(expense.id))

        try:
            update_data = expense_in.model_dump(exclude_unset=True)

            shares = update_data.pop("shares", None)

            for field, value in update_data.items():
                setattr(expense, field, value)

            if shares is not None:
                self.validate_participants(expense_in.shares, group.id)

                if expense_in.amount is not None:
                    total_amount = expense_in.amount
                else:
                    total_amount = expense.amount

                self.validate_split_amounts(expense_in.shares, total_amount)

                self.share_repo.delete_by_expense_id(expense.id)

                for share in shares:
                    expenseShare = ExpenseShare(
                        expense_id=expense.id,
                        user_id=share["user_id"],
                        share_amount=share["share_amount"]
                    )
                    self.share_repo.create(expenseShare)

            new_share_user_ids = set(self.share_repo.list_user_ids_by_expense_id(expense.id))
            affected_user_ids = old_share_user_ids | new_share_user_ids

            new_expense_date = expense.expense_date.date()
            new_currency = expense.currency

            if old_currency == new_currency and old_expense_date == new_expense_date:
                self._sync_budget_state_for_users(
                    user_ids=affected_user_ids,
                    currency=new_currency,
                    check_date=new_expense_date,
                )
            else:
                self._sync_budget_state_for_users(
                    user_ids=affected_user_ids,
                    currency=old_currency,
                    check_date=old_expense_date,
                )
                self._sync_budget_state_for_users(
                    user_ids=affected_user_ids,
                    currency=new_currency,
                    check_date=new_expense_date,
                )

            self.expense_repo.save_all()

            return expense

        except Exception:
            self.expense_repo.db.rollback()
            raise


    def delete_group_expense(self, group_id: int, expense_id: int, user_id: int):
        group = self.group_service.get_group(group_id, user_id)

        expense = self.get_group_expense(expense_id, group_id)

        self.validate_edit_permission(group.id, expense, user_id)

        expense_date = expense.expense_date.date()
        expense_currency = expense.currency
        affected_user_ids = set(self.share_repo.list_user_ids_by_expense_id(expense.id))

        try: 
            self.expense_repo.delete(expense)
            self._sync_budget_state_for_users(
                user_ids=affected_user_ids,
                currency=expense_currency,
                check_date=expense_date,
            )
            self.expense_repo.save_all()

        except Exception:
            self.expense_repo.db.rollback()