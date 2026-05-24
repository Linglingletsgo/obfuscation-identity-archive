import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TechnicalRoutePage } from "./TechnicalRoutePage";

describe("TechnicalRoutePage", () => {
  it("explains the route from questionnaire data to reverse-inferred avatar tags", () => {
    render(<TechnicalRoutePage />);

    expect(screen.getByRole("heading", { name: "Technical Route" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "1. Questionnaire Results" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "2. Tag Definition and Assignment" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "3. Relationship Scoring" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "4. Reverse-Inferred Avatar Tags" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "5. Final Tag Structure" })).toBeInTheDocument();
    expect(screen.getByText(/"candidate_score"/)).toBeInTheDocument();
    expect(screen.getByText(/"role_fit": 0.10/)).toBeInTheDocument();
    expect(screen.getByText(/"core": \["Outlier", "Anxious", "Transport system"\]/)).toBeInTheDocument();
  });

  it("does not describe the removed cluster body stage, frontend rendering, or prompt layer", () => {
    render(<TechnicalRoutePage />);

    expect(screen.queryByText(/Cluster Body/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/GLB/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/point cloud/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/prompt/i)).not.toBeInTheDocument();
  });
});
