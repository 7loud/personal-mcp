import { z } from "zod";

import {
    listEvents,
    createEvents,
    updateEvents,
    deleteEvents,
    listCalendars
} from "../iCloud/calendar";

import {
    buildSimpleEvent,
    generateUID
} from "../iCloud/iCalBuilder";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BuildEventOptions } from "../@types/calendar";

export function registerCalendarTools(server: McpServer) {
    // List calendars
    server.registerTool("list_icloud-calendars", {
            description: "Returns a list of all iCloud calendars.",
            inputSchema: z.object({}),
            outputSchema: z.object({
                calendars: z.array(
                    z.object({
                        url: z.string(),
                        displayName: z.string(),
                        calendarColor: z.string(),
                        timezone: z.string(),
                        description: z.string().optional()
                    })
                )
            })
        },
        async () => {
            const calendars = await listCalendars(),
                structuredContent = { calendars };

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(structuredContent)
                    }
                ],
                structuredContent
            };
        }
    );

    // List calendar events
    server.registerTool("icloud-calendar_list_events", {
            description: "Returns a list of all iCloud calendar events within a specified time range.",
            inputSchema: z.object({
                from: z.string().describe("Start time as ISO-String (incl. timezone)"),
                to: z.string().describe("End time as ISO-String (incl. timezone)"),
                useCalendars: z
                    .union([z.literal("all"), z.array(z.string())])
                    .describe(
                        "List of calendar URLs to query, or 'all' to use all calendars."
                    )
            }),
            outputSchema: z.object({
                events: z.array(
                    z.object({
                        eventUrl: z.string(),
                        calendarUrl: z.string(),
                        etag: z.string(),
                        iCal: z.string()
                    })
                )
            })
        },
        async ({from, to, useCalendars}: { from: string; to: string; useCalendars: "all" | string[]; }) => {
            const events = await listEvents(from, to, useCalendars),
                flatEvents = events.flatMap(({ calendar, events }) =>
                    events.map((ev) => ({
                        eventUrl: ev.url,
                        calendarUrl: calendar.url,
                        etag: ev.etag,
                        iCal: ev.iCal
                    }))
                ),
                structuredContent = { events: flatEvents };

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(structuredContent)
                    }
                ],
                structuredContent
            };
        }
    );

    server.registerTool("icloud-calendar_create_events", {
            description: "Creates one or more iCloud calendar events. Returns the UID, filename and success state for each created event.",
            inputSchema: z.object({
                events: z.array(
                    z.object({
                        url: z.string().describe("Calendar iCloud-CalDAV-URL"),
                        summary: z.string().describe("Event title"),
                        description: z.string().optional().describe("Event description"),
                        location: z.string().optional().describe("Event location"),
                        timezone: z.string().optional().describe("Optional timezone (IANA format, e.g., 'America/New_York'). If not provided, UTC will be used."),
                        start: z.string().describe("Start (ISO-String)"),
                        end: z.string().describe("End (ISO-String)"),
                    })
                )
            }),
            outputSchema: z.object({
                events: z.array(
                    z.object({
                        success: z.boolean().describe("Indicates whether the event was successfully created."),
                        uid: z.string().describe("The unique identifier (UID) of the created event."),
                        filename: z.string().describe("The filename of the created event."),
                    })
                )
            })
        },
        async ({events}) => {
            const structuredContent: { events: { success: boolean; uid: string; filename: string }[] } = { events: [] };

            const eventsByCalendar = events.reduce((acc, event) => {
                if (!acc[event.url]) acc[event.url] = [];
                acc[event.url].push(event);
                return acc;
            }, {} as Record<string, typeof events>);

            for (const [calendarUrl, events] of Object.entries(eventsByCalendar)) {
                const eventsToCreate = events.map(event => {
                    const uid = generateUID(),
                        filename = `${uid}.ics`,
                        iCal = buildSimpleEvent({
                            summary: event.summary,
                            description: event.description,
                            location: event.location,
                            timezone: event.timezone,
                            start: new Date(event.start),
                            end: new Date(event.end),
                            uid
                        });

                    return { iCalData: iCal, uid, filename };
                });

                const createdEvents = await createEvents(calendarUrl, eventsToCreate);

                structuredContent.events.push(...createdEvents);
            }

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(structuredContent)
                    }
                ],
                structuredContent
            };
        }
    );

    server.registerTool("icloud-calendar_update_events", {
            description: "Updates existing iCloud calendar events by their CalDAV URL.",
            inputSchema: z.object({
                events: z.array(z.object({
                    url: z.string().describe("Event iCloud-CalDAV-URL"),
                    summary: z.string().describe("New event title."),
                    description: z.string().optional().describe("New event description. If not provided, the description will be cleared."),
                    location: z.string().optional().describe("New event location. If not provided, the location will be cleared."),
                    timezone: z.string().optional().describe("New timezone (IANA format, e.g., 'America/New_York'). If not provided, UTC will be used."),
                    start: z.string().describe("New start (ISO-String)."),
                    end: z.string().describe("New end (ISO-String)."),
                    etag: z.string().optional().describe("Optional ETag from listEvents")
                }))
            }),
            outputSchema: z.object({
                events: z.array(z.object({
                    success: z.boolean().describe("Indicates whether the event was successfully updated."),
                    etag: z.string().optional().describe("The ETag of the updated event, if available."),
                    iCalData: z.string().describe("The updated iCal data of the event.")
                }))
            })
        },
        async ({ events }) => {
            const structuredContent: { events: { success: boolean; etag?: string; iCalData: string }[] } = { events: [] };

            const eventsByCalendar = events.reduce((acc, event) => {
                if (!acc[event.url]) acc[event.url] = [];
                acc[event.url].push(event);
                return acc;
            }, {} as Record<string, typeof events>);

            for (const [calendarUrl, events] of Object.entries(eventsByCalendar)) {
                const eventsToUpdate = events.map(event => {
                    const iCal = buildSimpleEvent({
                            summary: event.summary,
                            description: event.description,
                            location: event.location,
                            timezone: event.timezone,
                            start: new Date(event.start),
                            end: new Date(event.end)
                        });

                    return { iCalData: iCal, etag: event.etag };
                });

                const updatedEvents = await updateEvents(calendarUrl, eventsToUpdate);

                structuredContent.events.push(...updatedEvents);
            }

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(structuredContent)
                    }
                ],
                structuredContent
            };
        }
    );

    server.registerTool("icloud-calendar_delete_events", {
            description: "Deletes existing iCloud calendar events by their CalDAV URLs.",
            inputSchema: z.object({
                urls: z.array(z.string().describe("Event iCloud-CalDAV-URL"))
            }),
            outputSchema: z.object({
                events: z.array(
                    z.object({
                        success: z.boolean().describe("Indicates whether the event was successfully deleted."),
                        url: z.string().describe("The URL of the deleted event.")
                    })
                )
            })
        },
        async ({ urls }: { urls: string[] }) => {
            const structuredContent = { events: await deleteEvents(urls) };

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(structuredContent)
                    }
                ],
                structuredContent
            };
        }
    );
}