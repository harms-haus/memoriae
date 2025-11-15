// Tool implementations - register all tools here

import { ToolRegistry } from '../registry'
import { finalResponseTool } from './finalResponse'
import { wgetTool } from './wget'

/**
 * Initialize and register all tools
 */
export function initializeTools(): void {
  const registry = ToolRegistry.getInstance()

  // Register built-in tools
  registry.register(finalResponseTool)
  registry.register(wgetTool)
}

/**
 * Get all registered tools
 */
export function getAllTools() {
  const registry = ToolRegistry.getInstance()
  return registry.getAll()
}

/**
 * Get a specific tool by name
 */
export function getTool(name: string) {
  const registry = ToolRegistry.getInstance()
  return registry.get(name)
}

// Export individual tools for selective use
export { finalResponseTool } from './finalResponse'
export { wgetTool } from './wget'

