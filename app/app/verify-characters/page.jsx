"use client";

import { useEffect, useState } from "react";
import { createMasterCharacters } from "../../lib/bomba/characterBuilder";

export default function VerifyCharactersPage() {
  const [results, setResults] = useState([]);
  const [characters, setCharacters] = useState([]);

  useEffect(() => {
    const tests = [];
    let generated = [];

    const pass = (name, detail = "") => {
      tests.push({
        name,
        status: "PASS",
        detail,
      });
    };

    const fail = (name, detail = "") => {
      tests.push({
        name,
        status: "FAIL",
        detail,
      });
    };

    try {
      /* =====================================================
         1. CREATE CHARACTERS
      ===================================================== */

      generated = createMasterCharacters();

      if (Array.isArray(generated)) {
        pass(
          "Characters are created",
          `Builder returned an array with ${generated.length} characters.`
        );
      } else {
        fail(
          "Characters are created",
          "Builder did not return an array."
        );
      }

      setCharacters(generated);

      /* =====================================================
         2. EXACTLY 3 CHARACTERS
      ===================================================== */

      if (generated.length === 3) {
        pass("Exactly 3 characters exist");
      } else {
        fail(
          "Exactly 3 characters exist",
          `Expected 3, received ${generated.length}.`
        );
      }

      /* =====================================================
         3. REQUIRED CHARACTER FIELDS
      ===================================================== */

      generated.forEach((character, index) => {
        const label = character.name || `Character ${index + 1}`;

        if (character.id) {
          pass(`${label} has an ID`);
        } else {
          fail(`${label} has an ID`);
        }

        if (character.name) {
          pass(`${label} has a name`);
        } else {
          fail(`${label} has a name`);
        }

        if (character.role) {
          pass(`${label} has a role`);
        } else {
          fail(`${label} has a role`);
        }

        if (character.gender) {
          pass(`${label} has gender metadata`);
        } else {
          fail(`${label} has gender metadata`);
        }

        if (character.voiceId) {
          pass(`${label} has a voice ID`);
        } else {
          fail(`${label} has a voice ID`);
        }

        if (character.voiceName) {
          pass(`${label} has a voice name`);
        } else {
          fail(`${label} has a voice name`);
        }

        if (character.voiceGender) {
          pass(`${label} has voice gender metadata`);
        } else {
          fail(`${label} has voice gender metadata`);
        }

        if (character.voiceStatus === "ready") {
          pass(`${label} voice status is ready`);
        } else {
          fail(
            `${label} voice status is ready`,
            `Received "${character.voiceStatus}".`
          );
        }
      });

      /* =====================================================
         4. UNIQUE CHARACTER IDS
      ===================================================== */

      const ids = generated.map((character) => character.id);
      const uniqueIds = new Set(ids);

      if (uniqueIds.size === ids.length) {
        pass("Character IDs are unique");
      } else {
        fail("Character IDs are unique");
      }

      /* =====================================================
         5. UNIQUE VOICE IDS
      ===================================================== */

      const voiceIds = generated.map((character) => character.voiceId);
      const uniqueVoiceIds = new Set(voiceIds);

      if (uniqueVoiceIds.size === voiceIds.length) {
        pass("Character voice IDs are unique");
      } else {
        fail(
          "Character voice IDs are unique",
          "Two or more characters share the same voice ID."
        );
      }

      /* =====================================================
         6. EXPECTED MASTER CHARACTERS
      ===================================================== */

      const expectedIds = [
        "character-main",
        "character-friend",
        "character-rival",
      ];

      const allExpectedCharactersExist = expectedIds.every((id) =>
        generated.some((character) => character.id === id)
      );

      if (allExpectedCharactersExist) {
        pass("Expected Master Characters exist");
      } else {
        fail(
          "Expected Master Characters exist",
          "One or more expected character IDs are missing."
        );
      }

      /* =====================================================
         7. VOICE ASSIGNMENTS
      ===================================================== */

      const main = generated.find(
        (character) => character.id === "character-main"
      );

      const friend = generated.find(
        (character) => character.id === "character-friend"
      );

      const rival = generated.find(
        (character) => character.id === "character-rival"
      );

      if (main?.voiceId === "ada_pcm") {
        pass("Main Character voice assignment is correct");
      } else {
        fail(
          "Main Character voice assignment is correct",
          `Expected ada_pcm, received ${main?.voiceId || "missing"}.`
        );
      }

      if (friend?.voiceId === "blessing_pcm") {
        pass("Friend voice assignment is correct");
      } else {
        fail(
          "Friend voice assignment is correct",
          `Expected blessing_pcm, received ${friend?.voiceId || "missing"}.`
        );
      }

      if (rival?.voiceId === "ifeanyi_ig") {
        pass("Rival voice assignment is correct");
      } else {
        fail(
          "Rival voice assignment is correct",
          `Expected ifeanyi_ig, received ${rival?.voiceId || "missing"}.`
        );
      }

      /* =====================================================
         8. CHARACTER OBJECTS ARE VALID
      ===================================================== */

      const allObjects = generated.every(
        (character) =>
          character &&
          typeof character === "object" &&
          !Array.isArray(character)
      );

      if (allObjects) {
        pass("All character records are valid objects");
      } else {
        fail("All character records are valid objects");
      }

      /* =====================================================
         FINAL RESULT
      ===================================================== */

      setResults(tests);
    } catch (error) {
      setResults([
        {
          name: "Character Builder execution",
          status: "FAIL",
          detail: error?.message || "Unknown error",
        },
      ]);
    }
  }, []);

  const passed = results.filter(
    (result) => result.status === "PASS"
  ).length;

  const failed = results.filter(
    (result) => result.status === "FAIL"
  ).length;

  const allPassed = results.length > 0 && failed === 0;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b0b0b",
        color: "#ffffff",
        padding: "30px 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        <h1 style={{ marginBottom: "8px" }}>
          BOMBA AI — Character Verification
        </h1>

        <p style={{ color: "#aaa", marginTop: 0 }}>
          Read-only test. No video generation. No voice API. No Cloudinary.
          No Eternal AI. No credits.
        </p>

        <div
          style={{
            marginTop: "25px",
            padding: "20px",
            borderRadius: "12px",
            background: allPassed ? "#12351f" : "#351212",
            border: `1px solid ${allPassed ? "#2d8a4e" : "#8a2d2d"}`,
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            {allPassed
              ? "🔒 ALL CHARACTER TESTS PASSED"
              : "🛑 CHARACTER CHECK FAILED"}
          </h2>

          <div>
            Passed: <strong>{passed}</strong>
          </div>

          <div>
            Failed: <strong>{failed}</strong>
          </div>

          <div>
            Total: <strong>{results.length}</strong>
          </div>
        </div>

        {characters.length > 0 && (
          <section style={{ marginTop: "30px" }}>
            <h2>Characters Generated</h2>

            <div
              style={{
                display: "grid",
                gap: "15px",
              }}
            >
              {characters.map((character) => (
                <div
                  key={character.id}
                  style={{
                    padding: "18px",
                    borderRadius: "12px",
                    background: "#151515",
                    border: "1px solid #2b2b2b",
                  }}
                >
                  <h3 style={{ marginTop: 0 }}>
                    {character.name}
                  </h3>

                  <div>ID: {character.id}</div>
                  <div>Role: {character.role}</div>
                  <div>Gender: {character.gender}</div>
                  <div>Voice: {character.voiceName}</div>
                  <div>Voice ID: {character.voiceId}</div>
                  <div>Voice Gender: {character.voiceGender}</div>
                  <div>Voice Status: {character.voiceStatus}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section style={{ marginTop: "30px" }}>
          <h2>Test Results</h2>

          <div
            style={{
              display: "grid",
              gap: "8px",
            }}
          >
            {results.map((result, index) => (
              <div
                key={`${result.name}-${index}`}
                style={{
                  padding: "12px 15px",
                  borderRadius: "8px",
                  background:
                    result.status === "PASS"
                      ? "#101d14"
                      : "#1d1010",
                  border:
                    result.status === "PASS"
                      ? "1px solid #234d32"
                      : "1px solid #4d2323",
                }}
              >
                <strong>
                  {result.status === "PASS" ? "✅" : "❌"}{" "}
                  {result.name}
                </strong>

                {result.detail && (
                  <div
                    style={{
                      marginTop: "5px",
                      color: "#aaa",
                      fontSize: "14px",
                    }}
                  >
                    {result.detail}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}