import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpToolResponse } from '../types/common.js';
import { GetIssueGraphInputSchema } from '../types/tools.js';
import { validateInput } from '../utils/validators.js';
import { getIssue } from '../utils/api-helpers.js';
import { handleError } from '../utils/error-handler.js';
import { TOOL_NAMES } from '../config/constants.js';
import { createLogger } from '../utils/logger.js';
import {
  IssueGraphNode,
  IssueGraphEdge,
  IssueGraph,
  JiraIssueLink,
  JiraSubtask,
  JiraIssue,
} from '../types/jira.js';

const log = createLogger('tool:get-issue-graph');

const GRAPH_FIELDS = [
  'summary',
  'status',
  'issuetype',
  'priority',
  'parent',
  'subtasks',
  'issuelinks',
];

export const getIssueGraphTool: Tool = {
  name: TOOL_NAMES.GET_ISSUE_GRAPH,
  description:
    'Build a dependency/relationship graph starting from a seed issue. Returns a map of connected issues (parent/child hierarchy, blocks, relates to, duplicates, etc.) with nodes and edges, plus a Mermaid diagram for visualization. Use this to understand how issues are connected across epics, stories, and subtasks.',
  inputSchema: {
    type: 'object',
    properties: {
      issueKey: {
        type: 'string',
        description: 'Seed issue key to start graph traversal from (e.g., PROJECT-123)',
      },
      maxDepth: {
        type: 'number',
        description: 'Maximum BFS traversal depth (default: 2, max: 5)',
        default: 2,
      },
      maxNodes: {
        type: 'number',
        description: 'Maximum number of nodes in the graph (default: 50, max: 200)',
        default: 50,
      },
      includeHierarchy: {
        type: 'boolean',
        description: 'Include parent/child/subtask edges (default: true)',
        default: true,
      },
      linkTypes: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter to specific link types (e.g., ["Blocks", "Relates"])',
      },
      direction: {
        type: 'string',
        enum: ['all', 'inward', 'outward'],
        description: 'Which link directions to follow (default: "all")',
        default: 'all',
      },
    },
    required: ['issueKey'],
  },
};

interface RawIssueData {
  key: string;
  summary: string;
  status: string;
  statusCategory: string;
  issueType: string;
  priority: string;
  issuelinks: JiraIssueLink[];
  parent: { key: string; summary?: string; status?: string; issueType?: string } | undefined;
  subtasks: JiraSubtask[];
}

function extractIssueData(issue: JiraIssue): RawIssueData {
  const fields = issue.fields as any;
  return {
    key: issue.key,
    summary: fields?.summary || 'No summary',
    status: fields?.status?.name || 'Unknown',
    statusCategory: fields?.status?.statusCategory?.name || 'Unknown',
    issueType: fields?.issuetype?.name || 'Unknown',
    priority: fields?.priority?.name || 'None',
    issuelinks: (fields?.issuelinks as JiraIssueLink[]) || [],
    parent: fields?.parent
      ? {
          key: fields.parent.key,
          summary: fields.parent.fields?.summary,
          status: fields.parent.fields?.status?.name,
          issueType: fields.parent.fields?.issuetype?.name,
        }
      : undefined,
    subtasks: (fields?.subtasks as JiraSubtask[]) || [],
  };
}

