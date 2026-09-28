"use client";

import { useState } from "react";

export default function PlanPanel({ idea = "", onPlanChange }) {
  const [story, setStory] = useState("");
  const [characters, setCharacters] = useState("");
  const [scenes, setScenes] = useState("");
  const [shots, setShots] = useState("");

  const updatePlan = (field, value) => {
    const plan = {
      idea,
      story,
      characters,
      scenes,
      shots,
      [field]: value,
    };

    onPlanChange?.(plan);
  };

  return (
    <section className="mt-8 rounded-3xl border border-white/10 bg-black/40 p-5">
      <div className="mb-6">
        <div className="mb-2 text-xs font-semibold tracking-[0.25em] text-yellow-400">
          STUDIO PLAN
        </div>

        <h2 className="text-2xl font-bold text-white">
          Plan your video
        </h2>

        <p className="mt-2 text-sm leading-6 text-white/60">
          Turn your idea into a clear story, characters, scenes and shots
          before generating the video.
        </p>
      </div>

      <div className="space-y-5">
        {/* IDEA */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-white">
            1. Idea
          </label>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/70">
            {idea || "Your video idea will appear here."}
          </div>
        </div>

        {/* STORY */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-white">
            2. Story
          </label>

          <textarea
            value={story}
            onChange={(e) => {
              setStory(e.target.value);
              updatePlan("story", e.target.value);
            }}
            placeholder="Describe what happens in the story..."
            rows={4}
            className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-yellow-400/50"
          />
        </div>

        {/* CHARACTERS */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-white">
            3. Characters
          </label>

          <textarea
            value={characters}
            onChange={(e) => {
              setCharacters(e.target.value);
              updatePlan("characters", e.target.value);
            }}
            placeholder="Who appears in the video? Describe their appearance and role..."
            rows={4}
            className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-yellow-400/50"
          />
        </div>

        {/* SCENES */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-white">
            4. Scenes
          </label>

          <textarea
            value={scenes}
            onChange={(e) => {
              setScenes(e.target.value);
              updatePlan("scenes", e.target.value);
            }}
            placeholder="Describe the locations, actions and important moments..."
            rows={4}
            className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-yellow-400/50"
          />
        </div>

        {/* SHOTS */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-white">
            5. Shots
          </label>

          <textarea
            value={shots}
            onChange={(e) => {
              setShots(e.target.value);
              updatePlan("shots", e.target.value);
            }}
            placeholder="Describe camera angles, movement and important shots..."
            rows={4}
            className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-yellow-400/50"
          />
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-4">
        <div className="text-sm font-semibold text-yellow-400">
          Next step
        </div>

        <p className="mt-1 text-sm leading-6 text-white/60">
          Later, BOMBA AI will be connected here to turn your idea into the
          story, characters, scenes and shots automatically.
        </p>
      </div>
    </section>
  );
}