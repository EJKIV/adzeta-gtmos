import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'https://gtm.adzeta.io',
  'https://app.adzeta.io'
]

export function middleware(request: NextRequest) {
  // Get the origin from the request headers or referrer
  const origin = request.headers.get('origin') || ''
  const referer = request.headers.get('referer') || ''
  
  // Check if origin is allowed
  const isAllowed = allowedOrigins.some(
    allowed => origin.startsWith(allowed) || referer.startsWith(allowed)
  ) || origin === '' // Allow requests with no origin (same-origin)

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 })
    
    response.headers.set('Access-Control-Allow-Origin', origin || '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Max-Age', '86400')
    
    return response
  }

  // Handle actual requests
  const response = NextResponse.next()
  
  // Add CORS headers
  if (isAllowed) {
    response.headers.set('Access-Control-Allow-Origin', origin || '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }
  
  return response
}

// Apply middleware to all API routes
export const config = {
  matcher: ['/api/:path*']
}