function buildGraph(
  issueDataMap: Map<string, RawIssueData>,
  rootKey: string,
  options: {
    includeHierarchy: boolean;
    linkTypes: string[] | undefined;
    direction: 'all' | 'inward' | 'outward';
  }
): IssueGraph {
  const nodes: IssueGraphNode[] = [];
  const edges: IssueGraphEdge[] = [];
  const edgeSet = new Set<string>();

  const addEdge = (edge: IssueGraphEdge) => {
    const edgeId = `${edge.from}->${edge.to}:${edge.type}:${edge.category}`;
    if (!edgeSet.has(edgeId)) {
      edgeSet.add(edgeId);
      edges.push(edge);
    }
  };

  for (const [, data] of issueDataMap) {
    nodes.push({
      key: data.key,
      summary: data.summary,
      status: data.status,
      statusCategory: data.statusCategory,
      issueType: data.issueType,
      priority: data.priority,
    });

    // Hierarchy edges
    if (options.includeHierarchy) {
      if (data.parent && issueDataMap.has(data.parent.key)) {
        addEdge({
          from: data.parent.key,
          to: data.key,
          type: 'parent of',
          label: 'parent of',
          category: 'hierarchy',
        });
      }

      for (const sub of data.subtasks) {
        if (issueDataMap.has(sub.key)) {
          addEdge({
            from: data.key,
            to: sub.key,
            type: 'parent of',
            label: 'parent of',
            category: 'hierarchy',
          });
        }
      }
    }

    // Issue link edges
    for (const link of data.issuelinks) {
      const typeName = link.type?.name || 'Unknown';

      // Apply link type filter
      if (options.linkTypes && options.linkTypes.length > 0) {
        if (!options.linkTypes.some((lt) => lt.toLowerCase() === typeName.toLowerCase())) {
          continue;
        }
      }

      if (link.outwardIssue && (options.direction === 'all' || options.direction === 'outward')) {
        if (issueDataMap.has(link.outwardIssue.key)) {
          addEdge({
            from: data.key,
            to: link.outwardIssue.key,
            type: typeName,
            label: link.type?.outward || typeName,
            category: 'link',
          });
        }
      }

      if (link.inwardIssue && (options.direction === 'all' || options.direction === 'inward')) {
        if (issueDataMap.has(link.inwardIssue.key)) {
          addEdge({
            from: link.inwardIssue.key,
            to: data.key,
            type: typeName,
            label: link.type?.outward || typeName,
            category: 'link',
          });
        }
      }
    }
  }

  return {
    rootIssue: rootKey,
    nodes,
    edges,
    metadata: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      maxDepthReached: false, // set by caller
      traversalDepth: 0, // set by caller
    },
  };
}

function formatGraphResponse(graph: IssueGraph): McpToolResponse {
  const { nodes, edges, metadata, rootIssue } = graph;

  // Nodes table
  const nodesTable = nodes
    .map((n) => `| ${n.key} | ${n.summary} | ${n.status} | ${n.issueType} | ${n.priority} |`)
    .join('\n');

  // Edges table
  const edgesTable = edges
    .map((e) => `| ${e.from} | ${e.label} | ${e.to} | ${e.category} |`)
    .join('\n');

  // Mermaid diagram
  const mermaidNodes = nodes
    .map((n) => {
      const shape =
        n.statusCategory === 'Done'
          ? `${n.key}[/"${n.issueType}: ${escapeMermaid(n.summary)}"/]`
          : n.statusCategory === 'In Progress'
            ? `${n.key}[["${n.issueType}: ${escapeMermaid(n.summary)}"]]`
            : `${n.key}["${n.issueType}: ${escapeMermaid(n.summary)}"]`;
      return `  ${shape}`;
    })
    .join('\n');

  const mermaidEdges = edges
    .map((e) => {
      if (e.category === 'hierarchy') {
        return `  ${e.from} --> ${e.to}`;
      }
      return `  ${e.from} -->|${escapeMermaid(e.label)}| ${e.to}`;
    })
    .join('\n');

  // Style nodes by status category
  const doneNodes = nodes.filter((n) => n.statusCategory === 'Done').map((n) => n.key);
  const inProgressNodes = nodes.filter((n) => n.statusCategory === 'In Progress').map((n) => n.key);
  const todoNodes = nodes
    .filter((n) => n.statusCategory !== 'Done' && n.statusCategory !== 'In Progress')
    .map((n) => n.key);

  let mermaidStyles = '';
  if (doneNodes.length > 0) mermaidStyles += `\n  classDef done fill:#d4edda,stroke:#28a745`;
  if (inProgressNodes.length > 0)
    mermaidStyles += `\n  classDef inprogress fill:#fff3cd,stroke:#ffc107`;
  if (todoNodes.length > 0) mermaidStyles += `\n  classDef todo fill:#f8d7da,stroke:#dc3545`;
  if (doneNodes.length > 0) mermaidStyles += `\n  class ${doneNodes.join(',')} done`;
  if (inProgressNodes.length > 0)
    mermaidStyles += `\n  class ${inProgressNodes.join(',')} inprogress`;
  if (todoNodes.length > 0) mermaidStyles += `\n  class ${todoNodes.join(',')} todo`;

  const depthNote = metadata.maxDepthReached ? ' (max depth reached, graph may be incomplete)' : '';

  const text = `## Issue Graph: ${rootIssue} (depth: ${metadata.traversalDepth}, ${metadata.totalNodes} nodes, ${metadata.totalEdges} edges)${depthNote}

### Nodes
| Key | Summary | Status | Type | Priority |
|-----|---------|--------|------|----------|
${nodesTable}

### Edges
| From | Relationship | To | Category |
|------|-------------|-----|----------|
${edgesTable}

### Mermaid Diagram
\`\`\`mermaid
graph TD
${mermaidNodes}
${mermaidEdges}${mermaidStyles}
\`\`\``;

  return { content: [{ type: 'text', text }] };
}

