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
  const pendingUserText = useRef<string>('')

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
    onError: (err) => {
      console.error('[ElevenLabs] Error:', err)
      setError(err.message || 'Connection error')
      setConnectionStatus('error')
    },
    onModeChange: (mode) => {
      // mode.mode is 'speaking' | 'listening'
      setIsSpeaking(mode.mode === 'speaking')
    },
    onMessage: (message) => {
      // Handle different message types from the agent
      console.log('[ElevenLabs] Message:', message)

      // Filter for transcript-related messages
      if (message.type === 'user_transcript') {
        const userMessage = message as { type: string; user_transcript?: string; user_transcription_event?: { user_transcript: string; is_final: boolean } }
        
        // Handle tentative/final user transcript
        if (userMessage.user_transcription_event) {
          const { user_transcript, is_final } = userMessage.user_transcription_event
          
          if (is_final) {
            // Create final transcript event
            const newEvent: TranscriptEvent = {
              id: `user-${++eventIdCounter.current}`,
              type: 'user',
              text: user_transcript,
              isFinal: true,
              timestamp: Date.now(),
            }
            
            setTranscriptEvents((prev) => {
              // Remove any pending tentative events and add final
              const filtered = prev.filter((e) => e.isFinal)
              const updated = [...filtered, newEvent]
              options.onTranscriptUpdate?.(updated)
              return updated
            })
            
            // Trigger callback for final transcript
            options.onFinalTranscript?.(user_transcript)
            pendingUserText.current = ''
          } else {
            // Update tentative text (for display only)
            pendingUserText.current = user_transcript
          }
        }
      } else if (message.type === 'agent_response') {
        // Handle agent responses for display
        const agentMessage = message as { type: string; agent_response?: string }
        if (agentMessage.agent_response) {
          const newEvent: TranscriptEvent = {
            id: `agent-${++eventIdCounter.current}`,
            type: 'agent',
            text: agentMessage.agent_response,
            isFinal: true,
            timestamp: Date.now(),
          }
          
          setTranscriptEvents((prev) => {
            const updated = [...prev, newEvent]
            options.onTranscriptUpdate?.(updated)
            return updated
          })
        }
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
      pendingUserText.current = ''
    } catch (err) {
      console.error('Failed to end session:', err)
    }
  }, [conversation])

  const sendContextualUpdate = useCallback(
    (context: Record<string, unknown>) => {
      // Send contextual update to the agent
      // This allows the agent to know about detected intents and mockups
      try {
        // The ElevenLabs SDK provides this method on the conversation object
        // for sending context updates to the agent
        if ('sendContextualUpdate' in conversation) {
          (conversation as { sendContextualUpdate: (ctx: Record<string, unknown>) => void }).sendContextualUpdate(context)
        }
      } catch (err) {
        console.error('Failed to send contextual update:', err)
      }
    },
    [conversation]
  )

  return {
    // State
    transcriptEvents,
    connectionStatus,
    isSpeaking,
    error,
    pendingText: pendingUserText.current,
    
    // Actions
    startSession,
    endSession,
    sendContextualUpdate,
    
    // Raw conversation object for advanced usage
    conversation,
  }
}
