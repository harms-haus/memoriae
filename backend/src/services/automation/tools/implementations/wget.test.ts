// Tests for wget tool

import { describe, it, expect } from 'vitest'
import { wgetTool } from './wget'
import axios from 'axios'
import { vi } from 'vitest'

// Mock axios
vi.mock('axios')
const mockedAxios = axios as unknown as {
  get: ReturnType<typeof vi.fn>
  isAxiosError: ReturnType<typeof vi.fn>
}

describe('wgetTool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedAxios.isAxiosError = vi.fn((error) => error?.isAxiosError === true)
  })

  it('should download content successfully', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: 'Downloaded content',
    })

    const result = await wgetTool.implementation(['https://example.com', 30000])

    expect(result).toBe('Downloaded content')
    expect(mockedAxios.get).toHaveBeenCalledWith('https://example.com', {
      timeout: 30000,
      maxRedirects: 5,
      validateStatus: expect.any(Function),
      responseType: 'text',
      headers: {
        'User-Agent': 'Memoriae/1.0 (https://memoriae.app; automation@memoriae.app)',
      },
    })
  })

  it('should use default timeout when not provided', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: 'Content',
    })

    await wgetTool.implementation(['https://example.com'])

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({
        timeout: 30000,
      })
    )
  })

  it('should validate URI format', async () => {
    await expect(
      wgetTool.implementation(['not-a-uri', 30000])
    ).rejects.toThrow('URI must start with http:// or https://')
  })

  it('should validate timeout range', async () => {
    await expect(
      wgetTool.implementation(['https://example.com', -1])
    ).rejects.toThrow('timeoutMs must be between 0 and 300000')

    await expect(
      wgetTool.implementation(['https://example.com', 400000])
    ).rejects.toThrow('timeoutMs must be between 0 and 300000')
  })

  it('should handle timeout errors', async () => {
    const timeoutError = {
      code: 'ECONNABORTED',
      isAxiosError: true,
    }
    mockedAxios.get = vi.fn().mockRejectedValue(timeoutError)
    mockedAxios.isAxiosError.mockReturnValue(true)

    const result = await wgetTool.implementation(['https://example.com', 30000])

    expect(result).toContain('timed out')
  })

  it('should handle HTTP errors', async () => {
    const httpError = {
      response: {
        status: 404,
        statusText: 'Not Found',
      },
      isAxiosError: true,
    }
    mockedAxios.get = vi.fn().mockRejectedValue(httpError)
    mockedAxios.isAxiosError.mockReturnValue(true)

    const result = await wgetTool.implementation(['https://example.com', 30000])

    expect(result).toContain('HTTP 404')
  })

  it('should handle network errors', async () => {
    const networkError = {
      request: {},
      message: 'Network error',
      isAxiosError: true,
    }
    mockedAxios.get = vi.fn().mockRejectedValue(networkError)
    mockedAxios.isAxiosError.mockReturnValue(true)

    const result = await wgetTool.implementation(['https://example.com', 30000])

    expect(result).toContain('No response from server')
  })

  it('should handle generic errors', async () => {
    mockedAxios.get = vi.fn().mockRejectedValue(new Error('Generic error'))
    mockedAxios.isAxiosError.mockReturnValue(false)

    const result = await wgetTool.implementation(['https://example.com', 30000])

    expect(result).toContain('Generic error')
  })
})

