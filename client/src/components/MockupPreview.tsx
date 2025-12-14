/**
 * MockupPreview component
 * 
 * Renders HTML/CSS mockup variants in sandboxed iframes.
 * Allows selecting between variants.
 */

import { useState } from 'react'
import { Eye, Code, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import type { MockupVariant } from '../types'

interface MockupPreviewProps {
  variants: MockupVariant[]
  selectedIndex: number | null
  onSelectVariant: (index: number) => void
  isLoading?: boolean
}

export function MockupPreview({
  variants,
  selectedIndex,
  onSelectVariant,
  isLoading,
}: MockupPreviewProps) {
  const [showCode, setShowCode] = useState(false)

  // Current variant to display
  const currentIndex = selectedIndex ?? 0
  const currentVariant = variants[currentIndex]

  // Build the full HTML document for the iframe
  const buildHtmlDocument = (variant: MockupVariant): string => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 16px;
      font-family: system-ui, -apple-system, sans-serif;
      line-height: 1.5;
      background: #ffffff;
      color: #1a1a1a;
    }
    ${variant.css}
  </style>
</head>
<body>
  ${variant.html}
</body>
</html>`
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card flex flex-col h-full">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-lg font-semibold">Mockup Preview</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm">Generating mockup...</p>
          </div>
        </div>
      </div>
    )
  }

  if (variants.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card flex flex-col h-full">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-lg font-semibold">Mockup Preview</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Eye className="w-12 h-12 opacity-50" />
            <p className="text-sm">Mockups will appear here</p>
            <p className="text-xs">Detected UI requests will generate design variants</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-lg font-semibold">Mockup Preview</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCode(!showCode)}
            className="gap-1"
          >
            <Code className="w-4 h-4" />
            {showCode ? 'Preview' : 'Code'}
          </Button>
        </div>
      </div>

      {/* Variant selector */}
      {variants.length > 1 && (
        <div className="px-4 py-2 border-b border-border flex items-center justify-between bg-muted/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelectVariant(currentIndex - 1)}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-2">
            {variants.map((variant, index) => (
              <button
                key={index}
                onClick={() => onSelectVariant(index)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  index === currentIndex
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {variant.name}
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelectVariant(currentIndex + 1)}
            disabled={currentIndex === variants.length - 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Preview area */}
      <div className="flex-1 overflow-hidden">
        {showCode && currentVariant ? (
          <div className="h-full overflow-auto p-4 space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">HTML</h3>
              <pre className="p-3 rounded-lg bg-muted text-xs overflow-auto max-h-48">
                <code>{currentVariant.html}</code>
              </pre>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">CSS</h3>
              <pre className="p-3 rounded-lg bg-muted text-xs overflow-auto max-h-48">
                <code>{currentVariant.css}</code>
              </pre>
            </div>
          </div>
        ) : currentVariant ? (
          <iframe
            title={`Mockup: ${currentVariant.name}`}
            srcDoc={buildHtmlDocument(currentVariant)}
            className="w-full h-full border-0 bg-white"
            sandbox="allow-same-origin"
          />
        ) : null}
      </div>
    </div>
  )
}
