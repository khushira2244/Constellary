import type {
  BranchPageData,
  BranchTreeNode,
} from "@/features/branch-reading/types";

export type BranchClassification = "new" | "derived" | "referenced";

export function branchClassification(data: BranchPageData): BranchClassification {
  if (data.branch.parent_branch_id) return "derived";
  if (data.branch.origin_type === "own_idea") return "new";
  if (["existing_branch", "existing_subbranch", "combined_ideas"].includes(data.branch.origin_type)) {
    return "derived";
  }
  return "referenced";
}

export function branchClassificationLabel(value: BranchClassification) {
  return value === "new" ? "New" : value === "derived" ? "Derived" : "Taken / Referenced";
}

export function branchStatusLabel(value: string) {
  return value.split("_").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
}

export function firstSummaryParagraph(value: string | null | undefined) {
  return value?.split(/\n\s*\n/)[0]?.trim() || "No approved summary has been added yet.";
}

export function compactSummaryPreview(
  value: string | null | undefined,
  maximumCharacters = 400,
) {
  const fullContent = value?.trim() ?? "";
  if (!fullContent) return { content: "", truncated: false };

  const firstParagraph = fullContent.split(/\n\s*\n/, 1)[0]?.trim() ?? "";
  const omittedLaterParagraphs = firstParagraph.length < fullContent.length;
  if (firstParagraph.length <= maximumCharacters) {
    return {
      content: `${firstParagraph}${omittedLaterParagraphs ? "…" : ""}`,
      truncated: omittedLaterParagraphs,
    };
  }

  const candidate = firstParagraph.slice(0, maximumCharacters + 1);
  const sentenceMatches = [...candidate.matchAll(/[.!?](?=\s|$)/g)];
  const sentenceEnd = sentenceMatches.at(-1)?.index;
  const wordEnd = candidate.lastIndexOf(" ", maximumCharacters);
  const cutAt = sentenceEnd !== undefined && sentenceEnd + 1 >= maximumCharacters * 0.6
    ? sentenceEnd + 1
    : wordEnd > 0 ? wordEnd : maximumCharacters;

  return {
    content: `${candidate.slice(0, cutAt).trimEnd()}…`,
    truncated: true,
  };
}

export function connectorThickness(linkCount: number) {
  if (linkCount >= 6) return 4;
  if (linkCount >= 3) return 3;
  if (linkCount >= 1) return 3;
  return 1;
}

export function connectorClassName(linkCount: number) {
  return linkCount > 0
    ? "branch-tree-item branch-tree-item--linked"
    : "branch-tree-item";
}

export function flattenBranchTree(
  node: BranchTreeNode,
  depth = 0,
): { node: BranchTreeNode; depth: number }[] {
  return [
    { node, depth },
    ...node.children.flatMap((child) => flattenBranchTree(child, depth + 1)),
  ];
}
