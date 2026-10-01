import "dotenv/config";

export const PMCP_ENABLE_AUTH = process.env.PMCP_ENABLE_AUTH === "true";
export const PMCP_TOKEN = process.env.PMCP_TOKEN;

if (PMCP_ENABLE_AUTH && !PMCP_TOKEN) {
    throw new Error("PMCP_TOKEN is required when authentication is enabled.");
}

export const ALLOWED_ORIGINS = new Set(
    (process.env.PMCP_ALLOWED_ORIGINS ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
);

export const ALLOWED_HOSTS = new Set(
    (process.env.PMCP_ALLOWED_HOSTS ?? "")
        .split(",")
        .map((s) => s.toLowerCase().trim())
        .filter(Boolean)
);

export const PORT = Number(process.env.PORT ?? 4242);
export const VER = Number(process.env.npm_package_version);
export const DEBUG = process.env.DEBUG === "true";

export const PMCP_ENABLE_CALENDAR = process.env.PMCP_ENABLE_CALENDAR === "true";
export const PMCP_ENABLE_CONTACTS = process.env.PMCP_ENABLE_CONTACTS === "true";