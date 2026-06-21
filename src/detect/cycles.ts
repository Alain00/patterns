/**
 * Cycle detector for Fase 2 (`detect`). Finds directed import cycles via
 * strongly-connected components (Tarjan) over the file graph. Each SCC with
 * size > 1 is one cycle incongruity — confidence 1, never auto-fixed.
 * Deterministic, LLM-free.
 */
import type { FileGraph } from "../scanner/types";
import type { Incongruity } from "./types";

/** Tarjan's SCC: returns components with size > 1 (the cyclic ones). */
function stronglyConnected(files: string[], edges: Map<string, Set<string>>): string[][] {
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const sccs: string[][] = [];
  let counter = 0;

  // iterative DFS to stay cycle-safe on large graphs.
  for (const root of files) {
    if (index.has(root)) continue;
    const work: Array<{ node: string; next: number }> = [{ node: root, next: 0 }];
    while (work.length > 0) {
      const frame = work[work.length - 1] as { node: string; next: number };
      const { node } = frame;
      if (frame.next === 0) {
        index.set(node, counter);
        low.set(node, counter);
        counter++;
        stack.push(node);
        onStack.add(node);
      }
      const succs = [...(edges.get(node) ?? new Set<string>())];
      if (frame.next < succs.length) {
        const to = succs[frame.next] as string;
        frame.next++;
        if (!index.has(to)) {
          work.push({ node: to, next: 0 });
        } else if (onStack.has(to)) {
          low.set(node, Math.min(low.get(node) as number, index.get(to) as number));
        }
        continue;
      }
      // done with node — fold low-link into parent, then maybe close an SCC.
      if (work.length > 1) {
        const parent = (work[work.length - 2] as { node: string }).node;
        low.set(parent, Math.min(low.get(parent) as number, low.get(node) as number));
      }
      if (low.get(node) === index.get(node)) {
        const comp: string[] = [];
        let w: string;
        do {
          w = stack.pop() as string;
          onStack.delete(w);
          comp.push(w);
        } while (w !== node);
        if (comp.length > 1) sccs.push(comp);
      }
      work.pop();
    }
  }
  return sccs;
}

/** One cycle Incongruity per SCC with > 1 member. No cycles -> []. */
export function findCycles(graph: FileGraph): Incongruity[] {
  const out: Incongruity[] = [];
  for (const comp of stronglyConnected(graph.files, graph.importEdges ?? graph.edges)) {
    const members = [...comp].sort();
    out.push({
      kind: "cycle",
      confidence: 1,
      files: members,
      message: `import cycle among ${members.length} files: ${members.join(" -> ")}`,
      evidence: { members },
    });
  }
  // deterministic: sort cycles by first member.
  out.sort((a, b) => (a.files[0] as string).localeCompare(b.files[0] as string));
  return out;
}
