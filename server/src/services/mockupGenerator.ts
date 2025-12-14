/**
 * Mockup generator service using AI SDK
 * 
 * Generates HTML/CSS mockup variants based on detected intents.
 */

import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { z } from 'zod'

export const MockupVariantSchema = z.object({
  name: z.string().describe('Short descriptive name for this variant'),
  html: z.string().describe('Complete HTML markup for the component'),
  css: z.string().describe('CSS styles for the component'),
})

export const MockupResultSchema = z.object({
  variants: z.array(MockupVariantSchema).min(1).max(2).describe('1-2 design variants'),
})

export type MockupVariant = z.infer<typeof MockupVariantSchema>
export type MockupResult = z.infer<typeof MockupResultSchema>

export interface MockupRequest {
  component: string
  intent: string
  context?: string | null
  brandColors?: {
    primary?: string
    secondary?: string
    accent?: string
  }
}

const SYSTEM_PROMPT = `You are an expert UI/UX designer who creates clean, modern HTML/CSS mockups.

Generate 1-2 design variants based on the request. Each variant should:
1. Be self-contained (no external dependencies)
2. Use modern CSS (flexbox, grid, CSS variables)
3. Be responsive and accessible
4. Include realistic placeholder content
5. Use clean, semantic HTML5

Style guidelines:
- Use a clean, modern aesthetic
- Include appropriate padding and spacing
- Use readable font sizes (16px base)
- Ensure good color contrast
- Add subtle hover states where appropriate

The CSS should be complete and work standalone. Use CSS variables for colors so they can be easily customized.

Return HTML that can be directly rendered in a sandboxed iframe.`

export async function generateMockup(request: MockupRequest): Promise<MockupResult> {
  const colorContext = request.brandColors
    ? `\n\nBrand colors to use:\n- Primary: ${request.brandColors.primary || '#3b82f6'}\n- Secondary: ${request.brandColors.secondary || '#64748b'}\n- Accent: ${request.brandColors.accent || '#10b981'}`
    : ''

  const prompt = `Create a mockup for: ${request.component}

Intent: ${request.intent}
${request.context ? `Context: ${request.context}` : ''}${colorContext}

Generate 1-2 design variants. Make them visually distinct but both solve the requirement.`

  const { object } = await generateObject({
    model: google("gemini-2.5-pro"),
    schema: MockupResultSchema,
    system: SYSTEM_PROMPT,
    prompt,
  })

  return object
}
