import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Edit3, Plus, ReceiptText, Repeat2, ScanSearch } from "lucide-react";

type SpeedDialProps = {
  onAddExpense: () => void;
  onAddRecurringExpense?: () => void;
  onScanReceipt: () => void;
  onEditGroup?: () => void;
  addExpenseLabel?: string;
  addRecurringExpenseLabel?: string;
  scanReceiptLabel?: string;
  editGroupLabel?: string;
};

type SpeedDialAction = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
};

export function SpeedDial({
  onAddExpense,
  onAddRecurringExpense,
  onScanReceipt,
  onEditGroup,
  addExpenseLabel = "Dodaj wydatek",
  addRecurringExpenseLabel = "Dodaj cykliczny",
  scanReceiptLabel = "Skanuj paragon",
  editGroupLabel = "Edytuj grupę",
}: SpeedDialProps) {
  const [isOpen, setIsOpen] = useState(false);

  const actions = useMemo<SpeedDialAction[]>(() => {
    const nextActions: SpeedDialAction[] = [];

    if (onEditGroup) {
      nextActions.push({
        id: "edit-group",
        label: editGroupLabel,
        icon: Edit3,
        onClick: onEditGroup,
      });
    }

    if (onAddRecurringExpense) {
      nextActions.push({
        id: "add-recurring-expense",
        label: addRecurringExpenseLabel,
        icon: Repeat2,
        onClick: onAddRecurringExpense,
      });
    }

    nextActions.push(
      {
        id: "add-expense",
        label: addExpenseLabel,
        icon: ReceiptText,
        onClick: onAddExpense,
      },
      {
        id: "scan-receipt",
        label: scanReceiptLabel,
        icon: ScanSearch,
        onClick: onScanReceipt,
      }
    );

    return nextActions;
  }, [
    addExpenseLabel,
    addRecurringExpenseLabel,
    editGroupLabel,
    onAddExpense,
    onAddRecurringExpense,
    onEditGroup,
    onScanReceipt,
    scanReceiptLabel,
  ]);

  const handleActionClick = (onClick: () => void) => {
    onClick();
    setIsOpen(false);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen ? (
          <motion.button
            type="button"
            aria-label="Close speed dial overlay"
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-black/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        ) : null}
      </AnimatePresence>

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <AnimatePresence>
          {isOpen
            ? actions.map((action, index) => {
                const Icon = action.icon;

                return (
                  <motion.div
                    key={action.id}
                    className="flex items-center gap-2"
                    initial={{ opacity: 0, y: 16, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: index * 0.04 }}
                  >
                    <motion.span
                      className="rounded-md bg-card/95 px-3 py-1.5 text-sm font-medium text-foreground shadow"
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{ duration: 0.16, delay: index * 0.04 + 0.04 }}
                    >
                      {action.label}
                    </motion.span>

                    <button
                      type="button"
                      onClick={() => handleActionClick(action.onClick)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition-colors hover:bg-accent"
                      aria-label={action.label}
                    >
                      <Icon className="h-5 w-5" />
                    </button>
                  </motion.div>
                );
              })
            : null}
        </AnimatePresence>

        <button
          type="button"
          aria-label={isOpen ? "Zamknij menu akcji" : "Otwórz menu akcji"}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
        >
          <motion.span
            initial={false}
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 20 }}
          >
            <Plus className="h-6 w-6" strokeWidth={2.5} />
          </motion.span>
        </button>
      </div>
    </>
  );
}

export default SpeedDial;
