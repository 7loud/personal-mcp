import { tzlib_get_ical_block } from "timezones-ical-library";
import crypto from "crypto";

import type { BuildEventOptions } from "../@types/calendar";

/**
    @description Converts a Date object to an iCal date-time string in the format YYYYMMDDTHHMMSS. If utc is true, the date-time will be in UTC and will have a "Z" suffix.
    @param date - The Date object to convert.
    @param timeZone - Optional. The IANA timezone string (e.g., "America/New_York"). If not provided, the date-time will be in UTC.
    @returns The iCal date-time string.
 */
export function toICalDateTime(date: Date, timeZone?: string): string {
    if (!timeZone || timeZone.toUpperCase() === "UTC") {
        const y = date.getUTCFullYear();
        const m = (date.getUTCMonth() + 1).toString().padStart(2, "0");
        const d = date.getUTCDate().toString().padStart(2, "0");
        const hh = date.getUTCHours().toString().padStart(2, "0");
        const mm = date.getUTCMinutes().toString().padStart(2, "0");
        const ss = date.getUTCSeconds().toString().padStart(2, "0");

        return `${y}${m}${d}T${hh}${mm}${ss}Z`;
    }

    const formatter = new Intl.DateTimeFormat("en-GB", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
    });

    const parts = formatter.formatToParts(date);
    const p = Object.fromEntries(parts.map((part) => [part.type, part.value]));

    return `${p.year}${p.month}${p.day}T${p.hour}${p.minute}${p.second}`;
}

export function generateUID(): string {
    const rand = crypto.randomBytes(8).toString("hex");

    return `${rand}@personal-icloud-mcp`;
}

export function buildSimpleEvent(options: BuildEventOptions): string {
    const uid = options.uid ?? generateUID();

    // DTSTAMP is the timestamp of when the event was created, in UTC
    const dtStamp = toICalDateTime(new Date()),
        timeData = getTimeBlocks(options.start, options.end, options.timezone);

    const lines: string[] = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Personal MCP//EN",
        "CALSCALE:GREGORIAN",
    ];

    // --IMPORTANT-- Timezone block BEFORE the first "VEVENT" block.
    if (timeData.tzBlock) lines.push(timeData.tzBlock);

    lines.push(
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${dtStamp}`,
        timeData.dtStart,
        timeData.dtEnd,
        `SUMMARY:${escapeText(options.summary)}`
    );

    if (options.description)
        lines.push(`DESCRIPTION:${escapeText(options.description)}`);

    if (options.location)
        lines.push(`LOCATION:${escapeText(options.location)}`);

    lines.push("END:VEVENT", "END:VCALENDAR");

    return lines.join("\r\n");
}

function getTimeBlocks(start: Date, end: Date, timezone?: string): { dtStart: string; dtEnd: string; tzBlock?: string } {
    if (timezone) {
        const dateTimeBlock = tzlib_get_ical_block(timezone),
            dtStart = toICalDateTime(start, timezone),
            dtEnd = toICalDateTime(end, timezone);

        return {
            dtStart: `DTSTART;${dateTimeBlock[1]}:${dtStart}`,
            dtEnd: `DTEND;${dateTimeBlock[1]}:${dtEnd}`,
            tzBlock: dateTimeBlock[0],
        };
    }

    const dtStart = toICalDateTime(start),
        dtEnd = toICalDateTime(end);

    return {
        dtStart: `DTSTART:${dtStart}`,
        dtEnd: `DTEND:${dtEnd}`
    };
}

function escapeText(text: string): string {
    return text
        .replace(/\\/g, "\\\\")
        .replace(/\n/g, "\\n")
        .replace(/,/g, "\\,");
}