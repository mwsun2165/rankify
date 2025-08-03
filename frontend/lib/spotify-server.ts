// Server-side Spotify API utilities with token caching and error handling

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1'
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'

interface SpotifyTokenCache {
  access_token: string
  expires_at: number
}

let tokenCache: SpotifyTokenCache | null = null

async function getSpotifyAccessToken(): Promise<string> {
  // Check if we have a valid cached token
  if (tokenCache && Date.now() < tokenCache.expires_at) {
    console.log('Using cached Spotify access token')
    return tokenCache.access_token
  }

  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error('Spotify credentials missing:', { 
      hasClientId: !!clientId, 
      hasClientSecret: !!clientSecret 
    })
    throw new Error('Spotify credentials not configured')
  }

  console.log('Getting new Spotify access token via client credentials...', {
    clientId: clientId.substring(0, 8) + '...' // Log partial client ID for debugging
  })

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
    },
    body: 'grant_type=client_credentials',
    cache: 'no-cache',
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Failed to get Spotify access token:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText
    })
    throw new Error(`Failed to get Spotify access token: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  
  if (!data.access_token) {
    console.error('No access token in response:', data)
    throw new Error('No access token received from Spotify')
  }
  
  // Cache the token (expires in 1 hour, we'll refresh 5 minutes early)
  tokenCache = {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in - 300) * 1000 // 5 minutes early
  }

  console.log('Successfully obtained new Spotify access token', {
    expiresIn: data.expires_in,
    tokenType: data.token_type
  })
  return data.access_token
}

export async function makeSpotifyRequest(url: string, options: RequestInit = {}): Promise<Response> {
  const accessToken = await getSpotifyAccessToken()
  
  const response = await fetch(url, {
    ...options,
    cache: 'no-store',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      ...options.headers
    }
  })

  // If we get a 401, the token might be invalid, clear cache and retry once
  if (response.status === 401) {
    console.log('Spotify API returned 401, clearing token cache and retrying...')
    
    // Read the error body before retrying (to avoid "body already read" error)
    const errorClone = response.clone()
    errorClone.text().then((txt) => console.error('Initial 401 error body:', txt)).catch(()=>{})
    
    tokenCache = null
    
    const newAccessToken = await getSpotifyAccessToken()
    const retryResponse = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${newAccessToken}`,
        ...options.headers
      }
    })

    if (!retryResponse.ok) {
      const retryClone = retryResponse.clone()
      retryClone.text().then((txt)=>console.error('Spotify API request failed after retry:', retryResponse.status, txt)).catch(()=>{})
    }

    return retryResponse
  }

  return response
}

export { SPOTIFY_API_BASE }