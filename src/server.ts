import dotenv from "dotenv";

import express from "express";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

// Import tools
import { registerCalendarTools } from "./tools/calendar";

dotenv.config();

// Create server
const server = new McpServer({
    name: "personal-mcp",
    version: "0.0.0",
    title: "Personal MCP"
});

let transports = new Map<string, SSEServerTransport>();

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

        res.on("close", () => {
            transport.close();
        });

        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
    });

    // Intentionally use deprecated SSE endpoint for Poke integration
    app.get("/sse", async (req, res) => {
        const transport = new SSEServerTransport("/message", res);

        transports.set(transport.sessionId, transport);

        transport.onclose = () => {
            transports.delete(transport.sessionId);
        };

        res.on("close", () => {
            transport.close();
        });

        await server.connect(transport);
    });

    app.post("/message", async (req, res) => {
        const sessionId = req.query.sessionId as string;

        if (!sessionId) {
            res.status(400).send("No sessionId");
            return;
        }

        const transport = transports.get(sessionId);

        if (!transport) {
            res.status(400).json({
                jsonrpc: "2.0",
                error: {
                    code: -32000,
                    message: "Bad Request: Unknown or missing MCP session",
                },
                id: null,
            });
            return;
        }

        const message = req.body;

        try {
            await transport.handleMessage(message);
            res.status(200).end();
        } catch (err) {
            console.error("Error in SSE handleMessage:", err);
            res.status(500).json({
                jsonrpc: "2.0",
                error: {
                    code: -32001,
                    message: "Internal error while handling SSE message",
                },
                id: message?.id ?? null,
            });
        }
    });

    app.get("/", (req, res) => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
            JSON.stringify({
                name: "Personal MCP",
                version: process.env.npm_package_version,
                endpoints: {
                    sse: "/sse",
                    message: "/message",
                },
                activeConnections: transports.size,
            })
        );
    });

    const port = parseInt(process.env.PORT || "8000", 10);

    app.listen(port, () => {
            console.log(`Personal MCP listens at http://localhost:${port}`);
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