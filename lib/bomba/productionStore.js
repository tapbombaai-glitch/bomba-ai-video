// lib/bomba/productionStore.js

/**
 * BOMBA AI — Production Store
 *
 * This is the central state bridge for BOMBA's production system.
 *
 * The Production Brain contains the intelligence and dependency logic.
 * The Production Store keeps the current production state available
 * to Studio, Director, Timeline, Preview, Export and future modules.
 *
 * This file does NOT call external AI, video, voice or sound APIs.
 *
 * Existing video, voice, sound and Cloudinary systems remain untouched.
 */

import {
  createProduction,
  updateStage,
  changeProductionStage,
  invalidateAffectedStages,
  getAffectedStages,
  getNextProductionStage,
  canRunStage,
  getProductionSummary,
  getProductionState,
  createDirectorDecision,
  BOMBA_STATUS,
  BOMBA_STAGES,
} from "./productionBrain";

/**
 * Current in-memory production.
 *
 * The store starts empty.
 * A production must be created with initializeProduction()
 * before other operations are used.
 */
let currentProduction = null;

/**
 * Subscribers waiting for production-state changes.
 *
 * Future UI components can subscribe to the store so that
 * StudioBoard, Director, Timeline and Preview can react
 * whenever production state changes.
 */
const subscribers = new Set();

/**
 * Notify every subscriber that production state changed.
 */
function notifySubscribers() {
  const snapshot = getProductionState(currentProduction);

  for (const subscriber of subscribers) {
    try {
      subscriber(snapshot);
    } catch (error) {
      console.error(
        "BOMBA Production Store subscriber error:",
        error
      );
    }
  }
}

/**
 * Subscribe to production-state changes.
 *
 * Returns an unsubscribe function.
 *
 * Example:
 *
 * const unsubscribe = subscribeToProduction((production) => {
 *   console.log(production);
 * });
 *
 * unsubscribe();
 */
export function subscribeToProduction(subscriber) {
  if (typeof subscriber !== "function") {
    throw new Error(
      "Production subscriber must be a function."
    );
  }

  subscribers.add(subscriber);

  /**
   * Immediately provide the current state.
   */
  subscriber(
    getProductionState(currentProduction)
  );

  return () => {
    subscribers.delete(subscriber);
  };
}

/**
 * Create a new BOMBA production.
 *
 * Example:
 *
 * initializeProduction(
 *   "Create a cinematic Nigerian short film"
 * );
 */
export function initializeProduction(initialIdea = "") {
  currentProduction =
    createProduction(initialIdea);

  notifySubscribers();

  return getProductionState(
    currentProduction
  );
}

/**
 * Replace the entire production state.
 *
 * This is mainly useful for loading an existing project
 * from storage/database in the future.
 */
export function setProduction(production) {
  if (!production) {
    throw new Error(
      "Production state is required."
    );
  }

  currentProduction =
    getProductionState(production);

  notifySubscribers();

  return getProductionState(
    currentProduction
  );
}

/**
 * Get the current production state.
 */
export function getProduction() {
  return getProductionState(
    currentProduction
  );
}

/**
 * Check whether a production has been initialized.
 */
export function hasProduction() {
  return Boolean(currentProduction);
}

/**
 * Clear the current production.
 *
 * Useful when starting a completely new project
 * or logging out later.
 */
export function clearProduction() {
  currentProduction = null;

  notifySubscribers();

  return null;
}

/**
 * Update one production stage.
 */
export function updateProductionStage(
  stage,
  update = {}
) {
  ensureProduction();

  currentProduction =
    updateStage(
      currentProduction,
      stage,
      update
    );

  notifySubscribers();

  return getProductionState(
    currentProduction
  );
}

/**
 * Replace the data for a production stage
 * and automatically invalidate dependent stages.
 *
 * Example:
 *
 * changeStage(
 *   "characters",
 *   {
 *     characters: [...]
 *   }
 * );
 */
export function changeStage(
  stage,
  data
) {
  ensureProduction();

  currentProduction =
    changeProductionStage(
      currentProduction,
      stage,
      data
    );

  notifySubscribers();

  return getProductionState(
    currentProduction
  );
}

/**
 * Mark everything affected by a stage change
 * as needing regeneration.
 */
