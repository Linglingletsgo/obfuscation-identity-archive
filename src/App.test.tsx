import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App shell", () => {
  it("does NOT render the archive experience at root /", () => {
    // 根路径现在是小镇首页，不应渲染 3D 档案
    render(<App />);
    expect(screen.queryByTestId("archive-experience")).not.toBeInTheDocument();
  });

  it("renders the archive experience at /archive", () => {
    window.history.pushState(null, "", "/archive");
    render(<App />);
    expect(screen.getByTestId("archive-experience")).toBeInTheDocument();
    window.history.pushState(null, "", "/");
  });
});
