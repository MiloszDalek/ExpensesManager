from dataclasses import dataclass

from .category_section_enum import CategorySection


@dataclass(frozen=True)
class DefaultExpenseCategoryDefinition:
    name: str
    section: CategorySection


# Keep this list flat and explicit so adding new defaults is straightforward.
DEFAULT_EXPENSE_CATEGORIES: tuple[DefaultExpenseCategoryDefinition, ...] = (
    DefaultExpenseCategoryDefinition(name="groceries", section=CategorySection.FOOD),
    DefaultExpenseCategoryDefinition(name="restaurants", section=CategorySection.FOOD),
    DefaultExpenseCategoryDefinition(name="coffee_snacks", section=CategorySection.FOOD),
    DefaultExpenseCategoryDefinition(name="food_delivery", section=CategorySection.FOOD),
    DefaultExpenseCategoryDefinition(name="food_other", section=CategorySection.FOOD),
    DefaultExpenseCategoryDefinition(name="public_transport", section=CategorySection.TRANSPORT),
    DefaultExpenseCategoryDefinition(name="fuel", section=CategorySection.TRANSPORT),
    DefaultExpenseCategoryDefinition(name="taxi_rideshare", section=CategorySection.TRANSPORT),
    DefaultExpenseCategoryDefinition(name="parking_tolls", section=CategorySection.TRANSPORT),
    DefaultExpenseCategoryDefinition(name="vehicle_maintenance", section=CategorySection.TRANSPORT),
    DefaultExpenseCategoryDefinition(name="transport_other", section=CategorySection.TRANSPORT),
    DefaultExpenseCategoryDefinition(name="rent_mortgage", section=CategorySection.HOME),
    DefaultExpenseCategoryDefinition(name="household_supplies", section=CategorySection.HOME),
    DefaultExpenseCategoryDefinition(name="home_repairs", section=CategorySection.HOME),
    DefaultExpenseCategoryDefinition(name="home_other", section=CategorySection.HOME),
    DefaultExpenseCategoryDefinition(name="utilities", section=CategorySection.BILLS),
    DefaultExpenseCategoryDefinition(name="internet_phone", section=CategorySection.BILLS),
    DefaultExpenseCategoryDefinition(name="subscriptions", section=CategorySection.BILLS),
    DefaultExpenseCategoryDefinition(name="insurance", section=CategorySection.BILLS),
    DefaultExpenseCategoryDefinition(name="bills_other", section=CategorySection.BILLS),
    DefaultExpenseCategoryDefinition(name="medical", section=CategorySection.HEALTH),
    DefaultExpenseCategoryDefinition(name="pharmacy", section=CategorySection.HEALTH),
    DefaultExpenseCategoryDefinition(name="fitness", section=CategorySection.HEALTH),
    DefaultExpenseCategoryDefinition(name="health_other", section=CategorySection.HEALTH),
    DefaultExpenseCategoryDefinition(name="entertainment", section=CategorySection.LIFESTYLE),
    DefaultExpenseCategoryDefinition(name="clothing", section=CategorySection.LIFESTYLE),
    DefaultExpenseCategoryDefinition(name="travel", section=CategorySection.LIFESTYLE),
    DefaultExpenseCategoryDefinition(name="gifts", section=CategorySection.LIFESTYLE),
    DefaultExpenseCategoryDefinition(name="personal_care", section=CategorySection.LIFESTYLE),
    DefaultExpenseCategoryDefinition(name="lifestyle_other", section=CategorySection.LIFESTYLE),
    DefaultExpenseCategoryDefinition(name="bank_fees", section=CategorySection.FINANCE),
    DefaultExpenseCategoryDefinition(name="savings", section=CategorySection.FINANCE),
    DefaultExpenseCategoryDefinition(name="investments", section=CategorySection.FINANCE),
    DefaultExpenseCategoryDefinition(name="finance_other", section=CategorySection.FINANCE),
    DefaultExpenseCategoryDefinition(name="courses", section=CategorySection.EDUCATION),
    DefaultExpenseCategoryDefinition(name="books", section=CategorySection.EDUCATION),
    DefaultExpenseCategoryDefinition(name="education_other", section=CategorySection.EDUCATION),
    DefaultExpenseCategoryDefinition(name="kids_family", section=CategorySection.FAMILY),
    DefaultExpenseCategoryDefinition(name="pets", section=CategorySection.FAMILY),
    DefaultExpenseCategoryDefinition(name="family_other", section=CategorySection.FAMILY),
    DefaultExpenseCategoryDefinition(name="other", section=CategorySection.OTHER),
)