export function invalidateStage(
  stage
) {
  ensureProduction();

  currentProduction =
    invalidateAffectedStages(
      currentProduction,
      stage
    );

  notifySubscribers();

  return getProductionState(
    currentProduction
  );
}

/**
 * Get all stages affected by a change.
 */
export function getAffected(
  stage
) {
  ensureProduction();

  return getAffectedStages(
    currentProduction,
    stage
  );
}

/**
 * Get the next production stage BOMBA can work on.
 */
export function getNextStage() {
  ensureProduction();

  return getNextProductionStage(
    currentProduction
  );
}

/**
 * Check whether a particular stage is ready to run.
 */
export function canRun(
  stage
) {
  ensureProduction();

  return canRunStage(
    currentProduction,
    stage
  );
}

/**
 * Get a compact production summary.
 */
export function getSummary() {
  return getProductionSummary(
    currentProduction
  );
}

/**
 * Get BOMBA Director's current decision.
 */
export function getDirectorDecision() {
  ensureProduction();

  return createDirectorDecision(
    currentProduction
  );
}

/**
 * Mark a stage as processing.
 */
export function startStage(
  stage
) {
  ensureProduction();

  if (!BOMBA_STAGES.includes(stage)) {
    throw new Error(
      `Unknown BOMBA production stage: ${stage}`
    );
  }

  currentProduction =
    updateStage(
      currentProduction,
      stage,
      {
        status:
          BOMBA_STATUS.PROCESSING,
        error: null,
      }
    );

  notifySubscribers();

  return getProductionState(
    currentProduction
  );
}

/**
 * Mark a stage as completed.
 */
export function completeStage(
  stage,
  data = null
) {
  ensureProduction();

  if (!BOMBA_STAGES.includes(stage)) {
    throw new Error(
      `Unknown BOMBA production stage: ${stage}`
    );
  }

  currentProduction =
    updateStage(
      currentProduction,
      stage,
      {
        status:
          BOMBA_STATUS.COMPLETED,
        data,
        error: null,
      }
    );

  notifySubscribers();

  return getProductionState(
    currentProduction
  );
}

/**
 * Mark a stage as failed.
 */
export function failStage(
  stage,
  error
) {
  ensureProduction();

  if (!BOMBA_STAGES.includes(stage)) {
    throw new Error(
      `Unknown BOMBA production stage: ${stage}`
    );
  }

  currentProduction =
    updateStage(
      currentProduction,
      stage,
      {
        status:
          BOMBA_STATUS.FAILED,
        error:
          error instanceof Error
            ? error.message
            : String(error || "Unknown error."),
      }
    );

  notifySubscribers();

  return getProductionState(
    currentProduction
  );
}

/**
 * Reset a stage so BOMBA can work on it again.
 */
export function resetStage(
  stage
) {
  ensureProduction();

  if (!BOMBA_STAGES.includes(stage)) {
    throw new Error(
      `Unknown BOMBA production stage: ${stage}`
    );
  }

  currentProduction =
    updateStage(
      currentProduction,
      stage,
      {
        status:
          BOMBA_STATUS.PENDING,
        data: null,
        error: null,
      }
    );

  notifySubscribers();

  return getProductionState(
    currentProduction
  );
}

/**
 * Export the current state as JSON.
 *
 * This will later help with:
 *
 * - project saving
 * - version history
 * - Supabase persistence
 * - project recovery
 * - importing/exporting projects
 */
export function exportProductionState() {
  ensureProduction();

  return JSON.stringify(
    currentProduction,
    null,
    2
  );
}

/**
 * Import a previously saved production state.
 */
export function importProductionState(
  json
) {
  if (!json) {
    throw new Error(
      "Production JSON is required."
    );
  }

  let parsed;

  try {
    parsed =
      typeof json === "string"
        ? JSON.parse(json)
        : json;
  } catch {
    throw new Error(
      "Invalid production JSON."
    );
  }

  setProduction(parsed);

  return getProductionState(
    currentProduction
  );
}

/**
 * Internal safety check.
 */
function ensureProduction() {
  if (!currentProduction) {
    throw new Error(
      "No BOMBA production is initialized."
    );
  }
}