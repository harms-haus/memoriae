// Tool injection utility - generates prompts, detects calls, and manages feedback loop

import type { ToolDefinition, ToolCall, FeedbackLoopState } from './types'
import type { OpenRouterClient, OpenRouterMessage } from '../../openrouter/client'
import { parseToolCalls } from './parser'
import { ToolExecutor } from './executor'
import { getTool } from './implementations'

/**
 * Generate system prompt text describing available tools
 * 
 * @param tools - Array of tool definitions to include
 * @returns Formatted prompt text
 */
export function generateToolPrompt(tools: ToolDefinition[]): string {
  const toolDescriptions = tools.map(tool => {
    const params = tool.parameters.map(p => {
      const required = p.required !== false ? '' : ' (optional)'
      const desc = p.description ? ` - ${p.description}` : ''
      return `  - ${p.name}: ${p.type}${required}${desc}`
    }).join('\n')

    return `/**
 * ${tool.description.trim()}
 */
${tool.signature}
${params ? `Parameters:\n${params}` : ''}`
  }).join('\n\n')

  return `You have access to the following tools. To use a tool, format your call like this:

\`\`\`tool
return functionName(arg1, arg2, ...);
\`\`\`

Available tools:

${toolDescriptions}

IMPORTANT: When you are ready to provide your final response, you MUST call the finalResponse() tool with the response format requirements. After calling finalResponse(), you will receive instructions on how to format your final output.`
}

/**
 * Detect tool calls in AI response
 * 
 * @param responseText - AI response text to analyze
 * @returns Array of detected tool calls
 */
export function detectToolCalls(responseText: string): ToolCall[] {
  return parseToolCalls(responseText)
}

/**
 * Process tool calls with feedback loop
 * 
 * This function manages the entire feedback loop:
 * 1. Automatically includes finalResponse() tool (required for feedback loop)
 * 2. Sends initial prompt to AI with all available tools
 * 3. Detects and executes tool calls
 * 4. Feeds results back to AI
 * 5. Continues until finalResponse() is called
 * 6. Returns final JSON response
 * 
 * Note: The finalResponse() tool is automatically included even if not explicitly
 * passed in the tools array. This ensures the feedback loop can always terminate.
 * 
 * @param options - Configuration options
 * @param options.tools - Array of tool definitions (finalResponse is automatically added)
 * @returns Final JSON response from AI
 */
