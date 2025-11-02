// Events routes for timeline management
import { Router, Request, Response } from 'express'
import { authenticate } from '../middleware/auth'
import { EventsService } from '../services/events'
import db from '../db/connection'
import { applyEvents, createBaseState } from '../utils/jsonpatch'
import type { Operation } from 'fast-json-patch'

const router = Router()

// All routes require authentication
router.use(authenticate)

/**
 * GET /api/seeds/:seedId/timeline
 * Get full timeline of events for a seed
 */
router.get('/seeds/:seedId/timeline', async (req: Request, res: Response) => {
  try {
    const { seedId } = req.params
    const userId = req.user!.id

    // Verify seed ownership
    const seed = await db('seeds')
      .where({ id: seedId, user_id: userId })
      .first()

    if (!seed) {
      return res.status(404).json({ error: 'Seed not found' })
    }

    // Get all events for the seed
    const events = await EventsService.getBySeedId(seedId)

    res.json(events)
  } catch (error) {
    console.error('Error fetching timeline:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/seeds/:seedId/state
 * Get computed current state of a seed (base + enabled events)
 */
router.get('/seeds/:seedId/state', async (req: Request, res: Response) => {
  try {
    const { seedId } = req.params
    const userId = req.user!.id

    // Verify seed ownership
    const seed = await db('seeds')
      .where({ id: seedId, user_id: userId })
      .first()

    if (!seed) {
      return res.status(404).json({ error: 'Seed not found' })
    }

    // Get enabled events
    const events = await EventsService.getEnabledBySeedId(seedId)

    // Create base state
    const baseState = createBaseState(seed.seed_content, seed.created_at)

    // Apply events to compute current state
    const currentState = applyEvents(baseState, events)

    res.json({
      seed_id: seedId,
      base_state: baseState,
      current_state: currentState,
      events_applied: events.length,
    })
  } catch (error) {
    console.error('Error computing seed state:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/seeds/:seedId/events
 * Create a new event for a seed
 */
router.post('/seeds/:seedId/events', async (req: Request, res: Response) => {
  try {
    const { seedId } = req.params
    const userId = req.user!.id
    const { event_type, patch_json, automation_id } = req.body

    // Validate input
    if (!event_type || typeof event_type !== 'string') {
      return res.status(400).json({ error: 'event_type is required and must be a string' })
    }

    if (!Array.isArray(patch_json) || patch_json.length === 0) {
      return res.status(400).json({ error: 'patch_json is required and must be a non-empty array' })
    }

    // Verify seed ownership
    const seed = await db('seeds')
      .where({ id: seedId, user_id: userId })
      .first()

    if (!seed) {
      return res.status(404).json({ error: 'Seed not found' })
    }

    // Validate patch_json structure (basic validation)
    for (const op of patch_json) {
      if (!op.op || !op.path) {
        return res.status(400).json({ error: 'Invalid patch_json: each operation must have "op" and "path" fields' })
      }
    }

    // Create event
    const event = await EventsService.create({
      seed_id: seedId,
      event_type,
      patch_json: patch_json as Operation[],
      automation_id: automation_id || null,
    })

    res.status(201).json(event)
  } catch (error) {
    console.error('Error creating event:', error)
    if (error instanceof Error && error.message.includes('not allowed')) {
      return res.status(400).json({ error: error.message })
    }
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/seeds/:seedId/events/:eventId/toggle
 * Toggle event enabled/disabled state
 */
router.post('/seeds/:seedId/events/:eventId/toggle', async (req: Request, res: Response) => {
  try {
    const { seedId, eventId } = req.params
    const userId = req.user!.id
    const { enabled } = req.body

    // Validate input
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' })
    }

    // Verify seed ownership
    const seed = await db('seeds')
      .where({ id: seedId, user_id: userId })
      .first()

    if (!seed) {
      return res.status(404).json({ error: 'Seed not found' })
    }

    // Verify event belongs to seed
    const event = await EventsService.getById(eventId)
    if (!event) {
      return res.status(404).json({ error: 'Event not found' })
    }

    if (event.seed_id !== seedId) {
      return res.status(400).json({ error: 'Event does not belong to this seed' })
    }

    // Toggle event
    const updated = await EventsService.toggle(eventId, enabled)
    if (!updated) {
      return res.status(404).json({ error: 'Event not found' })
    }

    res.json(updated)
  } catch (error) {
    console.error('Error toggling event:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/events/:eventId
 * Get a specific event by ID
 */
router.get('/events/:eventId', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params
    const userId = req.user!.id

    const event = await EventsService.getById(eventId)
    if (!event) {
      return res.status(404).json({ error: 'Event not found' })
    }

    // Verify seed ownership
    const seed = await db('seeds')
      .where({ id: event.seed_id, user_id: userId })
      .first()

    if (!seed) {
      return res.status(404).json({ error: 'Seed not found' })
    }

    res.json(event)
  } catch (error) {
    console.error('Error fetching event:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * DELETE /api/seeds/:seedId/events/:eventId
 * Delete an event (soft delete by default)
 */
router.delete('/seeds/:seedId/events/:eventId', async (req: Request, res: Response) => {
  try {
    const { seedId, eventId } = req.params
    const userId = req.user!.id
    const hardDelete = req.query.hard === 'true'

    // Verify seed ownership
    const seed = await db('seeds')
      .where({ id: seedId, user_id: userId })
      .first()

    if (!seed) {
      return res.status(404).json({ error: 'Seed not found' })
    }

    // Verify event belongs to seed
    const event = await EventsService.getById(eventId)
    if (!event) {
      return res.status(404).json({ error: 'Event not found' })
    }

    if (event.seed_id !== seedId) {
      return res.status(400).json({ error: 'Event does not belong to this seed' })
    }

    // Delete event
    const deleted = await EventsService.delete(eventId, hardDelete)

    if (!deleted) {
      return res.status(404).json({ error: 'Event not found' })
    }

    res.json({ message: 'Event deleted successfully' })
  } catch (error) {
    console.error('Error deleting event:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

