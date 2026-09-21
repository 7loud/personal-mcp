import type { DAVCalendar } from "tsdav";

export type BuildEventOptions = {
    uid?: string;
    summary: string;
    description?: string;
    location?: string;
    /**
     * The timezone of the event's start and end time/date. Must follow the IANA timezone database format (e.g., "America/New_York"). If not provided, the event will be treated as UTC.
     */
    timezone?: string;
    start: Date;
    end: Date;
};

export type SimpleEvent = {
    url: string;
    etag?: string;
    iCal: string;
};

export type PublicCalendar = Pick<
    DAVCalendar,
    "url" | "displayName" | "calendarColor" | "timezone" | "description"
>;

export type EventsByCalendar = {
    calendar: PublicCalendar;
    events: SimpleEvent[];
};
