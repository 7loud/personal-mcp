import { createDAVClient, DAVCalendar, DAVCalendarObject, DAVObject } from "tsdav";
import dotenv from "dotenv";

import type { SimpleEvent } from "../@types/SimpleEvent";

dotenv.config();

const ICLOUD_USERNAME = process.env.ICLOUD_USERNAME;
const ICLOUD_APP_PASSWORD = process.env.ICLOUD_APP_PASSWORD;
const ICLOUD_SERVER_URL = process.env.ICLOUD_SERVER_URL ?? "https://caldav.icloud.com";

if (!ICLOUD_USERNAME || !ICLOUD_APP_PASSWORD) {
    console.error("Missing ICLOUD_USERNAME or ICLOUD_APP_PASSWORD in .env");
    process.exit(1);
}

let cachedCalendar: DAVCalendar | null = null;

async function getDavClient() {
    return await createDAVClient({
        serverUrl: ICLOUD_SERVER_URL,
        credentials: {
            username: ICLOUD_USERNAME,
            password: ICLOUD_APP_PASSWORD,
        },
        authMethod: "Basic",
        defaultAccountType: "caldav",
    });
}

export async function getPrimaryCalendar(): Promise<DAVCalendar> {
    if (cachedCalendar) return cachedCalendar;

    const client = await getDavClient(),
        calendars = await client.fetchCalendars();

    if (!calendars || calendars.length === 0)
        throw new Error("Could not find any calendars on iCloud");

    console.log("[getPrimaryCalendar] Calendars", calendars)

    // TODO: filter by display name
    cachedCalendar = calendars[0];
    return cachedCalendar;
}

export async function listEvents(fromISO: string, toISO: string): Promise<SimpleEvent[]> {
    const client = await getDavClient(),
        calendar = await getPrimaryCalendar();

    const objects: DAVObject[] = await client.fetchCalendarObjects({
        calendar,
        timeRange: {
            start: fromISO,
            end: toISO,
        },
    });

    return objects.map(obj => ({
        url: obj.url!,
        etag: obj.etag,
        iCal: obj.data!,
    }));
}

export async function createEvent(icalData: string, filename: string): Promise<void> {
    const client = await getDavClient(),
        calendar = await getPrimaryCalendar();

    await client.createCalendarObject({
        calendar,
        iCalString: icalData,
        filename,
    });
}

export async function updateEvent(url: string, icalData: string, etag?: string): Promise<void> {
    const client = await getDavClient(),
        calendarObject: DAVCalendarObject = {
            url,
            data: icalData,
            ...(etag ? { etag } : {}),
        };

    await client.updateCalendarObject({
        calendarObject,
    });
}

export async function deleteEvent(url: string): Promise<void> {
    const client = await getDavClient(),
        calendarObject: DAVCalendarObject = {
            url,
        };

    await client.deleteCalendarObject({
        calendarObject,
    });
}

export function getFilenameFromUrl(url: string): string {
    const parts = url.split("/");

    return parts[parts.length - 1];
}