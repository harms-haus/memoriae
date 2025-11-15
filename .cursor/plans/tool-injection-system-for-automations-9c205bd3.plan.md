<!-- 9c205bd3-3782-49f3-91c0-9537ce69465a 898bbd43-734b-482d-9327-e4fecb40716c -->
# Tool Injection System for Automations

## Overview

Create a utility system that allows automations to inject "tools" (TypeScript-like function APIs) into system prompts for AI models. The system will:

1. Define tools with TypeScript signatures and JSDoc comments
2. Generate system prompt snippets describing available tools
3. Detect tool calls in AI responses (format: ````tool\nreturn functionName(args);\n````)
4. Execute tool implementations
5. Feed results back to AI in a structured feedback loop
6. Return final JSON response for automation parsing

## Architecture

### Core Components

1. **Tool Definition System** (`backend/src/services/automation/tools/`)

   - `ToolDefinition` interface: TypeScript signature + JSDoc + implementation examples (minimum 3)
   - `ToolRegistry`: Global registry of available tools
   - `ToolExecutor`: Executes tool calls and handles errors

2. **Tool Injection Utility** (`backend/src/services/automation/tools/injector.ts`)

   - `generateToolPrompt()`: Converts tool definitions to system prompt text
   - `detectToolCalls()`: Parses AI responses for tool call blocks
   - `executeToolCall()`: Executes a single tool call
   - `processToolCalls()`: Handles multiple tool calls with feedback loop

3. **Tool Implementations** (`backend/src/services/automation/tools/implementations/`)

   - `wget.ts`: HTTP download tool (example implementation)
   - Future tools can be added here

4. **Integration with Automations**

   - Extend `AutomationContext` to include tool executor
   - Helper method for automations to use tools in their prompts

## Implementation Details

### Tool Definition Format

```typescript
interface ToolDefinition {
  name: string
  signature: string  // e.g., "wget(string uri, number timeoutMs): string"
  description: string // JSDoc comment
  parameters: ToolParameter[]
  implementation: ToolImplementation
}

interface ToolParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description?: string
  required?: boolean
}
```

### Tool Call Detection

Detect tool calls in AI responses using regex pattern:

- Format: ````tool\nreturn functionName(args);\n````
- Extract function name and arguments
- Parse arguments (support string, number, boolean, object, array literals)

### Feedback Loop with `finalResponse()` Tool

The system maintains a feedback loop where the AI can use tools iteratively. The **system prompt remains unchanged** throughout the loop:

1. **Initial Request**: Send system prompt (with tool definitions including built-in `finalResponse()`) + user prompt to AI

2. **Tool Call Detection**: Parse AI response for tool calls (format: ````tool\nreturn functionName(args);\n````)

3. **Tool Execution**: 

   - If `finalResponse()` is NOT called: Execute all detected tool calls and continue loop
   - If `finalResponse()` IS called: Execute it to get response format requirements

4. **Continue Loop** (when `finalResponse()` not called):

   - Send back to AI with **same system prompt** (unchanged):
     - Original user prompt
     - AI's previous response (with tool calls)
     - Tool execution results
   - AI can make more tool calls or call `finalResponse()`

5. **Final Response** (when `finalResponse()` is called):

   - Execute `finalResponse()` which returns the response format requirements (JSON schema/description)
   - Send to AI with **same system prompt** + response format requirements + full conversation history
   - AI formats final output according to the provided format requirements
   - Return final JSON response for automation parsing

The loop continues until `finalResponse()` is called, allowing the AI to use multiple tools in sequence. The prompt structure stays consistent - only the response format requirements are added when `finalResponse()` is invoked.

### Error Handling

- Tool execution errors: Return error message to AI for retry
- Invalid tool calls: Log and skip, continue with other calls
- Timeout handling: Built into individual tools (e.g., wget timeout)

## File Structure

```
backend/src/services/automation/tools/
├── index.ts                    # Exports
├── types.ts                    # ToolDefinition, ToolParameter, etc.
├── registry.ts                 # ToolRegistry class
├── executor.ts                 # ToolExecutor class
├── injector.ts                 # Prompt generation and tool call detection
├── parser.ts                   # Parse tool call syntax
└── implementations/
    ├── index.ts                # Register all tools
    └── wget.ts                 # wget tool implementation
```

## Tool: wget

**Signature**: `wget(string uri, number timeoutMs): string`

**Description**: Downloads content from a URI with timeout. Returns the content as a string.

**Implementation**:

- Use `axios` with timeout
- Handle HTTP errors gracefully
- Return error message as string if fails
- Support GET requests only (for security)

## Integration Points

1. **AutomationContext Extension**

   - Add `toolExecutor: ToolExecutor` to context
   - Initialize in `processAutomationJob()` in `processor.ts`

2. **Automation Usage Pattern**
   ```typescript
   const tools = [wgetTool]
   const toolPrompt = generateToolPrompt(tools)
   const systemPrompt = `${basePrompt}\n\n${toolPrompt}`
   
   // After AI response, detect and execute tools
   const result = await processToolCalls(aiResponse, tools, context.toolExecutor)
   ```


## Testing Strategy

1. Unit tests for:

   - Tool call detection/parsing
   - Tool execution
   - Error handling
   - Prompt generation

2. Integration tests:

   - Full feedback loop with mock AI
   - wget tool with mock HTTP server

## Security Considerations

- Tool implementations should validate inputs
- Timeout limits on all tools
- No arbitrary code execution (only registered tools)
- Input sanitization for tool arguments

## Implementation Todos

