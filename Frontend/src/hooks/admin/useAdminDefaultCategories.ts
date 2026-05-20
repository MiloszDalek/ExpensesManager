import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { categoriesApi, queryKeys } from "@/api";
import { useAuth } from "@/contexts/AuthContext";
import { extractApiErrorMessage, localizeAdminError } from "@/utils/adminUtils";
import { formatCategoryNameForDisplay } from "@/utils/category";
import type { ApiCategoryCreate, ApiCategoryResponse } from "@/types";
import type { CategorySection } from "@/types/enums";

import type { AdminFeedback } from "./useAdminUsers";

export type CategoryPendingAction = number | "create" | null;

export type UseAdminDefaultCategoriesResult = {
    categories: ApiCategoryResponse[];
    isLoading: boolean;
    errorMessage: string | null;
    feedback: AdminFeedback;
    defaultCategoryName: string;
    defaultCategorySection: CategorySection;
    editingCategoryId: number | null;
    editingCategoryName: string;
    editingCategorySection: CategorySection;
    pendingCategoryAction: CategoryPendingAction;
    setDefaultCategoryName: (value: string) => void;
    setDefaultCategorySection: (value: CategorySection) => void;
    setEditingCategoryName: (value: string) => void;
    setEditingCategorySection: (value: CategorySection) => void;
    handleCreate: () => Promise<void>;
    handleStartEdit: (category: ApiCategoryResponse) => void;
    handleCancelEdit: () => void;
    handleSaveEdit: () => Promise<void>;
    handleDelete: (category: ApiCategoryResponse) => Promise<void>;
};

export function useAdminDefaultCategories(): UseAdminDefaultCategoriesResult {
    const { t } = useTranslation();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [feedback, setFeedback] = useState<AdminFeedback>(null);
    const [defaultCategoryName, setDefaultCategoryName] = useState("");
    const [defaultCategorySection, setDefaultCategorySection] = useState<CategorySection>("other");
    const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
    const [editingCategoryName, setEditingCategoryName] = useState("");
    const [editingCategorySection, setEditingCategorySection] = useState<CategorySection>("other");
    const [pendingCategoryAction, setPendingCategoryAction] = useState<CategoryPendingAction>(null);

    const isAdmin = !!user && user.role === "admin";

    const {
        data: defaultCategories = [],
        isLoading,
        error,
    } = useQuery<ApiCategoryResponse[]>({
        queryKey: queryKeys.admin.defaultCategories,
        queryFn: () => categoriesApi.getDefault(),
        enabled: isAdmin,
    });

    const createMutation = useMutation({
        mutationFn: (payload: ApiCategoryCreate) => categoriesApi.createDefault(payload),
    });

    const updateMutation = useMutation({
        mutationFn: ({ categoryId, payload }: { categoryId: number; payload: { name: string; section: CategorySection } }) =>
            categoriesApi.updateDefault(categoryId, payload),
    });

    const deleteMutation = useMutation({
        mutationFn: (categoryId: number) => categoriesApi.deleteDefault(categoryId),
    });

    const sortedCategories = useMemo(
        () => [...defaultCategories].sort((left, right) => left.name.localeCompare(right.name)),
        [defaultCategories]
    );

    const errorMessage = error
        ? localizeAdminError(
            (error as Error).message || t("adminPage.errors.categoryLoadFailed"),
            t
        )
        : null;

    const invalidateDefaultCategories = async () => {
        await queryClient.invalidateQueries({ queryKey: queryKeys.admin.defaultCategories });
    };

    const handleCancelEdit = () => {
        setEditingCategoryId(null);
        setEditingCategoryName("");
        setEditingCategorySection("other");
    };

    const handleCreate = async () => {
        const normalizedName = defaultCategoryName.trim();
        if (!normalizedName) {
            setFeedback({
                tone: "error",
                message: t("adminPage.errors.categoryNameEmpty"),
            });
            return;
        }

        setFeedback(null);
        setPendingCategoryAction("create");

        try {
            await createMutation.mutateAsync({
                name: normalizedName,
                section: defaultCategorySection,
            });
            setDefaultCategoryName("");
            setFeedback({
                tone: "success",
                message: t("adminPage.feedback.defaultCategoryCreated"),
            });
        } catch (caughtError) {
            const message =
                extractApiErrorMessage(caughtError) || t("adminPage.errors.categoryCreateFailed");
            setFeedback({
                tone: "error",
                message: localizeAdminError(message, t),
            });
        } finally {
            setPendingCategoryAction(null);
            await invalidateDefaultCategories();
        }
    };

    const handleStartEdit = (category: ApiCategoryResponse) => {
        setEditingCategoryId(category.id);
        setEditingCategoryName(category.name);
        setEditingCategorySection(category.section ?? "other");
    };

    const handleSaveEdit = async () => {
        if (editingCategoryId == null) {
            return;
        }

        const normalizedName = editingCategoryName.trim();
        if (!normalizedName) {
            setFeedback({
                tone: "error",
                message: t("adminPage.errors.categoryNameEmpty"),
            });
            return;
        }

        setFeedback(null);
        setPendingCategoryAction(editingCategoryId);

        try {
            await updateMutation.mutateAsync({
                categoryId: editingCategoryId,
                payload: {
                    name: normalizedName,
                    section: editingCategorySection,
                },
            });
            setFeedback({
                tone: "success",
                message: t("adminPage.feedback.defaultCategoryUpdated"),
            });
            handleCancelEdit();
        } catch (caughtError) {
            const message =
                extractApiErrorMessage(caughtError) || t("adminPage.errors.categoryUpdateFailed");
            setFeedback({
                tone: "error",
                message: localizeAdminError(message, t),
            });
        } finally {
            setPendingCategoryAction(null);
            await invalidateDefaultCategories();
        }
    };

    const handleDelete = async (category: ApiCategoryResponse) => {
        const localizedCategoryName = t(`category.${category.name}`, {
            defaultValue: formatCategoryNameForDisplay(category.name),
        });
        if (!window.confirm(t("adminPage.confirmDeleteCategory", { category: localizedCategoryName }))) {
            return;
        }

        setFeedback(null);
        setPendingCategoryAction(category.id);

        try {
            await deleteMutation.mutateAsync(category.id);
            if (editingCategoryId === category.id) {
                handleCancelEdit();
            }
            setFeedback({
                tone: "success",
                message: t("adminPage.feedback.defaultCategoryDeleted"),
            });
        } catch (caughtError) {
            const message =
                extractApiErrorMessage(caughtError) || t("adminPage.errors.categoryDeleteFailed");
            setFeedback({
                tone: "error",
                message: localizeAdminError(message, t),
            });
        } finally {
            setPendingCategoryAction(null);
            await invalidateDefaultCategories();
        }
    };

    return {
        categories: sortedCategories,
        isLoading,
        errorMessage,
        feedback,
        defaultCategoryName,
        defaultCategorySection,
        editingCategoryId,
        editingCategoryName,
        editingCategorySection,
        pendingCategoryAction,
        setDefaultCategoryName,
        setDefaultCategorySection,
        setEditingCategoryName,
        setEditingCategorySection,
        handleCreate,
        handleStartEdit,
        handleCancelEdit,
        handleSaveEdit,
        handleDelete,
    };
}
