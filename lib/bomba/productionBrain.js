// lib/bomba/productionBrain.js

/**
 * BOMBA AI — Production Brain
 *
 * Central production state and dependency system.
 *
 * Production flow:
 *
 * IDEA
 * STORY
 * CHARACTERS
 * DIALOGUE
 * VOICES
 * SCENES
 * SHOTS
 * VIDEO
 * SOUND
 * TIMELINE
 * PREVIEW
 * EXPORT
 */

export const BOMBA_STAGES = [
  "idea",
  "story",
  "characters",
  "dialogue",
  "voices",
  "scenes",
  "shots",
  "video",
  "sound",
  "timeline",
  "preview",
  "export",
];

export const BOMBA_STATUS = {
  PENDING: "pending",
  READY: "ready",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
};

function createStage(
  status = BOMBA_STATUS.PENDING
) {
  return {
    status,
    data: null,
    updatedAt: null,
    error: null,
  };
}

/**
 * Create a completely new BOMBA production.
 */
export function createProduction(
  initialIdea = ""
) {
  const now = new Date().toISOString();

  const safeIdea =
    typeof initialIdea === "string"
      ? initialIdea.trim()
      : "";

  return {
    version: 1,

    project: {
      id: createProjectId(),
      title: "",
      createdAt: now,
      updatedAt: now,
    },

    idea: {
      status: safeIdea
        ? BOMBA_STATUS.READY
        : BOMBA_STATUS.PENDING,

      data: safeIdea
        ? {
            prompt: safeIdea,
          }
        : null,

      updatedAt: safeIdea
        ? now
        : null,

      error: null,
    },

    story: createStage(),
    characters: createStage(),
    dialogue: createStage(),
    voices: createStage(),
    scenes: createStage(),
    shots: createStage(),
    video: createStage(),
    sound: createStage(),
    timeline: createStage(),
    preview: createStage(),
    export: createStage(),

    /**
     * Production dependencies.
     *
     * A stage can only run when all of its
     * dependencies are READY or COMPLETED.
     */
    dependencies: {
      idea: [],

      story: [
        "idea",
      ],

      characters: [
        "story",
      ],

      dialogue: [
        "story",
        "characters",
      ],

      voices: [
        "dialogue",
        "characters",
      ],

      scenes: [
        "story",
        "characters",
        "dialogue",
      ],

      shots: [
        "scenes",
      ],

      video: [
        "shots",
        "characters",
      ],

      sound: [
        "scenes",
        "dialogue",
      ],

      timeline: [
        "video",
        "voices",
        "sound",
      ],

      preview: [
        "timeline",
      ],

      export: [
        "preview",
        "timeline",
      ],
    },

    history: [],
  };
}

/**
 * Generate a lightweight project ID.
 */
