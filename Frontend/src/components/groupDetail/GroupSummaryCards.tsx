import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Wallet, Coins, Repeat2 } from "lucide-react";
import { formatCurrency } from "@/utils/currency";
import type { CurrencyEnum } from "@/types/enums";

interface GroupSummaryCardsProps {
  membersCount: number;
  expensesCount: number;
  totalAmount: number;
  currency: string;
  recurringCount: number;
  recurringLoading: boolean;
}

export default function GroupSummaryCards({
  membersCount,
  expensesCount,
  totalAmount,
  currency,
  recurringCount,
  recurringLoading,
}: GroupSummaryCardsProps) {
  const { t } = useTranslation();

  const getFontSizeClass = (textLength: number) => {
    if (textLength <= 8) return "text-[clamp(1rem,5.2vw,1.85rem)] sm:text-3xl md:text-6xl";
    if (textLength <= 12) return "text-[clamp(0.9rem,4.5vw,1.5rem)] sm:text-2xl md:text-3xl";
    if (textLength <= 16) return "text-[clamp(0.8rem,3.8vw,1.25rem)] sm:text-xl md:text-xl";
    return "text-[clamp(0.7rem,3.2vw,1rem)] sm:text-lg md:text-2xl";
  };

  const cards = [
    {
      label: t("groupDetailPage.summaryMembers"),
      icon: Users,
      value: membersCount,
    },
    {
      label: t("groupDetailPage.summaryExpenses"),
      icon: Wallet,
      value: expensesCount,
    },
    {
      label: t("groupDetailPage.summaryTotal"),
      icon: Coins,
      value: formatCurrency(Number(totalAmount ?? 0), currency as CurrencyEnum),
      isCurrency: true,
    },
    {
      label: t("globalHeader.navRecurring"),
      icon: Repeat2,
      value: recurringLoading ? "..." : recurringCount,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-1.5 sm:gap-3 lg:grid-cols-2">
      {cards.map((card) => (
        <Card key={card.label} className="aspect-square border border-border bg-card/80 shadow-sm backdrop-blur-sm">
          <CardContent className="flex h-full flex-col p-2 sm:p-3">
            <div className="flex items-center justify-center gap-1 text-center sm:gap-2 mt-[-12px] sm:mt-0">
              <p className="text-[10px] font-medium leading-tight text-muted-foreground sm:text-xs md:text-base">
                {card.label}
              </p>
              <card.icon className="h-3.5 w-3.5 shrink-0 text-primary sm:h-4 sm:w-4 md:h-5 md:w-5" />
            </div>
            <div className="flex flex-1 items-center justify-center">
              <p className={`${card.isCurrency ? getFontSizeClass(String(card.value).length) : "text-[clamp(1rem,5.2vw,1.85rem)] sm:text-3xl md:text-5xl"} font-bold leading-none text-foreground`}>
                {card.value}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
