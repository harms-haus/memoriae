import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WikipediaLinksMusing } from './WikipediaLinksMusing'
import type { IdeaMusing, WikipediaLinksContent } from '../../types'

const mockMusing: IdeaMusing = {
  id: 'musing-1',
  seed_id: 'seed-1',
  template_type: 'wikipedia_links',
  content: {
    links: [
      { title: 'React (JavaScript library)', url: 'https://en.wikipedia.org/wiki/React_(JavaScript_library)' },
      { title: 'TypeScript', url: 'https://en.wikipedia.org/wiki/TypeScript' },
      { title: 'Web Development', url: 'https://en.wikipedia.org/wiki/Web_development' },
    ],
  } as WikipediaLinksContent,
  created_at: '2024-01-01T00:00:00.000Z',
  dismissed: false,
  completed: false,
}

describe('WikipediaLinksMusing', () => {
  describe('Rendering', () => {
    it('should render all links', () => {
      render(<WikipediaLinksMusing musing={mockMusing} />)

      expect(screen.getByText('React (JavaScript library)')).toBeInTheDocument()
      expect(screen.getByText('TypeScript')).toBeInTheDocument()
      expect(screen.getByText('Web Development')).toBeInTheDocument()
    })

    it('should render links with correct href attributes', () => {
      render(<WikipediaLinksMusing musing={mockMusing} />)

      const reactLink = screen.getByText('React (JavaScript library)').closest('a')
      expect(reactLink).toHaveAttribute('href', 'https://en.wikipedia.org/wiki/React_(JavaScript_library)')

      const tsLink = screen.getByText('TypeScript').closest('a')
      expect(tsLink).toHaveAttribute('href', 'https://en.wikipedia.org/wiki/TypeScript')
    })

    it('should render links with target="_blank" and rel="noopener noreferrer"', () => {
      render(<WikipediaLinksMusing musing={mockMusing} />)

      const links = screen.getAllByRole('link')
      links.forEach((link) => {
        expect(link).toHaveAttribute('target', '_blank')
        expect(link).toHaveAttribute('rel', 'noopener noreferrer')
      })
    })

    it('should apply correct CSS classes', () => {
      const { container } = render(<WikipediaLinksMusing musing={mockMusing} />)

      const containerElement = container.querySelector('.wikipedia-links-musing')
      expect(containerElement).toBeInTheDocument()

      const listElement = container.querySelector('.wikipedia-links-list')
      expect(listElement).toBeInTheDocument()

      const linkItems = container.querySelectorAll('.wikipedia-link-item')
      expect(linkItems).toHaveLength(3)

      const links = container.querySelectorAll('.wikipedia-link')
      expect(links).toHaveLength(3)
    })

    it('should handle empty links array', () => {
      const emptyMusing: IdeaMusing = {
        ...mockMusing,
        content: {
          links: [],
        } as WikipediaLinksContent,
      }

      render(<WikipediaLinksMusing musing={emptyMusing} />)

      const links = screen.queryAllByRole('link')
      expect(links).toHaveLength(0)
    })

    it('should handle missing links property', () => {
      const missingLinksMusing: IdeaMusing = {
        ...mockMusing,
        content: {} as WikipediaLinksContent,
      }

      render(<WikipediaLinksMusing musing={missingLinksMusing} />)

      const links = screen.queryAllByRole('link')
      expect(links).toHaveLength(0)
    })

    it('should render single link', () => {
      const singleLinkMusing: IdeaMusing = {
        ...mockMusing,
        content: {
          links: [
            { title: 'Single Link', url: 'https://en.wikipedia.org/wiki/Single' },
          ],
        } as WikipediaLinksContent,
      }

      render(<WikipediaLinksMusing musing={singleLinkMusing} />)

      expect(screen.getByText('Single Link')).toBeInTheDocument()
      const link = screen.getByText('Single Link').closest('a')
      expect(link).toHaveAttribute('href', 'https://en.wikipedia.org/wiki/Single')
    })
  })
})

