// Built-in finalResponse tool - signals completion and provides response format

import type { ToolDefinition } from '../types'

/**
 * finalResponse tool definition
 * 
 * This is a built-in tool that the AI calls when it's ready to format the final response.
 * It accepts response format requirements and returns them so the system can instruct
 * the AI on how to format the final output.
 */
export const finalResponseTool: ToolDefinition = {
  name: 'finalResponse',
  signature: 'finalResponse(string responseFormat): string',
  description: `
    Call this tool when you are ready to format your final response.
    Provide the response format requirements (JSON schema or description) as the argument.
    After calling this, you will receive instructions on how to format your final output.
    
    Example:
    \`\`\`tool
    return finalResponse('Return a JSON object with keys: result, data');
    \`\`\`
  `,
  parameters: [
    {
      name: 'responseFormat',
      type: 'string',
      description: 'Response format requirements (JSON schema or description)',
      required: true,
    },
  ],
  implementation: async (args: unknown[]): Promise<string> => {
    const responseFormat = args[0]
    
    if (typeof responseFormat !== 'string') {
      throw new Error('responseFormat must be a string')
    }

    // Return the format requirements - this will be used to instruct the AI
    return responseFormat
  },
}

