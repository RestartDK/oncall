/**
 * TranscriptFeed component
 * 
 * Displays real-time transcript events from the conversation.
 * Highlights messages that contain detected UI intents.
 */

import { useEffect, useRef } from 'react'
import { User, Bot, Sparkles } from 'lucide-react'
import type { TranscriptEvent, DetectedIntent } from '../types'

interface TranscriptFeedProps {
  events: TranscriptEvent[]
  detectedIntents: DetectedIntent[]
  pendingText?: string
}

export function TranscriptFeed({
  events,
  detectedIntents,
  pendingText,
}: TranscriptFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [events, pendingText])

  // Check if an event has a detected intent
  const getIntentForEvent = (event: TranscriptEvent): DetectedIntent | undefined => {
    return detectedIntents.find(
      (intent) =>
        intent.transcriptText === event.text ||
        event.text.includes(intent.transcriptText) ||
        intent.transcriptText.includes(event.text)
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-lg font-semibold">Transcript</h2>
      </div>

      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3"
      >
        {events.length === 0 && !pendingText ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Bot className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-sm">Start a call to see the transcript</p>
          </div>
        ) : (
          <>
            {events.map((event) => {
              const intent = getIntentForEvent(event)
              return (
                <TranscriptMessage
                  key={event.id}
                  event={event}
                  intent={intent}
                />
              )
            })}

            {/* Show pending/tentative text */}
            {pendingText && (
              <div className="flex items-start gap-3 opacity-50">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm italic">{pendingText}...</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

interface TranscriptMessageProps {
  event: TranscriptEvent
  intent?: DetectedIntent
}

function TranscriptMessage({ event, intent }: TranscriptMessageProps) {
  const isUser = event.type === 'user'
  const hasIntent = intent && intent.isUiRequest

  return (
    <div
      className={`flex items-start gap-3 ${
        hasIntent ? 'bg-primary/5 -mx-2 px-2 py-2 rounded-lg border border-primary/20' : ''
      }`}
    >
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-primary/10' : 'bg-muted'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-primary" />
        ) : (
          <Bot className="w-4 h-4 text-muted-foreground" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-muted-foreground">
            {isUser ? 'Customer' : 'Agent'}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatTime(event.timestamp)}
          </span>
          {hasIntent && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <Sparkles className="w-3 h-3" />
              UI Request
            </span>
          )}
        </div>

        <p className="text-sm break-words">{event.text}</p>

        {hasIntent && intent && (
          <div className="mt-2 p-2 rounded bg-muted/50 text-xs">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">Component:</span>
              <span className="text-muted-foreground">{intent.component}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Intent:</span>
              <span className="text-muted-foreground">{intent.intent}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}
