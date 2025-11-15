// Tool executor - executes tool calls and handles errors

import type { ToolCall, ToolResult, ToolDefinition } from './types'
import { ToolRegistry } from './registry'

/**
 * Executes tool calls and manages tool execution
 */
export class ToolExecutor {
  private registry: ToolRegistry

  constructor(registry?: ToolRegistry) {
    this.registry = registry || ToolRegistry.getInstance()
  }

  /**
   * Execute a single tool call
   * 
   * @param toolCall - Parsed tool call to execute
   * @returns Result of tool execution
   */
  async execute(toolCall: ToolCall): Promise<ToolResult> {
    const tool = this.registry.get(toolCall.toolName)

    if (!tool) {
      return {
        success: false,
        toolName: toolCall.toolName,
        error: `Tool "${toolCall.toolName}" not found`,
      }
    }

    // Validate arguments match tool signature
    const validationError = this.validateArguments(tool, toolCall.arguments)
    if (validationError) {
      return {
        success: false,
        toolName: toolCall.toolName,
        error: validationError,
      }
    }

    try {
      // Execute the tool implementation
      const result = await tool.implementation(toolCall.arguments)

      return {
        success: true,
        toolName: toolCall.toolName,
        result,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return {
        success: false,
        toolName: toolCall.toolName,
        error: `Tool execution failed: ${errorMessage}`,
      }
    }
  }

  /**
   * Execute multiple tool calls
   * 
   * @param toolCalls - Array of tool calls to execute
   * @returns Array of execution results
   */
  async executeAll(toolCalls: ToolCall[]): Promise<ToolResult[]> {
    const results = await Promise.all(
      toolCalls.map(call => this.execute(call))
    )
    return results
  }

  /**
   * Validate that arguments match the tool's expected parameters
   * 
   * @param tool - Tool definition
   * @param args - Arguments to validate
   * @returns Error message if validation fails, undefined if valid
   */
  private validateArguments(tool: ToolDefinition, args: unknown[]): string | undefined {
    const requiredParams = tool.parameters.filter(p => p.required !== false)
    
    // Check minimum number of arguments
    if (args.length < requiredParams.length) {
      return `Expected at least ${requiredParams.length} argument(s), got ${args.length}`
    }

    // Check maximum number of arguments (all parameters)
    if (args.length > tool.parameters.length) {
      return `Expected at most ${tool.parameters.length} argument(s), got ${args.length}`
    }

    // Type checking for each argument
    for (let i = 0; i < args.length; i++) {
      const param = tool.parameters[i]
      if (!param) {
        continue // Extra arguments are allowed
      }

      const arg = args[i]
      const typeError = this.validateType(arg, param.type)
      if (typeError) {
        return `Argument ${i + 1} (${param.name}): ${typeError}`
      }
    }

    return undefined
  }

  /**
   * Validate that a value matches the expected type
   * 
   * @param value - Value to validate
   * @param expectedType - Expected type
   * @returns Error message if type doesn't match, undefined if valid
   */
  private validateType(value: unknown, expectedType: string): string | undefined {
    switch (expectedType) {
      case 'string':
        if (typeof value !== 'string') {
          return `Expected string, got ${typeof value}`
        }
        break

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return `Expected number, got ${typeof value}`
        }
        break

      case 'boolean':
        if (typeof value !== 'boolean') {
          return `Expected boolean, got ${typeof value}`
        }
        break

      case 'object':
        if (value === null || typeof value !== 'object' || Array.isArray(value)) {
          return `Expected object, got ${Array.isArray(value) ? 'array' : typeof value}`
        }
        break

      case 'array':
        if (!Array.isArray(value)) {
          return `Expected array, got ${typeof value}`
        }
        break

      default:
        // Unknown type - allow it
        break
    }

    return undefined
  }
}

