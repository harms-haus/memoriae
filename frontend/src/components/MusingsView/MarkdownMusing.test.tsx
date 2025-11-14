import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MarkdownMusing } from './MarkdownMusing'
import type { IdeaMusing, MarkdownContent } from '../../types'

// Mock react-markdown
vi.mock('react-markdown', () => ({
  default: ({ children, className }: any) => (
    <div data-testid="react-markdown" className={className}>
      {children}
    </div>
  ),
}))

vi.mock('remark-gfm', () => ({
  default: vi.fn(),
}))

const mockMusing: IdeaMusing = {
  id: 'musing-1',
  seed_id: 'seed-1',
  template_type: 'markdown',
  content: {
    markdown: '# Hello World\n\nThis is a **markdown** test.',
  } as MarkdownContent,
  created_at: '2024-01-01T00:00:00.000Z',
  dismissed: false,
  completed: false,
}

describe('MarkdownMusing', () => {
  describe('Rendering', () => {
    it('should render markdown content', () => {
      render(<MarkdownMusing musing={mockMusing} />)

      const markdownElement = screen.getByTestId('react-markdown')
      expect(markdownElement).toBeInTheDocument()
      // Check that the content is present (newlines may be collapsed in textContent)
      expect(markdownElement.textContent).toContain('Hello World')
      expect(markdownElement.textContent).toContain('This is a **markdown** test.')
    })

    it('should apply correct CSS classes', () => {
      render(<MarkdownMusing musing={mockMusing} />)

      const container = screen.getByTestId('react-markdown').parentElement
      expect(container).toHaveClass('markdown-musing')

      const markdownElement = screen.getByTestId('react-markdown')
      expect(markdownElement).toHaveClass('markdown-content')
    })

    it('should handle empty markdown content', () => {
      const emptyMusing: IdeaMusing = {
        ...mockMusing,
        content: {
          markdown: '',
        } as MarkdownContent,
      }

      render(<MarkdownMusing musing={emptyMusing} />)

      const markdownElement = screen.getByTestId('react-markdown')
      expect(markdownElement).toBeInTheDocument()
      expect(markdownElement).toHaveTextContent('')
    })

    it('should handle missing markdown property', () => {
      const missingMarkdownMusing: IdeaMusing = {
        ...mockMusing,
        content: {} as MarkdownContent,
      }

      render(<MarkdownMusing musing={missingMarkdownMusing} />)

      const markdownElement = screen.getByTestId('react-markdown')
      expect(markdownElement).toBeInTheDocument()
      expect(markdownElement).toHaveTextContent('')
    })

    it('should render complex markdown content', () => {
      const complexMusing: IdeaMusing = {
        ...mockMusing,
        content: {
          markdown: `# Title

## Subtitle

- List item 1
- List item 2

\`\`\`javascript
const code = 'example';
\`\`\`

[Link](https://example.com)`,
        } as MarkdownContent,
      }

      render(<MarkdownMusing musing={complexMusing} />)

      const markdownElement = screen.getByTestId('react-markdown')
      expect(markdownElement).toBeInTheDocument()
      expect(markdownElement).toHaveTextContent('Title')
    })
  })
})

