"use client";

import { useEffect, useState } from "react";

import {
  initializeProduction,
  getProduction,
  hasProduction,
  clearProduction,
  changeStage,
  startStage,
  completeStage,
  failStage,
  resetStage,
  getAffected,
  canRun,
  getNextStage,
  getSummary,
  getDirectorDecision,
  subscribeToProduction,
  exportProductionState,
  importProductionState,
} from "../../lib/bomba/productionStore";

import {
  BOMBA_STAGES,
  BOMBA_STATUS,
} from "../../lib/bomba/productionBrain";

const TEST_IDEA =
  "A young Nigerian filmmaker returns to his village to uncover a family secret.";

function TestResult({
  number,
  name,
  passed,
  expected,
  actual,
}) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        background: passed ? "#f0fff4" : "#fff5f5",
      }}
    >
      <div
        style={{
          fontWeight: 800,
          fontSize: 17,
          marginBottom: 8,
        }}
      >
        {passed ? "✅" : "❌"} Test {number}: {name}
      </div>

      <div style={{ fontSize: 14, marginBottom: 4 }}>
        <strong>Expected:</strong> {String(expected)}
      </div>

      <div style={{ fontSize: 14 }}>
        <strong>Actual:</strong> {String(actual)}
      </div>
    </div>
  );
}

