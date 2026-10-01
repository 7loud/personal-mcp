export default function debugLog(message: string, ...optionalParams: any[]): void {
    if (process.env.DEBUG_LOG === "true") {
        console.debug(message, ...optionalParams);
    }
}