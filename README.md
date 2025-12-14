# Oncall - Voice-to-Mockup Pipeline

<div align="center">
  <img src="attachments/Screenshot 2025-12-14 at 19.33.29.png" alt="Oncall Screenshot" />
</div>

An AI forward-deployed engineer that helps non-technical PMs clarify technical requirements with clients in real time.

## Problem

Traditional PM workflows create a disconnect between clients and the development process. Requirements are gathered in meetings, translated by PMs, and only shared with developers later—often leading to miscommunication, rework, and delayed feedback cycles. Clients are kept out of the feedback loop until it's too late to make meaningful changes.

## Solution

Together with @PenTest-duck, we built OnCall which is an AI forward-deployed engineer that helps non-technical PMs clarify technical requirements with clients in real time. By the end of the call, you have outlined tickets and actual mockups ready to hand off to developers. It challenges the traditional PM workflow by putting the client directly in the feedback loop from the start.

## Features

- **Real-time transcript streaming** via ElevenLabs Agents Platform (browser WebSocket)
- **Intent detection** using AI SDK to identify UI/design requests from conversation
- **AI-powered mockup generation** creating HTML/CSS variants based on detected intents
- **Ticket queue** for managing detected UI requirements
- **Linear integration** via ElevenLabs Agent webhook tool for seamless issue creation

## Architecture

```
Browser ──────► Hono Server ──────► ElevenLabs (signed URL)
   │                │
   │                ▼
   └──────► ElevenLabs WebSocket (transcript streaming)
   │
   ├──────► POST /api/intent ──────► AI SDK (Gemini)
   │
   ├──────► POST /api/mockup ──────► AI SDK (Gemini)
   │
   └──────► sendContextualUpdate ──► ElevenLabs Agent ──► Linear Webhook
```

## Prerequisites

- [Bun](https://bun.sh/) runtime
- ElevenLabs account with API key and Agent configured
- Google Gemini API key (for AI SDK)
- Linear account with API key and Team ID

## Setup

### 1. Install dependencies

```bash
# Server
cd server && bun install

# Client
cd client && bun install
```

### 2. Configure environment variables

Create a `.env` file in the `server/` directory:

```env
# ElevenLabs Agents Platform
# Get your API key from: https://elevenlabs.io/app/settings/api
ELEVENLABS_API_KEY=your_api_key_here

# Your ElevenLabs Agent ID
# Create an agent at: https://elevenlabs.io/app/conversational-ai
ELEVENLABS_AGENT_ID=your_agent_id_here

# Google Gemini API Key (for AI SDK intent detection and mockup generation)
# Get your API key from: https://aistudio.google.com/app/apikey
GOOGLE_GEMINI_API_KEY=your_gemini_api_key_here

# Linear API Key and Team ID (for issue creation)
# Get your API key from: https://linear.app/settings/api
# Get your Team ID from your Linear workspace settings
LINEAR_API_KEY=your_linear_api_key_here
LINEAR_TEAM_ID=your_linear_team_id_here
```

### 3. Configure your ElevenLabs Agent

No additional configuration is needed for the ElevenLabs Agent. Simply create or select an Agent in the [ElevenLabs Conversational AI dashboard](https://elevenlabs.io/app/conversational-ai) - the agent will work out of the box with OnCall.

### 4. Start the development servers

```bash
# Terminal 1: Start the server (port 3000)
cd server && bun run dev

# Terminal 2: Start the client (port 5173)
cd client && bun run dev
```

Open http://localhost:5173 in your browser.

## Usage

1. Click **Start Call** to connect to the ElevenLabs agent
2. Speak naturally - the transcript will appear in real-time
3. When you mention UI/design requirements, the system will:
   - Detect the intent automatically
   - Generate HTML/CSS mockup variants
   - Create a ticket in the queue
4. Select your preferred mockup variant
5. Click **Export to Linear** to send the ticket to the agent, which will create a Linear issue

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/signed-url` | GET | Get ElevenLabs signed URL for WebSocket |
| `/api/intent` | POST | Detect UI intent from transcript text |
| `/api/mockup` | POST | Generate HTML/CSS mockup variants |

## Project Structure

```
├── client/                  # Vite + React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── CallPanel.tsx
│   │   │   ├── TranscriptFeed.tsx
│   │   │   ├── MockupPreview.tsx
│   │   │   └── TicketQueue.tsx
│   │   ├── hooks/           # Custom React hooks
│   │   │   └── useConversationTranscription.ts
│   │   ├── lib/             # Utilities & API client
│   │   ├── types/           # TypeScript types
│   │   └── App.tsx          # Main application
│   └── package.json
│
├── server/                  # Bun + Hono backend
│   ├── src/
│   │   ├── services/        # Business logic
│   │   │   ├── elevenlabs.ts
│   │   │   ├── intentDetector.ts
│   │   │   └── mockupGenerator.ts
│   │   └── index.ts         # API routes
│   └── package.json
│
└── README.md
```

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS 4, Lucide React
- **Backend**: Bun, Hono, AI SDK, Zod
- **Voice**: ElevenLabs Agents Platform (@elevenlabs/react)