- [ ] 1. **Core Type Definitions** (`types.ts`)

  - [ ] Define `ToolDefinition` interface with name, signature, description, parameters, implementation
  - [ ] Define `ToolParameter` interface with name, type, description, required
  - [ ] Define `ToolImplementation` function type
  - [ ] Define `ToolCall` interface for parsed tool calls
  - [ ] Define `ToolResult` interface for tool execution results
  - [ ] Define `FeedbackLoopState` interface to track conversation history

- [ ] 2. **Tool Registry** (`registry.ts`)

  - [ ] Create `ToolRegistry` class (singleton pattern)
  - [ ] Implement `register()` method to add tools
  - [ ] Implement `get()` method to retrieve tool by name
  - [ ] Implement `getAll()` method to get all registered tools
  - [ ] Implement `has()` method to check if tool exists
  - [ ] Add built-in `finalResponse()` tool registration

- [ ] 3. **Tool Call Parser** (`parser.ts`)

  - [ ] Implement `parseToolCall()` function to extract tool calls from text
  - [ ] Use regex to match ````tool\nreturn functionName(args);\n```` pattern
  - [ ] Parse function name from call
  - [ ] Parse arguments (support string, number, boolean, object, array literals)
  - [ ] Handle multiple tool calls in single response
  - [ ] Return array of `ToolCall` objects

- [ ] 4. **Tool Executor** (`executor.ts`)

  - [ ] Create `ToolExecutor` class
  - [ ] Implement `execute()` method to run a tool call
  - [ ] Implement `executeAll()` method for multiple tool calls
  - [ ] Add error handling with try/catch
  - [ ] Return `ToolResult` with success/error status
  - [ ] Validate tool exists before execution
  - [ ] Validate arguments match tool signature

- [ ] 5. **Built-in finalResponse Tool** (`implementations/finalResponse.ts`)

  - [ ] Create `finalResponse` tool definition
  - [ ] Implement handler that accepts response format requirements
  - [ ] Return format requirements as string/JSON schema
  - [ ] Register in tool registry

- [ ] 6. **wget Tool Implementation** (`implementations/wget.ts`)

  - [ ] Create `wget` tool definition with signature and description
  - [ ] Implement handler using `axios` with timeout
  - [ ] Add input validation (URI format, timeout range)
  - [ ] Handle HTTP errors gracefully
  - [ ] Support GET requests only
  - [ ] Return content as string or error message
  - [ ] Register in tool registry

- [ ] 7. **Tool Prompt Generator** (`injector.ts` - `generateToolPrompt()`)

  - [ ] Create function to convert tool definitions to prompt text
  - [ ] Format TypeScript signatures with JSDoc comments
  - [ ] Include parameter descriptions
  - [ ] Add instructions on how to call tools (format: ````tool\nreturn functionName(args);\n````)
  - [ ] Include `finalResponse()` tool in generated prompt
  - [ ] Keep prompt concise and token-efficient

- [ ] 8. **Tool Call Detection** (`injector.ts` - `detectToolCalls()`)

  - [ ] Create function to detect tool calls in AI response
  - [ ] Use parser to extract tool calls
  - [ ] Return array of detected tool calls
  - [ ] Handle edge cases (malformed calls, missing tools)

- [ ] 9. **Feedback Loop Processor** (`injector.ts` - `processToolCalls()`)

  - [ ] Create main function to handle feedback loop
  - [ ] Accept initial system prompt, user prompt, tools, and OpenRouter client
  - [ ] Implement loop that continues until `finalResponse()` is called
  - [ ] On each iteration: detect tool calls, execute tools, send results back to AI
  - [ ] When `finalResponse()` is called: get format requirements, send to AI, return final JSON
  - [ ] Maintain conversation history throughout loop
  - [ ] Add max iteration limit to prevent infinite loops
  - [ ] Return final JSON response

- [ ] 10. **Tool Registry Initialization** (`implementations/index.ts`)

  - [ ] Import all tool implementations
  - [ ] Register all tools in ToolRegistry
  - [ ] Export tool registry instance
  - [ ] Export individual tools for selective use

- [ ] 11. **Integration with AutomationContext** (`base.ts`)

  - [ ] Add `toolExecutor: ToolExecutor` to `AutomationContext` interface
  - [ ] Initialize ToolExecutor in `processAutomationJob()` in `processor.ts`
  - [ ] Pass toolExecutor to automation context

- [ ] 12. **Helper Function for Automations** (`injector.ts` - `useToolsWithAI()`)

  - [ ] Create convenience function for automations to use tools
  - [ ] Accept base system prompt, user prompt, tools array, and OpenRouter client
  - [ ] Handle full feedback loop internally
  - [ ] Return final JSON response
  - [ ] Simplify automation integration

- [ ] 13. **Unit Tests** (`*.test.ts` files)

  - [ ] Test tool call parsing with various formats
  - [ ] Test tool execution with valid/invalid calls
  - [ ] Test error handling (missing tools, invalid args, execution errors)
  - [ ] Test prompt generation format
  - [ ] Test feedback loop with mock AI responses
  - [ ] Test `finalResponse()` tool behavior
  - [ ] Test wget tool with mock HTTP server

- [ ] 14. **Integration Tests**

  - [ ] Test full feedback loop with real OpenRouter API (if possible)
  - [ ] Test multiple tool calls in sequence
  - [ ] Test error recovery in feedback loop
  - [ ] Test max iteration limit

- [ ] 15. **Export Module** (`index.ts`)

  - [ ] Export all public types and interfaces
  - [ ] Export ToolRegistry instance
  - [ ] Export ToolExecutor class
  - [ ] Export injector functions
  - [ ] Export tool implementations
  - [ ] Export helper functions