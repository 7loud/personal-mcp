import { tzlib_get_ical_block } from "timezones-ical-library";
import crypto from "crypto";

import type { BuildEventOptions } from "../@types/calendar";

/**
    @description Converts a Date object to an iCal date-time string in the format YYYYMMDDTHHMMSS. If utc is true, the date-time will be in UTC and will have a "Z" suffix.
    @param date - The Date object to convert.
    @param utc - Whether to convert the date-time to UTC and include a "Z" suffix. Defaults to `true`.
    @returns The iCal date-time string.
 */
export function toICalDateTime(date: Date, utc: boolean = true): string {
    const y = date.getUTCFullYear();
    const m = (date.getUTCMonth() + 1).toString().padStart(2, "0");
    const d = date.getUTCDate().toString().padStart(2, "0");
    const hh = date.getUTCHours().toString().padStart(2, "0");
    const mm = date.getUTCMinutes().toString().padStart(2, "0");
    const ss = date.getUTCSeconds().toString().padStart(2, "0");

    return `${y}${m}${d}T${hh}${mm}${ss}${utc ? "Z" : ""}`;
}

export function generateUID(): string {
    const rand = crypto.randomBytes(8).toString("hex");

    return `${rand}@personal-icloud-mcp`;
}

export function buildSimpleEvent(options: BuildEventOptions): string {
    const uid = options.uid ?? generateUID();

    // DTSTAMP is the timestamp of when the event was created, in UTC
    const dtStamp = toICalDateTime(new Date());

    const lines: string[] = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Personal MCP//EN",
        "CALSCALE:GREGORIAN",
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${dtStamp}`,
        `SUMMARY:${escapeText(options.summary)}`,
    ];

    /*
        If a timezone is provided, use the tzlib_get_ical_block function to get the iCal block for that timezone and include it in the event.
        Otherwise, format the date/time to UTC.
     */
    if (options.timezone) {
        const dateTimeBlock = tzlib_get_ical_block(options.timezone),
            dtStart = toICalDateTime(options.start, false),
            dtEnd = toICalDateTime(options.end, false);

        lines.push(dateTimeBlock[0]);
        lines.push(
            `DTSTART;${dateTimeBlock[1]}:${dtStart}`,
            `DTEND;${dateTimeBlock[1]}:${dtEnd}`
        );
    } else {
        const dtStart = toICalDateTime(options.start),
            dtEnd = toICalDateTime(options.end);

        lines.push(`DTSTART:${dtStart}`, `DTEND:${dtEnd}`);
    }

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