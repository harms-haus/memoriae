// Sprout type handler registry
import type { SproutType } from '../../types/sprouts'
import * as followupHandler from './followup-sprout'
import * as musingHandler from './musing-sprout'

export interface SproutHandler {
  // Each handler can have type-specific methods
  // The registry provides a way to get the right handler
}

/**
 * Get handler for a sprout type
 * Returns the appropriate handler module based on sprout type
 */
export function getHandler(sproutType: SproutType): typeof followupHandler | typeof musingHandler {
  switch (sproutType) {
    case 'followup':
      return followupHandler
    case 'musing':
      return musingHandler
    case 'extra_context':
      // Placeholder for future implementation
      throw new Error('Extra context sprout handler not yet implemented')
    case 'fact_check':
      // Placeholder for future implementation
      throw new Error('Fact check sprout handler not yet implemented')
    default:
      throw new Error(`Unknown sprout type: ${sproutType}`)
  }
}

