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
      
      // Request microphone permission first, then enumerate devices
      // This clears any cached device IDs and ensures we can see available devices
      try {
        // Request permission with a temporary stream (this will prompt user if needed)
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        
        // Now enumerate devices - they should have proper labels now
        await navigator.mediaDevices.enumerateDevices()
        
        // Stop the temporary stream - we just needed it to get permission
        tempStream.getTracks().forEach(track => track.stop())
      } catch (permError) {
        // If permission is denied, we'll let the ElevenLabs SDK handle the error
        // But we'll still try to start the session - the SDK might handle it better
      }
      
      // Fetch signed URL from our backend
      const signedUrl = await fetchSignedUrl()
      
      // Start the conversation session
      await conversation.startSession({
        signedUrl,
      })
    } catch (err) {
      console.error('Failed to start session:', err)
      
      // Provide user-friendly error messages for common microphone errors
      let errorMessage = 'Failed to start session'
      if (err instanceof DOMException) {
        if (err.name === 'NotFoundError' || err.message.includes('device not found')) {
          errorMessage = 'Microphone not found. Please check your microphone is connected and try again. You may need to reset microphone permissions in your browser settings.'
        } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage = 'Microphone permission denied. Please allow microphone access and try again.'
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorMessage = 'Microphone is in use by another application. Please close other apps using the microphone and try again.'
        } else {
          errorMessage = `Microphone error: ${err.message}`
        }
      } else if (err instanceof Error) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
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
