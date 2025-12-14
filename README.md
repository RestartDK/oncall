# Oncall - Voice-to-Mockup Pipeline

Real-time voice-to-UI mockup generation using ElevenLabs Agents Platform, AI SDK, and Linear integration.

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
   ├──────► POST /api/intent ──────► AI SDK (GPT-4o-mini)
   │
   ├──────► POST /api/mockup ──────► AI SDK (GPT-4o)
   │
   └──────► sendContextualUpdate ──► ElevenLabs Agent ──► Linear Webhook
```

## Prerequisites

- [Bun](https://bun.sh/) runtime
- ElevenLabs account with API key and Agent configured
- OpenAI API key (for AI SDK)

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

# OpenAI API Key (for AI SDK intent detection and mockup generation)
# Get your API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Configure your ElevenLabs Agent

In the ElevenLabs Conversational AI dashboard:

1. Create or select an Agent
2. Add a **Webhook Tool** for Linear integration:
   - Name: `create_linear_issue`
   - URL: Your Linear API endpoint or webhook
   - Configure the payload schema to accept: title, description, labels
3. Update the agent's system prompt to understand when to use the Linear tool

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
- **AI**: OpenAI GPT-4o / GPT-4o-mini via AI SDK
