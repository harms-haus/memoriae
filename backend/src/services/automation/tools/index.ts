// Tool injection system - main exports

// Types
export type {
  ToolDefinition,
  ToolParameter,
  ToolImplementation,
  ToolCall,
  ToolResult,
  FeedbackLoopState,
} from './types'

// Registry
export { ToolRegistry } from './registry'

// Executor
export { ToolExecutor } from './executor'

// Parser
export { parseToolCalls } from './parser'

// Injector functions
export {
  generateToolPrompt,
  detectToolCalls,
  processToolCalls,
  useToolsWithAI,
} from './injector'

// Tool implementations
export {
  finalResponseTool,
  wgetTool,
  initializeTools,
  getAllTools,
  getTool,
} from './implementations'

