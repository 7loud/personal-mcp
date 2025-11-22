import { getDavClient } from "./iCloudClient";

import type { DAVCalendar, DAVCalendarObject, DAVObject } from "tsdav";
import type { SimpleEvent, PublicCalendar, EventsByCalendar } from "../@types/calendar";

async function fetchAllCalendars(): Promise<DAVCalendar[]> {
    const client = await getDavClient("caldav"),
        calendars = await client.fetchCalendars();

    if (!calendars || calendars.length === 0)
        throw new Error("Could not find any calendars on iCloud");

    return calendars;
}

async function findCalendarByUrl(url: string): Promise<DAVCalendar | undefined> {
    return (await fetchAllCalendars()).find((c) => c.url === url);
}

export async function listCalendars(): Promise<PublicCalendar[]> {
    const calendars = await fetchAllCalendars();

    // TODO: don't send calendar's URL to AI and use custom generated (hash) ID instead
    return calendars.map((calendar) => {
        const {
            url,
            displayName,
            calendarColor,
            timezone,
            description,
        } = calendar;

        return {
            url,
            displayName,
            calendarColor,
            timezone,
            description,
        };
    });
}

export async function listEvents(fromISO: string, toISO: string, useCalendars: "all" | string[]): Promise<EventsByCalendar[]> {
    const client = await getDavClient("caldav"),
        calendars = await listCalendars();

    const calendarURLs = useCalendars === "all" ? calendars.map(c => c.url) : useCalendars,
        result: EventsByCalendar[] = [];

    await Promise.all(
        calendarURLs.map(async (calendarUrl) => {
            const calendar = calendars.find((c) => c.url === calendarUrl);

            if (!calendar) return;

            const events: DAVObject[] = await client.fetchCalendarObjects({
                    calendar,
                    timeRange: {
                        start: fromISO,
                        end: toISO,
                    },
                }),
                simpleEvents: SimpleEvent[] = events.map((event) => ({
                    url: event.url!,
                    etag: event.etag,
                    iCal: event.data!,
                }));

            result.push({
                calendar,
                events: simpleEvents,
            });
        })
    );

    return result;
}

export async function createEvent(calendarUrl: string, iCalData: string, filename: string): Promise<void> {
    const client = await getDavClient("caldav"),
        calendar = await findCalendarByUrl(calendarUrl);

    if (!calendar) throw new Error(`Calendar with URL "${calendarUrl}" not found`);

    await client.createCalendarObject({
        calendar,
        iCalString: iCalData,
        filename,
    });
}

export async function updateEvent(url: string, iCalData: string, etag?: string): Promise<void> {
    const client = await getDavClient("caldav"),
        calendarObject: DAVCalendarObject = {
            url,
            data: iCalData,
            ...(etag ? { etag } : {}),
        };

    await client.updateCalendarObject({
        calendarObject,
    });
}

export async function deleteEvent(url: string): Promise<void> {
    const client = await getDavClient("caldav"),
        calendarObject: DAVCalendarObject = {
            url,
        };

    await client.deleteCalendarObject({
        calendarObject,
    });
}