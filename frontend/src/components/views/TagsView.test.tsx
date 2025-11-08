// TagsView component tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { TagsView } from './TagsView'

// Mock TagCloud component
vi.mock('../TagCloud', () => ({
  TagCloud: ({ onTagSelect, selectedTags }: any) => (
    <div data-testid="tag-cloud">
      <button
        data-testid="tag-work"
        onClick={() => onTagSelect?.('work')}
      >
        work
      </button>
      <button
        data-testid="tag-personal"
        onClick={() => onTagSelect?.('personal')}
      >
        personal
      </button>
      <div data-testid="selected-count">{selectedTags?.size || 0}</div>
    </div>
  ),
}))

// Mock mother-theme components
vi.mock('@mother/components/Panel', () => ({
  Panel: ({ children, variant, className }: any) => (
    <div data-testid="panel" data-variant={variant} className={className}>
      {children}
    </div>
  ),
}))

vi.mock('@mother/components/Badge', () => ({
  Badge: ({ children, variant }: any) => (
    <span data-testid="badge" data-variant={variant}>
      {children}
    </span>
  ),
}))

vi.mock('@mother/components/Button', () => ({
  Button: ({ children, onClick, variant }: any) => (
    <button
      data-testid="button"
      data-variant={variant}
      onClick={onClick}
    >
      {children}
    </button>
  ),
}))

describe('TagsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render tags view', () => {
    render(
      <MemoryRouter>
        <TagsView />
      </MemoryRouter>
    )

    expect(screen.getByText('Tags')).toBeInTheDocument()
    expect(screen.getByTestId('tag-cloud')).toBeInTheDocument()
  })

  it('should handle tag selection', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <TagsView />
      </MemoryRouter>
    )

    const workTag = screen.getByTestId('tag-work')
    await user.click(workTag)

    // Tag should be selected
    expect(screen.getByTestId('badge')).toBeInTheDocument()
    expect(screen.getByText('1 selected')).toBeInTheDocument()
  })

  it('should toggle tag selection on click', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <TagsView />
      </MemoryRouter>
    )

    const workTag = screen.getByTestId('tag-work')
    
    // First click - select
    await user.click(workTag)
    expect(screen.getByText('1 selected')).toBeInTheDocument()

    // Second click - deselect
    await user.click(workTag)
    expect(screen.queryByText('1 selected')).not.toBeInTheDocument()
  })

  it('should handle multiple tag selections', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <TagsView />
      </MemoryRouter>
    )

    const workTag = screen.getByTestId('tag-work')
    const personalTag = screen.getByTestId('tag-personal')

    await user.click(workTag)
    await user.click(personalTag)

    expect(screen.getByText('2 selected')).toBeInTheDocument()
  })

  it('should show clear button when tags are selected', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <TagsView />
      </MemoryRouter>
    )

    const workTag = screen.getByTestId('tag-work')
    await user.click(workTag)

    expect(screen.getByText('Clear')).toBeInTheDocument()
  })

  it('should clear selection when clear button is clicked', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <TagsView />
      </MemoryRouter>
    )

    const workTag = screen.getByTestId('tag-work')
    await user.click(workTag)

    expect(screen.getByText('1 selected')).toBeInTheDocument()

    const clearButton = screen.getByText('Clear')
    await user.click(clearButton)

    expect(screen.queryByText('1 selected')).not.toBeInTheDocument()
    expect(screen.queryByText('Clear')).not.toBeInTheDocument()
  })

  it('should show selection info panel when tags are selected', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <TagsView />
      </MemoryRouter>
    )

    const workTag = screen.getByTestId('tag-work')
    await user.click(workTag)

    const panel = screen.getByTestId('panel')
    expect(panel).toBeInTheDocument()
    expect(screen.getByText(/1 tag selected/)).toBeInTheDocument()
  })

  it('should show plural form for multiple tags', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <TagsView />
      </MemoryRouter>
    )

    const workTag = screen.getByTestId('tag-work')
    const personalTag = screen.getByTestId('tag-personal')

    await user.click(workTag)
    await user.click(personalTag)

    expect(screen.getByText(/2 tags selected/)).toBeInTheDocument()
  })

  it('should show singular form for single tag', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <TagsView />
      </MemoryRouter>
    )

    const workTag = screen.getByTestId('tag-work')
    await user.click(workTag)

    expect(screen.getByText(/1 tag selected/)).toBeInTheDocument()
  })

  it('should display selection instructions', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <TagsView />
      </MemoryRouter>
    )

    const workTag = screen.getByTestId('tag-work')
    await user.click(workTag)

    expect(screen.getByText(/Ctrl\/Cmd\+Click tags to filter seeds/)).toBeInTheDocument()
  })

  it('should not show selection info when no tags selected', () => {
    render(
      <MemoryRouter>
        <TagsView />
      </MemoryRouter>
    )

    const panels = screen.queryAllByTestId('panel')
    const selectionPanel = panels.find(p => p.className.includes('tag-selection-info'))
    expect(selectionPanel).toBeUndefined()
  })
})

