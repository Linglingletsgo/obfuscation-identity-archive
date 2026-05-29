export const avatarPromptBase = `Generate a person / character design based on the following identity tags, without being limited to a standard human form. Maintain clear character recognizability and distinctive identity traits. Keep the design simplified, with a clear structure, strong silhouette, balanced proportions, and a prominent visual focal point.

Use a childlike simple drawing style overall, as if drawn by a 6-year-old child: rough black pencil lines, slightly shaky and uneven in thickness, with some contours allowed to remain slightly open; use simple flat coloring with uneven color fill.

The character should be shown alone, centered in the composition, in a full-body view, on a pure white background. Do not include any text, symbols, logos, watermarks, or background decorations in the image. The overall silhouette should be clean, clear, and easy to recognize, while avoiding overly complex or messy details.

No photorealism, no 3D, no polished thick-paint rendering, no complex lighting, no gradients, no highlights or shadows, no commercial illustration style, no excessive detail, and no realistic materials.

Identity tags:[IDENTITY_TAGS]`;

export const avatarTagFields = [
  "shell_form",
  "places",
  "expression_formats",
  "material_sources",
  "social_role_tags",
  "spatial_tags",
  "time_era_tags",
  "platform_behavior_tags",
  "emotion_personality_tags",
  "relationship_tags",
  "aesthetic_cultural_tags",
  "system_tags",
  "non_human_tags",
];

export function buildIdentityTagsBlock(tagsByField) {
  const lines = ["Identity tags:"];
  for (const field of avatarTagFields) {
    const values = Array.isArray(tagsByField[field])
      ? tagsByField[field].filter((value) => typeof value === "string" && value.trim())
      : [];
    lines.push(`${field}: ${values.length > 0 ? values.join(", ") : "None"}`);
  }
  return lines.join("\n");
}

export function buildAvatarPrompt(tagsByField) {
  return avatarPromptBase.replace("Identity tags:[IDENTITY_TAGS]", buildIdentityTagsBlock(tagsByField));
}
