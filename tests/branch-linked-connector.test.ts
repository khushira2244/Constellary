import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

const view = readFileSync("src/app/branches/[branchId]/branch-view.tsx", "utf8");
const css = readFileSync("src/app/globals.css", "utf8");
const reading = readFileSync("src/features/branch-reading/services.ts", "utf8");

describe("Branch View linked-reference connector", () => {
  test("uses each exact branch's already accessible linked collection", () => {
    expect(view).toContain("connectorClassName(data.linkedBranches.length)");
    expect(view).toContain("connectorThickness(data.linkedBranches.length)");
    expect(view).toContain("links.map((link)");
    expect(view).toContain("linkedBranches: next");
  });

  test("keeps the ancestry structure and adds only restrained linked styling", () => {
    expect(view).toContain('<div className="provenance-tree">');
    expect(view).toContain('<div className="branch-node"');
    expect(css).toContain(".branch-tree-item--linked::after");
    expect(css).toContain("box-shadow: 0 4px 0 rgba(70, 80, 100, .72)");
    expect(css).not.toContain(".branch-tree-item--linked::before");
  });

  test("continues to rely on privacy-aware branch reading rather than raw link counts", () => {
    expect(reading).toContain("readLinks(branch.id, client)");
    expect(reading).toContain("linkedBranches: links.data ?? []");
    expect(view).not.toContain("linked_branch_count");
  });

  test("leaves the existing compact Links panel unchanged", () => {
    expect(view).toContain('className="linked-branch-tag"');
    expect(view).toContain("Remove linked branch");
    expect(view).toContain("Add linked branch");
  });
});
