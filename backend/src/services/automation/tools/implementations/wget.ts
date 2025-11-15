// wget tool - downloads content from a URI

import axios, { AxiosError } from 'axios'
import type { ToolDefinition } from '../types'

/**
 * wget tool definition
 * 
 * Downloads content from a URI with a timeout.
 * Returns the content as a string.
 */
export const wgetTool: ToolDefinition = {
  name: 'wget',
  signature: 'wget(string uri, number timeoutMs): string',
  description: `
    Download data from a URI with a timeout.
    
    @param uri - The URI to download from (must be http:// or https://)
    @param timeoutMs - Timeout in milliseconds (default: 30000, max: 300000)
    @returns The content as a string, or an error message if the download fails
  `,
  parameters: [
    {
      name: 'uri',
      type: 'string',
      description: 'The URI to download from',
      required: true,
    },
    {
      name: 'timeoutMs',
      type: 'number',
      description: 'Timeout in milliseconds (default: 30000, max: 300000)',
      required: false,
    },
  ],
  implementation: async (args: unknown[]): Promise<string> => {
    const uri = args[0]
    const timeoutMs = args[1] ?? 30000

    // Validate URI
    if (typeof uri !== 'string') {
      throw new Error('URI must be a string')
    }

    // Validate URI format (must be http:// or https://)
    if (!uri.startsWith('http://') && !uri.startsWith('https://')) {
      throw new Error('URI must start with http:// or https://')
    }

    // Validate timeout
    if (typeof timeoutMs !== 'number') {
      throw new Error('timeoutMs must be a number')
    }

    if (timeoutMs < 0 || timeoutMs > 300000) {
      throw new Error('timeoutMs must be between 0 and 300000 (5 minutes)')
    }

    try {
      // Make GET request with timeout
      const response = await axios.get(uri, {
        timeout: timeoutMs,
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 400, // Accept 2xx and 3xx
        responseType: 'text', // Get response as text
      })

      return response.data
    } catch (error) {
      // Handle errors gracefully
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError
        
        if (axiosError.code === 'ECONNABORTED') {
          return `Error: Request timed out after ${timeoutMs}ms`
        }
        
        if (axiosError.response) {
          // HTTP error response
          return `Error: HTTP ${axiosError.response.status} - ${axiosError.response.statusText}`
        }
        
        if (axiosError.request) {
          // Request made but no response
          return `Error: No response from server - ${axiosError.message}`
        }
      }

      // Generic error
      const errorMessage = error instanceof Error ? error.message : String(error)
      return `Error: ${errorMessage}`
    }
  },
}

