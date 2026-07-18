import { describe, expect, test } from "vitest";

import {
  branchClassification,
  branchClassificationLabel,
  firstSummaryParagraph,
  flattenBranchTree,
} from "@/features/branch-view/model";
import type { BranchPageData, BranchTreeNode } from "@/features/branch-reading/types";

function page(id: string, parentId: string | null, origin: BranchPageData["branch"]["origin_type"]) {
  return {
    branch: {
      id,
      parent_branch_id: parentId,
      origin_type: origin,
    },
  } as BranchPageData;
}

describe("confirmed Branch View model", () => {
  test("maps root and subbranch provenance classifications", () => {
    expect(branchClassification(page("root", null, "own_idea"))).toBe("new");
    expect(branchClassification(page("derived-root", null, "existing_branch"))).toBe("derived");
    expect(branchClassification(page("paper-root", null, "paper"))).toBe("referenced");
    expect(branchClassification(page("child", "root", "own_idea"))).toBe("derived");
    expect(branchClassificationLabel("referenced")).toBe("Taken / Referenced");
  });

  test("uses only the first real summary paragraph for hover preview", () => {
    expect(firstSummaryParagraph("First paragraph.\n\nSecond paragraph.")).toBe("First paragraph.");
    expect(firstSummaryParagraph(null)).toContain("No approved summary");
  });

  test("keeps every subbranch and its depth in structured rendering order", () => {
    const leaf: BranchTreeNode = { data: page("leaf", "child", "existing_branch"), children: [] };
    const child: BranchTreeNode = { data: page("child", "root", "existing_branch"), children: [leaf] };
    const root: BranchTreeNode = { data: page("root", null, "own_idea"), children: [child] };
    expect(flattenBranchTree(root).map(({ node, depth }) => [node.data.branch.id, depth])).toEqual([
      ["root", 0],
      ["child", 1],
      ["leaf", 2],
    ]);
  });
});
