import type { TFunction } from "i18next";
import { format, parseISO } from "date-fns";

import type { CategorySection } from "@/types/enums";

export const CATEGORY_SECTION_OPTIONS: CategorySection[] = [
    "food",
    "transport",
    "home",
    "bills",
    "lifestyle",
    "health",
    "finance",
    "education",
    "family",
    "other",
];

export const ADMIN_ERROR_TRANSLATIONS: Record<string, string> = {
    "Not enough permissions": "adminPage.errors.notEnoughPermissions",
    "System admin role changes are disabled": "adminPage.errors.roleChangeDisabled",
    "User deletion is disabled by system policy": "adminPage.errors.userDeletionDisabled",
    "Admin cannot deactivate own account": "adminPage.errors.cannotDeactivateOwnAccount",
    "System admin account cannot be deactivated": "adminPage.errors.systemAdminCannotDeactivate",
    "Email already in use": "adminPage.errors.emailAlreadyInUse",
    "Category name cannot be empty": "adminPage.errors.categoryNameEmpty",
    "Category already exists": "adminPage.errors.categoryAlreadyExists",
    "Category not found": "adminPage.errors.categoryNotFound",
    "Not a default category": "adminPage.errors.notDefaultCategory",
    "Cannot delete category assigned to expenses": "adminPage.errors.categoryInUse",
};

export const localizeAdminError = (message: string, t: TFunction): string => {
    const normalizedMessage = message.trim().replace(/\.$/, "");

    if (normalizedMessage.match(/^Cannot delete category assigned to expenses?$/)) {
        return t("adminPage.errors.categoryInUse");
    }

    const categoryExistsMatch = normalizedMessage.match(/^Category '(.+)' already exists$/);
    if (categoryExistsMatch) {
        return t("adminPage.errors.categoryAlreadyExistsWithName", {
            name: categoryExistsMatch[1],
        });
    }

    const key = ADMIN_ERROR_TRANSLATIONS[normalizedMessage];
    if (key) {
        return t(key);
    }

    return normalizedMessage;
};

export const formatDateTime = (value: string | null | undefined, fallback: string) => {
    if (!value) {
        return fallback;
    }

    try {
        return format(parseISO(value), "yyyy-MM-dd HH:mm");
    } catch {
        return fallback;
    }
};

export const extractApiErrorMessage = (error: unknown): string | null => {
    if (typeof error === "object" && error !== null && "response" in error) {
        const detail = (error as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
        if (typeof detail === "string" && detail.trim()) {
            return detail.trim();
        }
    }

    if (error instanceof Error && error.message.trim()) {
        return error.message.trim();
    }

    return null;
};
