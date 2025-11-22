import type { DAVCalendar } from "tsdav";

export type BuildEventOptions = {
    uid?: string;
    summary: string;
    description?: string;
    location?: string;
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
