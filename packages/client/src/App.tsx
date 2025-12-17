import { useCallback, useEffect, useRef, useState } from 'react'
import { useConversationTranscription } from './hooks/useConversationTranscription'
import { CallPanel } from './components/CallPanel'
import { TranscriptFeed } from './components/TranscriptFeed'
import { MockupPreview } from './components/MockupPreview'
import { TicketQueue } from './components/TicketQueue'
import { detectIntent, generateMockup, exportToLinear, checkLinearStatus, connectLinear, disconnectLinear } from './lib/api'
import type { DetectedIntent, Ticket, MockupVariant } from './types'

// Debounce delay for intent detection after final transcript
const INTENT_DETECTION_DELAY_MS = 800

function App() {
  // Intent & ticket state
  const [detectedIntents, setDetectedIntents] = useState<DetectedIntent[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [isGeneratingMockup, setIsGeneratingMockup] = useState(false)
  
  // Linear OAuth state
  const [isLinearConnected, setIsLinearConnected] = useState(false)
  const [isCheckingLinearStatus, setIsCheckingLinearStatus] = useState(true)

  // Debounce timer ref
  const intentDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intentIdCounter = useRef(0)
  const ticketIdCounter = useRef(0)

  // Handle final transcript - trigger intent detection
  const handleFinalTranscript = useCallback(async (text: string) => {
    // Clear any pending debounce
    if (intentDebounceRef.current) {
      clearTimeout(intentDebounceRef.current)
    }

    // Debounce intent detection
    intentDebounceRef.current = setTimeout(async () => {
      try {
        const result = await detectIntent(text)

        if (result.isUiRequest && result.confidence > 0.6) {
          const newIntent: DetectedIntent = {
            ...result,
            id: `intent-${++intentIdCounter.current}`,
            transcriptText: text,
            timestamp: Date.now(),
          }

          setDetectedIntents((prev) => [...prev, newIntent])

          // Auto-create ticket for high-confidence UI requests
          if (result.confidence > 0.7) {
            const newTicket: Ticket = {
              id: `ticket-${++ticketIdCounter.current}`,
              intent: newIntent,
              mockupVariants: [],
              selectedVariantIndex: null,
              status: 'generating',
              createdAt: Date.now(),
            }

            setTickets((prev) => [...prev, newTicket])
            setSelectedTicketId(newTicket.id)

            // Generate mockup for the ticket
            try {
              setIsGeneratingMockup(true)
              const mockupResult = await generateMockup({
                component: result.component || 'component',
                intent: result.intent || text,
                context: result.context,
              })

              setTickets((prev) =>
                prev.map((t) =>
                  t.id === newTicket.id
                    ? {
                        ...t,
                        mockupVariants: mockupResult.variants,
                        selectedVariantIndex: 0,
                        status: 'ready',
                      }
                    : t
                )
              )
            } catch (err) {
              console.error('Failed to generate mockup:', err)
              setTickets((prev) =>
                prev.map((t) =>
                  t.id === newTicket.id ? { ...t, status: 'pending' } : t
                )
              )
            } finally {
              setIsGeneratingMockup(false)
            }
          }
        }
      } catch (err) {
        console.error('Failed to detect intent:', err)
      }
    }, INTENT_DETECTION_DELAY_MS)
  }, [])

  // Conversation hook with transcript streaming
  const {
    transcriptEvents,
    connectionStatus,
    isSpeaking,
    error,
    startSession,
    endSession,
  } = useConversationTranscription({
    onFinalTranscript: handleFinalTranscript,
  })

  // Get the currently selected ticket
  const selectedTicket = tickets.find((t) => t.id === selectedTicketId)

  // Get mockup variants for the selected ticket
  const currentMockupVariants: MockupVariant[] = selectedTicket?.mockupVariants || []
  const currentSelectedIndex = selectedTicket?.selectedVariantIndex ?? null

  // Handle ticket actions
  const handleSelectTicket = useCallback((ticketId: string) => {
    setSelectedTicketId(ticketId)
  }, [])

  const handleRemoveTicket = useCallback((ticketId: string) => {
    setTickets((prev) => prev.filter((t) => t.id !== ticketId))
    if (selectedTicketId === ticketId) {
      setSelectedTicketId(null)
    }
  }, [selectedTicketId])

  const handleExportTicket = useCallback(
    async (ticketId: string) => {
      const ticket = tickets.find((t) => t.id === ticketId)
      if (!ticket || ticket.status !== 'ready') return

      const selectedVariant = ticket.mockupVariants[ticket.selectedVariantIndex ?? 0]
      if (!selectedVariant) return

      try {
        // Build the ticket description with structured sections
        const description = `## Context\n\nCustomer feedback from call:\n\n"${ticket.intent.transcriptText}"\n\n## Details\n\n- **Component**: ${ticket.intent.component || 'N/A'}\n- **Intent**: ${ticket.intent.intent || 'N/A'}\n- **Context**: ${ticket.intent.context || 'N/A'}\n\n## Mockup\n\n**Variant**: ${selectedVariant.name}\n\n\`\`\`html\n${selectedVariant.html}\n\`\`\`\n\n\`\`\`css\n${selectedVariant.css}\n\`\`\``

        // Create Linear issue via backend
        const result = await exportToLinear({
          title: `${ticket.intent.component || 'Component'}: ${ticket.intent.intent || 'UI Request'}`,
          description,
          labelIds: [], // Can be configured via env or UI later
        })

        // Mark ticket as exported with Linear URL
        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticketId
              ? { ...t, status: 'exported', linearUrl: result.url }
              : t
          )
        )
      } catch (err) {
        console.error('Failed to export ticket to Linear:', err)
        // Optionally show error to user
      }
    },
    [tickets]
  )

  const handleSelectMockupVariant = useCallback(
    (ticketId: string, variantIndex: number) => {
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId ? { ...t, selectedVariantIndex: variantIndex } : t
        )
      )
    },
    []
  )

  // Check Linear connection status on load
  useEffect(() => {
    async function checkStatus() {
      try {
        setIsCheckingLinearStatus(true)
        const status = await checkLinearStatus()
        setIsLinearConnected(status.connected)
      } catch (err) {
        console.error('Failed to check Linear status:', err)
        setIsLinearConnected(false)
      } finally {
        setIsCheckingLinearStatus(false)
      }
    }
    
    checkStatus()
    
    // Also check status after OAuth redirect (check for error in URL)
    const urlParams = new URLSearchParams(window.location.search)
    const error = urlParams.get('error')
    if (error) {
      console.error('Linear OAuth error:', error)
      // Clear the error from URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Handle Linear connect/disconnect
  const handleConnectLinear = useCallback(() => {
    connectLinear()
  }, [])

  const handleDisconnectLinear = useCallback(async () => {
    try {
      await disconnectLinear()
      setIsLinearConnected(false)
    } catch (err) {
      console.error('Failed to disconnect from Linear:', err)
    }
  }, [])

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (intentDebounceRef.current) {
        clearTimeout(intentDebounceRef.current)
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Oncall</h1>
              <p className="text-sm text-muted-foreground">
                Voice-to-Mockup Pipeline
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Linear Connection Status */}
              {!isCheckingLinearStatus && (
                <div className="flex items-center gap-2">
                  {isLinearConnected ? (
                    <>
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        Connected to Linear
                      </span>
                      <button
                        onClick={handleDisconnectLinear}
                        className="px-3 py-1.5 text-sm bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md transition-colors"
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleConnectLinear}
                      className="px-3 py-1.5 text-sm bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors"
                    >
                      Connect Linear
                    </button>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Voice-to-Mockup
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)]">
          {/* Left column: Call controls + Transcript */}
          <div className="lg:col-span-4 flex flex-col gap-6 min-h-0">
            <CallPanel
              connectionStatus={connectionStatus}
              isSpeaking={isSpeaking}
              error={error}
              onStartCall={startSession}
              onEndCall={endSession}
            />
            <div className="flex-1 min-h-0">
              <TranscriptFeed
                events={transcriptEvents}
                detectedIntents={detectedIntents}
              />
            </div>
          </div>

          {/* Middle column: Mockup Preview */}
          <div className="lg:col-span-5 min-h-0">
            <MockupPreview
              variants={currentMockupVariants}
              selectedIndex={currentSelectedIndex}
              onSelectVariant={(index) => {
                if (selectedTicketId) {
                  handleSelectMockupVariant(selectedTicketId, index)
                }
              }}
              isLoading={isGeneratingMockup}
            />
          </div>

          {/* Right column: Ticket Queue */}
          <div className="lg:col-span-3 min-h-0">
            <TicketQueue
              tickets={tickets}
              selectedTicketId={selectedTicketId}
              onSelectTicket={handleSelectTicket}
              onRemoveTicket={handleRemoveTicket}
              onExportTicket={handleExportTicket}
              onSelectMockupVariant={handleSelectMockupVariant}
            />
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
