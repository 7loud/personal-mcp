import dotenv from "dotenv";

import { listEvents, createEvent, deleteEvent } from "./iCloud/iCloudClient";
import { buildSimpleEvent, generateUID } from "./iCloud/iCalBuilder";

dotenv.config();

async function main() {
    console.log("Starte iCloud-Test...");

    // Create a test calendar event
    // The event will be created in the real calendar of the user
    const now = new Date(),
        inOneHour = new Date(now.getTime() + 60 * 60 * 1000);

    const uid = generateUID(),
        filename = `${uid}.ics`,
        iCal = buildSimpleEvent({
            uid,
            summary: "MCP Testevent",
            description: "Erstellt von test.ts",
            location: "Zuhause",
            start: now,
            end: inOneHour,
        });

    console.log("Creating test event with UID:", uid);
    await createEvent(iCal, filename);
    console.log("Event created successfully.");

    // Check for events from now until in one hour
    const from = new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
        to = new Date(inOneHour.getTime() + 5 * 60 * 1000).toISOString();

    console.log("List of events between", from, "and", to);
    const events = await listEvents(from, to);
    console.log(`Found events: ${events.length}`);

    const created = events.find(e => e.iCal.includes(uid));

    if (created) {
        console.log("Found test event by URL:", created.url);

        // Delete the created test event
        console.log("Deleting test event...");
        await deleteEvent(created.url);
        console.log("Deleted test event successfully.");
    } else
        console.log("Could not find test event in list.");

    console.log("Finished.");
}

main().catch(err => {
    console.error("Error during test:", err);
    process.exit(1);
});