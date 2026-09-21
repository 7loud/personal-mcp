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

export async function createEvents(calendarUrl: string, events: { iCalData: string, uid: string, filename: string }[]): Promise<{ success: boolean, uid: string, filename: string }[]> {
    const client = await getDavClient("caldav"),
        calendar = await findCalendarByUrl(calendarUrl);

    if (!calendar) throw new Error(`Calendar with URL "${calendarUrl}" not found`);

    const structuredContent: { success: boolean, uid: string, filename: string }[] = [];

    for (const event of events) {
        await client.createCalendarObject({
            calendar,
            iCalString: event.iCalData,
            filename: event.filename,
        }).then((res) => {
            const success = res.status === 201 || res.status === 204;

            structuredContent.push({ success, uid: event.uid, filename: event.filename });

            if (!res || !res.url || !success) throw new Error(`Failed to create event with UID "${event.uid}"`);
        }).catch((err) => {
            console.error("Error creating event:", err);
            structuredContent.push({ success: false, uid: event.uid, filename: event.filename });
        });
    }

    return structuredContent;
}

export async function updateEvents(url: string, events: { iCalData: string, etag?: string }[]): Promise<{ success: boolean, etag?: string, iCalData: string }[]> {
    const client = await getDavClient("caldav"),
        structuredContent: { success: boolean, etag?: string, iCalData: string }[] = [];

    for (const event of events) {
        await client.updateCalendarObject({
            calendarObject: {
                url,
                data: event.iCalData,
                etag: event.etag,
            },
        }).then((res) => {
            const success = res.status === 200 || res.status === 204;

            structuredContent.push({ success, etag: event.etag, iCalData: event.iCalData });

            if (!res || !res.url || !success) throw new Error(`Failed to update event with URL "${url}"`);
        }).catch((err) => {
            console.error("Error updating event:", err);
            structuredContent.push({ success: false, etag: event.etag, iCalData: event.iCalData });
        });
    }

    return structuredContent;
}

export async function deleteEvents(url: string[]): Promise<{ success: boolean; url: string }[]> {
    const client = await getDavClient("caldav"),
        structuredContent: { success: boolean, url: string }[] = [];

    for (const singleURL of url) {
        const calendarObject: DAVCalendarObject = {
            url: singleURL,
        };

        await client.deleteCalendarObject({
            calendarObject,
        }).then((res) => {
            const success = res.status === 200 || res.status === 204;

            structuredContent.push({ success, url: singleURL });

            if (!res || !res.url || !success) throw new Error(`Failed to delete event with URL "${singleURL}"`);
        }).catch((err) => {
            console.error("Error deleting event:", err);
            structuredContent.push({ success: false, url: singleURL });
        });
    }

    return structuredContent;
}