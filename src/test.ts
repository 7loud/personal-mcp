import dotenv from "dotenv";

import { listEvents, createEvents, deleteEvents, listCalendars } from "./iCloud/calendar";
import { buildSimpleEvent, generateUID } from "./iCloud/iCalBuilder";

dotenv.config();

async function main() {
    console.log("Starting iCloud-Test...");

    // Create a test calendar event
    // The event will be created in the real calendar of the user
    const now = new Date(),
        inOneHour = new Date(now.getTime() + 60 * 60 * 1000);

    const events = [
        {
            summary: "MCP Testevent w/o Timezone"
        },
        {
            summary: "MCP Testevent w/ Timezone",
            timezone: "Europe/Berlin"
        }
    ];

    for (const event of events) {
        const uid = generateUID(),
            filename = `${uid}.ics`,
            iCalData = buildSimpleEvent({
                uid,
                summary: event.summary,
                description: "Created by Personal MCP testing script",
                location: "Everywhere and Nowhere",
                timezone: event.timezone,
                start: now,
                end: inOneHour,
            });

        const calendarURL = (await listCalendars())[0].url;

        console.log(`Creating test event (${event.summary}) with UID: ${uid}`);

        await createEvents(calendarURL, [{iCalData, uid, filename}]);

        console.log("Event created successfully.");

        // Check for events from now until in one hour
        const from = new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
            to = new Date(inOneHour.getTime() + 5 * 60 * 1000).toISOString();

        console.log("List of events between", from, "and", to);

        const eventsByCalendars = await listEvents(from, to, "all"),
            events = eventsByCalendars.flatMap(c => c.events);

        console.log(`Found ${events.length} event(s) in calendar.`);

        const created = events.find(e => e.iCal.includes(uid));

        if (created) {
            console.log("Found test event by URL:", created.url);

            // Delete the created test event
            console.log("Deleting test event...");

            if ((await deleteEvents([created.url]))[0].success)
                console.log("Deleted test event successfully.");
            else
                console.log("Failed to delete test event.");
        } else
            console.log("Could not find test event in list.");
    }

    console.log("Finished.");
}

main().catch(err => {
    console.error("Error during test:", err);
    process.exit(1);
});