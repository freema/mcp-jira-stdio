import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleGetIssueGraph, getIssueGraphTool } from '../../../src/tools/get-issue-graph.js';
import { validateInput } from '../../../src/utils/validators.js';
import { getIssue } from '../../../src/utils/api-helpers.js';
import { handleError } from '../../../src/utils/error-handler.js';
import { TOOL_NAMES } from '../../../src/config/constants.js';

// Mock dependencies
vi.mock('../../../src/utils/validators.js');
vi.mock('../../../src/utils/api-helpers.js');
vi.mock('../../../src/utils/error-handler.js');

const mockedValidateInput = vi.mocked(validateInput);
const mockedGetIssue = vi.mocked(getIssue);
const mockedHandleError = vi.mocked(handleError);

// Factory for mock issues with graph-relevant fields
function makeMockIssue(
  key: string,
  opts: {
    summary?: string;
    status?: string;
    statusCategory?: string;
    issueType?: string;
    priority?: string;
    issuelinks?: any[];
    parent?: { key: string; summary?: string };
    subtasks?: any[];
  } = {}
) {
  return {
    id: `id-${key}`,
    key,
    self: `https://test.atlassian.net/rest/api/3/issue/${key}`,
    fields: {
      summary: opts.summary || `${key} summary`,
      status: {
        id: '1',
        name: opts.status || 'Open',
        description: '',
        iconUrl: '',
        self: '',
        statusCategory: {
          id: 2,
          key: 'new',
          colorName: 'blue-gray',
          name: opts.statusCategory || 'To Do',
          self: '',
        },
      },
      issuetype: {
        id: '1',
        name: opts.issueType || 'Story',
        description: '',
        iconUrl: '',
        self: '',
        subtask: false,
      },
      priority: {
        id: '1',
        name: opts.priority || 'Medium',
        description: '',
        self: '',
        iconUrl: '',
      },
      project: { id: '1', key: 'TEST', name: 'Test' },
      assignee: null,
      reporter: null,
      created: '2024-01-01T00:00:00.000Z',
      updated: '2024-01-01T00:00:00.000Z',
      labels: [],
      components: [],
      fixVersions: [],
      versions: [],
      issuelinks: opts.issuelinks || [],
      parent: opts.parent
        ? {
            id: `id-${opts.parent.key}`,
            key: opts.parent.key,
            self: '',
            fields: {
              summary: opts.parent.summary || `${opts.parent.key} summary`,
              status: { id: '1', name: 'Open', statusCategory: { name: 'To Do' } },
              issuetype: { name: 'Epic' },
            },
          }
        : undefined,
      subtasks: (opts.subtasks || []).map((s: any) => ({
        id: `id-${s.key}`,
        key: s.key,
        self: '',
        fields: {
          summary: s.summary || `${s.key} summary`,
          status: { id: '1', name: 'Open', statusCategory: { name: 'To Do' } },
          issuetype: { name: 'Sub-task' },
        },
      })),
    },
  } as any;
}

function makeIssueLink(
  type: string,
  direction: 'outward' | 'inward',
  linkedKey: string,
  outwardLabel = type.toLowerCase(),
  inwardLabel = `is ${type.toLowerCase()}ed by`
) {
  const link: any = {
    id: `link-${linkedKey}`,
    type: {
      id: '1',
      name: type,
      outward: outwardLabel,
      inward: inwardLabel,
      self: '',
    },
  };
  if (direction === 'outward') {
    link.outwardIssue = {
      id: `id-${linkedKey}`,
      key: linkedKey,
      self: '',
      fields: { summary: `${linkedKey} summary`, status: { name: 'Open' } },
    };
  } else {
    link.inwardIssue = {
      id: `id-${linkedKey}`,
      key: linkedKey,
      self: '',
      fields: { summary: `${linkedKey} summary`, status: { name: 'Open' } },
    };
  }
  return link;
}