function createProjectId() {
  return `bomba-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/**
 * Update one production stage.
 */
export function updateStage(
  production,
  stage,
  update = {}
) {
  if (!production) {
    throw new Error(
      "Production state is required."
    );
  }

  if (!BOMBA_STAGES.includes(stage)) {
    throw new Error(
      `Unknown BOMBA production stage: ${stage}`
    );
  }

  const now = new Date().toISOString();

  const previousStage =
    production[stage] || createStage();

  const nextStage = {
    ...previousStage,
    ...update,
    updatedAt: now,
  };

  return {
    ...production,

    [stage]: nextStage,

    project: {
      ...(production.project || {}),
      updatedAt: now,
    },

    history: [
      ...(Array.isArray(production.history)
        ? production.history
        : []),

      {
        type: "stage_update",
        stage,
        timestamp: now,
        previousStatus:
          previousStage?.status || null,
        nextStatus:
          nextStage.status,
      },
    ],
  };
}

/**
 * Determine which stages depend directly
 * or indirectly on a changed stage.
 */
export function getAffectedStages(
  production,
  changedStage
) {
  if (!production) {
    throw new Error(
      "Production state is required."
    );
  }

  if (!BOMBA_STAGES.includes(changedStage)) {
    throw new Error(
      `Unknown BOMBA production stage: ${changedStage}`
    );
  }

  const affected = new Set();

  function collect(stage) {
    for (const candidate of BOMBA_STAGES) {
      if (affected.has(candidate)) {
        continue;
      }

      const dependencies =
        production.dependencies?.[
          candidate
        ] || [];

      if (
        dependencies.includes(stage)
      ) {
        affected.add(candidate);
        collect(candidate);
      }
    }
  }

  collect(changedStage);

  return Array.from(affected);
}

/**
 * Mark affected stages as needing regeneration.
 *
 * The changed stage itself is not reset.
 */
export function invalidateAffectedStages(
  production,
  changedStage
) {
  const affected =
    getAffectedStages(
      production,
      changedStage
    );

  let nextProduction =
    production;

  for (const stage of affected) {
    nextProduction =
      updateStage(
        nextProduction,
        stage,
        {
          status:
            BOMBA_STATUS.PENDING,
          data: null,
          error: null,
        }
      );
  }

  return nextProduction;
}

/**
 * Change data in a stage and automatically
 * invalidate dependent stages.
 */
export function changeProductionStage(
  production,
  stage,
  data
) {
  if (!production) {
    throw new Error(
      "Production state is required."
    );
  }

  let nextProduction =
    updateStage(
      production,
      stage,
      {
        status:
          BOMBA_STATUS.READY,
        data,
        error: null,
      }
    );

  nextProduction =
    invalidateAffectedStages(
      nextProduction,
      stage
    );

  return nextProduction;
}

/**
 * Get the next production stage
 * that is ready to work on.
 */
export function getNextProductionStage(
  production
) {
  if (!production) {
    throw new Error(
      "Production state is required."
    );
  }

  for (const stage of BOMBA_STAGES) {
    const current =
      production[stage];

    if (!current) {
      continue;
    }

    if (
      current.status ===
      BOMBA_STATUS.COMPLETED
    ) {
      continue;
    }

    const dependencies =
      production.dependencies?.[
        stage
      ] || [];

    const dependenciesReady =
      dependencies.every(
        (dependency) => {
          const dependencyStage =
            production[
              dependency
            ];

          return (
            dependencyStage &&
            (
              dependencyStage.status ===
                BOMBA_STATUS.READY ||
              dependencyStage.status ===
                BOMBA_STATUS.COMPLETED
            )
          );
        }
      );

    if (dependenciesReady) {
      return stage;
    }
  }

  return null;
}

/**
 * Check whether a stage can run.
 */
export function canRunStage(
  production,
  stage
) {
  if (!production) {
    return false;
  }

  if (!BOMBA_STAGES.includes(stage)) {
    return false;
  }

  const dependencies =
    production.dependencies?.[
      stage
    ] || [];

  return dependencies.every(
    (dependency) => {
      const dependencyStage =
        production[dependency];

      return (
        dependencyStage &&
        (
          dependencyStage.status ===
            BOMBA_STATUS.READY ||
          dependencyStage.status ===
            BOMBA_STATUS.COMPLETED
        )
      );
    }
  );
}

/**
 * Get a simple production summary.
 */
export function getProductionSummary(
  production
) {
  const summary = {
    completed: [],
    ready: [],
    processing: [],
    pending: [],
    failed: [],
  };

  if (!production) {
    return summary;
  }

  for (const stage of BOMBA_STAGES) {
    const status =
      production[stage]?.status;

    if (
      Object.prototype.hasOwnProperty.call(
        summary,
        status
      )
    ) {
      summary[status].push(stage);
    }
  }

  return summary;
}

/**
 * Get the complete production state.
 *
 * Returns null when no production exists.
 */
export function getProductionState(
  production
) {
  if (!production) {
    return null;
  }

  return JSON.parse(
    JSON.stringify(production)
  );
}

/**
 * Create a simple Director decision object.
 */
export function createDirectorDecision(
  production
) {
  if (!production) {
    return {
      nextStage: null,

      summary:
        getProductionSummary(
          null
        ),

      message:
        "BOMBA Director has no active production.",
    };
  }

  const nextStage =
    getNextProductionStage(
      production
    );

  return {
    nextStage,

    summary:
      getProductionSummary(
        production
      ),

    message: nextStage
      ? `BOMBA Director recommends working on ${nextStage}.`
      : "BOMBA Director has no pending stage ready to run.",
  };
}