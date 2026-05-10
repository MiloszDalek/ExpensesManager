import { memo } from "react";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/currency";
import type { CurrencyEnum } from "@/types/enums";

interface TransactionItem {
  scope: string;
  expense_id: number;
  expense_date: string;
  title: string;
  category_name: string;
  group_name: string | null;
  user_amount: number | string;
  currency: string;
}

interface SummaryTransactionsTableProps {
  items: TransactionItem[];
  sortBy: "expense_date" | "amount";
  sortOrder: "asc" | "desc";
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  accumulatedItems?: TransactionItem[];
}

const SortIndicator = memo(function SortIndicator({ active, order }: { active: boolean; order: "asc" | "desc" }) {
  if (!active) return null;
  return order === "desc" ? (
    <ArrowDown className="h-3 w-3 text-primary" />
  ) : (
    <ArrowUp className="h-3 w-3 text-primary" />
  );
});

const TransactionCard = memo(function TransactionCard({ item, t }: { item: TransactionItem; t: (key: string, options?: any) => string }) {
  return (
    <div className="rounded-lg border border-border bg-card/80 shadow-sm backdrop-blur-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate text-base" title={item.title}>{item.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {format(parseISO(item.expense_date), "yyyy-MM-dd")}
          </p>
        </div>
        <div className="font-semibold text-base whitespace-nowrap">
          {formatCurrency(Number(item.user_amount), item.currency as CurrencyEnum)}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <Badge variant={item.scope === "personal" ? "outline" : "secondary"} className="text-xs">
          {item.scope === "personal"
            ? t("summaryPage.scopePersonal")
            : t("summaryPage.scopeGroup")}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {t(`category.${item.category_name}`, { defaultValue: item.category_name })}
        </Badge>
        {item.group_name && (
          <span className="text-xs text-muted-foreground">
            {item.group_name}
          </span>
        )}
      </div>
    </div>
  );
});

const SummaryTransactionsTable = memo(function SummaryTransactionsTable({
  items,
  sortBy,
  sortOrder,
  page,
  pageSize,
  totalCount,
  onPageChange,
  accumulatedItems,
}: SummaryTransactionsTableProps) {
  const { t } = useTranslation();
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="space-y-4">
      <h2 className="hidden md:block text-lg font-semibold">
        {t("summaryPage.transactionsTitle", { defaultValue: "Transactions" })}
      </h2>
      {items.length ? (
        <>
          <div className="hidden md:block rounded-lg border border-border bg-card/80 shadow-sm backdrop-blur-sm overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-2 py-2 font-medium">
                      <span className="inline-flex items-center gap-1">
                        {t("summaryPage.table.date")}
                        <SortIndicator active={sortBy === "expense_date"} order={sortOrder} />
                      </span>
                    </th>
                    <th className="px-2 py-2 font-medium">{t("summaryPage.table.title")}</th>
                    <th className="px-2 py-2 font-medium">{t("summaryPage.table.scope")}</th>
                    <th className="px-2 py-2 font-medium">{t("summaryPage.table.category")}</th>
                    <th className="px-2 py-2 font-medium">{t("summaryPage.table.group")}</th>
                    <th className="px-2 py-2 font-medium">
                      <span className="inline-flex items-center gap-1">
                        {t("summaryPage.table.amount")}
                        <SortIndicator active={sortBy === "amount"} order={sortOrder} />
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={`${item.scope}-${item.expense_id}`} className="border-b/60">
                      <td className="px-2 py-2">{format(parseISO(item.expense_date), "yyyy-MM-dd")}</td>
                      <td className="px-2 py-2 font-medium max-w-[200px] truncate" title={item.title}>{item.title}</td>
                      <td className="px-2 py-2">
                        <Badge variant={item.scope === "personal" ? "outline" : "secondary"}>
                          {item.scope === "personal"
                            ? t("summaryPage.scopePersonal")
                            : t("summaryPage.scopeGroup")}
                        </Badge>
                      </td>
                      <td className="px-2 py-2">{t(`category.${item.category_name}`, { defaultValue: item.category_name })}</td>
                      <td className="px-2 py-2">{item.group_name || "-"}</td>
                      <td className="px-2 py-2 font-semibold">
                        {formatCurrency(Number(item.user_amount), item.currency as CurrencyEnum)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
          <div className="space-y-3 md:hidden">
              {(accumulatedItems || items).map((item) => (
                <TransactionCard key={`${item.scope}-${item.expense_id}`} item={item} t={t} />
              ))}
            </div>
        </>
      ) : (
        <p className="py-8 text-center text-muted-foreground">{t("summaryPage.noData")}</p>
      )}
      {totalCount > pageSize && (
        <>
          <div className="hidden md:flex items-center justify-between pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page - 1)}
                disabled={!hasPrevious}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                {t("common.previous", { defaultValue: "Previous" })}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t("common.pageOf", { defaultValue: "Page {{page}} of {{total}}", page, total: totalPages })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page + 1)}
                disabled={!hasNext}
              >
                {t("common.next", { defaultValue: "Next" })}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
          </div>
          <div className="md:hidden pt-3">
              {hasNext && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(page + 1)}
                  className="w-full border border-border bg-card/80"
                >
                  {t("common.loadMore", { defaultValue: "Load more" })}
                </Button>
              )}
            </div>
        </>
      )}
    </div>
  );
});

export default SummaryTransactionsTable;