describe('get-issue-graph tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getIssueGraphTool configuration', () => {
    it('should have correct tool name', () => {
      expect(getIssueGraphTool.name).toBe(TOOL_NAMES.GET_ISSUE_GRAPH);
    });

    it('should have a description', () => {
      expect(typeof getIssueGraphTool.description).toBe('string');
      expect(getIssueGraphTool.description!.toLowerCase()).toContain('graph');
    });

    it('should require issueKey', () => {
      expect(getIssueGraphTool.inputSchema.required).toEqual(['issueKey']);
    });
  });

  describe('handleGetIssueGraph', () => {
    describe('single node graph', () => {
      it('should return graph for isolated issue with no links', async () => {
        const input = { issueKey: 'TEST-1' };
        const validated = {
          issueKey: 'TEST-1',
          maxDepth: 2,
          maxNodes: 50,
          includeHierarchy: true,
          direction: 'all' as const,
        };

        mockedValidateInput.mockReturnValue(validated);
        mockedGetIssue.mockResolvedValue(makeMockIssue('TEST-1'));

        const result = await handleGetIssueGraph(input);

        expect(result.content[0].type).toBe('text');
        const text = result.content[0].text;
        expect(text).toContain('TEST-1');
        expect(text).toContain('1 nodes');
        expect(text).toContain('0 edges');
        expect(text).toContain('mermaid');
      });
    });

    describe('parent-child hierarchy', () => {
      it('should follow parent link', async () => {
        const input = { issueKey: 'TEST-2' };
        const validated = {
          issueKey: 'TEST-2',
          maxDepth: 2,
          maxNodes: 50,
          includeHierarchy: true,
          direction: 'all' as const,
        };

        mockedValidateInput.mockReturnValue(validated);

        const childIssue = makeMockIssue('TEST-2', {
          parent: { key: 'TEST-1' },
          issueType: 'Story',
        });
        const parentIssue = makeMockIssue('TEST-1', {
          issueType: 'Epic',
          subtasks: [{ key: 'TEST-2' }],
        });

        mockedGetIssue
          .mockResolvedValueOnce(childIssue) // seed
          .mockResolvedValueOnce(parentIssue); // parent

        const result = await handleGetIssueGraph(input);
        const text = result.content[0].text;

        expect(text).toContain('2 nodes');
        expect(text).toContain('parent of');
        expect(text).toContain('TEST-1');
        expect(text).toContain('TEST-2');
      });

      it('should follow subtask links', async () => {
        const input = { issueKey: 'TEST-1' };
        const validated = {
          issueKey: 'TEST-1',
          maxDepth: 2,
          maxNodes: 50,
          includeHierarchy: true,
          direction: 'all' as const,
        };

        mockedValidateInput.mockReturnValue(validated);

        const parentIssue = makeMockIssue('TEST-1', {
          subtasks: [{ key: 'TEST-2' }, { key: 'TEST-3' }],
        });
        const sub1 = makeMockIssue('TEST-2', { parent: { key: 'TEST-1' } });
        const sub2 = makeMockIssue('TEST-3', { parent: { key: 'TEST-1' } });

        mockedGetIssue
          .mockResolvedValueOnce(parentIssue)
          .mockResolvedValueOnce(sub1)
          .mockResolvedValueOnce(sub2);

        const result = await handleGetIssueGraph(input);
        const text = result.content[0].text;

        expect(text).toContain('3 nodes');
        expect(text).toContain('TEST-1');
        expect(text).toContain('TEST-2');
        expect(text).toContain('TEST-3');
      });

      it('should skip hierarchy when includeHierarchy is false', async () => {
        const input = { issueKey: 'TEST-2' };
        const validated = {
          issueKey: 'TEST-2',
          maxDepth: 2,
          maxNodes: 50,
          includeHierarchy: false,
          direction: 'all' as const,
        };

        mockedValidateInput.mockReturnValue(validated);

        const issue = makeMockIssue('TEST-2', { parent: { key: 'TEST-1' } });
        mockedGetIssue.mockResolvedValue(issue);

        const result = await handleGetIssueGraph(input);
        const text = result.content[0].text;

        // Should only have the seed node since parent is not followed
        expect(text).toContain('1 nodes');
        expect(mockedGetIssue).toHaveBeenCalledTimes(1);
      });
    });

    describe('issue links', () => {
      it('should follow outward block links', async () => {
        const input = { issueKey: 'TEST-1' };
        const validated = {
          issueKey: 'TEST-1',
          maxDepth: 2,
          maxNodes: 50,
          includeHierarchy: true,
          direction: 'all' as const,
        };

        mockedValidateInput.mockReturnValue(validated);

        const issue1 = makeMockIssue('TEST-1', {
          issuelinks: [makeIssueLink('Blocks', 'outward', 'TEST-2', 'blocks', 'is blocked by')],
        });
        const issue2 = makeMockIssue('TEST-2');

        mockedGetIssue.mockResolvedValueOnce(issue1).mockResolvedValueOnce(issue2);

        const result = await handleGetIssueGraph(input);
        const text = result.content[0].text;

        expect(text).toContain('2 nodes');
        expect(text).toContain('blocks');
        expect(text).toContain('TEST-2');
      });

      it('should follow inward links', async () => {
        const input = { issueKey: 'TEST-2' };
        const validated = {
          issueKey: 'TEST-2',
          maxDepth: 2,
          maxNodes: 50,
          includeHierarchy: true,
          direction: 'all' as const,
        };

        mockedValidateInput.mockReturnValue(validated);

        const issue2 = makeMockIssue('TEST-2', {
          issuelinks: [makeIssueLink('Blocks', 'inward', 'TEST-1', 'blocks', 'is blocked by')],
        });
        const issue1 = makeMockIssue('TEST-1');

        mockedGetIssue.mockResolvedValueOnce(issue2).mockResolvedValueOnce(issue1);

        const result = await handleGetIssueGraph(input);
        const text = result.content[0].text;

        expect(text).toContain('2 nodes');
        expect(text).toContain('blocks');
      });

      it('should filter by link types', async () => {
        const input = { issueKey: 'TEST-1' };
        const validated = {
          issueKey: 'TEST-1',
          maxDepth: 2,
          maxNodes: 50,
          includeHierarchy: true,
          direction: 'all' as const,
          linkTypes: ['Blocks'],
        };

        mockedValidateInput.mockReturnValue(validated);

        const issue = makeMockIssue('TEST-1', {
          issuelinks: [
            makeIssueLink('Blocks', 'outward', 'TEST-2', 'blocks', 'is blocked by'),
            makeIssueLink('Relates', 'outward', 'TEST-3', 'relates to', 'relates to'),
          ],
        });
        const issue2 = makeMockIssue('TEST-2');

        mockedGetIssue.mockResolvedValueOnce(issue).mockResolvedValueOnce(issue2);

        const result = await handleGetIssueGraph(input);
        const text = result.content[0].text;

        // TEST-3 should not be in the graph (Relates filtered out)
        expect(text).toContain('TEST-2');
        expect(text).not.toContain('TEST-3');
      });

      it('should respect direction filter', async () => {
        const input = { issueKey: 'TEST-1' };
        const validated = {
          issueKey: 'TEST-1',
          maxDepth: 2,
          maxNodes: 50,
          includeHierarchy: false,
          direction: 'outward' as const,
        };

        mockedValidateInput.mockReturnValue(validated);

        const issue = makeMockIssue('TEST-1', {
          issuelinks: [
            makeIssueLink('Blocks', 'outward', 'TEST-2', 'blocks', 'is blocked by'),
            makeIssueLink('Blocks', 'inward', 'TEST-3', 'blocks', 'is blocked by'),
          ],
        });
        const issue2 = makeMockIssue('TEST-2');

        mockedGetIssue.mockResolvedValueOnce(issue).mockResolvedValueOnce(issue2);

        const result = await handleGetIssueGraph(input);
        const text = result.content[0].text;

        // TEST-3 should not be traversed (inward link, but direction is outward)
        expect(text).toContain('TEST-2');
        expect(text).not.toContain('TEST-3');
      });
    });

    describe('depth limiting', () => {
      it('should respect maxDepth', async () => {
        const input = { issueKey: 'TEST-1' };
        const validated = {
          issueKey: 'TEST-1',
          maxDepth: 1,
          maxNodes: 50,
          includeHierarchy: true,
          direction: 'all' as const,
        };

        mockedValidateInput.mockReturnValue(validated);

        // TEST-1 -> TEST-2 -> TEST-3 (depth 2, but maxDepth is 1)
        const issue1 = makeMockIssue('TEST-1', {
          issuelinks: [makeIssueLink('Blocks', 'outward', 'TEST-2')],
        });
        const issue2 = makeMockIssue('TEST-2', {
          issuelinks: [makeIssueLink('Blocks', 'outward', 'TEST-3')],
        });

        mockedGetIssue.mockResolvedValueOnce(issue1).mockResolvedValueOnce(issue2);

        const result = await handleGetIssueGraph(input);
        const text = result.content[0].text;

        // TEST-3 should NOT be fetched (beyond maxDepth)
        expect(text).toContain('TEST-1');
        expect(text).toContain('TEST-2');
        expect(text).not.toContain('TEST-3');
      });
    });

    describe('maxNodes limiting', () => {
      it('should stop fetching when maxNodes is reached', async () => {
        const input = { issueKey: 'TEST-1' };
        const validated = {
          issueKey: 'TEST-1',
          maxDepth: 5,
          maxNodes: 2,
          includeHierarchy: true,
          direction: 'all' as const,
        };

        mockedValidateInput.mockReturnValue(validated);

        const issue1 = makeMockIssue('TEST-1', {
          issuelinks: [
            makeIssueLink('Blocks', 'outward', 'TEST-2'),
            makeIssueLink('Blocks', 'outward', 'TEST-3'),
          ],
        });
        const issue2 = makeMockIssue('TEST-2');

        mockedGetIssue.mockResolvedValueOnce(issue1).mockResolvedValueOnce(issue2);

        const result = await handleGetIssueGraph(input);
        const text = result.content[0].text;

        // Should have at most 2 nodes
        expect(text).toContain('2 nodes');
      });
    });

    describe('circular references', () => {
      it('should handle circular links without infinite loop', async () => {
        const input = { issueKey: 'TEST-1' };
        const validated = {
          issueKey: 'TEST-1',
          maxDepth: 3,
          maxNodes: 50,
          includeHierarchy: true,
          direction: 'all' as const,
        };

        mockedValidateInput.mockReturnValue(validated);

        // TEST-1 -> TEST-2 -> TEST-1 (cycle)
        const issue1 = makeMockIssue('TEST-1', {
          issuelinks: [makeIssueLink('Relates', 'outward', 'TEST-2', 'relates to', 'relates to')],
        });
        const issue2 = makeMockIssue('TEST-2', {
          issuelinks: [makeIssueLink('Relates', 'outward', 'TEST-1', 'relates to', 'relates to')],
        });

        mockedGetIssue.mockResolvedValueOnce(issue1).mockResolvedValueOnce(issue2);

        const result = await handleGetIssueGraph(input);
        const text = result.content[0].text;

        expect(text).toContain('2 nodes');
        // Should not loop forever
        expect(mockedGetIssue).toHaveBeenCalledTimes(2);
      });
    });

    describe('error handling', () => {
      it('should handle errors gracefully', async () => {
        const input = { issueKey: 'TEST-1' };
        const error = new Error('API error');

        mockedValidateInput.mockImplementation(() => {
          throw error;
        });
        mockedHandleError.mockReturnValue({
          content: [{ type: 'text', text: 'Error: API error' }],
        });

        const result = await handleGetIssueGraph(input);

        expect(mockedHandleError).toHaveBeenCalledWith(error);
        expect(result.content[0].text).toContain('Error');
      });

      it('should skip issues that fail to fetch', async () => {
        const input = { issueKey: 'TEST-1' };
        const validated = {
          issueKey: 'TEST-1',
          maxDepth: 2,
          maxNodes: 50,
          includeHierarchy: true,
          direction: 'all' as const,
        };

        mockedValidateInput.mockReturnValue(validated);

        const issue1 = makeMockIssue('TEST-1', {
          issuelinks: [makeIssueLink('Blocks', 'outward', 'TEST-2')],
        });

        mockedGetIssue.mockResolvedValueOnce(issue1).mockRejectedValueOnce(new Error('Not found'));

        const result = await handleGetIssueGraph(input);
        const text = result.content[0].text;

        // Should still return a graph with just the seed node
        expect(text).toContain('1 nodes');
      });
    });

    describe('mermaid output', () => {
      it('should generate valid mermaid diagram', async () => {
        const input = { issueKey: 'TEST-1' };
        const validated = {
          issueKey: 'TEST-1',
          maxDepth: 2,
          maxNodes: 50,
          includeHierarchy: true,
          direction: 'all' as const,
        };

        mockedValidateInput.mockReturnValue(validated);

        const issue1 = makeMockIssue('TEST-1', {
          status: 'Done',
          statusCategory: 'Done',
          issuelinks: [makeIssueLink('Blocks', 'outward', 'TEST-2', 'blocks')],
        });
        const issue2 = makeMockIssue('TEST-2', {
          status: 'In Progress',
          statusCategory: 'In Progress',
        });

        mockedGetIssue.mockResolvedValueOnce(issue1).mockResolvedValueOnce(issue2);

        const result = await handleGetIssueGraph(input);
        const text = result.content[0].text;

        expect(text).toContain('```mermaid');
        expect(text).toContain('graph TD');
        expect(text).toContain('TEST-1');
        expect(text).toContain('TEST-2');
        expect(text).toContain('classDef done');
        expect(text).toContain('classDef inprogress');
      });
    });
  });
});
