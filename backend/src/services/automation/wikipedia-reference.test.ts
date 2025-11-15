// WikipediaReferenceAutomation tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WikipediaReferenceAutomation } from './wikipedia-reference'
import type { Seed, SeedState } from '../seeds'
import type { OpenRouterClient } from '../openrouter/client'
import type { AutomationContext, CategoryChange } from './base'
import type { ToolExecutor, ToolResult } from './tools/executor'
import { useToolsWithAI } from './tools/injector'

// Suppress logs during testing
vi.mock('loglevel', () => ({
  default: {
    getLogger: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}))

// Mock useToolsWithAI
vi.mock('./tools/injector', () => ({
  useToolsWithAI: vi.fn(),
}))

describe('WikipediaReferenceAutomation', () => {
  let automation: WikipediaReferenceAutomation
  let mockSeed: Seed
  let mockContext: AutomationContext
  let mockOpenRouter: OpenRouterClient
  let mockToolExecutor: ToolExecutor
  let mockGenerateText: ReturnType<typeof vi.fn>
  let mockExecute: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock OpenRouter client
    mockGenerateText = vi.fn()
    mockOpenRouter = {
      generateText: mockGenerateText,
    } as unknown as OpenRouterClient

    // Mock ToolExecutor
    mockExecute = vi.fn()
    mockToolExecutor = {
      execute: mockExecute,
    } as unknown as ToolExecutor

    // Create automation context
    mockContext = {
      openrouter: mockOpenRouter,
      userId: 'user-123',
      toolExecutor: mockToolExecutor,
    }

    // Create mock seed
    mockSeed = {
      id: 'seed-123',
      user_id: 'user-123',
      slug: 'test-seed',
      created_at: new Date(),
      currentState: {
        seed: 'This is a seed about human chimerism and its implications.',
        timestamp: new Date(),
        metadata: {},
      },
    }

    automation = new WikipediaReferenceAutomation()
    automation.id = 'automation-123'
  })

  describe('process', () => {
    it('should successfully add Wikipedia reference to seed', async () => {
      // Mock identifyReference
      vi.mocked(useToolsWithAI).mockResolvedValue({
        reference: 'Human chimerism',
        searchQuery: 'Human chimerism',
        reason: 'Interesting biological concept',
      })

      // Mock Wikipedia search results
      const searchResultsJson = JSON.stringify([
        'Human chimerism',
        ['Human chimerism'],
        ['A condition where an individual has two sets of DNA'],
        ['https://en.wikipedia.org/wiki/Human_chimerism'],
      ])
      mockExecute.mockResolvedValueOnce({
        success: true,
        toolName: 'wget',
        result: searchResultsJson,
      } as ToolResult)

      // Mock Wikipedia article content
      const articleData = {
        query: {
          pages: {
            '12345': {
              extract: 'Human chimerism is a condition where an individual has two sets of DNA...',
            },
          },
        },
      }
      mockExecute.mockResolvedValueOnce({
        success: true,
        toolName: 'wget',
        result: JSON.stringify(articleData),
      } as ToolResult)

      // Mock summary generation
      mockGenerateText.mockResolvedValue('This article explains human chimerism in detail...')

      const result = await automation.process(mockSeed, mockContext)

      expect(result.transactions).toHaveLength(1)
      expect(result.transactions[0]?.transaction_type).toBe('edit_content')
      expect(result.transactions[0]?.transaction_data).toHaveProperty('content')
      expect((result.transactions[0]?.transaction_data as { content: string }).content).toContain('## Wikipedia Reference')
      expect((result.transactions[0]?.transaction_data as { content: string }).content).toContain('Human chimerism')
      expect(result.metadata).toEqual({
        reference: 'Human chimerism',
        articleUrl: 'https://en.wikipedia.org/wiki/Human_chimerism',
      })
    }, 10000)

    it('should skip if seed already has Wikipedia reference', async () => {
      mockSeed.currentState.seed = 'Content\n\n## Wikipedia Reference\n\nAlready has reference'

      const result = await automation.process(mockSeed, mockContext)

      expect(result.transactions).toHaveLength(0)
      expect(useToolsWithAI).not.toHaveBeenCalled()
    })

    it('should return empty transactions if no reference found', async () => {
      vi.mocked(useToolsWithAI).mockResolvedValue(null)

      const result = await automation.process(mockSeed, mockContext)

      expect(result.transactions).toHaveLength(0)
      expect(mockExecute).not.toHaveBeenCalled()
    })

    it('should return empty transactions if reference identification returns null reference', async () => {
      vi.mocked(useToolsWithAI).mockResolvedValue({
        reference: null,
        searchQuery: 'test',
      })

      const result = await automation.process(mockSeed, mockContext)

      expect(result.transactions).toHaveLength(0)
    })

    it('should return empty transactions if Wikipedia search fails', async () => {
      vi.mocked(useToolsWithAI).mockResolvedValue({
        reference: 'Human chimerism',
        searchQuery: 'Human chimerism',
      })

      mockExecute.mockResolvedValueOnce({
        success: false,
        toolName: 'wget',
        error: 'Network error',
      } as ToolResult)

      const result = await automation.process(mockSeed, mockContext)

      expect(result.transactions).toHaveLength(0)
      expect(mockExecute).toHaveBeenCalledTimes(1)
    })

    it('should return empty transactions if search result is not a string', async () => {
      vi.mocked(useToolsWithAI).mockResolvedValue({
        reference: 'Human chimerism',
        searchQuery: 'Human chimerism',
      })

      mockExecute.mockResolvedValueOnce({
        success: true,
        toolName: 'wget',
        result: { not: 'a string' },
      } as ToolResult)

      const result = await automation.process(mockSeed, mockContext)

      expect(result.transactions).toHaveLength(0)
    })

    it('should return empty transactions if search results JSON is invalid', async () => {
      vi.mocked(useToolsWithAI).mockResolvedValue({
        reference: 'Human chimerism',
        searchQuery: 'Human chimerism',
      })

      mockExecute.mockResolvedValueOnce({
        success: true,
        toolName: 'wget',
        result: 'invalid json {',
      } as ToolResult)

      const result = await automation.process(mockSeed, mockContext)

      expect(result.transactions).toHaveLength(0)
    })

    it('should return empty transactions if search results have no URLs', async () => {
      vi.mocked(useToolsWithAI).mockResolvedValue({
        reference: 'Human chimerism',
        searchQuery: 'Human chimerism',
      })

      const searchResultsJson = JSON.stringify([
        'Human chimerism',
        ['Human chimerism'],
        ['Description'],
        [], // Empty URLs array
      ])
      mockExecute.mockResolvedValueOnce({
        success: true,
        toolName: 'wget',
        result: searchResultsJson,
      } as ToolResult)

      const result = await automation.process(mockSeed, mockContext)

      expect(result.transactions).toHaveLength(0)
    })

    it('should return empty transactions if article URL extraction fails', async () => {
      vi.mocked(useToolsWithAI).mockResolvedValue({
        reference: 'Human chimerism',
        searchQuery: 'Human chimerism',
      })

      const searchResultsJson = JSON.stringify([
        'Human chimerism',
        ['Human chimerism'],
        ['Description'],
        ['https://example.com/not-wikipedia'], // URL without /wiki/
      ])
      mockExecute.mockResolvedValueOnce({
        success: true,
        toolName: 'wget',
        result: searchResultsJson,
      } as ToolResult)

      const result = await automation.process(mockSeed, mockContext)

      expect(result.transactions).toHaveLength(0)
    })

    it('should return empty transactions if article fetch fails', async () => {
      vi.mocked(useToolsWithAI).mockResolvedValue({
        reference: 'Human chimerism',
        searchQuery: 'Human chimerism',
      })

      const searchResultsJson = JSON.stringify([
        'Human chimerism',
        ['Human chimerism'],
        ['Description'],
        ['https://en.wikipedia.org/wiki/Human_chimerism'],
      ])
      mockExecute
        .mockResolvedValueOnce({
          success: true,
          toolName: 'wget',
          result: searchResultsJson,
        } as ToolResult)
        .mockResolvedValueOnce({
          success: false,
          toolName: 'wget',
          error: 'Failed to fetch article',
        } as ToolResult)

      const result = await automation.process(mockSeed, mockContext)

      expect(result.transactions).toHaveLength(0)
      expect(mockExecute).toHaveBeenCalledTimes(2)
    })

    it('should return empty transactions if article content parsing fails', async () => {
      vi.mocked(useToolsWithAI).mockResolvedValue({
        reference: 'Human chimerism',
        searchQuery: 'Human chimerism',
      })

      const searchResultsJson = JSON.stringify([
        'Human chimerism',
        ['Human chimerism'],
        ['Description'],
        ['https://en.wikipedia.org/wiki/Human_chimerism'],
      ])
      mockExecute
        .mockResolvedValueOnce({
          success: true,
          toolName: 'wget',
          result: searchResultsJson,
        } as ToolResult)
        .mockResolvedValueOnce({
          success: true,
          toolName: 'wget',
          result: 'invalid json {',
        } as ToolResult)

      const result = await automation.process(mockSeed, mockContext)

      expect(result.transactions).toHaveLength(0)
    })

    it('should return empty transactions if article has no extract text', async () => {
      vi.mocked(useToolsWithAI).mockResolvedValue({
        reference: 'Human chimerism',
        searchQuery: 'Human chimerism',
      })

      const searchResultsJson = JSON.stringify([
        'Human chimerism',
        ['Human chimerism'],
        ['Description'],
        ['https://en.wikipedia.org/wiki/Human_chimerism'],
      ])
      const articleData = {
        query: {
          pages: {
            '12345': {
              // No extract field
            },
          },
        },
      }
      mockExecute
        .mockResolvedValueOnce({
          success: true,
          toolName: 'wget',
          result: searchResultsJson,
        } as ToolResult)
        .mockResolvedValueOnce({
          success: true,
          toolName: 'wget',
          result: JSON.stringify(articleData),
        } as ToolResult)

      const result = await automation.process(mockSeed, mockContext)

      expect(result.transactions).toHaveLength(0)
    })

    it('should return empty transactions if summary generation fails', async () => {
      vi.mocked(useToolsWithAI).mockResolvedValue({
        reference: 'Human chimerism',
        searchQuery: 'Human chimerism',
      })

      const searchResultsJson = JSON.stringify([
        'Human chimerism',
        ['Human chimerism'],
        ['Description'],
        ['https://en.wikipedia.org/wiki/Human_chimerism'],
      ])
      const articleData = {
        query: {
          pages: {
            '12345': {
              extract: 'Human chimerism is a condition...',
            },
          },
        },
      }
      mockExecute
        .mockResolvedValueOnce({
          success: true,
          toolName: 'wget',
          result: searchResultsJson,
        } as ToolResult)
        .mockResolvedValueOnce({
          success: true,
          toolName: 'wget',
          result: JSON.stringify(articleData),
        } as ToolResult)

      mockGenerateText.mockResolvedValue('') // Empty summary

      const result = await automation.process(mockSeed, mockContext)

      expect(result.transactions).toHaveLength(0)
    })

    it('should handle article URL with special characters', async () => {
      vi.mocked(useToolsWithAI).mockResolvedValue({
        reference: 'C++',
        searchQuery: 'C++',
      })

      const searchResultsJson = JSON.stringify([
        'C++',
        ['C++'],
        ['Programming language'],
        ['https://en.wikipedia.org/wiki/C%2B%2B'],
      ])
      mockExecute.mockResolvedValueOnce({
        success: true,
        toolName: 'wget',
        result: searchResultsJson,
      } as ToolResult)

      const articleData = {
        query: {
          pages: {
            '12345': {
              extract: 'C++ is a programming language...',
            },
          },
        },
      }
      mockExecute.mockResolvedValueOnce({
        success: true,
        toolName: 'wget',
        result: JSON.stringify(articleData),
      } as ToolResult)

      mockGenerateText.mockResolvedValue('Summary text')

      const result = await automation.process(mockSeed, mockContext)

      expect(result.transactions).toHaveLength(1)
      expect(result.metadata?.articleUrl).toBe('https://en.wikipedia.org/wiki/C%2B%2B')
    }, 10000)

    it('should truncate very long article text', async () => {
      vi.mocked(useToolsWithAI).mockResolvedValue({
        reference: 'Test',
        searchQuery: 'Test',
      })

      const searchResultsJson = JSON.stringify([
        'Test',
        ['Test'],
        ['Description'],
        ['https://en.wikipedia.org/wiki/Test'],
      ])
      mockExecute.mockResolvedValueOnce({
        success: true,
        toolName: 'wget',
        result: searchResultsJson,
      } as ToolResult)

      const longText = 'A'.repeat(3000)
      const articleData = {
        query: {
          pages: {
            '12345': {
              extract: longText,
            },
          },
        },
      }
      mockExecute.mockResolvedValueOnce({
        success: true,
        toolName: 'wget',
        result: JSON.stringify(articleData),
      } as ToolResult)

      mockGenerateText.mockResolvedValue('Summary')

      await automation.process(mockSeed, mockContext)

      // Verify that generateText was called with truncated text
      const callArgs = mockGenerateText.mock.calls[0]
      expect(callArgs?.[0]).toContain('A'.repeat(2000))
      expect(callArgs?.[0]).toContain('...')
    }, 10000)
  })

  describe('identifyReference', () => {
    it('should successfully identify a reference from valid JSON response', async () => {
      vi.mocked(useToolsWithAI).mockResolvedValue({
        reference: 'Quantum entanglement',
        searchQuery: 'Quantum entanglement',
        reason: 'Interesting physics concept',
      })

      const result = await (automation as any).identifyReference(mockSeed, mockContext)

      expect(result).toEqual({
        reference: 'Quantum entanglement',
        searchQuery: 'Quantum entanglement',
      })
    })

    it('should return null if no reference found', async () => {
      vi.mocked(useToolsWithAI).mockResolvedValue(null)

      const result = await (automation as any).identifyReference(mockSeed, mockContext)

      expect(result).toBeNull()
    })

    it('should return null if reference field is missing', async () => {
      vi.mocked(useToolsWithAI).mockResolvedValue({
        searchQuery: 'Test',
        reason: 'Test reason',
      })

      const result = await (automation as any).identifyReference(mockSeed, mockContext)

      expect(result).toBeNull()
    })

    it('should return null if reference is "null" string', async () => {
      vi.mocked(useToolsWithAI).mockResolvedValue({
        reference: 'null',
        searchQuery: 'Test',
      })

      const result = await (automation as any).identifyReference(mockSeed, mockContext)

      expect(result).toBeNull()
    })

    it('should use reference as searchQuery if searchQuery is missing', async () => {
      vi.mocked(useToolsWithAI).mockResolvedValue({
        reference: 'Test Reference',
        reason: 'Test',
      })

      const result = await (automation as any).identifyReference(mockSeed, mockContext)

      expect(result).toEqual({
        reference: 'Test Reference',
        searchQuery: 'Test Reference',
      })
    })

    it('should parse JSON from string response', async () => {
      vi.mocked(useToolsWithAI).mockResolvedValue(
        '{"reference": "Test", "searchQuery": "Test Query"}'
      )

      const result = await (automation as any).identifyReference(mockSeed, mockContext)

      expect(result).toEqual({
        reference: 'Test',
        searchQuery: 'Test Query',
      })
    })

    it('should extract JSON from string with extra text', async () => {
      vi.mocked(useToolsWithAI).mockResolvedValue(
        'Here is the result: {"reference": "Test", "searchQuery": "Test Query"} and more text'
      )

      const result = await (automation as any).identifyReference(mockSeed, mockContext)

      expect(result).toEqual({
        reference: 'Test',
        searchQuery: 'Test Query',
      })
    })

    it('should return null if JSON parsing fails', async () => {
      vi.mocked(useToolsWithAI).mockResolvedValue('invalid json {')

      const result = await (automation as any).identifyReference(mockSeed, mockContext)

      expect(result).toBeNull()
    })

    it('should return null if useToolsWithAI throws error', async () => {
      vi.mocked(useToolsWithAI).mockRejectedValue(new Error('API error'))

      const result = await (automation as any).identifyReference(mockSeed, mockContext)

      expect(result).toBeNull()
    })
  })

  describe('summarizeReference', () => {
    it('should successfully generate summary', async () => {
      const articleText = 'Human chimerism is a condition...'
      const articleUrl = 'https://en.wikipedia.org/wiki/Human_chimerism'
      mockGenerateText.mockResolvedValue('This article explains human chimerism...')

      const result = await (automation as any).summarizeReference(
        mockSeed,
        'Human chimerism',
        articleText,
        articleUrl,
        mockContext
      )

      expect(result).toContain('This article explains human chimerism...')
      expect(result).toContain('[Read more on Wikipedia]')
      expect(result).toContain(articleUrl)
    })

    it('should return null if summary is empty', async () => {
      const articleText = 'Test article text'
      const articleUrl = 'https://en.wikipedia.org/wiki/Test'
      mockGenerateText.mockResolvedValue('')

      const result = await (automation as any).summarizeReference(
        mockSeed,
        'Test',
        articleText,
        articleUrl,
        mockContext
      )

      expect(result).toBeNull()
    })

    it('should return null if summary is only whitespace', async () => {
      const articleText = 'Test article text'
      const articleUrl = 'https://en.wikipedia.org/wiki/Test'
      mockGenerateText.mockResolvedValue('   \n\t   ')

      const result = await (automation as any).summarizeReference(
        mockSeed,
        'Test',
        articleText,
        articleUrl,
        mockContext
      )

      expect(result).toBeNull()
    })

    it('should return null if OpenRouter API throws error', async () => {
      const articleText = 'Test article text'
      const articleUrl = 'https://en.wikipedia.org/wiki/Test'
      mockGenerateText.mockRejectedValue(new Error('API error'))

      const result = await (automation as any).summarizeReference(
        mockSeed,
        'Test',
        articleText,
        articleUrl,
        mockContext
      )

      expect(result).toBeNull()
    })

    it('should truncate article text to 2000 characters', async () => {
      const longText = 'A'.repeat(3000)
      const articleUrl = 'https://en.wikipedia.org/wiki/Test'
      mockGenerateText.mockResolvedValue('Summary')

      await (automation as any).summarizeReference(
        mockSeed,
        'Test',
        longText,
        articleUrl,
        mockContext
      )

      const callArgs = mockGenerateText.mock.calls[0]
      expect(callArgs?.[0]).toContain('A'.repeat(2000))
      expect(callArgs?.[0]).toContain('...')
    })

    it('should not truncate article text shorter than 2000 characters', async () => {
      const shortText = 'A'.repeat(1000)
      const articleUrl = 'https://en.wikipedia.org/wiki/Test'
      mockGenerateText.mockResolvedValue('Summary')

      await (automation as any).summarizeReference(
        mockSeed,
        'Test',
        shortText,
        articleUrl,
        mockContext
      )

      const callArgs = mockGenerateText.mock.calls[0]
      expect(callArgs?.[0]).toContain(shortText)
      expect(callArgs?.[0]).not.toContain('...')
    })

    it('should handle article text exactly 2000 characters', async () => {
      const exactText = 'A'.repeat(2000)
      const articleUrl = 'https://en.wikipedia.org/wiki/Test'
      mockGenerateText.mockResolvedValue('Summary')

      await (automation as any).summarizeReference(
        mockSeed,
        'Test',
        exactText,
        articleUrl,
        mockContext
      )

      const callArgs = mockGenerateText.mock.calls[0]
      expect(callArgs?.[0]).toContain(exactText)
      expect(callArgs?.[0]).not.toContain('...')
    })
  })

  describe('calculatePressure', () => {
    it('should return 0 if seed has no categories', () => {
      mockSeed.currentState.categories = []

      const result = automation.calculatePressure(mockSeed, mockContext, [
        { type: 'rename', categoryId: 'cat-1' },
      ])

      expect(result).toBe(0)
    })

    it('should return 0 if seed categories are not affected', () => {
      mockSeed.currentState.categories = [
        { id: 'cat-1', name: 'Category 1', path: '/category1' },
      ]

      const result = automation.calculatePressure(mockSeed, mockContext, [
        { type: 'rename', categoryId: 'cat-2' },
      ])

      expect(result).toBe(0)
    })

    it('should return 5 if seed category is affected', () => {
      mockSeed.currentState.categories = [
        { id: 'cat-1', name: 'Category 1', path: '/category1' },
      ]

      const result = automation.calculatePressure(mockSeed, mockContext, [
        { type: 'rename', categoryId: 'cat-1' },
      ])

      expect(result).toBe(5)
    })

    it('should return 5 if multiple changes affect seed category', () => {
      mockSeed.currentState.categories = [
        { id: 'cat-1', name: 'Category 1', path: '/category1' },
      ]

      const result = automation.calculatePressure(mockSeed, mockContext, [
        { type: 'rename', categoryId: 'cat-1' },
        { type: 'add_child', categoryId: 'cat-1' },
      ])

      expect(result).toBe(5)
    })

    it('should return 0 if changes array is empty', () => {
      mockSeed.currentState.categories = [
        { id: 'cat-1', name: 'Category 1', path: '/category1' },
      ]

      const result = automation.calculatePressure(mockSeed, mockContext, [])

      expect(result).toBe(0)
    })
  })

  describe('integration', () => {
    it('should create transaction with correct structure', async () => {
      vi.mocked(useToolsWithAI).mockResolvedValue({
        reference: 'Test Reference',
        searchQuery: 'Test Reference',
      })

      const searchResultsJson = JSON.stringify([
        'Test Reference',
        ['Test Reference'],
        ['Description'],
        ['https://en.wikipedia.org/wiki/Test_Reference'],
      ])
      const articleData = {
        query: {
          pages: {
            '12345': {
              extract: 'Test article content',
            },
          },
        },
      }
      mockExecute
        .mockResolvedValueOnce({
          success: true,
          toolName: 'wget',
          result: searchResultsJson,
        } as ToolResult)
        .mockResolvedValueOnce({
          success: true,
          toolName: 'wget',
          result: JSON.stringify(articleData),
        } as ToolResult)

      mockGenerateText.mockResolvedValue('Test summary')

      const result = await automation.process(mockSeed, mockContext)

      expect(result.transactions).toHaveLength(1)
      const transaction = result.transactions[0]
      expect(transaction?.seed_id).toBe('seed-123')
      expect(transaction?.transaction_type).toBe('edit_content')
      expect(transaction?.automation_id).toBe('automation-123')
      expect(transaction?.created_at).toBeInstanceOf(Date)
      expect((transaction?.transaction_data as { content: string }).content).toContain(
        '## Wikipedia Reference'
      )
      expect((transaction?.transaction_data as { content: string }).content).toContain(
        '**Test Reference**'
      )
      expect((transaction?.transaction_data as { content: string }).content).toContain(
        'Test summary'
      )
    }, 10000)
  })
})

