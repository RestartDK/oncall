/**
 * ElevenLabs service for generating signed URLs for the Agents Platform
 * 
 * Uses the ElevenLabs Conversational AI API to get short-lived signed WebSocket URLs
 * that the browser can use to connect directly to ElevenLabs without exposing the API key.
 */

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io'

interface SignedUrlResponse {
  signed_url: string
}

/**
 * Fetches a signed URL from ElevenLabs for browser WebSocket connections.
 * The signed URL is short-lived and allows the browser to connect to ElevenLabs
 * without the API key being exposed client-side.
 */
export async function getSignedUrl(): Promise<string> {
  console.log('[ElevenLabs] Starting getSignedUrl()')
  const startTime = Date.now()

  const apiKey = process.env.ELEVENLABS_API_KEY
  const agentId = process.env.ELEVENLABS_AGENT_ID

  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/f0605e8a-dbe2-42bd-9d1d-9c2fc6e6c45d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'A',location:'server/src/services/elevenlabs.ts:getSignedUrl',message:'Env check for ElevenLabs',data:{hasApiKey:!!apiKey,hasAgentId:!!agentId},timestamp:Date.now()})}).catch(()=>{})
  // #endregion

  console.log('[ElevenLabs] Environment check:', {
    hasApiKey: !!apiKey,
    hasAgentId: !!agentId,
    agentId: agentId || 'NOT SET',
  })

  if (!apiKey) {
    console.error('[ElevenLabs] Missing ELEVENLABS_API_KEY')
    throw new Error('ELEVENLABS_API_KEY environment variable is required')
  }

  if (!agentId) {
    console.error('[ElevenLabs] Missing ELEVENLABS_AGENT_ID')
    throw new Error('ELEVENLABS_AGENT_ID environment variable is required')
  }

  const url = `${ELEVENLABS_API_BASE}/v1/convai/conversation/get-signed-url?agent_id=${agentId}`
  console.log('[ElevenLabs] Making request to:', url)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
      },
    })

    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/f0605e8a-dbe2-42bd-9d1d-9c2fc6e6c45d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'A',location:'server/src/services/elevenlabs.ts:getSignedUrl',message:'ElevenLabs response status',data:{status:response.status,statusText:response.statusText},timestamp:Date.now()})}).catch(()=>{})
    // #endregion

    console.log('[ElevenLabs] Response status:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[ElevenLabs] API error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      })
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/f0605e8a-dbe2-42bd-9d1d-9c2fc6e6c45d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'A',location:'server/src/services/elevenlabs.ts:getSignedUrl',message:'ElevenLabs API error',data:{status:response.status,statusText:response.statusText,bodyPreview:errorText.substring(0,120)},timestamp:Date.now()})}).catch(()=>{})
      // #endregion
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`)
    }

    const data = (await response.json()) as SignedUrlResponse
    const duration = Date.now() - startTime
    console.log('[ElevenLabs] Successfully received signed URL:', {
      urlLength: data.signed_url.length,
      urlPreview: data.signed_url.substring(0, 50) + '...',
      duration: `${duration}ms`,
    })
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/f0605e8a-dbe2-42bd-9d1d-9c2fc6e6c45d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'A',location:'server/src/services/elevenlabs.ts:getSignedUrl',message:'ElevenLabs signed URL received',data:{urlLength:data.signed_url?.length ?? 0,urlPreview:(data.signed_url || '').substring(0,32)+'...',durationMs:duration},timestamp:Date.now()})}).catch(()=>{})
    // #endregion

    return data.signed_url
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[ElevenLabs] Error fetching signed URL:', {
      error: error instanceof Error ? error.message : String(error),
      duration: `${duration}ms`,
    })
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/f0605e8a-dbe2-42bd-9d1d-9c2fc6e6c45d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'A',location:'server/src/services/elevenlabs.ts:getSignedUrl',message:'ElevenLabs signed URL exception',data:{error:error instanceof Error ? error.message : String(error),durationMs:duration},timestamp:Date.now()})}).catch(()=>{})
    // #endregion
    throw error
  }
}
