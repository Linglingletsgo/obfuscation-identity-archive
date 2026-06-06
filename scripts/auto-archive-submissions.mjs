import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureDir, graphPath, readJson, repoRoot } from "./archive-core.mjs";
import { avatarTagFields, buildAvatarPrompt } from "./avatar-prompt-template.mjs";

const overlayPath = path.join(repoRoot, "public/data/generated/submission_overlay_graph.json");
const registryPath = path.join(repoRoot, "public/data/generated/submission_overlay_registry.json");
const generatedAvatarDir = path.join(repoRoot, "public/assets/avatars/generated");

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function readJsonIfExists(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return readJson(filePath);
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(`${filePath}.tmp`, filePath);
}

function normalizeSubmissionId(rawSubmission, filePath) {
  const direct = rawSubmission.submission_id || rawSubmission.id || rawSubmission.submissionId;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  return path.basename(filePath, path.extname(filePath));
}

function normalizeName(rawSubmission) {
  const value = rawSubmission.identity_name || rawSubmission.name || rawSubmission.avatar_name;
  return typeof value === "string" && value.trim() ? value.trim() : "Anonymous";
}

function normalizeCarriedFragment(rawSubmission) {
  const value =
    rawSubmission.carried_fragment ||
    rawSubmission.carriedFragment ||
    rawSubmission.fragment ||
    rawSubmission.memory;
  return typeof value === "string" ? value.trim() : "";
}

function valuesFromField(rawSubmission, field) {
  const value = rawSubmission[field];
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string") {
    return [value];
  }
  return [];
}

function uniqueCleanStrings(values) {
  return [...new Set(values)]
    .filter((tag) => typeof tag === "string")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function buildStandardTagSet(baseGraph) {
  return new Set(
    baseGraph.nodes
      .flatMap((node) => node.tags || [])
      .map((tag) => tag.label)
      .filter(Boolean),
  );
}

export function fieldTagsFromSubmission(rawSubmission, standardTagSet = new Set(), { includeCustom = true } = {}) {
  return Object.fromEntries(
    avatarTagFields.map((field) => [
      field,
      uniqueCleanStrings(valuesFromField(rawSubmission, field))
        .filter((tag) => includeCustom || standardTagSet.has(tag)),
    ]),
  );
}

export function labelsFromFields(tagsByField, standardTagSet = null) {
  return [...new Set(Object.values(tagsByField).flat())]
    .filter((label) => !standardTagSet || standardTagSet.has(label))
    .sort((a, b) => a.localeCompare(b));
}

export function tagObjectsFromFields(tagsByField, standardTagSet) {
  const byLabel = new Map();
  for (const field of avatarTagFields) {
    for (const label of tagsByField[field] || []) {
      if (!byLabel.has(label)) {
        byLabel.set(label, {
          label,
          category: field,
          definition_source: standardTagSet.has(label) ? "standard" : "custom",
        });
      }
    }
  }
  return [...byLabel.values()];
}

export function standardTagsFromSubmission(rawSubmission, standardTagSet) {
  const fieldTags = labelsFromFields(fieldTagsFromSubmission(rawSubmission, standardTagSet, { includeCustom: false }));
  if (fieldTags.length > 0) {
    return fieldTags;
  }

  const tagCandidates = [
    ...(Array.isArray(rawSubmission.tags) ? rawSubmission.tags : []),
    ...(Array.isArray(rawSubmission.selected_tags) ? rawSubmission.selected_tags : []),
    ...(Array.isArray(rawSubmission.standard_tags) ? rawSubmission.standard_tags : []),
  ];

  return [...new Set(tagCandidates)]
    .filter((tag) => typeof tag === "string")
    .map((tag) => tag.trim())
    .filter((tag) => standardTagSet.has(tag))
    .sort((a, b) => a.localeCompare(b));
}

export function createGeneratedEdges(generatedNode, baseNodes, maxTargets = 8) {
  const generatedTags = new Set(
    (generatedNode.tags || [])
      .filter((tag) => tag.definition_source !== "custom")
      .map((tag) => tag.label),
  );
  return baseNodes
    .map((baseNode) => {
      const sharedTags = [
        ...new Set((baseNode.tags || []).map((tag) => tag.label).filter((label) => generatedTags.has(label))),
      ].sort((a, b) => a.localeCompare(b));
      return { baseNode, sharedTags };
    })
    .filter(({ sharedTags }) => sharedTags.length > 0)
    .sort((a, b) => b.sharedTags.length - a.sharedTags.length || a.baseNode.id.localeCompare(b.baseNode.id))
    .slice(0, maxTargets)
    .map(({ baseNode, sharedTags }) => ({
      id: `generated_shared:${generatedNode.id}->${baseNode.id}`,
      source: generatedNode.id,
      target: baseNode.id,
      relation: "interaction",
      weight: sharedTags.length,
      shared_tags: sharedTags,
    }));
}

export function shouldProcessSubmissionId(submissionId, baseSubmissionIds) {
  return !baseSubmissionIds.has(submissionId);
}

function submissionFiles(submissionsDir) {
  if (!submissionsDir || !fs.existsSync(submissionsDir)) return [];
  return fs
    .readdirSync(submissionsDir)
    .filter((name) => name.endsWith(".json") && !name.startsWith("._"))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => path.join(submissionsDir, name));
}

