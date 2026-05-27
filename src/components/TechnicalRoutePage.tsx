type TechnicalRouteStep = {
  code: string;
  description: string;
  eyebrow: string;
  title: string;
};

const technicalRouteSteps: TechnicalRouteStep[] = [
  {
    eyebrow: "Input",
    title: "Questionnaire Results",
    description:
      "Each participant contributes an obfuscated identity rather than a fixed profile. The route starts from selected tags, aliases, fragments, and free-text signals.",
    code: `{
  "submission_id": "submission_...",
  "identity_name": "Mango",
  "carried_fragment": "You are free, you can transform",
  "social_role_tags": ["Outsider", "Observer"],
  "platform_behavior_tags": ["Browses without buying"],
  "non_human_tags": ["Shadow"]
}`,
  },
  {
    eyebrow: "Mapping",
    title: "Tag Definition and Assignment",
    description:
      "Preset and interpreted custom tags are mapped to computational properties. A tag remains readable as language, but it also carries values used by the algorithm.",
    code: `{
  "label": "Database",
  "category": "places",
  "role": "trace",
  "mobility": 0.63,
  "stability": 0.31,
  "contamination": 0.67,
  "visibility": 0.89
}`,
  },
  {
    eyebrow: "Scoring",
    title: "Relationship Scoring",
    description:
      "The algorithm compares identities through shared tags, places, and conflict rules. The result is not a visual layout yet, but a set of relationship pressures.",
    code: `{
  "source": "submission_A",
  "target": "submission_B",
  "scores": {
    "affinity": 0.42,
    "conflict": 0.68,
    "contamination": 0.51,
    "masking": 0.37,
    "mutation": 0.44
  },
  "evidence": {
    "shared_tags": ["Archive", "Dream"],
    "conflict_pairs": [["Calm", "Anxious"]]
  }
}`,
  },
  {
    eyebrow: "Inference",
    title: "Reverse-Inferred Avatar Tags",
    description:
      "This step compresses many possible tags into a smaller identity structure. Tags gain weight from direct selection, relationship evidence, and the role they play in the archive.",
    code: `{
  "candidate_score": {
    "direct_selection": 0.45,
    "shared_evidence": 0.20,
    "conflict_pressure": 0.15,
    "contamination": 0.10,
    "role_fit": 0.10
  },
  "grouping_rules": {
    "core": ["anchor", "trace", "portal"],
    "surface": ["surface", "mask"],
    "movement": ["location", "portal"],
    "affect": ["emotion", "social_role"],
    "material": ["object", "format", "source"],
    "non_human": ["non_human", "glitch", "system"]
  },
  "selection": "rank each group, keep strongest tags, remove near-duplicates"
}`,
  },
  {
    eyebrow: "Output",
    title: "Final Tag Structure",
    description:
      "The route stops at this structured tag output. The result stays ambiguous enough to resist a single profile, while preserving a readable identity logic.",
    code: `{
  "core": ["Outlier", "Anxious", "Transport system"],
  "surface": ["Outsider", "Dream", "Game character"],
  "movement": ["No fixed place", "Airport"],
  "affect": ["Socially active", "Anonymous observer"],
  "material": ["Private diary", "Pop culture", "Futurism"],
  "non_human": ["Crack", "Broken phone", "Shadow"]
}`,
  },
];

function TechnicalRouteStepCard({
  step,
  index,
}: {
  index: number;
  step: TechnicalRouteStep;
}) {
  return (
    <article className="technical-route-step">
      <div className="technical-route-step-copy">
        <span>{step.eyebrow}</span>
        <h2>
          {index + 1}. {step.title}
        </h2>
        <p>{step.description}</p>
      </div>
      <pre aria-label={`${step.title} JSON example`}>
        <code>{step.code}</code>
      </pre>
    </article>
  );
}

export function TechnicalRoutePage() {
  return (
    <section
      className="technical-route-page"
      aria-label="Technical route explanation"
    >
      <header className="technical-route-hero">
        <a href="/" className="index-back-link">
          Collective Space
        </a>
        <h1>Technical Route</h1>
        <div>
          This page explains how questionnaire responses are translated into
          computational identity tags. It follows the route from survey
          fragments to reverse-inferred avatar tags.
        </div>
      </header>

      <div
        className="technical-route-flow"
        aria-label="Survey-to-avatar-tag route"
      >
        {technicalRouteSteps.map((step, index) => (
          <TechnicalRouteStepCard key={step.title} step={step} index={index} />
        ))}
      </div>
    </section>
  );
}
