from enum import Enum

from .default_expense_category_list import DEFAULT_EXPENSE_CATEGORIES


def _to_enum_key(category_name: str) -> str:
    return category_name.upper().replace("-", "_")


# Compatibility enum built from the central list in default_expense_category_list.py.
DefaultExpenseCategory = Enum(
    "DefaultExpenseCategory",
    {_to_enum_key(item.name): item.name for item in DEFAULT_EXPENSE_CATEGORIES},
    type=str,
)

