// Tool registry - manages all registered tools

import type { ToolDefinition } from './types'

/**
 * Global registry for all available tools
 * Uses singleton pattern to ensure single instance
 */
export class ToolRegistry {
  private static instance: ToolRegistry
  private tools: Map<string, ToolDefinition> = new Map()

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry()
    }
    return ToolRegistry.instance
  }

  /**
   * Register a tool in the registry
   * 
   * @param tool - Tool definition to register
   * @throws Error if tool with same name already exists
   */
  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`)
    }
    this.tools.set(tool.name, tool)
  }

  /**
   * Get a tool by name
   * 
   * @param name - Name of the tool
   * @returns Tool definition or undefined if not found
   */
  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name)
  }

  /**
   * Get all registered tools
   * 
   * @returns Array of all tool definitions
   */
  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values())
  }

  /**
   * Check if a tool exists
   * 
   * @param name - Name of the tool
   * @returns true if tool exists, false otherwise
   */
  has(name: string): boolean {
    return this.tools.has(name)
  }

  /**
   * Clear all registered tools (useful for testing)
   */
  clear(): void {
    this.tools.clear()
  }
}

