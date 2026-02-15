import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/hooks/useCalendar";

type Props = {
  events: CalendarEvent[];
  isConnected: boolean;
  loading: boolean;
  onConnect?: () => void;
  onPrepMeeting?: (event: CalendarEvent) => void;
  onPlanDay?: () => void;
  className?: string;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export function CalendarTLDR({
  events,
  isConnected,
  loading,
  onConnect,
  onPrepMeeting,
  onPlanDay,
  className,
}: Props) {
  const { nextEvent, todayCount, freeBlocks } = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    const todayEvents = events.filter(
      (e) => new Date(e.start_at).toDateString() === todayStr
    );
    const nextEvent = events[0] || null;

    // Simple free block estimation
    const busyMinutes = todayEvents.reduce((sum, e) => {
      const start = new Date(e.start_at);
      const end = new Date(e.end_at);
      return sum + (end.getTime() - start.getTime()) / 60000;
    }, 0);
    const workMinutes = 8 * 60; // 8 hour day
    const freeMinutes = Math.max(0, workMinutes - busyMinutes);
    const freeBlocks = Math.floor(freeMinutes / 30);

    return { nextEvent, todayCount: todayEvents.length, freeBlocks };
  }, [events]);

  if (!isConnected) {
    return (
      <div className={cn("rounded-2xl border border-border bg-muted/10 p-4", className)}>
        <div className="text-xs font-medium text-foreground">Calendar</div>
        <div className="mt-2 text-xs text-muted-foreground">
          Connect your Google Calendar to see today's schedule, prep for meetings, and plan your day.
        </div>
        <button
          type="button"
          onClick={onConnect}
          className="mt-3 rounded-lg border border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted/30 transition-colors"
        >
          Connect Google Calendar
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={cn("rounded-2xl border border-border bg-muted/10 p-4", className)}>
        <div className="text-xs font-medium text-foreground">Calendar</div>
        <div className="mt-2 text-xs text-muted-foreground">Loading events…</div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl border border-border bg-muted/10 p-4", className)}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-foreground">Today</div>
        <div className="text-[10px] text-muted-foreground font-mono">
          {todayCount} event{todayCount !== 1 ? "s" : ""} • ~{freeBlocks} free blocks
        </div>
      </div>

      {nextEvent && (
        <div className="mt-2 rounded-lg border border-border p-2">
          <div className="flex items-center justify-between">
            <div className="text-xs text-foreground">{nextEvent.title || "Untitled"}</div>
            <div className="text-[10px] text-muted-foreground">
              {formatDate(nextEvent.start_at)} {formatTime(nextEvent.start_at)}
            </div>
          </div>
          {nextEvent.location && (
            <div className="text-[10px] text-muted-foreground mt-0.5">{nextEvent.location}</div>
          )}
        </div>
      )}

      {events.length === 0 && (
        <div className="mt-2 text-xs text-muted-foreground">No upcoming events this week.</div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {nextEvent && onPrepMeeting && (
          <button
            type="button"
            onClick={() => onPrepMeeting(nextEvent)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted/30 transition-colors"
          >
            Prep next meeting
          </button>
        )}
        {onPlanDay && (
          <button
            type="button"
            onClick={onPlanDay}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
          >
            Plan my day
          </button>
        )}
      </div>
    </div>
  );
}
