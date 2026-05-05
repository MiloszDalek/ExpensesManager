import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { DismissableLayer } from "@radix-ui/react-dismissable-layer";
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

type PanelStyle = {
  top: number;
  left: number;
  width: number;
};

const PANEL_ANIMATION_MS = 200;

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
  const closeTimeoutRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<PanelStyle | null>(null);
  const [isPanelRendered, setIsPanelRendered] = useState(false);
  const [panelState, setPanelState] = useState<"open" | "closed">("closed");
  const [monthCursor, setMonthCursor] = useState(() => {
    const parsedValue = value ? parseISO(value) : null;
    return parsedValue && !Number.isNaN(parsedValue.getTime()) ? parsedValue : new Date();
  });

  const dateLocale = useMemo(() => {
    return i18n.language.startsWith("pl") ? pl : enUS;
  }, [i18n.language]);

  useEffect(() => {
    if (open) {
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }

      setIsPanelRendered(true);
      setPanelState("open");
      return;
    }

    if (!isPanelRendered) {
      return;
    }

    setPanelState("closed");
    closeTimeoutRef.current = window.setTimeout(() => {
      setIsPanelRendered(false);
      closeTimeoutRef.current = null;
    }, PANEL_ANIMATION_MS);

    return () => {
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    };
  }, [open, isPanelRendered]);

  useEffect(() => {
    if (!isPanelRendered) {
      setPanelStyle(null);
    }
  }, [isPanelRendered]);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    const updatePanelStyle = () => {
      const viewportPadding = 12;
      const fixedWidth = 240;
      const width = Math.min(fixedWidth, Math.max(window.innerWidth - viewportPadding * 2, 160));
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      // Calculate smart positioning to prevent off-screen overflow
      const triggerRect = triggerRef.current?.getBoundingClientRect();
      if (triggerRect) {
        const spaceOnLeft = triggerRect.left;
        const spaceOnRight = window.innerWidth - triggerRect.right;
        const panelHeight = panelRef.current?.offsetHeight ?? 296;
        const spaceBelow = window.innerHeight - triggerRect.bottom;
        const spaceAbove = triggerRect.top;
        let left = scrollX + triggerRect.left + triggerRect.width / 2 - width / 2;
        let top = scrollY + triggerRect.bottom + 8;

        if (spaceOnRight < width / 2 && spaceOnLeft > width / 2) {
          left = scrollX + triggerRect.right - width;
        } else if (spaceOnLeft < width / 2 && spaceOnRight > width / 2) {
          left = scrollX + triggerRect.left;
        }

        if (spaceBelow < panelHeight + 8 && spaceAbove >= panelHeight + 8) {
          top = scrollY + triggerRect.top - panelHeight - 8;
        }

        left = Math.min(scrollX + window.innerWidth - viewportPadding - width, Math.max(scrollX + viewportPadding, left));
        top = Math.max(scrollY + viewportPadding, top);

        setPanelStyle({
          top,
          left,
          width,
        });
      }
    };

    updatePanelStyle();

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

    const handleScroll = () => {
      setOpen(false);
    };

    window.addEventListener("resize", updatePanelStyle);
    window.addEventListener("scroll", handleScroll, true);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("resize", updatePanelStyle);
      window.removeEventListener("scroll", handleScroll, true);
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

      {isPanelRendered && panelStyle
        ? createPortal(
            <DismissableLayer asChild>
              <div
                ref={panelRef}
                role="dialog"
                aria-modal="false"
                data-state={panelState}
                className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 absolute z-[220] overflow-hidden rounded-lg border border-border bg-card shadow-xl duration-200"
                style={{
                  top: `${panelStyle.top}px`,
                  left: `${panelStyle.left}px`,
                  width: `${panelStyle.width}px`,
                  maxWidth: "calc(100vw - 1rem)",
                }}
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
            </DismissableLayer>,
            document.body
          )
        : null}
    </div>
  );
}
