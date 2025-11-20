import dotenv from "dotenv";
dotenv.config();

import express from "express";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

// Import tools
import { registerCalendarTools } from "./tools/calendar";

// Create server
const server = new McpServer({
    name: "personal-mcp",
    version: "0.0.0",
    title: "Personal MCP"
});

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