function extractBase64Image(payload) {
  const imageUrl = payload.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (typeof imageUrl !== "string") {
    throw new Error("OpenRouter returned no image data URL.");
  }
  const match = imageUrl.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
  if (!match) {
    throw new Error("OpenRouter image response was not a base64 data URL.");
  }
  return Buffer.from(match[1], "base64");
}

async function generateAvatarImage({ rawSubmission, node, outputPath, dryRun }) {
  ensureDir(path.dirname(outputPath));
  const shouldOverwrite = node.source_hash_changed === true;
  if (fs.existsSync(outputPath) && !shouldOverwrite) return;

  if (dryRun) {
    fs.writeFileSync(outputPath, "");
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is required when --generate-images is used.");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/Linglingletsgo/obfuscation-identity-archive",
      "X-Title": "Obfuscation Identity Archive",
    },
    body: JSON.stringify({
      model: "openai/gpt-5.4-image-2",
      modalities: ["image", "text"],
      image_config: {
        aspect_ratio: "1:1",
        image_size: "1K",
      },
      messages: [
        {
          role: "user",
          content: buildAvatarPrompt(fieldTagsFromSubmission(rawSubmission)),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Image generation failed: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json();
  fs.writeFileSync(outputPath, extractBase64Image(payload));
}

export async function runAutoArchive({
  submissionsDir = process.env.AUTO_ARCHIVE_SUBMISSIONS_DIR,
  generateImages = false,
  dryRunImages = false,
} = {}) {
  const baseGraph = readJson(graphPath);
  const baseSubmissionIds = new Set(baseGraph.nodes.map((node) => node.id));
  const standardTagSet = buildStandardTagSet(baseGraph);
  const previousOverlay = readJsonIfExists(overlayPath, {
    version: 1,
    generated_at: new Date(0).toISOString(),
    base_graph_source: "/data/algorithm/interaction_graph_real_submissions.json",
    base_timeline_source: "/data/algorithm/timeline/anchor_timeline_real_submissions.json",
    nodes: [],
    edges: [],
  });
  const registry = readJsonIfExists(registryPath, { version: 1, submissions: {} });
  const nodesById = new Map();

  for (const filePath of submissionFiles(submissionsDir)) {
    const fileText = fs.readFileSync(filePath, "utf8");
    const rawSubmission = JSON.parse(fileText);
    if (!isRecord(rawSubmission)) continue;

    const submissionId = normalizeSubmissionId(rawSubmission, filePath);
    if (!shouldProcessSubmissionId(submissionId, baseSubmissionIds)) {
      continue;
    }

    const sourceHash = sha256(fileText);
    const previousRegistryEntry = registry.submissions[submissionId];
    const sourceHashChanged = previousRegistryEntry?.source_sha256 !== sourceHash;

    const avatarPath = `/assets/avatars/generated/${submissionId}.png`;
    const tagsByField = fieldTagsFromSubmission(rawSubmission);
    const node = {
      id: submissionId,
      type: "submission",
      label: normalizeName(rawSubmission),
      carried_fragment: normalizeCarriedFragment(rawSubmission),
      asset_path: avatarPath,
      tags: tagObjectsFromFields(tagsByField, standardTagSet),
      source_group: "generated",
      source_hash_changed: sourceHashChanged,
    };

    nodesById.set(submissionId, node);
    if (sourceHashChanged || previousRegistryEntry?.avatar_path !== avatarPath) {
      registry.submissions[submissionId] = {
        submission_id: submissionId,
        source_sha256: sourceHash,
        avatar_path: avatarPath,
        processed_at: new Date().toISOString(),
      };
    }

    if (generateImages) {
      await generateAvatarImage({
        rawSubmission,
        node,
        outputPath: path.join(generatedAvatarDir, `${submissionId}.png`),
        dryRun: dryRunImages,
      });
    }
  }

  const nodes = [...nodesById.values()]
    .map(({ source_hash_changed: _sourceHashChanged, ...node }) => node)
    .sort((a, b) => a.id.localeCompare(b.id));
  const edges = nodes.flatMap((node) => createGeneratedEdges(node, baseGraph.nodes, 8));
  const overlayContent = {
    version: 1,
    base_graph_source: "/data/algorithm/interaction_graph_real_submissions.json",
    base_timeline_source: "/data/algorithm/timeline/anchor_timeline_real_submissions.json",
    nodes,
    edges,
  };
  const previousOverlayContent = {
    version: previousOverlay.version,
    base_graph_source: previousOverlay.base_graph_source,
    base_timeline_source: previousOverlay.base_timeline_source,
    nodes: previousOverlay.nodes || [],
    edges: previousOverlay.edges || [],
  };
  const overlay = {
    ...overlayContent,
    generated_at:
      JSON.stringify(overlayContent) === JSON.stringify(previousOverlayContent)
        ? previousOverlay.generated_at
        : new Date().toISOString(),
  };

  writeJson(overlayPath, overlay);
  writeJson(registryPath, registry);
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  const generateImages = process.argv.includes("--generate-images");
  const dryRunImages = process.argv.includes("--dry-run-images");
  await runAutoArchive({ generateImages, dryRunImages });
}
