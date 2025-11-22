import { createDAVClient } from "tsdav";
import dotenv from "dotenv";

dotenv.config();

const ICLOUD_USERNAME = process.env.ICLOUD_USERNAME;
const ICLOUD_APP_PASSWORD = process.env.ICLOUD_APP_PASSWORD;

if (!ICLOUD_USERNAME || !ICLOUD_APP_PASSWORD) {
    console.error("Missing ICLOUD_USERNAME or ICLOUD_APP_PASSWORD in .env");
    process.exit(1);
}

export async function getDavClient(server: "caldav" | "carddav" = "caldav") {
    return await createDAVClient({
        serverUrl: server === "caldav" ? "https://caldav.icloud.com" : "https://contacts.icloud.com",
        credentials: {
            username: ICLOUD_USERNAME,
            password: ICLOUD_APP_PASSWORD,
        },
        authMethod: "Basic",
        defaultAccountType: server,
    });
}

export function getFilenameFromUrl(url: string): string {
    const parts = url.split("/");

    return parts[parts.length - 1];
}