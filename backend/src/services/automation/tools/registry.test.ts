// Tests for tool registry

import { describe, it, expect, beforeEach } from 'vitest'
import { ToolRegistry } from './registry'
import type { ToolDefinition } from './types'

describe('ToolRegistry', () => {
  let registry: ToolRegistry

  beforeEach(() => {
    registry = ToolRegistry.getInstance()
    registry.clear()
  })

  it('should be a singleton', () => {
    const instance1 = ToolRegistry.getInstance()
    const instance2 = ToolRegistry.getInstance()
    
    expect(instance1).toBe(instance2)
  })

  it('should register a tool', () => {
    const tool: ToolDefinition = {
      name: 'testTool',
      signature: 'testTool(string arg): string',
      description: 'A test tool',
      parameters: [
        { name: 'arg', type: 'string', required: true },
      ],
      implementation: async () => 'result',
    }

    registry.register(tool)
    
    expect(registry.has('testTool')).toBe(true)
    expect(registry.get('testTool')).toBe(tool)
  })

  it('should throw error when registering duplicate tool', () => {
    const tool: ToolDefinition = {
      name: 'testTool',
      signature: 'testTool(): void',
      description: 'A test tool',
      parameters: [],
      implementation: async () => {},
    }

    registry.register(tool)
    
    expect(() => registry.register(tool)).toThrow('Tool "testTool" is already registered')
  })

  it('should get all registered tools', () => {
    const tool1: ToolDefinition = {
      name: 'tool1',
      signature: 'tool1(): void',
      description: 'Tool 1',
      parameters: [],
      implementation: async () => {},
    }

    const tool2: ToolDefinition = {
      name: 'tool2',
      signature: 'tool2(): void',
      description: 'Tool 2',
      parameters: [],
      implementation: async () => {},
    }

    registry.register(tool1)
    registry.register(tool2)

    const all = registry.getAll()
    expect(all).toHaveLength(2)
    expect(all).toContain(tool1)
    expect(all).toContain(tool2)
  })

  it('should return undefined for non-existent tool', () => {
    expect(registry.get('nonExistent')).toBeUndefined()
    expect(registry.has('nonExistent')).toBe(false)
  })

  it('should clear all tools', () => {
    const tool: ToolDefinition = {
      name: 'testTool',
      signature: 'testTool(): void',
      description: 'A test tool',
      parameters: [],
      implementation: async () => {},
    }

    registry.register(tool)
    expect(registry.has('testTool')).toBe(true)

    registry.clear()
    expect(registry.has('testTool')).toBe(false)
    expect(registry.getAll()).toHaveLength(0)
  })
})

