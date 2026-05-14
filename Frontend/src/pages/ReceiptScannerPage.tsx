import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { LoadingSpinnerWrapper } from "@/components/ui/LoadingSpinner";
import { useReceiptScanner } from "@/hooks/receiptScanner/useReceiptScanner";
import ReceiptUploadSection from "@/components/receiptScanner/ReceiptUploadSection";
import ExpenseFormSection from "@/components/receiptScanner/ExpenseFormSection";
import ReceiptItemsSection from "@/components/receiptScanner/ReceiptItemsSection";
import PageInfoButton from "@/components/help/PageInfoButton";
import { parseAmount } from "@/utils/receiptScanner";

export default function ReceiptScannerPage() {
  const { t } = useTranslation();
  const scanner = useReceiptScanner();

  if (scanner.isLoading) {
    return <LoadingSpinnerWrapper className="h-screen" />;
  }

  return (
    <div className="min-h-screen p-4 md:p-8 relative">
      <div className="absolute top-4 right-4 flex items-center gap-2 md:hidden">
        <PageInfoButton pageKey="receiptScan" autoOpen={true} />
      </div>
      <div className="mx-auto max-w-6xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("receiptScannerPage.title")}</h1>
            <p className="mt-2 text-muted-foreground">{t("receiptScannerPage.subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <PageInfoButton pageKey="receiptScan" autoOpen={true} className="hidden lg:inline-flex" />
          </div>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <ReceiptUploadSection
            hasCamera={scanner.hasCamera}
            ocrMode={scanner.ocrMode}
            isUploading={scanner.isUploading}
            isMutationPending={
              scanner.createExpenseMutation.isPending || scanner.createGroupExpenseMutation.isPending
            }
            imagePreviewUrl={scanner.imagePreviewUrl}
            ocrText={scanner.ocrText}
            ocrStatus={scanner.ocrStatus}
            ocrEngine={scanner.ocrEngine}
            localWarning={scanner.localWarning}
            receiptFileName={scanner.receiptFileName}
            onOcrModeChange={(mode) => {
              scanner.setOcrMode(mode);
              scanner.setLocalWarning(null);
            }}
            onUpload={scanner.handleUpload}
            onOcrTextChange={scanner.setOcrText}
            uploadLabel={t("receiptScannerPage.uploadLabel")}
            ocrModeLabel={t("receiptScannerPage.ocrModeLabel")}
            ocrModeFast={t("receiptScannerPage.ocrModeFast")}
            ocrModeAccurate={t("receiptScannerPage.ocrModeAccurate")}
            takePhoto={t("receiptScannerPage.takePhoto")}
            chooseFromGallery={t("receiptScannerPage.chooseFromGallery")}
            uploading={t("receiptScannerPage.uploading")}
            uploadedFileLabel={(params) => t("receiptScannerPage.uploadedFile", params)}
            ocrDone={t("receiptScannerPage.ocrDone")}
            ocrUnavailable={t("receiptScannerPage.ocrUnavailable")}
            ocrFailed={t("receiptScannerPage.ocrFailed")}
            previewAlt={t("receiptScannerPage.previewAlt")}
            ocrTextLabel={t("receiptScannerPage.ocrText")}
          />

          <ExpenseFormSection
            expenseScope={scanner.expenseScope}
            selectedGroupId={scanner.selectedGroupId}
            selectedMemberIds={scanner.selectedMemberIds}
            currency={scanner.currency}
            categoryId={scanner.categoryId}
            expenseDate={scanner.expenseDate}
            titleDraft={scanner.titleDraft}
            parsedTotal={scanner.parsedTotal}
            localError={scanner.localError}
            localSuccess={scanner.localSuccess}
            activeGroups={scanner.activeGroups}
            activeGroupMembers={scanner.activeGroupMembers}
            selectedParticipants={scanner.selectedParticipants}
            selectedGroup={scanner.selectedGroup}
            categories={scanner.categories}
            selectedTotal={scanner.selectedTotal}
            createExpenseMutationPending={scanner.createExpenseMutation.isPending}
            createGroupExpenseMutationPending={scanner.createGroupExpenseMutation.isPending}
            onExpenseScopeChange={(scope) => {
              scanner.setExpenseScope(scope);
              scanner.setLocalError(null);
              scanner.setLocalSuccess(null);
            }}
            onSelectedGroupIdChange={(groupId) => {
              scanner.setSelectedGroupId(groupId);
              scanner.setLocalError(null);
              scanner.setLocalSuccess(null);
            }}
            onSelectedMemberIdsChange={scanner.setSelectedMemberIds}
            onCurrencyChange={scanner.setCurrency}
            onCategoryIdChange={scanner.setCategoryId}
            onExpenseDateChange={scanner.setExpenseDate}
            onTitleDraftChange={scanner.setTitleDraft}
            onParsedTotalChange={scanner.setParsedTotal}
            onCreateFromParsedTotal={scanner.handleCreateFromParsedTotal}
            onCreateFromSelected={scanner.handleCreateFromSelected}
            canCreateFromTotal={parseAmount(scanner.parsedTotal) > 0}
            canCreateFromSelected={scanner.selectedItems.length > 0}
            scopeLabel={t("receiptScannerPage.scopeLabel")}
            scopePersonal={t("receiptScannerPage.scopePersonal")}
            scopeGroup={t("receiptScannerPage.scopeGroup")}
            groupLabel={t("receiptScannerPage.group")}
            groupPlaceholder={t("receiptScannerPage.groupPlaceholder")}
            titleFieldLabel={t("receiptScannerPage.titleField")}
            titlePlaceholder={t("receiptScannerPage.titlePlaceholder")}
            parsedTotalLabel={t("receiptScannerPage.parsedTotal")}
            currencyLabel={t("receiptScannerPage.currency")}
            expenseDateLabel={t("receiptScannerPage.expenseDate")}
            categoryLabel={t("receiptScannerPage.category")}
            participantsLabel={t("receiptScannerPage.participants")}
            selectedParticipantsLabel={(params) =>
              t("receiptScannerPage.selectedParticipants", params)
            }
            createFromTotal={t("receiptScannerPage.createFromTotal")}
            createFromSelected={t("receiptScannerPage.createFromSelected")}
            selectedTotalLabel={(params) =>
              t("receiptScannerPage.selectedTotal", params)
            }
            noActiveGroupsError={t("receiptScannerPage.errors.noActiveGroups")}
          />
        </div>

        {scanner.ocrText && (
          <ReceiptItemsSection
            items={scanner.items}
            onToggleSelected={scanner.handleToggleSelected}
            onUpdateItem={scanner.handleUpdateItem}
            onRemoveItem={scanner.handleRemoveItem}
            onAddItem={scanner.handleAddManualItem}
            itemsTitle={t("receiptScannerPage.itemsTitle")}
            addItem={t("receiptScannerPage.addItem")}
            noItems={t("receiptScannerPage.noItems")}
            itemNamePlaceholder={t("receiptScannerPage.itemNamePlaceholder")}
            usedBadge={t("receiptScannerPage.usedBadge")}
            removeItem={t("receiptScannerPage.removeItem")}
          />
        )}
      </div>
    </div>
  );
}
