import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { ScannerItem } from "@/types/receiptScanner";

interface ReceiptItemsSectionProps {
  items: ScannerItem[];
  onToggleSelected: (id: string, checked: boolean) => void;
  onUpdateItem: (id: string, field: "name" | "amount", value: string) => void;
  onRemoveItem: (id: string) => void;
  onAddItem: () => void;
  itemsTitle: string;
  addItem: string;
  noItems: string;
  itemNamePlaceholder: string;
  usedBadge: string;
  removeItem: string;
}

export default function ReceiptItemsSection({
  items,
  onToggleSelected,
  onUpdateItem,
  onRemoveItem,
  onAddItem,
  itemsTitle,
  addItem,
  noItems,
  itemNamePlaceholder,
  usedBadge,
  removeItem,
}: ReceiptItemsSectionProps) {
  return (
    <section className="space-y-3 rounded-lg border border-border bg-card/80 p-4 shadow-sm backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">{itemsTitle}</h2>
        <Button type="button" variant="outline" size="sm" onClick={onAddItem}>
          {addItem}
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{noItems}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[auto_1fr_120px_auto] items-center gap-2 rounded-md border border-border bg-background/60 p-2"
            >
              <Checkbox
                checked={item.is_selected}
                disabled={item.is_used}
                onCheckedChange={(checked) => onToggleSelected(item.id, checked === true)}
                className="h-4 w-4"
              />

              <Input
                value={item.name}
                onChange={(event) => onUpdateItem(item.id, "name", event.target.value)}
                placeholder={itemNamePlaceholder}
                disabled={item.is_used}
              />

              <Input
                value={item.amount}
                onChange={(event) => onUpdateItem(item.id, "amount", event.target.value)}
                placeholder="0.00"
                disabled={item.is_used}
              />

              <div className="flex items-center gap-2">
                {item.is_used ? (
                  <span className="rounded bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                    {usedBadge}
                  </span>
                ) : null}
                <Button type="button" variant="ghost" size="sm" onClick={() => onRemoveItem(item.id)}>
                  {removeItem}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
