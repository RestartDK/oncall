/**
 * Hook for managing ElevenLabs conversation with transcript streaming
 * 
 * Uses the ElevenLabs React SDK to:
 * - Fetch signed URL from our backend
 * - Connect to ElevenLabs WebSocket
 * - Stream real-time transcripts
 * - Handle connection state
 */

import { useCallback, useRef, useState } from 'react'
import { useConversation } from '@elevenlabs/react'
import type { TranscriptEvent, ConnectionStatus } from '../types'
import { fetchSignedUrl } from '../lib/api'

interface UseConversationTranscriptionOptions {
  onTranscriptUpdate?: (events: TranscriptEvent[]) => void
  onFinalTranscript?: (text: string) => void
}

export function useConversationTranscription(options: UseConversationTranscriptionOptions = {}) {
  const [transcriptEvents, setTranscriptEvents] = useState<TranscriptEvent[]>([])
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const eventIdCounter = useRef(0)

  const conversation = useConversation({
    onConnect: () => {
      console.log('[ElevenLabs] Connected')
      setConnectionStatus('connected')
      setError(null)
    },
    onDisconnect: () => {
      console.log('[ElevenLabs] Disconnected')
      setConnectionStatus('disconnected')
    },
    onError: (message) => {
      console.error('[ElevenLabs] Error:', message)
      setError(message)
      setConnectionStatus('error')
    },
    onModeChange: ({ mode }) => {
      // mode is 'speaking' | 'listening'
      setIsSpeaking(mode === 'speaking')
    },
    onMessage: ({ message, role }) => {
      // Handle transcript messages from ElevenLabs ConvAI
      // MessagePayload has: message (string), role ("user" | "agent")
      console.log('[ElevenLabs] Message:', { message, role })

      const newEvent: TranscriptEvent = {
        id: `${role}-${++eventIdCounter.current}`,
        type: role,
        text: message,
        isFinal: true,
        timestamp: Date.now(),
      }

      setTranscriptEvents((prev) => {
        const updated = [...prev, newEvent]
        options.onTranscriptUpdate?.(updated)
        return updated
      })

      // Trigger callback for final user transcript (for intent detection)
      if (role === 'user') {
        options.onFinalTranscript?.(message)
      }
    },
  })

  const startSession = useCallback(async () => {
    try {
      setConnectionStatus('connecting')
      setError(null)
      
      // Fetch signed URL from our backend
      const signedUrl = await fetchSignedUrl()
      
      // Start the conversation session
      await conversation.startSession({
        signedUrl,
      })
    } catch (err) {
      console.error('Failed to start session:', err)
      setError(err instanceof Error ? err.message : 'Failed to start session')
      setConnectionStatus('error')
    }
  }, [conversation])

  const endSession = useCallback(async () => {
    try {
      await conversation.endSession()
      setTranscriptEvents([])
    } catch (err) {
      console.error('Failed to end session:', err)
    }
  }, [conversation])

  return {
    // State
    transcriptEvents,
    connectionStatus,
    isSpeaking,
    error,
    
    // Actions
    startSession,
    endSession,
    
    // Raw conversation object for advanced usage
    conversation,
  }
}
