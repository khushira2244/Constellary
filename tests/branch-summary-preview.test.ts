import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

const view = readFileSync("src/app/branches/[branchId]/branch-view.tsx", "utf8");
const fullPage = readFileSync("src/app/branches/[branchId]/summary/page.tsx", "utf8");

describe("compact Branch View summary presentation", () => {
  test("previews the exact branch summary and links to its full reading page", () => {
    expect(view).toContain("compactSummaryPreview(readable?.content)");
    expect(view).toContain('href={`/branches/${data.branch.id}/summary`}');
    expect(view).toContain("View full summary");
    expect(view).not.toContain('<p>{readable?.content ?? "No summary has been added yet."}</p>');
  });

  test("keeps permission-checked edit and Workspace actions unchanged", () => {
    expect(view).toContain("data.capabilities.canEdit && !editing");
    expect(view).toContain("Edit Summary");
    expect(view).toContain('href={`/branches/${data.branch.id}/workspace?item=full-summary`}');
    expect(view).toContain("saveBranchSummaryAction(data.branch.id, summary?.id ?? null, content)");
  });

  test("leaves the dedicated Summary page untruncated", () => {
    expect(fullPage).toContain("const summary = data.fullSummary");
    expect(fullPage).toContain('<div className="summary-reading-content">{summary.content}</div>');
    expect(fullPage).not.toContain("compactSummaryPreview");
  });
});
