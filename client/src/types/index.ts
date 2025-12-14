/**
 * Shared types for the voice-to-mockup pipeline
 */

// =============================================================================
// Transcript Types
// =============================================================================

export interface TranscriptEvent {
  id: string
  type: 'user' | 'agent'
  text: string
  isFinal: boolean
  timestamp: number
}

// =============================================================================
// Intent Types
// =============================================================================

export interface IntentResult {
  isUiRequest: boolean
  confidence: number
  component: string | null
  intent: string | null
  context: string | null
  reasoningShort: string | null
}

export interface DetectedIntent extends IntentResult {
  id: string
  transcriptText: string
  timestamp: number
}

// =============================================================================
// Mockup Types
// =============================================================================

export interface MockupVariant {
  name: string
  html: string
  css: string
}

export interface MockupResult {
  variants: MockupVariant[]
}

// =============================================================================
// Ticket Types
// =============================================================================

export interface Ticket {
  id: string
  intent: DetectedIntent
  mockupVariants: MockupVariant[]
  selectedVariantIndex: number | null
  status: 'pending' | 'generating' | 'ready' | 'exported'
  createdAt: number
  linearUrl?: string // URL of the created Linear issue (if exported)
}

// =============================================================================
// Connection Types
// =============================================================================

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'