function escapeMermaid(text: string): string {
  return text
    .replace(/"/g, "'")
    .replace(/[[\]{}()#]/g, '')
    .substring(0, 60);
}

export async function handleGetIssueGraph(input: unknown): Promise<McpToolResponse> {
  try {
    const validated = validateInput(GetIssueGraphInputSchema, input);
    const {
      issueKey,
      maxDepth = 2,
      maxNodes = 50,
      includeHierarchy = true,
      linkTypes,
      direction = 'all',
    } = validated;

    log.info(`Building issue graph from ${issueKey} (depth: ${maxDepth}, maxNodes: ${maxNodes})`);

    const issueDataMap = new Map<string, RawIssueData>();
    const queue: { key: string; depth: number }[] = [{ key: issueKey, depth: 0 }];
    const visited = new Set<string>();
    let maxDepthReached = false;
    let actualDepth = 0;

    // BFS traversal
    while (queue.length > 0 && issueDataMap.size < maxNodes) {
      const current = queue.shift()!;

      if (visited.has(current.key)) continue;
      visited.add(current.key);

      if (current.depth > maxDepth) {
        maxDepthReached = true;
        continue;
      }

      actualDepth = Math.max(actualDepth, current.depth);

      // Fetch issue with relationship fields
      let issue: JiraIssue;
      try {
        issue = await getIssue(current.key, { fields: GRAPH_FIELDS });
      } catch (err: any) {
        log.warn(`Skipping issue ${current.key}: ${err.message}`);
        continue;
      }

      const data = extractIssueData(issue);
      issueDataMap.set(current.key, data);

      // Don't enqueue more if we've hit the max depth for enqueueing
      if (current.depth >= maxDepth) continue;

      // Enqueue connected issues for next depth level
      const nextDepth = current.depth + 1;

      // Parent
      if (includeHierarchy && data.parent && !visited.has(data.parent.key)) {
        queue.push({ key: data.parent.key, depth: nextDepth });
      }

      // Subtasks
      if (includeHierarchy) {
        for (const sub of data.subtasks) {
          if (!visited.has(sub.key)) {
            queue.push({ key: sub.key, depth: nextDepth });
          }
        }
      }

      // Issue links
      for (const link of data.issuelinks) {
        // Apply link type filter
        if (linkTypes && linkTypes.length > 0) {
          const typeName = link.type?.name || '';
          if (!linkTypes.some((lt) => lt.toLowerCase() === typeName.toLowerCase())) continue;
        }

        if (
          link.outwardIssue &&
          !visited.has(link.outwardIssue.key) &&
          (direction === 'all' || direction === 'outward')
        ) {
          queue.push({ key: link.outwardIssue.key, depth: nextDepth });
        }

        if (
          link.inwardIssue &&
          !visited.has(link.inwardIssue.key) &&
          (direction === 'all' || direction === 'inward')
        ) {
          queue.push({ key: link.inwardIssue.key, depth: nextDepth });
        }
      }
    }

    if (queue.length > 0) {
      maxDepthReached = true;
    }

    log.info(`Graph built: ${issueDataMap.size} nodes discovered`);

    const graph = buildGraph(issueDataMap, issueKey, {
      includeHierarchy,
      linkTypes,
      direction,
    });

    graph.metadata.maxDepthReached = maxDepthReached;
    graph.metadata.traversalDepth = actualDepth;

    return formatGraphResponse(graph);
  } catch (error) {
    log.error('Error in handleGetIssueGraph:', error);
    return handleError(error);
  }
}
