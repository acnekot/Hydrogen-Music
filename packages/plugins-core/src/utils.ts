interface NodeInfo {
  id: string;
  dependencies: string[];
}

export function topoSort(nodes: NodeInfo[]): string[] {
  const result: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  const visit = (id: string) => {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      throw new Error(`Circular plugin dependency detected: ${Array.from(visiting).join(' -> ')} -> ${id}`);
    }
    visiting.add(id);
    const node = nodeMap.get(id);
    if (node) {
      for (const dep of node.dependencies ?? []) {
        if (!nodeMap.has(dep)) continue;
        visit(dep);
      }
    }
    visiting.delete(id);
    visited.add(id);
    result.push(id);
  };

  for (const node of nodes) {
    visit(node.id);
  }

  return result;
}
