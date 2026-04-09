from __future__ import annotations

import argparse
from dataclasses import replace
from time import perf_counter

from app.database import SessionLocal
from .seeder import SeederConfig, TestDataSeeder


PROFILE_DEFAULTS: dict[str, SeederConfig] = {
    "small": SeederConfig(
        users_count=20,
        groups_count=15,
        personal_expenses_count=2000,
        group_expenses_count=1200,
        personal_recurring_expenses_count=140,
        group_recurring_expenses_count=90,
    ),
    "medium": SeederConfig(
        users_count=80,
        groups_count=60,
        personal_expenses_count=12000,
        group_expenses_count=8000,
        personal_recurring_expenses_count=800,
        group_recurring_expenses_count=500,
    ),
    "large": SeederConfig(
        users_count=200,
        groups_count=160,
        personal_expenses_count=50000,
        group_expenses_count=30000,
        personal_recurring_expenses_count=3500,
        group_recurring_expenses_count=2200,
    ),
}


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Generate large synthetic test data for Expenses Manager backend.",
    )

    parser.add_argument(
        "--profile",
        choices=tuple(PROFILE_DEFAULTS.keys()),
        default="medium",
        help="Preset scale profile.",
    )
    parser.add_argument("--users", type=int, default=None, help="Override number of users.")
    parser.add_argument("--groups", type=int, default=None, help="Override number of groups.")
    parser.add_argument(
        "--personal-expenses",
        type=int,
        default=None,
        help="Override number of personal expenses.",
    )
    parser.add_argument(
        "--group-expenses",
        type=int,
        default=None,
        help="Override number of group expenses.",
    )
    parser.add_argument(
        "--personal-recurring-expenses",
        type=int,
        default=None,
        help="Override number of personal recurring expenses.",
    )
    parser.add_argument(
        "--group-recurring-expenses",
        type=int,
        default=None,
        help="Override number of group recurring expenses.",
    )
    parser.add_argument(
        "--password",
        type=str,
        default="password",
        help="Password for all generated users.",
    )
    parser.add_argument(
        "--edge-case-ratio",
        type=float,
        default=0.12,
        help="Fraction of records that should include edge-case behavior (0.0-0.5).",
    )
    parser.add_argument(
        "--max-days-back",
        type=int,
        default=730,
        help="Maximum age of generated expenses in days.",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="Optional deterministic random seed.",
    )
    parser.add_argument(
        "--run-tag",
        type=str,
        default=None,
        help="Optional suffix used in generated usernames/groups.",
    )

    return parser


def _resolve_config(args: argparse.Namespace) -> SeederConfig:
    profile = PROFILE_DEFAULTS[args.profile]
    config = replace(
        profile,
        users_count=args.users if args.users is not None else profile.users_count,
        groups_count=args.groups if args.groups is not None else profile.groups_count,
        personal_expenses_count=(
            args.personal_expenses
            if args.personal_expenses is not None
            else profile.personal_expenses_count
        ),
        group_expenses_count=(
            args.group_expenses
            if args.group_expenses is not None
            else profile.group_expenses_count
        ),
        personal_recurring_expenses_count=(
            args.personal_recurring_expenses
            if args.personal_recurring_expenses is not None
            else profile.personal_recurring_expenses_count
        ),
        group_recurring_expenses_count=(
            args.group_recurring_expenses
            if args.group_recurring_expenses is not None
            else profile.group_recurring_expenses_count
        ),
        password=args.password,
        edge_case_ratio=max(0.0, min(args.edge_case_ratio, 0.5)),
        max_days_back=max(1, args.max_days_back),
        seed=args.seed,
        run_tag=args.run_tag,
    )
    return config


def _print_summary(run_seconds: float, result) -> None:
    print("\nTest data seeding finished")
    print(f"Run tag: {result.run_tag}")
    print(f"Created users: {result.created_users}")
    print(f"Created groups: {result.created_groups}")
    print(f"Created group members: {result.created_group_members}")
    print(f"Created contacts: {result.created_contacts}")
    print(f"Created personal expenses: {result.created_personal_expenses}")
    print(f"Created group expenses: {result.created_group_expenses}")
    print(f"Created expense shares: {result.created_expense_shares}")
    print(f"Created personal recurring expenses: {result.created_personal_recurring_expenses}")
    print(f"Created group recurring expenses: {result.created_group_recurring_expenses}")
    print(f"Created recurring participants: {result.created_recurring_participants}")
    print(f"Elapsed: {run_seconds:.2f} s")


def main() -> int:
    parser = _build_parser()
    args = parser.parse_args()
    config = _resolve_config(args)

    db = SessionLocal()
    started = perf_counter()

    try:
        seeder = TestDataSeeder(db, config)
        result = seeder.seed_all()
        elapsed = perf_counter() - started
        _print_summary(elapsed, result)
        return 0
    except Exception as exc:
        db.rollback()
        print(f"Seeding failed: {exc}")
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
