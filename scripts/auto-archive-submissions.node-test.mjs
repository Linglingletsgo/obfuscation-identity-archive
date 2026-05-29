import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStandardTagSet,
  createGeneratedEdges,
  fieldTagsFromSubmission,
  shouldProcessSubmissionId,
  standardTagsFromSubmission,
} from "./auto-archive-submissions.mjs";
import { buildAvatarPrompt } from "./avatar-prompt-template.mjs";

const baseGraph = {
  nodes: [
    {
      id: "base-a",
      tags: [{ label: "Archive" }, { label: "Calm" }],
    },
    {
      id: "base-b",
      tags: [{ label: "Archive" }],
    },
  ],
  edges: [],
};

test("standardTagsFromSubmission skips custom tags and unknown labels", () => {
  const standardTagSet = buildStandardTagSet(baseGraph);
  const tags = standardTagsFromSubmission(
    {
      tags: ["Archive", "Custom invented tag", "Calm"],
      custom_tags: ["Archive"],
    },
    standardTagSet,
  );

  assert.deepEqual(tags, ["Archive", "Calm"]);
});

test("fieldTagsFromSubmission preserves fixed field buckets", () => {
  const standardTagSet = buildStandardTagSet(baseGraph);
  const tagsByField = fieldTagsFromSubmission(
    {
      shell_form: "Archive",
      emotion_personality_tags: ["Calm", "Custom invented tag"],
    },
    standardTagSet,
  );

  assert.deepEqual(tagsByField.shell_form, ["Archive"]);
  assert.deepEqual(tagsByField.emotion_personality_tags, ["Calm"]);
});

test("buildAvatarPrompt uses fixed identity tag field headings", () => {
  const prompt = buildAvatarPrompt({
    shell_form: ["Archive"],
    emotion_personality_tags: ["Calm"],
  });

  assert.match(prompt, /Identity tags:\nshell_form: Archive/);
  assert.match(prompt, /emotion_personality_tags: Calm/);
  assert.match(prompt, /non_human_tags: None/);
});

test("createGeneratedEdges creates deterministic shared-tag interactions", () => {
  const edges = createGeneratedEdges(
    {
      id: "generated-a",
      tags: [{ label: "Archive" }, { label: "Calm" }],
    },
    baseGraph.nodes,
    2,
  );

  assert.deepEqual(
    edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      relation: edge.relation,
      weight: edge.weight,
      shared_tags: edge.shared_tags,
    })),
    [
      {
        source: "generated-a",
        target: "base-a",
        relation: "interaction",
        weight: 2,
        shared_tags: ["Archive", "Calm"],
      },
      {
        source: "generated-a",
        target: "base-b",
        relation: "interaction",
        weight: 1,
        shared_tags: ["Archive"],
      },
    ],
  );
});

test("shouldProcessSubmissionId skips submissions already present in the base graph", () => {
  const baseIds = new Set(["base-a"]);

  assert.equal(shouldProcessSubmissionId("base-a", baseIds), false);
  assert.equal(shouldProcessSubmissionId("generated-a", baseIds), true);
});
