/**
 * TicketQueue component
 * 
 * Displays queued tickets with detected intents and mockup variants.
 * Allows selecting mockups and exporting to Linear via the agent.
 */

import { Trash2, Send, Loader2, CheckCircle, Eye, Sparkles } from 'lucide-react'
import { Button } from './ui/button'
import type { Ticket } from '../types'

interface TicketQueueProps {
  tickets: Ticket[]
  selectedTicketId: string | null
  onSelectTicket: (ticketId: string) => void
  onRemoveTicket: (ticketId: string) => void
  onExportTicket: (ticketId: string) => void
  onSelectMockupVariant: (ticketId: string, variantIndex: number) => void
}

export function TicketQueue({
  tickets,
  selectedTicketId,
  onSelectTicket,
  onRemoveTicket,
  onExportTicket,
  onSelectMockupVariant,
}: TicketQueueProps) {
  return (
    <div className="rounded-xl border border-border bg-card flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-lg font-semibold">Ticket Queue</h2>
        {tickets.length > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
            <Sparkles className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-sm text-center">No tickets yet</p>
            <p className="text-xs text-center mt-1">
              UI requests will automatically create tickets
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {tickets.map((ticket) => (
              <TicketItem
                key={ticket.id}
                ticket={ticket}
                isSelected={ticket.id === selectedTicketId}
                onSelect={() => onSelectTicket(ticket.id)}
                onRemove={() => onRemoveTicket(ticket.id)}
                onExport={() => onExportTicket(ticket.id)}
                onSelectVariant={(index) => onSelectMockupVariant(ticket.id, index)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface TicketItemProps {
  ticket: Ticket
  isSelected: boolean
  onSelect: () => void
  onRemove: () => void
  onExport: () => void
  onSelectVariant: (index: number) => void
}

function TicketItem({
  ticket,
  isSelected,
  onSelect,
  onRemove,
  onExport,
  onSelectVariant,
}: TicketItemProps) {
  const statusConfig = {
    pending: { icon: Loader2, label: 'Pending', className: 'text-muted-foreground' },
    generating: { icon: Loader2, label: 'Generating', className: 'text-yellow-500 animate-spin' },
    ready: { icon: Eye, label: 'Ready', className: 'text-green-500' },
    exported: { icon: CheckCircle, label: 'Exported', className: 'text-blue-500' },
  }

  const status = statusConfig[ticket.status]
  const StatusIcon = status.icon

  return (
    <div
      className={`p-4 cursor-pointer transition-colors hover:bg-muted/30 ${
        isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : ''
      }`}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-muted-foreground uppercase">
              {ticket.intent.component || 'Component'}
            </span>
            <StatusIcon className={`w-3 h-3 ${status.className}`} />
          </div>
          <h3 className="text-sm font-medium truncate">
            {ticket.intent.intent || 'UI Request'}
          </h3>
        </div>
      </div>

      {/* Transcript quote */}
      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
        "{ticket.intent.transcriptText}"
      </p>

      {/* Variant selector (if mockups available) */}
      {ticket.mockupVariants.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-muted-foreground">Variant:</span>
          {ticket.mockupVariants.map((variant, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation()
                onSelectVariant(index)
              }}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                ticket.selectedVariantIndex === index
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {variant.name}
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="gap-1 text-destructive hover:text-destructive"
        >
          <Trash2 className="w-3 h-3" />
          Remove
        </Button>

        {ticket.status === 'ready' && (
          <Button
            variant="default"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onExport()
            }}
            className="gap-1 ml-auto"
          >
            <Send className="w-3 h-3" />
            Export to Linear
          </Button>
        )}

        {ticket.status === 'exported' && (
          <span className="ml-auto text-xs text-blue-500 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Sent to agent
          </span>
        )}
      </div>

      {/* Timestamp */}
      <div className="mt-2 text-xs text-muted-foreground">
        {formatTime(ticket.createdAt)}
      </div>
    </div>
  )
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}
