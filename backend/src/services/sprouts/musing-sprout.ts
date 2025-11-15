// Musing sprout handler - manages musing sprout operations
import db from '../../db/connection'
import { SproutsService } from '../sprouts'
import type {
  Sprout,
  MusingSproutData,
} from '../../types/sprouts'
import log from 'loglevel'

const logHandler = log.getLogger('Handler:MusingSprout')

/**
 * Get musing sprout data (state is stored directly in sprout_data)
 */
export function getMusingData(sprout: Sprout): MusingSproutData {
  if (sprout.sprout_type !== 'musing') {
    throw new Error('Sprout is not a musing type')
  }
  return sprout.sprout_data as MusingSproutData
}

/**
 * Update musing sprout data
 */
async function updateMusingData(
  sproutId: string,
  updates: Partial<MusingSproutData>
): Promise<Sprout> {
  const sprout = await SproutsService.getById(sproutId)
  if (!sprout) {
    throw new Error('Sprout not found')
  }

  if (sprout.sprout_type !== 'musing') {
    throw new Error('Sprout is not a musing type')
  }

  const currentData = sprout.sprout_data as MusingSproutData
  const updatedData: MusingSproutData = {
    ...currentData,
    ...updates,
  }

  await db('sprouts')
    .where({ id: sproutId })
    .update({
      sprout_data: db.raw('?::jsonb', [JSON.stringify(updatedData)]),
    })

  const updated = await SproutsService.getById(sproutId)
  if (!updated) {
    throw new Error('Failed to update sprout')
  }

  return updated
}

/**
 * Dismiss a musing sprout
 */
export async function dismissMusing(sproutId: string): Promise<Sprout> {
  logHandler.debug(`dismissMusing - Dismissing sprout ${sproutId}`)
  try {
    const sprout = await SproutsService.getById(sproutId)
    if (!sprout) {
      throw new Error('Sprout not found')
    }

    const currentData = getMusingData(sprout)

    if (currentData.dismissed) {
      // Already dismissed, return current sprout
      return sprout
    }

    return await updateMusingData(sproutId, {
      dismissed: true,
      dismissed_at: new Date().toISOString(),
    })
  } catch (error) {
    logHandler.error(`dismissMusing - Error dismissing sprout ${sproutId}:`, error)
    throw error
  }
}

/**
 * Complete a musing sprout
 */
export async function completeMusing(sproutId: string): Promise<Sprout> {
  logHandler.debug(`completeMusing - Completing sprout ${sproutId}`)
  try {
    const sprout = await SproutsService.getById(sproutId)
    if (!sprout) {
      throw new Error('Sprout not found')
    }

    const currentData = getMusingData(sprout)

    if (currentData.completed) {
      // Already completed, return current sprout
      return sprout
    }

    return await updateMusingData(sproutId, {
      completed: true,
      completed_at: new Date().toISOString(),
    })
  } catch (error) {
    logHandler.error(`completeMusing - Error completing sprout ${sproutId}:`, error)
    throw error
  }
}

/**
 * Create a musing sprout
 */
export async function createMusingSprout(
  seedId: string,
  templateType: 'numbered_ideas' | 'wikipedia_links' | 'markdown',
  content: MusingSproutData['content'],
  automationId: string | null = null
): Promise<Sprout> {
  logHandler.debug(`createMusingSprout - Creating musing sprout for seed ${seedId}`)
  try {
    const sproutData: MusingSproutData = {
      template_type: templateType,
      content,
      dismissed: false,
      dismissed_at: null,
      completed: false,
      completed_at: null,
    }

    const sprout = await SproutsService.create({
      seed_id: seedId,
      sprout_type: 'musing',
      sprout_data: sproutData,
      automation_id: automationId,
    })

    logHandler.info(`createMusingSprout - Created musing sprout ${sprout.id} for seed ${seedId}`)
    return sprout
  } catch (error) {
    logHandler.error(`createMusingSprout - Error creating musing sprout for seed ${seedId}:`, error)
    throw error
  }
}

