/**
 * Visual Test Setup and Utilities
 * 
 * Provides mock data factories and test utilities for Playwright visual tests.
 * Import theme CSS to ensure components render with proper styling.
 * 
 * This module uses a singleton pattern to prevent duplicate evaluation
 * when Playwright bundles multiple test files together.
 */

// Module-level guard to prevent duplicate evaluation
if (typeof globalThis !== 'undefined') {
  const moduleKey = '__visual_setup_loaded__';
  if ((globalThis as any)[moduleKey]) {
    // Module already loaded, return early to prevent re-evaluation
    // This prevents duplicate identifier errors when Playwright bundles test files
    throw new Error('visual-setup module should only be loaded once');
  }
  (globalThis as any)[moduleKey] = true;
}

import React from 'react'

// Import theme CSS for visual tests
import '@mother/styles/theme.css'
import '../styles/responsive.css'

import type {
  Seed,
  SeedState,
  SeedTransaction,
  Tag,
  Category,
  Sprout,
} from '../types'

// Automation interface (defined locally in SeedDetailView, duplicated here for tests)
interface Automation {
  id: string
  name: string
  description: string | null
  enabled: boolean
}

/**
 * Mock data factories for visual tests
 */

export function createMockSeed(overrides?: Partial<Seed>): Seed {
  const now = new Date().toISOString()
  return {
    id: overrides?.id || 'seed-1',
    user_id: 'user-1',
    created_at: overrides?.created_at || now,
    slug: overrides?.slug || null,
    currentState: overrides?.currentState || {
      seed: 'This is a sample seed content for visual testing.',
      timestamp: now,
      metadata: {},
      tags: [],
      categories: [],
    },
    ...overrides,
  }
}

export function createMockSeedState(overrides?: Partial<SeedState>): SeedState {
  const now = new Date().toISOString()
  return {
    seed: overrides?.seed || 'Sample seed content',
    timestamp: overrides?.timestamp || now,
    metadata: overrides?.metadata || {},
    tags: overrides?.tags || [],
    categories: overrides?.categories || [],
  }
}

export function createMockTag(overrides?: Partial<Tag>): Tag {
  return {
    id: overrides?.id || 'tag-1',
    name: overrides?.name || 'sample-tag',
    color: overrides?.color || '#ffd43b',
    ...overrides,
  }
}

export function createMockCategory(overrides?: Partial<Category>): Category {
  const now = new Date().toISOString()
  return {
    id: overrides?.id || 'category-1',
    parent_id: overrides?.parent_id || null,
    name: overrides?.name || 'Sample Category',
    path: overrides?.path || '/sample-category',
    created_at: overrides?.created_at || now,
    ...overrides,
  }
}

export function createMockSeedTransaction(
  overrides?: Partial<SeedTransaction>
): SeedTransaction {
  const now = new Date().toISOString()
  return {
    id: overrides?.id || 'transaction-1',
    seed_id: overrides?.seed_id || 'seed-1',
    transaction_type: overrides?.transaction_type || 'create_seed',
    transaction_data: overrides?.transaction_data || { content: 'Sample content' },
    created_at: overrides?.created_at || now,
    automation_id: overrides?.automation_id || null,
    ...overrides,
  }
}

export function createMockSprout(overrides?: Partial<Sprout>): Sprout {
  const now = new Date().toISOString()
  return {
    id: overrides?.id || 'sprout-1',
    seed_id: overrides?.seed_id || 'seed-1',
    sprout_type: overrides?.sprout_type || 'followup',
    sprout_data: overrides?.sprout_data || {
      trigger: 'manual',
      initial_time: now,
      initial_message: 'Sample followup message',
    },
    created_at: overrides?.created_at || now,
    automation_id: overrides?.automation_id || null,
    ...overrides,
  }
}

export function createMockAutomation(overrides?: Partial<Automation>): Automation {
  return {
    id: overrides?.id || 'automation-1',
    name: overrides?.name || 'Sample Automation',
    description: overrides?.description || 'A sample automation for testing',
    enabled: overrides?.enabled !== undefined ? overrides.enabled : true,
    ...overrides,
  }
}

/**
 * Helper to create multiple seeds with varied content
 */
export function createMockSeeds(count: number, baseContent?: string): Seed[] {
  return Array.from({ length: count }, (_, i) =>
    createMockSeed({
      id: `seed-${i + 1}`,
      currentState: {
        seed: baseContent || `Seed content ${i + 1}`,
        timestamp: new Date(Date.now() - i * 1000 * 60).toISOString(),
        metadata: {},
        tags: [],
        categories: [],
      },
    })
  )
}

/**
 * Helper to create tags with different frequencies (for TagCloud testing)
 */
export function createMockTagsWithFrequencies(
  frequencies: Record<string, number>
): Tag[] {
  return Object.entries(frequencies).map(([name, count], index) =>
    createMockTag({
      id: `tag-${index + 1}`,
      name,
      color: `hsl(${(index * 60) % 360}, 70%, 50%)`,
    })
  )
}

/**
 * Helper to create a hierarchical category structure
 */
export function createMockCategoryTree(): Category[] {
  const now = new Date().toISOString()
  const root = createMockCategory({
    id: 'cat-root',
    name: 'Root',
    path: '/root',
    parent_id: null,
    created_at: now,
  })

  const child1 = createMockCategory({
    id: 'cat-child-1',
    name: 'Child 1',
    path: '/root/child-1',
    parent_id: 'cat-root',
    created_at: now,
  })

  const child2 = createMockCategory({
    id: 'cat-child-2',
    name: 'Child 2',
    path: '/root/child-2',
    parent_id: 'cat-root',
    created_at: now,
  })

  const grandchild = createMockCategory({
    id: 'cat-grandchild',
    name: 'Grandchild',
    path: '/root/child-1/grandchild',
    parent_id: 'cat-child-1',
    created_at: now,
  })

  return [root, child1, child2, grandchild]
}

/**
 * Test wrapper component props
 */
export interface TestWrapperProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

/**
 * Visual test utilities
 * Using a default export pattern to avoid duplicate declaration issues
 * when Playwright bundles multiple test files together
 */

// Define utilities in an object to avoid const declaration issues
const testUtils = {
  /**
   * Simple test wrapper component
   */
  TestWrapper: ({ children, className, style }: TestWrapperProps) => {
    return (
      <div
        className={className}
        style={{
          padding: '1rem',
          minHeight: '100vh',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          ...style,
        }}
      >
        {children}
      </div>
    )
  },

  /**
   * Helper function to wait/delay in tests
   */
  wait: (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms))
  },

  // Mock data factories
  createMockSeed,
  createMockSeedState,
  createMockTag,
  createMockCategory,
  createMockSeedTransaction,
  createMockSprout,
  createMockAutomation,
  createMockSeeds,
  createMockTagsWithFrequencies,
  createMockCategoryTree,
}

// Export as default to avoid duplicate const declarations
// Test files should import as: import testUtils from '../../test/visual-setup'
// Then use: testUtils.TestWrapper, testUtils.wait, etc.
export default testUtils

