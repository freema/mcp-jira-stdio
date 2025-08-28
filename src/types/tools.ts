import { z } from 'zod';

// Get visible projects
export const GetVisibleProjectsInputSchema = z.object({
  expand: z.array(z.string()).optional().describe('Additional project details to include'),
  recent: z.number().optional().describe('Limit to recently accessed projects'),
});

export type GetVisibleProjectsInput = z.infer<typeof GetVisibleProjectsInputSchema>;

// Get issue
export const GetIssueInputSchema = z.object({
  issueKey: z.string().describe('Issue key (e.g., PROJECT-123)'),
  expand: z.array(z.string()).optional().describe('Additional issue details to include'),
  fields: z.array(z.string()).optional().describe('Specific fields to retrieve'),
});

export type GetIssueInput = z.infer<typeof GetIssueInputSchema>;

// Search issues
export const SearchIssuesInputSchema = z.object({
  jql: z.string().describe('JQL query string'),
  startAt: z.number().min(0).default(0).describe('Index of first result to return'),
  maxResults: z
    .number()
    .min(1)
    .max(100)
    .default(50)
    .describe('Maximum number of results to return'),
  fields: z.array(z.string()).optional().describe('Specific fields to retrieve'),
  expand: z.array(z.string()).optional().describe('Additional details to include'),
});

export type SearchIssuesInput = z.infer<typeof SearchIssuesInputSchema>;

// Create issue
export const CreateIssueInputSchema = z.object({
  projectKey: z.string().describe('Project key where the issue will be created'),
  summary: z.string().min(1).describe('Issue summary/title'),
  description: z.string().optional().describe('Issue description'),
  issueType: z.string().describe('Issue type (e.g., Bug, Story, Task)'),
  priority: z.string().optional().describe('Issue priority'),
  assignee: z.string().optional().describe('Assignee account ID'),
  labels: z.array(z.string()).optional().describe('Issue labels'),
  components: z.array(z.string()).optional().describe('Component names'),
});

export type CreateIssueInput = z.infer<typeof CreateIssueInputSchema>;

// Update issue
export const UpdateIssueInputSchema = z.object({
  issueKey: z.string().describe('Issue key to update'),
  summary: z.string().optional().describe('New summary'),
  description: z.string().optional().describe('New description'),
  priority: z.string().optional().describe('New priority'),
  assignee: z.string().optional().describe('New assignee account ID'),
  labels: z.array(z.string()).optional().describe('New labels (replaces existing)'),
  components: z.array(z.string()).optional().describe('New components (replaces existing)'),
});

export type UpdateIssueInput = z.infer<typeof UpdateIssueInputSchema>;

// Get my issues
export const GetMyIssuesInputSchema = z.object({
  startAt: z.number().min(0).default(0).describe('Index of first result to return'),
  maxResults: z
    .number()
    .min(1)
    .max(100)
    .default(50)
    .describe('Maximum number of results to return'),
  fields: z.array(z.string()).optional().describe('Specific fields to retrieve'),
  expand: z.array(z.string()).optional().describe('Additional details to include'),
});

export type GetMyIssuesInput = z.infer<typeof GetMyIssuesInputSchema>;

// Get issue types
export const GetIssueTypesInputSchema = z.object({
  projectKey: z.string().optional().describe('Project key to get issue types for specific project'),
});

export type GetIssueTypesInput = z.infer<typeof GetIssueTypesInputSchema>;

// Get users
export const GetUsersInputSchema = z.object({
  query: z.string().optional().describe('Search query for user name or email'),
  username: z.string().optional().describe('Specific username to search for'),
  accountId: z.string().optional().describe('Specific account ID to search for'),
  startAt: z.number().min(0).default(0).describe('Index of first result to return'),
  maxResults: z.number().min(1).max(50).default(50).describe('Maximum number of results to return'),
});

export type GetUsersInput = z.infer<typeof GetUsersInputSchema>;

// Get priorities
export const GetPrioritiesInputSchema = z.object({});

export type GetPrioritiesInput = z.infer<typeof GetPrioritiesInputSchema>;

// Get statuses
export const GetStatusesInputSchema = z.object({
  projectKey: z.string().optional().describe('Project key to get statuses for specific project'),
  issueTypeId: z
    .string()
    .optional()
    .describe('Issue type ID to get statuses for specific issue type'),
});

export type GetStatusesInput = z.infer<typeof GetStatusesInputSchema>;

// Add comment
export const AddCommentInputSchema = z.object({
  issueKey: z.string().describe('Issue key to add comment to'),
  body: z.string().min(1).describe('Comment body text'),
  visibility: z
    .object({
      type: z.enum(['group', 'role']).describe('Visibility type'),
      value: z.string().describe('Group name or role name'),
    })
    .optional()
    .describe('Comment visibility restrictions'),
});

export type AddCommentInput = z.infer<typeof AddCommentInputSchema>;

// Get project info
export const GetProjectInfoInputSchema = z.object({
  projectKey: z.string().describe('Project key to get detailed information for'),
  expand: z.array(z.string()).optional().describe('Additional project details to include'),
});

export type GetProjectInfoInput = z.infer<typeof GetProjectInfoInputSchema>;

// Create subtask
export const CreateSubtaskInputSchema = z.object({
  parentIssueKey: z.string().describe('Parent issue key'),
  summary: z.string().min(1).describe('Subtask summary/title'),
  description: z.string().optional().describe('Subtask description'),
  priority: z.string().optional().describe('Subtask priority'),
  assignee: z.string().optional().describe('Assignee account ID'),
  labels: z.array(z.string()).optional().describe('Subtask labels'),
  components: z.array(z.string()).optional().describe('Component names'),
});

export type CreateSubtaskInput = z.infer<typeof CreateSubtaskInputSchema>;
