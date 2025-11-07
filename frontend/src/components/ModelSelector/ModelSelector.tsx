import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { ChevronDown, X } from 'lucide-react'
import './ModelSelector.css'

export interface ModelSelectorOption {
  id: string
  name: string
}

export interface ModelSelectorProps {
  options: ModelSelectorOption[]
  value: string
  onChange: (value: string) => void
  onFocus?: () => void
  disabled?: boolean
  placeholder?: string
  loading?: boolean
}

export function ModelSelector({
  options,
  value,
  onChange,
  onFocus,
  disabled = false,
  placeholder = 'Select a model...',
  loading = false,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [filterText, setFilterText] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [openUpward, setOpenUpward] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Get the selected option
  const selectedOption = options.find(opt => opt.id === value)

  // Filter options based on filter text
  const filteredOptions = options.filter(opt => {
    if (!filterText.trim()) return true
    const searchText = filterText.toLowerCase()
    return (
      opt.name.toLowerCase().includes(searchText) ||
      opt.id.toLowerCase().includes(searchText)
    )
  })

  // Update filter text when value changes externally
  useEffect(() => {
    if (selectedOption) {
      setFilterText(selectedOption.name)
    } else {
      setFilterText('')
    }
  }, [value, selectedOption])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setHighlightedIndex(-1)
        // Reset filter text to selected option name when closing
        if (selectedOption) {
          setFilterText(selectedOption.name)
        } else {
          setFilterText('')
        }
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
    return undefined
  }, [isOpen, selectedOption])

  // Calculate dropdown position based on available space
  useEffect(() => {
    if (!isOpen || !containerRef.current || !inputRef.current) return

    const calculatePosition = () => {
      const inputRect = inputRef.current!.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const spaceBelow = viewportHeight - inputRect.bottom
      const spaceAbove = inputRect.top
      
      // Try to get actual dropdown height, otherwise estimate
      let dropdownHeight = 320 // max-height default
      if (dropdownRef.current) {
        dropdownHeight = dropdownRef.current.offsetHeight || dropdownRef.current.scrollHeight
      } else {
        // Estimate based on filtered options (before dropdown is rendered)
        const estimatedItemHeight = 48 // ~48px per item including padding
        const estimatedPadding = 16 // padding
        dropdownHeight = Math.min(320, filteredOptions.length * estimatedItemHeight + estimatedPadding)
      }
      
      // Open upward if there's not enough space below but more space above
      const shouldOpenUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow
      setOpenUpward(shouldOpenUpward)
    }

    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      calculatePosition()
    })

    // Recalculate on scroll and resize
    const handleResize = () => {
      requestAnimationFrame(() => {
        calculatePosition()
      })
    }
    const handleScroll = () => {
      requestAnimationFrame(() => {
        calculatePosition()
      })
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll, true)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [isOpen, filteredOptions.length])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFilterText = e.target.value
    setFilterText(newFilterText)
    setHighlightedIndex(-1)
    
    // If input is cleared, clear selection
    if (!newFilterText.trim()) {
      onChange('')
    }
    
    // Open dropdown when typing
    if (!isOpen) {
      setIsOpen(true)
    }
  }

  const handleInputFocus = () => {
    setIsOpen(true)
    onFocus?.()
  }

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setIsOpen(true)
        setHighlightedIndex(prev => {
          if (prev < filteredOptions.length - 1) {
            return prev + 1
          }
          return prev
        })
        break
      case 'ArrowUp':
        e.preventDefault()
        setIsOpen(true)
        setHighlightedIndex(prev => {
          if (prev > 0) {
            return prev - 1
          }
          return -1
        })
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex].id)
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setHighlightedIndex(-1)
        if (selectedOption) {
          setFilterText(selectedOption.name)
        } else {
          setFilterText('')
        }
        inputRef.current?.blur()
        break
      case 'Tab':
        setIsOpen(false)
        setHighlightedIndex(-1)
        break
    }
  }

  const handleSelect = (optionId: string) => {
    onChange(optionId)
    setIsOpen(false)
    setHighlightedIndex(-1)
    const selected = options.find(opt => opt.id === optionId)
    if (selected) {
      setFilterText(selected.name)
    }
    inputRef.current?.blur()
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setFilterText('')
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const handleToggleDropdown = () => {
    if (disabled) return
    setIsOpen(!isOpen)
    if (!isOpen) {
      inputRef.current?.focus()
    }
  }

  return (
    <div className="model-selector" ref={containerRef}>
      <div className="model-selector-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          className="model-selector-input"
          value={filterText}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleInputKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
        />
        <div className="model-selector-actions">
          {value && !disabled && (
            <button
              type="button"
              className="model-selector-clear"
              onClick={handleClear}
              aria-label="Clear selection"
            >
              <X size={16} />
            </button>
          )}
          <button
            type="button"
            className="model-selector-toggle"
            onClick={handleToggleDropdown}
            disabled={disabled}
            aria-label="Toggle dropdown"
          >
            <ChevronDown size={16} className={isOpen ? 'open' : ''} />
          </button>
        </div>
      </div>
      {isOpen && !disabled && (
        <div 
          ref={dropdownRef}
          className={`model-selector-dropdown ${openUpward ? 'open-upward' : ''}`}
        >
          {loading ? (
            <div className="model-selector-loading">
              <span>Loading models...</span>
            </div>
          ) : filteredOptions.length === 0 ? (
            <div className="model-selector-empty">
              <span>No models found</span>
            </div>
          ) : (
            <ul
              ref={listRef}
              className="model-selector-list"
              role="listbox"
            >
              {filteredOptions.map((option, index) => (
                <li
                  key={option.id}
                  className={`model-selector-option ${
                    option.id === value ? 'selected' : ''
                  } ${index === highlightedIndex ? 'highlighted' : ''}`}
                  onClick={() => handleSelect(option.id)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  role="option"
                  aria-selected={option.id === value}
                >
                  <span className="model-selector-option-name">{option.name}</span>
                  {option.name !== option.id && (
                    <span className="model-selector-option-id">{option.id}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

