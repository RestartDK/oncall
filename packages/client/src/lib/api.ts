import { hc } from 'hono/client'
import type { AppType } from '@oncall/api'
import type { IntentResult, MockupResult } from '../types'

// Hono RPC client for type-safe API calls
export const client = hc<AppType>('/api')

// =============================================================================
// Voice-to-Mockup API Functions
// =============================================================================

/**
 * Fetches a signed URL for ElevenLabs WebSocket connection.
 * The API key is kept server-side for security.
 */
export async function fetchSignedUrl(): Promise<string> {
  const res = await client['signed-url'].$get()
  
  if (!res.ok) {
    const error = await res.json() as { error?: string }
    throw new Error(error.error || 'Failed to fetch signed URL')
  }
  
  const data = await res.json() as { signedUrl: string }
  return data.signedUrl
}

/**
 * Analyzes transcript text to detect UI-related intents.
 */
export async function detectIntent(transcript: string): Promise<IntentResult> {
  const res = await client.intent.$post({
    json: { transcript },
  })
  
  if (!res.ok) {
    const error = await res.json() as { error?: string }
    throw new Error(error.error || 'Failed to detect intent')
  }
  
  return res.json() as Promise<IntentResult>
}

/**
 * Generates HTML/CSS mockup variants for a detected intent.
 */
export async function generateMockup(params: {
  component: string
  intent: string
  context?: string | null
  brandColors?: {
    primary?: string
    secondary?: string
    accent?: string
  }
}): Promise<MockupResult> {
  const res = await client.mockup.$post({
    json: params,
  })
  
  if (!res.ok) {
    const error = await res.json() as { error?: string }
    throw new Error(error.error || 'Failed to generate mockup')
  }
  
  return res.json() as Promise<MockupResult>
}

/**
 * Creates a Linear issue from ticket data.
 * Returns the created issue ID and URL.
 */
export async function exportToLinear(params: {
  title: string
  description: string
  teamId?: string
  assigneeId?: string
  projectId?: string
  labelIds?: string[]
  priority?: number
}): Promise<{ id: string; url: string }> {
  const res = await client.linear.issues.$post({
    json: params,
  })
  
  if (!res.ok) {
    const error = await res.json() as { error?: string }
    throw new Error(error.error || 'Failed to export to Linear')
  }
  
  return res.json() as Promise<{ id: string; url: string }>
}
