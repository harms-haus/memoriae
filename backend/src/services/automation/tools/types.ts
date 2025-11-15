// Type definitions for the tool injection system

/**
 * Parameter definition for a tool
 */
export interface ToolParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description?: string
  required?: boolean
}

/**
 * Implementation function for a tool
 * Accepts parsed arguments and returns a result
 */
export type ToolImplementation = (args: unknown[]) => Promise<unknown> | unknown

/**
 * Definition of a tool that can be injected into AI prompts
 */
export interface ToolDefinition {
  /**
   * Unique name of the tool (function name)
   */
  name: string

  /**
   * TypeScript-like signature string
   * Example: "wget(string uri, number timeoutMs): string"
   */
  signature: string

  /**
   * JSDoc-style description of what the tool does
   */
  description: string

  /**
   * Array of parameter definitions
   */
  parameters: ToolParameter[]

  /**
   * Implementation function that executes the tool
   */
  implementation: ToolImplementation
}

/**
 * Parsed tool call from AI response
 */
export interface ToolCall {
  /**
   * Name of the tool being called
   */
  toolName: string

  /**
   * Parsed arguments as an array
   */
  arguments: unknown[]

  /**
   * Raw text of the tool call
   */
  rawText: string
}

/**
 * Result of executing a tool
 */
export interface ToolResult {
  /**
   * Whether the tool execution was successful
   */
  success: boolean

  /**
   * Result value if successful
   */
  result?: unknown

  /**
   * Error message if failed
   */
  error?: string

  /**
   * Name of the tool that was executed
   */
  toolName: string
}

/**
 * State maintained during the feedback loop
 */
export interface FeedbackLoopState {
  /**
   * Conversation history (messages sent to and received from AI)
   */
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }>

  /**
   * Tool execution results from each iteration
   */
  toolResults: ToolResult[]

  /**
   * Number of iterations completed
   */
  iteration: number

  /**
   * Whether finalResponse() has been called
   */
  finalResponseCalled: boolean

  /**
   * Response format requirements (set when finalResponse() is called)
   */
  responseFormat?: string
}

