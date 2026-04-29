import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { enUS, pl } from "date-fns/locale";

import { cn } from "@/lib/utils";

type DatePickerProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  displayFormat?: string;
};

export default function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Select date",
  disabled = false,
  className,
  displayFormat = "dd MMM yyyy",
}: DatePickerProps) {
  const { t, i18n } = useTranslation();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState<number | null>(null);
  const [panelPosition, setPanelPosition] = useState<'left' | 'right' | 'center'>('center');
  const [monthCursor, setMonthCursor] = useState(() => {
    const parsedValue = value ? parseISO(value) : null;
    return parsedValue && !Number.isNaN(parsedValue.getTime()) ? parsedValue : new Date();
  });

  const dateLocale = useMemo(() => {
    return i18n.language.startsWith("pl") ? pl : enUS;
  }, [i18n.language]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const updatePanelWidth = () => {
      const viewportMax = Math.max(window.innerWidth - 24, 240);
      const fixedWidth = 240;
      setPanelWidth(Math.min(fixedWidth, viewportMax));

      // Calculate smart positioning to prevent off-screen overflow
      const triggerRect = triggerRef.current?.getBoundingClientRect();
      if (triggerRect) {
        const panelWidth = Math.min(fixedWidth, viewportMax);
        const spaceOnLeft = triggerRect.left;
        const spaceOnRight = window.innerWidth - triggerRect.right;
        
        if (spaceOnRight < panelWidth / 2 && spaceOnLeft > panelWidth / 2) {
          setPanelPosition('left');
        } else if (spaceOnLeft < panelWidth / 2 && spaceOnRight > panelWidth / 2) {
          setPanelPosition('right');
        } else {
          setPanelPosition('center');
        }
      }
    };

    updatePanelWidth();

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return;
      }

      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("resize", updatePanelWidth);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("resize", updatePanelWidth);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const parsedValue = value ? parseISO(value) : null;
    if (parsedValue && !Number.isNaN(parsedValue.getTime())) {
      setMonthCursor(parsedValue);
    }
  }, [open, value]);

  const selectedDate = useMemo(() => {
    if (!value) {
      return null;
    }

    const parsedValue = parseISO(value);
    return Number.isNaN(parsedValue.getTime()) ? null : parsedValue;
  }, [value]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(monthCursor);
    const monthEnd = endOfMonth(monthCursor);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [monthCursor]);

  const weekdayLabels = useMemo(() => {
    const firstWeekDay = startOfWeek(new Date(), { weekStartsOn: 1 });

    return Array.from({ length: 7 }, (_, index) =>
      format(addDays(firstWeekDay, index), "EEEEE", { locale: dateLocale })
    );
  }, [dateLocale]);

  const formattedValue = selectedDate ? format(selectedDate, displayFormat, { locale: dateLocale }) : "";

  const handleSelectDate = (date: Date) => {
    onChange(format(date, "yyyy-MM-dd"));
    setMonthCursor(date);
    setOpen(false);
  };

  const placeholderText = placeholder || t("datePicker.selectDate");

  return (
    <div className="relative">
      <button
        id={id}
        type="button"
        ref={triggerRef}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((previous) => !previous)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-left text-sm text-foreground shadow-sm transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      >
        <span className={cn("truncate", !formattedValue && "text-muted-foreground")}>
          {formattedValue || placeholderText}
        </span>
        <CalendarDays className="ml-3 h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          className={cn(
            "absolute top-[calc(100%+0.5rem)] z-[220] overflow-hidden rounded-lg border border-border bg-card shadow-xl",
            panelPosition === 'center' && "left-1/2 -translate-x-1/2",
            panelPosition === 'left' && "left-0",
            panelPosition === 'right' && "right-0"
          )}
          style={{ width: panelWidth ? `${panelWidth}px` : undefined, maxWidth: "calc(100vw - 1rem)" }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-foreground transition-colors hover:bg-accent"
              onClick={() => setMonthCursor((previous) => subMonths(previous, 1))}
              aria-label={t("datePicker.previousMonth")}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            <div className="text-center">
              <p className="text-xs font-semibold text-foreground">{format(monthCursor, "MMMM yyyy", { locale: dateLocale })}</p>
            </div>

            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-foreground transition-colors hover:bg-accent"
              onClick={() => setMonthCursor((previous) => addMonths(previous, 1))}
              aria-label={t("datePicker.nextMonth")}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="px-2 py-2">
            <div className="mb-1.5 grid grid-cols-7 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {weekdayLabels.map((label) => (
                <div key={label} className="py-0.5">
                  {label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {calendarDays.map((day) => {
                const isCurrentMonth = isSameMonth(day, monthCursor);
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                const currentDay = isToday(day);

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => handleSelectDate(day)}
                    className={cn(
                      "flex h-8 items-center justify-center rounded text-xs transition-colors",
                      isCurrentMonth ? "text-foreground hover:bg-accent" : "text-muted-foreground/60 hover:bg-accent/60",
                      isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                      currentDay && !isSelected && "ring-1 ring-primary/40"
                    )}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
              <button
                type="button"
                className="text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setOpen(false)}
              >
                {t("datePicker.close")}
              </button>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                <span>{selectedDate ? format(selectedDate, "PPP", { locale: dateLocale }) : placeholderText}</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
