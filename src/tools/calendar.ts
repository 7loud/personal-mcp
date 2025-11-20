import { z } from "zod";

import {
    listEvents,
    createEvent,
    updateEvent,
    deleteEvent,
} from "../iCloud/iCloudClient";

import {
    buildSimpleEvent,
    generateUID,
} from "../iCloud/iCalBuilder";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BuildEventOptions } from "../@types/BuildEventOptions";

export function registerCalendarTools(server: McpServer) {
    // List calendar events
    server.registerTool(
        "calendar_list_events",
        {
            description: "Returns a list of all iCloud calendar events within a specified time range.",
            inputSchema: {
                from: z.string().describe("Start time as ISO-String (incl. timezone)"),
                to: z.string().describe("End time as ISO-String (incl. timezone)"),
            },
        },
        async ({ from, to }: { from: string, to: string}) => {
            const events = await listEvents(from, to),
                output = { events };

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(output),
                    },
                ],
            };
        }
    );

    // Create calendar event
    server.registerTool(
        "calendar_create_event",
        {
            description: "Creates a new iCloud calendar event. Returns the created event's UID and filename.",
            inputSchema: {
                summary: z.string().describe("Event title"),
                description: z.string().optional(),
                location: z.string().optional(),
                start: z.string().describe("Start (ISO-String)"),
                end: z.string().describe("End (ISO-String)"),
            },
        },
        async ({ summary, description, location, start, end }) => {
            const opts: BuildEventOptions = {
                summary,
                description,
                location,
                start: new Date(start),
                end: new Date(end),
            };

            const uid = generateUID(),
                filename = `${uid}.ics`,
                iCal = buildSimpleEvent({ ...opts, uid });

            await createEvent(iCal, filename);

            const output = { success: true, uid, filename };

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(output),
                    },
                ],
            };
        }
    );

    // Update calendar event
    server.registerTool(
        "calendar_update_event",
        {
            description: "Updates an existing iCloud calendar event by its CalDAV URL.",
            inputSchema: {
                url: z.string().describe("Event iCloud-CalDAV-URL"),
                summary: z.string().optional().describe("Event title"),
                description: z.string().optional(),
                location: z.string().optional(),
                start: z.string().optional().describe("New start (ISO-String)"),
                end: z.string().optional().describe("New end (ISO-String)"),
                etag: z.string().optional().describe("Optional ETag from listEvents"),
            },
        },
        async ({url, summary, description, location, start, end, etag}) => {
            const opts: BuildEventOptions = {
                summary: summary ?? "No title",
                description,
                location,
                start: start ? new Date(start) : new Date(),
                end: end ? new Date(end) : new Date(Date.now() + 60 * 60 * 1000),
            },
                iCal = buildSimpleEvent(opts);

            await updateEvent(url, iCal, etag);

            const output = { success: true };

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(output),
                    },
                ],
            };
        }
    );

    // Delete calendar event
    server.registerTool(
        "calendar_delete_event",
        {
            description: "Deletes an existing iCloud calendar event by its CalDAV URL.",
            inputSchema: {
                url: z.string().describe("Event iCloud-CalDAV-URL"),
            },
        },
        async ({ url }: { url: string }) => {
            await deleteEvent(url);

            const output = { success: true };

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(output),
                    },
                ],
            };
        }
    );
}