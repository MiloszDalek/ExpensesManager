from enum import Enum


# General grouping names are handled on frontend (CategoryPicker):
# food, transport, home, bills, lifestyle, health, finance, education, family, other
class DefaultExpenseCategory(str, Enum):
    GROCERIES = "groceries"
    RESTAURANTS = "restaurants"
    COFFEE_SNACKS = "coffee_snacks"
    FOOD_DELIVERY = "food_delivery"

    PUBLIC_TRANSPORT = "public_transport"
    FUEL = "fuel"
    TAXI_RIDESHARE = "taxi_rideshare"
    PARKING_TOLLS = "parking_tolls"
    VEHICLE_MAINTENANCE = "vehicle_maintenance"

    RENT_MORTGAGE = "rent_mortgage"
    HOUSEHOLD_SUPPLIES = "household_supplies"
    HOME_REPAIRS = "home_repairs"

    UTILITIES = "utilities"
    INTERNET_PHONE = "internet_phone"
    SUBSCRIPTIONS = "subscriptions"
    INSURANCE = "insurance"

    MEDICAL = "medical"
    PHARMACY = "pharmacy"
    FITNESS = "fitness"

    ENTERTAINMENT = "entertainment"
    CLOTHING = "clothing"
    TRAVEL = "travel"
    GIFTS = "gifts"
    PERSONAL_CARE = "personal_care"

    BANK_FEES = "bank_fees"
    SAVINGS_INVESTMENTS = "savings_investments"

    COURSES_BOOKS = "courses_books"

    KIDS_FAMILY = "kids_family"
    PETS = "pets"
    OTHER = "other"
