from decimal import Decimal, ROUND_HALF_UP

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import SavingsGoal, SavingsGoalAllocation
from app.repositories import BudgetRepository, SavingsGoalRepository
from app.schemas import SavingsGoalAllocateRequest, SavingsGoalCreate, SavingsGoalUpdate

from .budget_service import BudgetService


class GoalService:
    def __init__(self, db: Session):
        self.goal_repo = SavingsGoalRepository(db)
        self.budget_repo = BudgetRepository(db)

    @staticmethod
    def _round_money(value: Decimal | int | float) -> Decimal:
        return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    def _to_goal_response(self, goal: SavingsGoal) -> dict:
        state = goal.state

        current_amount = self._round_money(state.current_amount) if state else self._round_money(goal.current_amount)
        target_amount = self._round_money(state.target_amount) if state else self._round_money(goal.target_amount)

        if state is not None:
            if state.status == "ACTIVE":
                is_active = True
            elif state.status == "COMPLETED":
                is_active = False
            else:
                is_active = False
        else:
            is_active = goal.is_active

        return {
            "id": goal.id,
            "user_id": goal.user_id,
            "name": goal.name,
            "target_amount": target_amount,
            "current_amount": current_amount,
            "deadline": goal.deadline,
            "budget_pool_id": goal.budget_pool_id,
            "auto_allocate_amount": (
                self._round_money(goal.auto_allocate_amount)
                if goal.auto_allocate_amount is not None
                else None
            ),
            "is_active": is_active,
            "created_at": goal.created_at,
            "updated_at": goal.updated_at,
        }

    def _refresh_budget_engine_state(self, user_id: int, budget_ids: set[int], preferred_budget_id: int | None = None):
        budget_service = BudgetService(self.goal_repo.db)

        if budget_ids:
            for budget_id in sorted(budget_ids):
                budget_service.recalculate_budget_state(budget_id, user_id)
            return

        budget_service.refresh_goal_state_for_user(user_id, preferred_budget_id=preferred_budget_id, commit=True)

    def _assert_goal_access(self, goal_id: int, user_id: int) -> SavingsGoal:
        goal = self.goal_repo.get_goal_by_id_for_user(goal_id, user_id)
        if not goal:
            raise HTTPException(status_code=404, detail="Savings goal not found")
        return goal

    def _assert_pool_access(self, pool_id: int, user_id: int):
        pool = self.budget_repo.get_pool_by_id(pool_id)
        if not pool:
            raise HTTPException(status_code=404, detail="Budget pool not found")

        budget = self.budget_repo.get_plan_by_id(pool.budget_id)
        if not budget or budget.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")

        return pool

    def create_goal(self, goal_in: SavingsGoalCreate, user_id: int) -> SavingsGoal:
        if goal_in.target_amount <= 0:
            raise HTTPException(status_code=400, detail="target_amount must be greater than 0")

        if goal_in.auto_allocate_amount is not None and goal_in.auto_allocate_amount < 0:
            raise HTTPException(status_code=400, detail="auto_allocate_amount cannot be negative")

        linked_budget_id = None
        if goal_in.budget_pool_id is not None:
            linked_pool = self._assert_pool_access(goal_in.budget_pool_id, user_id)
            linked_budget_id = linked_pool.budget_id

        goal = SavingsGoal(
            user_id=user_id,
            name=goal_in.name,
            target_amount=self._round_money(goal_in.target_amount),
            current_amount=Decimal("0.00"),
            deadline=goal_in.deadline,
            budget_pool_id=goal_in.budget_pool_id,
            auto_allocate_amount=(
                self._round_money(goal_in.auto_allocate_amount)
                if goal_in.auto_allocate_amount is not None
                else None
            ),
            is_active=True,
        )

        self.goal_repo.create_goal(goal)
        self.goal_repo.save_all()
        self._refresh_budget_engine_state(
            user_id=user_id,
            budget_ids={linked_budget_id} if linked_budget_id is not None else set(),
            preferred_budget_id=linked_budget_id,
        )
        self.goal_repo.refresh(goal)
        return self._to_goal_response(goal)

    def list_goals(self, user_id: int, include_inactive: bool = False) -> list[SavingsGoal]:
        goals = self.goal_repo.list_goals_by_user(user_id, include_inactive=include_inactive)
        return [self._to_goal_response(goal) for goal in goals]

    def get_goal(self, goal_id: int, user_id: int) -> SavingsGoal:
        goal = self._assert_goal_access(goal_id, user_id)
        return self._to_goal_response(goal)

    def get_goal_progress(self, goal_id: int, user_id: int):
        goal = self._assert_goal_access(goal_id, user_id)
        goal_payload = self._to_goal_response(goal)

        target_amount = self._round_money(goal_payload["target_amount"])
        current_amount = self._round_money(goal_payload["current_amount"])
        remaining_amount = self._round_money(max(target_amount - current_amount, Decimal("0.00")))

        progress_percent = 0.0
        if target_amount > 0:
            progress_percent = float(((current_amount / target_amount) * Decimal("100")).quantize(Decimal("0.01")))

        return {
            "goal": goal_payload,
            "progress_percent": progress_percent,
            "remaining_amount": remaining_amount,
            "allocations": goal.allocations,
        }

    def update_goal(self, goal_id: int, goal_in: SavingsGoalUpdate, user_id: int) -> SavingsGoal:
        goal = self._assert_goal_access(goal_id, user_id)
        old_pool_budget_id = goal.budget_pool.budget_id if goal.budget_pool is not None else None
        update_data = goal_in.model_dump(exclude_unset=True)

        if "target_amount" in update_data and update_data["target_amount"] is not None:
            if update_data["target_amount"] <= 0:
                raise HTTPException(status_code=400, detail="target_amount must be greater than 0")
            update_data["target_amount"] = self._round_money(update_data["target_amount"])

        if "current_amount" in update_data and update_data["current_amount"] is not None:
            raise HTTPException(status_code=400, detail="current_amount is derived and cannot be updated manually")

        if "auto_allocate_amount" in update_data and update_data["auto_allocate_amount"] is not None:
            if update_data["auto_allocate_amount"] < 0:
                raise HTTPException(status_code=400, detail="auto_allocate_amount cannot be negative")
            update_data["auto_allocate_amount"] = self._round_money(update_data["auto_allocate_amount"])

        if "budget_pool_id" in update_data and update_data["budget_pool_id"] is not None:
            self._assert_pool_access(update_data["budget_pool_id"], user_id)

        for field, value in update_data.items():
            setattr(goal, field, value)

        self.goal_repo.save_all()
        self.goal_repo.refresh(goal)

        new_pool_budget_id = goal.budget_pool.budget_id if goal.budget_pool is not None else None
        affected_budget_ids = {budget_id for budget_id in [old_pool_budget_id, new_pool_budget_id] if budget_id is not None}

        self._refresh_budget_engine_state(
            user_id=user_id,
            budget_ids=affected_budget_ids,
            preferred_budget_id=new_pool_budget_id or old_pool_budget_id,
        )

        self.goal_repo.refresh(goal)
        return self._to_goal_response(goal)

    def allocate_to_goal(self, goal_id: int, payload: SavingsGoalAllocateRequest, user_id: int):
        goal = self._assert_goal_access(goal_id, user_id)

        if payload.amount <= 0:
            raise HTTPException(status_code=400, detail="amount must be greater than 0")

        allocation_amount = self._round_money(payload.amount)
        target_pool_id = payload.budget_pool_id if payload.budget_pool_id is not None else goal.budget_pool_id
        target_budget_id: int | None = None

        if target_pool_id is not None:
            pool = self._assert_pool_access(target_pool_id, user_id)
            target_budget_id = pool.budget_id
            pool_remaining = self._round_money(pool.remaining_amount)

            if pool_remaining < allocation_amount:
                raise HTTPException(status_code=400, detail="Insufficient remaining amount in selected budget pool")

            pool.remaining_amount = self._round_money(pool_remaining - allocation_amount)
            pool.spent_amount = self._round_money(Decimal(pool.spent_amount) + allocation_amount)

        allocation = SavingsGoalAllocation(
            goal_id=goal.id,
            user_id=user_id,
            budget_id=target_budget_id,
            budget_pool_id=target_pool_id,
            amount=allocation_amount,
            allocation_type="manual",
            notes=payload.notes,
        )
        self.goal_repo.create_allocation(allocation)

        self.goal_repo.save_all()
        self._refresh_budget_engine_state(
            user_id=user_id,
            budget_ids={target_budget_id} if target_budget_id is not None else set(),
            preferred_budget_id=target_budget_id,
        )
        self.goal_repo.refresh(goal)
        return {
            "goal": self._to_goal_response(goal),
            "allocation": allocation,
        }

    def auto_allocate_for_budget(self, budget_id: int, user_id: int, commit: bool = True):
        budget = self.budget_repo.get_plan_by_id_for_user(budget_id, user_id)
        if not budget:
            raise HTTPException(status_code=404, detail="Budget not found")

        pools_by_id = {pool.id: pool for pool in budget.pools}
        finance_pool = next(
            (pool for pool in budget.pools if pool.category and str(pool.category.section.value) == "finance"),
            None,
        )

        goals = self.goal_repo.list_auto_active_goals_by_user(user_id)
        allocated_totals_by_goal = self.goal_repo.get_allocated_totals_by_goal_ids([goal.id for goal in goals])

        allocated_goals_count = 0
        total_allocated_amount = Decimal("0.00")

        for goal in goals:
            if self.goal_repo.has_auto_allocation_for_budget(goal.id, budget.id):
                continue

            if goal.budget_pool_id is not None and goal.budget_pool_id in pools_by_id:
                source_pool = pools_by_id[goal.budget_pool_id]
            else:
                source_pool = finance_pool

            if source_pool is None:
                continue

            available_amount = self._round_money(source_pool.remaining_amount)
            requested_amount = self._round_money(goal.auto_allocate_amount or Decimal("0.00"))
            current_amount = self._round_money(allocated_totals_by_goal.get(goal.id, Decimal("0.00")))
            remaining_target = self._round_money(self._round_money(goal.target_amount) - current_amount)

            if available_amount <= 0 or requested_amount <= 0 or remaining_target <= 0:
                continue

            allocation_amount = self._round_money(min(available_amount, requested_amount, remaining_target))
            if allocation_amount <= 0:
                continue

            source_pool.remaining_amount = self._round_money(Decimal(source_pool.remaining_amount) - allocation_amount)
            source_pool.spent_amount = self._round_money(Decimal(source_pool.spent_amount) + allocation_amount)

            self.goal_repo.create_allocation(
                SavingsGoalAllocation(
                    goal_id=goal.id,
                    user_id=user_id,
                    budget_id=budget.id,
                    budget_pool_id=source_pool.id,
                    amount=allocation_amount,
                    allocation_type="auto",
                    notes="Auto allocation on budget rollover",
                )
            )

            allocated_totals_by_goal[goal.id] = self._round_money(current_amount + allocation_amount)

            allocated_goals_count += 1
            total_allocated_amount = self._round_money(total_allocated_amount + allocation_amount)

        if commit:
            self.goal_repo.save_all()
            self._refresh_budget_engine_state(
                user_id=user_id,
                budget_ids={budget.id},
                preferred_budget_id=budget.id,
            )

        return {
            "budget_id": budget.id,
            "processed_goals_count": len(goals),
            "allocated_goals_count": allocated_goals_count,
            "total_allocated_amount": total_allocated_amount,
        }

    def delete_goal(self, goal_id: int, user_id: int):
        goal = self._assert_goal_access(goal_id, user_id)
        linked_budget_id = goal.budget_pool.budget_id if goal.budget_pool is not None else None
        self.goal_repo.delete_goal(goal)
        self.goal_repo.save_all()
        self._refresh_budget_engine_state(
            user_id=user_id,
            budget_ids={linked_budget_id} if linked_budget_id is not None else set(),
            preferred_budget_id=linked_budget_id,
        )
