import crypto from "crypto";

import type { BuildEventOptions } from "../@types/BuildEventOptions";

export function toICalDateTimeUTC(date: Date): string {
    const y = date.getUTCFullYear();
    const m = (date.getUTCMonth() + 1).toString().padStart(2, "0");
    const d = date.getUTCDate().toString().padStart(2, "0");
    const hh = date.getUTCHours().toString().padStart(2, "0");
    const mm = date.getUTCMinutes().toString().padStart(2, "0");
    const ss = date.getUTCSeconds().toString().padStart(2, "0");

    return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

export function generateUID(): string {
    const rand = crypto.randomBytes(8).toString("hex");

    return `${rand}@icloud-mcp`;
}

export function buildSimpleEvent(options: BuildEventOptions): string {
    const uid = options.uid ?? generateUID();
    const dtStart = toICalDateTimeUTC(options.start);
    const dtEnd = toICalDateTimeUTC(options.end);
    const dtStamp = toICalDateTimeUTC(new Date());

    const lines: string[] = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Personal MCP//EN",
        "CALSCALE:GREGORIAN",
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${dtStamp}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${escapeText(options.summary)}`,
    ];

    if (options.description)
        lines.push(`DESCRIPTION:${escapeText(options.description)}`);

    if (options.location)
        lines.push(`LOCATION:${escapeText(options.location)}`);

    lines.push("END:VEVENT", "END:VCALENDAR");

    return lines.join("\r\n");
}

function escapeText(text: string): string {
    return text
        .replace(/\\/g, "\\\\")
        .replace(/\n/g, "\\n")
        .replace(/,/g, "\\,");
}