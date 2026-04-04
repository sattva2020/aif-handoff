import { useMemo, useState } from "react";

export type ActivityKind = "tool" | "error" | "agent" | "info";
export type ActivityFilter = "all" | "tool" | "error" | "agent";

export interface ParsedEntry {
  raw: string;
  timestamp: string | null;
  message: string;
  kind: ActivityKind;
  toolName?: string;
}

export function parseEntry(line: string): ParsedEntry {
  const trimmed = line.trim();
  const tsMatch = trimmed.match(/^\[([^\]]+)\]\s*(.*)$/);
  const timestamp = tsMatch ? tsMatch[1] : null;
  const content = (tsMatch ? tsMatch[2] : trimmed).trim();

  const toolMatch = content.match(/^Tool:\s*(.+)$/i);
  if (toolMatch) {
    return {
      raw: line,
      timestamp,
      message: content,
      kind: "tool",
      toolName: toolMatch[1].trim(),
    };
  }

  const lower = content.toLowerCase();
  const isAgent = lower.includes("agent") || lower.includes("subagent");
  const isError = lower.includes("failed") || lower.includes("error");
  const kind: ActivityKind = isError ? "error" : isAgent ? "agent" : "info";

  return { raw: line, timestamp, message: content, kind };
}

export function useActivityLogParsing(activityLog: string | null) {
  const [filter, setFilter] = useState<ActivityFilter>("all");

  const entries = useMemo(
    () => (activityLog ?? "").split("\n").filter((line) => line.trim().length > 0),
    [activityLog],
  );

  const parsedEntries = useMemo(() => entries.map(parseEntry), [entries]);

  const visibleEntries = useMemo(
    () => parsedEntries.filter((e) => filter === "all" || e.kind === filter),
    [filter, parsedEntries],
  );

  const stats = useMemo(() => {
    const byKind: Record<ActivityKind, number> = { tool: 0, error: 0, agent: 0, info: 0 };
    for (const e of parsedEntries) byKind[e.kind]++;
    return { total: parsedEntries.length, visible: visibleEntries.length, byKind };
  }, [parsedEntries, visibleEntries]);

  return { entries, parsedEntries, visibleEntries, filter, setFilter, stats };
}
