### Public version now available! [thefredlab/icloud-mcp](https://github.com/thefredlab/icloud-mcp)

# Personal MCP Server

A personal Model Context Protocol (MCP) server that provides calendar integration with iCloud through CalDAV protocol.
This server allows seamless interaction with iCloud calendars through a standardized API.

## Features

- Calendar management through iCloud CalDAV
- Support for listing, creating, updating, and deleting calendar events
- Calendar listing and management
- Secure authentication and request validation
- Health check endpoint

## Available Tools

### Calendar Tools

- `list_icloud-calendars`: List all available iCloud calendars
- `icloud-calendar_list_events`: Retrieve events within a specified time range
- `icloud-calendar_create_event`: Create new calendar events
- `icloud-calendar_update_event`: Update existing calendar events
- `icloud-calendar_delete_event`: Delete calendar events

### Contacts Tools
Currently under development.

## Configuration

The server can be configured using environment variables. Take a look at `.env.example` for a list of available variables. Feel free to copy the file and rename it to `.env`.

## Usage

1. Set up your environment variables
2. Start the server using `npm start`
3. Access the server at `http://localhost:<PORT>`

### Endpoints

- `/`: Server information
- `/health`: Health check
- `/shttp`: Main MCP communication endpoint
