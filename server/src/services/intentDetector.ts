/**
 * Intent detector service using AI SDK
 * 
 * Analyzes transcript text to detect UI-related requests and extract structured intent data.
 */

import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { z } from 'zod'

export const IntentResultSchema = z.object({
  isUiRequest: z.boolean().describe('Whether this is a UI/design-related request'),
  confidence: z.number().min(0).max(1).describe('Confidence score from 0 to 1'),
  component: z.string().nullable().describe('Type of UI component mentioned (e.g., button, form, modal, card)'),
  intent: z.string().nullable().describe('The user\'s intent (e.g., "create a signup form", "add a dashboard widget")'),
  context: z.string().nullable().describe('Additional context about the request'),
  reasoningShort: z.string().nullable().describe('Brief reasoning for the classification'),
})

export type IntentResult = z.infer<typeof IntentResultSchema>

const SYSTEM_PROMPT = `You are an expert at analyzing conversation transcripts from customer calls to detect UI/UX feature requests and design requirements.

Your job is to:
1. Determine if the user is requesting a UI feature, component, or design change
2. Extract the specific component type they're asking about
3. Summarize their intent clearly
4. Provide relevant context

Examples of UI requests:
- "We need a better login page" → isUiRequest: true, component: "login form", intent: "improve login page design"
- "Can you add a dashboard with charts?" → isUiRequest: true, component: "dashboard", intent: "create dashboard with data visualization"
- "The button colors are hard to read" → isUiRequest: true, component: "button", intent: "improve button color contrast"

Examples of non-UI requests:
- "When is our next meeting?" → isUiRequest: false
- "Can you send me the invoice?" → isUiRequest: false
- "I have a billing question" → isUiRequest: false

Be accurate and conservative - only mark as UI request if there's clear evidence.`

export async function detectIntent(transcriptText: string): Promise<IntentResult> {
  const { object } = await generateObject({
    model: google("gemini-2.5-flash-lite"),
    schema: IntentResultSchema,
    system: SYSTEM_PROMPT,
    prompt: `Analyze the following transcript and detect if there's a UI/design request:\n\n"${transcriptText}"`,
  })

  return object
}
