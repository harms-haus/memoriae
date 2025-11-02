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
router.get('/seeds/:seedId/timeline', async (req: Request, res: Response): Promise<void> => {
  try {
    const { seedId } = req.params
    const userId = req.user!.id

    if (!seedId) {
      res.status(400).json({ error: 'Seed ID is required' })
      return
    }

    // Verify seed ownership
    const seed = await db('seeds')
      .where({ id: seedId, user_id: userId })
      .first()

    if (!seed) {
      res.status(404).json({ error: 'Seed not found' })
      return
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
router.get('/seeds/:seedId/state', async (req: Request, res: Response): Promise<void> => {
  try {
    const { seedId } = req.params
    const userId = req.user!.id

    if (!seedId) {
      res.status(400).json({ error: 'Seed ID is required' })
      return
    }

    // Verify seed ownership
    const seed = await db('seeds')
      .where({ id: seedId, user_id: userId })
      .first()

    if (!seed) {
      res.status(404).json({ error: 'Seed not found' })
      return
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
router.post('/seeds/:seedId/events', async (req: Request, res: Response): Promise<void> => {
  try {
    const { seedId } = req.params
    const userId = req.user!.id
    const { event_type, patch_json, automation_id } = req.body

    if (!seedId) {
      res.status(400).json({ error: 'Seed ID is required' })
      return
    }

    // Validate input
    if (!event_type || typeof event_type !== 'string') {
      res.status(400).json({ error: 'event_type is required and must be a string' })
      return
    }

    if (!Array.isArray(patch_json) || patch_json.length === 0) {
      res.status(400).json({ error: 'patch_json is required and must be a non-empty array' })
      return
    }

    // Verify seed ownership
    const seed = await db('seeds')
      .where({ id: seedId, user_id: userId })
      .first()

    if (!seed) {
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    // Validate patch_json structure (basic validation)
    for (const op of patch_json) {
      if (!op.op || !op.path) {
        res.status(400).json({ error: 'Invalid patch_json: each operation must have "op" and "path" fields' })
        return
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
      res.status(400).json({ error: error.message })
      return
    }
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/seeds/:seedId/events/:eventId/toggle
 * Toggle event enabled/disabled state
 */
router.post('/seeds/:seedId/events/:eventId/toggle', async (req: Request, res: Response): Promise<void> => {
  try {
    const { seedId, eventId } = req.params
    const userId = req.user!.id
    const { enabled } = req.body

    if (!seedId || !eventId) {
      res.status(400).json({ error: 'Seed ID and Event ID are required' })
      return
    }

    // Validate input
    if (typeof enabled !== 'boolean') {
      res.status(400).json({ error: 'enabled must be a boolean' })
      return
    }

    // Verify seed ownership
    const seed = await db('seeds')
      .where({ id: seedId, user_id: userId })
      .first()

    if (!seed) {
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    // Verify event belongs to seed
    const event = await EventsService.getById(eventId)
    if (!event) {
      res.status(404).json({ error: 'Event not found' })
      return
    }

    if (event.seed_id !== seedId) {
      res.status(400).json({ error: 'Event does not belong to this seed' })
      return
    }

    // Toggle event
    const updated = await EventsService.toggle(eventId, enabled)
    if (!updated) {
      res.status(404).json({ error: 'Event not found' })
      return
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
router.get('/events/:eventId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params
    const userId = req.user!.id

    if (!eventId) {
      res.status(400).json({ error: 'Event ID is required' })
      return
    }

    const event = await EventsService.getById(eventId)
    if (!event) {
      res.status(404).json({ error: 'Event not found' })
      return
    }

    // Verify seed ownership
    const seed = await db('seeds')
      .where({ id: event.seed_id, user_id: userId })
      .first()

    if (!seed) {
      res.status(404).json({ error: 'Seed not found' })
      return
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
router.delete('/seeds/:seedId/events/:eventId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { seedId, eventId } = req.params
    const userId = req.user!.id
    const hardDelete = req.query.hard === 'true'

    if (!seedId || !eventId) {
      res.status(400).json({ error: 'Seed ID and Event ID are required' })
      return
    }

    // Verify seed ownership
    const seed = await db('seeds')
      .where({ id: seedId, user_id: userId })
      .first()

    if (!seed) {
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    // Verify event belongs to seed
    const event = await EventsService.getById(eventId)
    if (!event) {
      res.status(404).json({ error: 'Event not found' })
      return
    }

    if (event.seed_id !== seedId) {
      res.status(400).json({ error: 'Event does not belong to this seed' })
      return
    }

    // Delete event
    const deleted = await EventsService.delete(eventId, hardDelete)

    if (!deleted) {
      res.status(404).json({ error: 'Event not found' })
      return
    }

    res.json({ message: 'Event deleted successfully' })
  } catch (error) {
    console.error('Error deleting event:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