export default function VerifyProductionStorePage() {
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    runVerification();
  }, []);

  function runVerification() {
    setRunning(true);

    const tests = [];

    function test(name, expected, actual) {
      const passed =
        JSON.stringify(expected) ===
        JSON.stringify(actual);

      tests.push({
        number: tests.length + 1,
        name,
        passed,
        expected,
        actual,
      });

      return passed;
    }

    function expectError(name, callback) {
      let passed = false;
      let actual = "No error";

      try {
        callback();
      } catch (error) {
        passed = true;
        actual =
          error instanceof Error
            ? error.message
            : String(error);
      }

      tests.push({
        number: tests.length + 1,
        name,
        passed,
        expected: "Error",
        actual,
      });

      return passed;
    }

    /*
     * Start clean.
     */
    try {
      clearProduction();
    } catch {
      // Safe cleanup only.
    }

    /*
     * TEST 1
     * Production starts empty.
     */
    test(
      "Production starts empty",
      false,
      hasProduction()
    );

    /*
     * TEST 2
     * Initialize production with an idea.
     */
    const initial = initializeProduction(
      TEST_IDEA
    );

    test(
      "Production initializes",
      true,
      hasProduction()
    );

    /*
     * TEST 3
     * Idea is preserved.
     */
    test(
      "Initial idea is preserved",
      TEST_IDEA,
      initial?.idea?.data?.prompt
    );

    /*
     * TEST 4
     * Initial idea should be READY.
     */
    test(
      "Initial idea status is READY",
      BOMBA_STATUS.READY,
      initial?.idea?.status
    );

    /*
     * TEST 5
     * Story should be runnable.
     */
    test(
      "Story can run after idea is ready",
      true,
      canRun("story")
    );

    /*
     * TEST 6
     * Story should be the next stage.
     */
    test(
      "Next stage is story",
      "story",
      getNextStage()
    );

    /*
     * TEST 7
     * Story data can be stored.
     */
    const storyData = {
      title: "The Return",
      genre: "Drama",
      setting: "Modern Nigeria",
      scenes: 5,
    };

    changeStage(
      "story",
      storyData
    );

    let production = getProduction();

    test(
      "Story becomes READY",
      BOMBA_STATUS.READY,
      production?.story?.status
    );

    /*
     * TEST 8
     * Story data is preserved.
     */
    test(
      "Story data is preserved",
      storyData,
      production?.story?.data
    );

    /*
     * TEST 9
     * Characters should now be runnable.
     */
    test(
      "Characters can run after story is ready",
      true,
      canRun("characters")
    );

    /*
     * TEST 10
     * Dialogue should NOT run until characters exist.
     */
    test(
      "Dialogue waits for characters",
      false,
      canRun("dialogue")
    );

    /*
     * TEST 11
     * Complete characters.
     */
    completeStage(
      "characters",
      [
        {
          id: "character-1",
          name: "Amaka",
          role: "Main Character",
        },
      ]
    );

    production = getProduction();

    test(
      "Characters become COMPLETED",
      BOMBA_STATUS.COMPLETED,
      production?.characters?.status
    );

    /*
     * TEST 12
     * Dialogue should now be runnable.
     */
    test(
      "Dialogue can run after story and characters",
      true,
      canRun("dialogue")
    );

    /*
     * TEST 13
     * Dialogue data can be stored.
     */
    const dialogueData = {
      language: "pcm",
      lines: [
        {
          speaker: "Amaka",
          text: "I have finally returned home.",
        },
      ],
    };

    changeStage(
      "dialogue",
      dialogueData
    );

    production = getProduction();

    test(
      "Dialogue data is preserved",
      dialogueData,
      production?.dialogue?.data
    );

    /*
     * TEST 14
     * Voices need dialogue + characters.
     */
    test(
      "Voices can run after dialogue and characters",
      true,
      canRun("voices")
    );

    /*
     * TEST 15
     * Scenes need story + characters + dialogue.
     */
    test(
      "Scenes can run after story, characters and dialogue",
      true,
      canRun("scenes")
    );

    /*
     * TEST 16
     * Shots must wait for scenes.
     */
    test(
      "Shots wait for scenes",
      false,
      canRun("shots")
    );

    /*
     * TEST 17
     * Complete scenes.
     */
    completeStage(
      "scenes",
      [
        {
          id: "scene-1",
          description:
            "Amaka returns to her village.",
          background: {
            imageId: "village-warm",
            localPath:
              "/backgrounds/village-warm.jpg",
          },
        },
      ]
    );

    production = getProduction();

    /*
     * TEST 18
     * Shots can now run.
     */
    test(
      "Shots can run after scenes",
      true,
      canRun("shots")
    );

    /*
     * TEST 19
     * Video still needs shots + characters.
     */
    test(
      "Video waits for shots",
      false,
      canRun("video")
    );

    /*
     * TEST 20
     * Complete shots.
     */
    completeStage(
      "shots",
      [
        {
          id: "shot-1",
          sceneId: "scene-1",
          duration: 5,
        },
      ]
    );

    production = getProduction();

    /*
     * TEST 21
     * Video can now run.
     */
    test(
      "Video can run after shots and characters",
      true,
      canRun("video")
    );

    /*
     * TEST 22
     * Timeline must wait for video + voices + sound.
     */
    test(
      "Timeline waits for video, voices and sound",
      false,
      canRun("timeline")
    );

    /*
     * TEST 23
     * Affected stages from changing story.
     */
    const affectedByStory =
      getAffected("story");

    const expectedStoryAffected = [
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

    test(
      "Story change affects all downstream stages",
      expectedStoryAffected,
      affectedByStory
    );

    /*
     * TEST 24
     * Changing story invalidates downstream work.
     */
    changeStage(
      "story",
      {
        title: "The Return — Revised",
      }
    );

    production = getProduction();

    const downstreamStatuses = [
      production.characters.status,
      production.dialogue.status,
      production.voices.status,
      production.scenes.status,
      production.shots.status,
      production.video.status,
      production.sound.status,
      production.timeline.status,
      production.preview.status,
      production.export.status,
    ];

    test(
      "Changing story resets downstream stages",
      Array(10).fill(BOMBA_STATUS.PENDING),
      downstreamStatuses
    );

    /*
     * TEST 25
     * Start a stage.
     */
    startStage("story");

    production = getProduction();

    test(
      "startStage sets PROCESSING",
      BOMBA_STATUS.PROCESSING,
      production.story.status
    );

    /*
     * TEST 26
     * Complete a stage.
     */
    completeStage(
      "story",
      {
        title: "Completed Story",
      }
    );

    production = getProduction();

    test(
      "completeStage sets COMPLETED",
      BOMBA_STATUS.COMPLETED,
      production.story.status
    );

    /*
     * TEST 27
     * Failed stage stores error.
     */
    failStage(
      "characters",
      new Error(
        "Character generation test failure"
      )
    );

    production = getProduction();

    test(
      "failStage sets FAILED",
      BOMBA_STATUS.FAILED,
      production.characters.status
    );

    test(
      "failStage stores error message",
      "Character generation test failure",
      production.characters.error
    );

    /*
     * TEST 28
     * Reset failed stage.
     */
    resetStage("characters");

    production = getProduction();

    test(
      "resetStage returns stage to PENDING",
      BOMBA_STATUS.PENDING,
      production.characters.status
    );

    test(
      "resetStage clears stage data",
      null,
      production.characters.data
    );

    /*
     * TEST 29
     * Summary contains the correct status.
     */
    const summary = getSummary();

    test(
      "Production summary contains story as COMPLETED",
      true,
      summary.completed.includes("story")
    );

    /*
     * TEST 30
     * Director returns a decision.
     */
    const director =
      getDirectorDecision();

    test(
      "Director decision exists",
      true,
      Boolean(director)
    );

    /*
     * TEST 31
     * Director exposes nextStage.
     */
    test(
      "Director decision has nextStage",
      true,
      Object.prototype.hasOwnProperty.call(
        director,
        "nextStage"
      )
    );

    /*
     * TEST 32
     * Subscriber receives updates.
     */
    let subscriberCalls = 0;

    const unsubscribe =
      subscribeToProduction(() => {
        subscriberCalls += 1;
      });

    changeStage(
      "characters",
      {
        characters: [
          {
            name: "Amaka",
          },
        ],
      }
    );

    test(
      "Subscriber receives production updates",
      true,
      subscriberCalls >= 2
    );

    const callsBeforeUnsubscribe =
      subscriberCalls;

    unsubscribe();

    changeStage(
      "characters",
      {
        characters: [
          {
            name: "Amaka Updated",
          },
        ],
      }
    );

    test(
      "Unsubscribe stops future notifications",
      callsBeforeUnsubscribe,
      subscriberCalls
    );

    /*
     * TEST 33
     * Export production state.
     */
    const exported =
      exportProductionState();

    test(
      "Production exports as JSON",
      true,
      typeof exported === "string" &&
        exported.length > 0
    );

    /*
     * TEST 34
     * Exported JSON is valid.
     */
    let parsedExport = null;

    try {
      parsedExport =
        JSON.parse(exported);
    } catch {
      parsedExport = null;
    }

    test(
      "Exported production JSON is valid",
      true,
      Boolean(parsedExport)
    );

    /*
     * TEST 35
     * Import exported production.
     */
    clearProduction();

    importProductionState(
      exported
    );

    production = getProduction();

    test(
      "Imported production is restored",
      true,
      hasProduction()
    );

    /*
     * TEST 36
     * Imported production keeps project data.
     */
    test(
      "Imported project ID is preserved",
      parsedExport?.project?.id,
      production?.project?.id
    );

    /*
     * TEST 37
     * Invalid JSON is rejected.
     */
    expectError(
      "Invalid production JSON is rejected",
      () => {
        importProductionState(
          "{ this is not valid JSON"
        );
      }
    );

    /*
     * TEST 38
     * Invalid stage is rejected.
     */
    expectError(
      "Invalid stage is rejected",
      () => {
        startStage(
          "not-a-real-stage"
        );
      }
    );

    /*
     * TEST 39
     * Unknown stage cannot be completed.
     */
    expectError(
      "Unknown stage cannot be completed",
      () => {
        completeStage(
          "fake-stage",
          {}
        );
      }
    );

    /*
     * TEST 40
     * Clearing production works.
     */
    clearProduction();

    test(
      "clearProduction removes active production",
      false,
      hasProduction()
    );

    /*
     * TEST 41
     * Protected operations reject missing production.
     */
    expectError(
      "Operations require initialized production",
      () => {
        getNextStage();
      }
    );

    /*
     * Final result.
     */
    setResults(tests);
    setRunning(false);
  }

  const passed =
    results.filter(
      (result) => result.passed
    ).length;

  const failed =
    results.filter(
      (result) => !result.passed
    ).length;

  const allPassed =
    results.length > 0 &&
    failed === 0;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f6f7f9",
        padding: "32px 16px",
        fontFamily:
          "Arial, sans-serif",
        color: "#111",
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            fontSize: 30,
            marginBottom: 8,
          }}
        >
          BOMBA AI — Production Store Verification
        </h1>

        <p
          style={{
            color: "#555",
            marginBottom: 24,
          }}
        >
          Read-only test. No video generation. No
          Eternal AI. No Cloudinary. No FFmpeg. No
          credits.
        </p>

        {running ? (
          <div
            style={{
              padding: 20,
              borderRadius: 12,
              background: "#fff",
              border: "1px solid #ddd",
              marginBottom: 24,
            }}
          >
            🧪 Running production verification...
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 12,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #ddd",
                  borderRadius: 12,
                  padding: 18,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    color: "#666",
                  }}
                >
                  Passed
                </div>

                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                  }}
                >
                  {passed} / {results.length}
                </div>
              </div>

              <div
                style={{
                  background: "#fff",
                  border: "1px solid #ddd",
                  borderRadius: 12,
                  padding: 18,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    color: "#666",
                  }}
                >
                  Failed
                </div>

                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                  }}
                >
                  {failed} / {results.length}
                </div>
              </div>
            </div>

            {results.map(
              (result) => (
                <TestResult
                  key={result.number}
                  {...result}
                />
              )
            )}

            <div
              style={{
                marginTop: 28,
                padding: 22,
                borderRadius: 14,
                background: allPassed
                  ? "#dff7e6"
                  : "#ffe1e1",
                border: `2px solid ${
                  allPassed
                    ? "#27ae60"
                    : "#e74c3c"
                }`,
                fontWeight: 800,
                fontSize: 18,
                textAlign: "center",
              }}
            >
              {allPassed
                ? "🔒 ALL PRODUCTION STORE TESTS PASSED — SAFE TO PROCEED"
                : "🛑 CHECK FAILED — DO NOT GENERATE VIDEO"}
            </div>

            <div
              style={{
                marginTop: 24,
                padding: 18,
                background: "#fff",
                borderRadius: 12,
                border: "1px solid #ddd",
              }}
            >
              <strong>Stages tested:</strong>

              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {BOMBA_STAGES.map(
                  (stage) => (
                    <span
                      key={stage}
                      style={{
                        padding:
                          "6px 10px",
                        borderRadius: 999,
                        background:
                          "#f0f0f0",
                        fontSize: 13,
                      }}
                    >
                      {stage}
                    </span>
                  )
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}