export async function processToolCalls(options: {
  systemPrompt: string
  userPrompt: string
  tools: ToolDefinition[]
  openrouter: OpenRouterClient
  maxIterations?: number
  trackingContext?: Record<string, any>
}): Promise<unknown> {
  const {
    systemPrompt,
    userPrompt,
    tools,
    openrouter,
    maxIterations = 20,
    trackingContext,
  } = options

  // Automatically include finalResponse() tool if not already present
  const finalResponseTool = getTool('finalResponse')
  const toolsWithFinalResponse: ToolDefinition[] = [...tools]
  
  if (finalResponseTool) {
    // Check if finalResponse is already in the tools array
    const hasFinalResponse = tools.some(tool => tool.name === 'finalResponse')
    if (!hasFinalResponse) {
      toolsWithFinalResponse.push(finalResponseTool)
    }
  } else {
    // Warn if finalResponse tool is not registered (should not happen in normal operation)
    console.warn('finalResponse tool is not registered. The feedback loop may not work correctly.')
  }

  // Generate tool prompt and combine with system prompt
  const toolPrompt = generateToolPrompt(toolsWithFinalResponse)
  const fullSystemPrompt = `${systemPrompt}\n\n${toolPrompt}`

  // Initialize state
  const state: FeedbackLoopState = {
    messages: [
      { role: 'system', content: fullSystemPrompt },
      { role: 'user', content: userPrompt },
    ],
    toolResults: [],
    iteration: 0,
    finalResponseCalled: false,
  }

  const executor = new ToolExecutor()

  // Main feedback loop
  while (state.iteration < maxIterations && !state.finalResponseCalled) {
    state.iteration++

    // Call OpenRouter API
    const response = await openrouter.createChatCompletion(
      state.messages,
      {
        temperature: 0.7,
        max_tokens: 4000,
      },
      trackingContext
    )

    const assistantMessage = response.choices[0]?.message
    if (!assistantMessage) {
      throw new Error('No response from OpenRouter API')
    }

    const assistantContent = assistantMessage.content || ''
    state.messages.push({
      role: 'assistant',
      content: assistantContent,
    })

    // Detect tool calls
    const toolCalls = detectToolCalls(assistantContent)

    if (toolCalls.length === 0) {
      // No tool calls - AI is providing a regular response
      // If we're past the first iteration, this might be the final response
      if (state.iteration > 1) {
        // Try to parse as JSON
        try {
          return JSON.parse(assistantContent)
        } catch {
          // Not JSON, return as-is
          return assistantContent
        }
      }
      // First iteration with no tools - continue (AI might be thinking)
      continue
    }

    // Check if finalResponse() was called
    const finalResponseCall = toolCalls.find(call => call.toolName === 'finalResponse')
    
    if (finalResponseCall) {
      // Execute finalResponse to get format requirements
      const finalResult = await executor.execute(finalResponseCall)
      
      if (finalResult.success && typeof finalResult.result === 'string') {
        state.finalResponseCalled = true
        state.responseFormat = finalResult.result

        // Send final request with format requirements
        const finalSystemPrompt = `${fullSystemPrompt}\n\nIMPORTANT: Format your final response according to these requirements:\n${state.responseFormat}\n\nReturn ONLY the final response in the specified format. Do not include any tool calls.`

        const finalMessages: OpenRouterMessage[] = [
          { role: 'system', content: finalSystemPrompt },
          { role: 'user', content: userPrompt },
          ...state.messages.slice(1), // Include conversation history
        ]

        const finalResponse = await openrouter.createChatCompletion(
          finalMessages,
          {
            temperature: 0.3, // Lower temperature for more consistent formatting
            max_tokens: 4000,
          },
          trackingContext
        )

        const finalContent = finalResponse.choices[0]?.message?.content || ''
        
        // Try to parse as JSON
        try {
          return JSON.parse(finalContent)
        } catch {
          // Not JSON, return as-is
          return finalContent
        }
      }
    }

    // Execute all tool calls (excluding finalResponse if it was called)
    const toolCallsToExecute = toolCalls.filter(call => call.toolName !== 'finalResponse')
    const results = await executor.executeAll(toolCallsToExecute)
    state.toolResults.push(...results)

    // Build response message with tool results
    if (results.length > 0) {
      const toolResultsText = results.map((result, index) => {
        const call = toolCallsToExecute[index]
        if (!call) return ''

        if (result.success) {
          const resultStr = typeof result.result === 'string' 
            ? result.result 
            : JSON.stringify(result.result, null, 2)
          return `Tool "${call.toolName}" result:\n${resultStr}`
        } else {
          return `Tool "${call.toolName}" error: ${result.error}`
        }
      }).filter(Boolean).join('\n\n')

      // Add tool results to conversation
      state.messages.push({
        role: 'user',
        content: `Tool execution results:\n\n${toolResultsText}\n\nContinue with your task. You can call more tools or call finalResponse() when ready.`,
      })
    }
  }

  // Max iterations reached
  if (state.iteration >= maxIterations) {
    throw new Error(`Maximum iterations (${maxIterations}) reached without finalResponse() being called`)
  }

  // Should not reach here, but return last message if we do
  const lastMessage = state.messages[state.messages.length - 1]
  return lastMessage?.content || ''
}

/**
 * Convenience function for automations to use tools
 * 
 * @param options - Configuration options
 * @returns Final JSON response
 */
export async function useToolsWithAI(options: {
  baseSystemPrompt: string
  userPrompt: string
  tools: ToolDefinition[]
  openrouter: OpenRouterClient
  maxIterations?: number
  trackingContext?: Record<string, any>
}): Promise<unknown> {
  return processToolCalls({
    systemPrompt: options.baseSystemPrompt,
    userPrompt: options.userPrompt,
    tools: options.tools,
    openrouter: options.openrouter,
    ...(options.maxIterations !== undefined && { maxIterations: options.maxIterations }),
    ...(options.trackingContext !== undefined && { trackingContext: options.trackingContext }),
  })
}

