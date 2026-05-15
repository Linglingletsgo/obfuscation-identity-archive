import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App shell", () => {
  it("renders the archive experience root", () => {
    render(<App />);
    expect(screen.getByTestId("archive-experience")).toBeInTheDocument();
  });
});
