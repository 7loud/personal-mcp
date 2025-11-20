import dotenv from "dotenv";
dotenv.config();

import express from "express";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

// Import tools
import { registerCalendarTools } from "./tools/calendar";

// Create server
const server = new McpServer({
    name: "personal-mcp",
    version: "0.0.0",
    title: "Personal MCP"
});

let sseTransport: SSEServerTransport | null = null;

// Register server tools
registerCalendarTools(server);

// Set up streamable HTTP transport
async function main() {
    const app = express();

    app.use(express.json());

    app.post("/mcp", async (req, res) => {
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
            enableJsonResponse: true,
        });

        res.on("close", transport.close);

        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
    });

    // Intentionally use deprecated SSE endpoint for Poke integration
    app.get("/sse", async (req, res) => {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        sseTransport = new SSEServerTransport("/sse/messages", res);

        res.on("close", () => {
            if (sseTransport) {
                sseTransport.close();
                sseTransport = null;
            }
        });

        await server.connect(sseTransport);
    });

    app.post("/sse/messages", async (req, res) => {
        if (!sseTransport) {
            res.status(400).send("No SSE session active");
            return;
        }

        await sseTransport.handlePostMessage(req, res);
    });

    const port = parseInt(process.env.PORT || "8000", 10);

    app.listen(port, () => {
            console.log(`Personal MCP listens at http://localhost:${port}/mcp`);
        })
        .on("error", (error) => {
            console.error("Server error:", error);
            process.exit(1);
        });
}

main().catch((err) => {
    console.error("Error at start:", err);
    process.exit(1);
});