import { z } from 'zod';
import { isValidIssueKey, isValidProjectKey } from '../utils/validators.js';

// Get visible projects
export const GetVisibleProjectsInputSchema = z.object({
  expand: z.array(z.string()).optional().describe('Additional project details to include'),
  recent: z.number().optional().describe('Limit to recently accessed projects'),
});

export type GetVisibleProjectsInput = z.infer<typeof GetVisibleProjectsInputSchema>;

// Get issue
export const GetIssueInputSchema = z.object({
  issueKey: z
    .string()
    .min(1)
    .describe(
      'Issue key or full Jira URL (e.g., PROJECT-123 or https://your.atlassian.net/browse/PROJECT-123)'
    ),
  expand: z.array(z.string()).optional().describe('Additional issue details to include'),
  fields: z.array(z.string()).optional().describe('Specific fields to retrieve'),
});

export type GetIssueInput = z.infer<typeof GetIssueInputSchema>;

// Search issues
export const SearchIssuesInputSchema = z.object({
  jql: z.string().min(1).describe('JQL query string'),
  nextPageToken: z
    .string()
    .optional()
    .describe(
      'Token for pagination. Omit for first page, use value from previous response for next page.'
    ),
  maxResults: z
    .number()
    .min(1)
    .max(100)
    .default(50)
    .describe('Maximum number of results to return per page'),
  fields: z.array(z.string()).optional().describe('Specific fields to retrieve'),
  expand: z.array(z.string()).optional().describe('Additional details to include'),
});

export type SearchIssuesInput = z.infer<typeof SearchIssuesInputSchema>;

// Create issue
export const CreateIssueInputSchema = z.object({
  projectKey: z
    .string()
    .describe('Project key where the issue will be created')
    .refine((v) => isValidProjectKey(v), 'Invalid project key format'),
  summary: z.string().min(1).describe('Issue summary/title'),
  description: z
    .union([z.string(), z.any()])
    .optional()
    .describe('Issue description. Accepts plain text or ADF object.'),
  issueType: z.string().describe('Issue type (e.g., Bug, Story, Task)'),
  priority: z.string().optional().describe('Issue priority'),
  assignee: z.string().optional().describe('Assignee account ID'),
  labels: z.array(z.string()).optional().describe('Issue labels'),
  components: z.array(z.string()).optional().describe('Component names'),
  customFields: z
    .record(z.any())
    .optional()
    .describe(
      'Additional Jira field mappings, e.g. { "customfield_12345": value }. Use for required custom fields.'
    ),
  returnIssue: z
    .boolean()
    .optional()
    .describe('When false, skip fetching full issue after creation'),
  format: z
    .enum(['markdown', 'adf', 'plain'])
    .optional()
    .default('markdown')
    .describe(
      'Description format: "markdown" (converts Markdown to ADF), "adf" (use as-is ADF object), "plain" (converts plain text to ADF with basic formatting). Default: "markdown"'
    ),
});

export type CreateIssueInput = z.infer<typeof CreateIssueInputSchema>;

// Update issue
export const UpdateIssueInputSchema = z.object({
  issueKey: z
    .string()
    .describe('Issue key to update')
    .refine((v) => isValidIssueKey(v), 'Invalid issue key format'),
  summary: z.string().optional().describe('New summary'),
  description: z
    .union([z.string(), z.any()])
    .optional()
    .describe('New description. Accepts plain text or ADF object.'),
  priority: z.string().optional().describe('New priority'),
  assignee: z.string().optional().describe('New assignee account ID'),
  labels: z.array(z.string()).optional().describe('New labels (replaces existing)'),
  components: z.array(z.string()).optional().describe('New components (replaces existing)'),
  returnIssue: z.boolean().optional().describe('When false, skip fetching full issue after update'),
  format: z
    .enum(['markdown', 'adf', 'plain'])
    .optional()
    .default('markdown')
    .describe(
      'Description format: "markdown" (converts Markdown to ADF), "adf" (use as-is ADF object), "plain" (converts plain text to ADF with basic formatting). Default: "markdown"'
    ),
});

export type UpdateIssueInput = z.infer<typeof UpdateIssueInputSchema>;

// Get my issues
export const GetMyIssuesInputSchema = z.object({
  nextPageToken: z
    .string()
    .optional()
    .describe(
      'Token for pagination. Omit for first page, use value from previous response for next page.'
    ),
  maxResults: z
    .number()
    .min(1)
    .max(100)
    .default(50)
    .describe('Maximum number of results to return per page'),
  fields: z.array(z.string()).optional().describe('Specific fields to retrieve'),
  expand: z.array(z.string()).optional().describe('Additional details to include'),
});

export type GetMyIssuesInput = z.infer<typeof GetMyIssuesInputSchema>;

// Get issue types
export const GetIssueTypesInputSchema = z.object({
  projectKey: z
    .string()
    .optional()
    .describe('Project key to get issue types for specific project')
    .refine((v) => (v ? isValidProjectKey(v) : true), 'Invalid project key format'),
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
  projectKey: z
    .string()
    .optional()
    .describe('Project key to get statuses for specific project')
    .refine((v) => (v ? isValidProjectKey(v) : true), 'Invalid project key format'),
  issueTypeId: z
    .string()
    .optional()
    .describe('Issue type ID to get statuses for specific issue type'),
});

export type GetStatusesInput = z.infer<typeof GetStatusesInputSchema>;

// Add comment
export const AddCommentInputSchema = z.object({
  issueKey: z
    .string()
    .describe('Issue key to add comment to')
    .refine((v) => isValidIssueKey(v), 'Invalid issue key format'),
  body: z.string().min(1).describe('Comment body text'),
  visibility: z
    .object({
      type: z.enum(['group', 'role']).describe('Visibility type'),
      value: z.string().describe('Group name or role name'),
    })
    .optional()
    .describe('Comment visibility restrictions'),
  format: z
    .enum(['markdown', 'adf', 'plain'])
    .optional()
    .default('markdown')
    .describe(
      'Comment format: "markdown" (converts Markdown to ADF), "adf" (use as-is ADF object), "plain" (converts plain text to ADF with basic formatting). Default: "markdown"'
    ),
});

export type AddCommentInput = z.infer<typeof AddCommentInputSchema>;

// Get project info
export const GetProjectInfoInputSchema = z.object({
  projectKey: z
    .string()
    .describe('Project key to get detailed information for')
    .refine((v) => isValidProjectKey(v), 'Invalid project key format'),
  expand: z.array(z.string()).optional().describe('Additional project details to include'),
});

export type GetProjectInfoInput = z.infer<typeof GetProjectInfoInputSchema>;

// Create subtask
export const CreateSubtaskInputSchema = z.object({
  parentIssueKey: z.string().describe('Parent issue key'),
  summary: z.string().min(1).describe('Subtask summary/title'),
  description: z
    .union([z.string(), z.any()])
    .optional()
    .describe('Subtask description. Accepts plain text or ADF object.'),
  priority: z.string().optional().describe('Subtask priority'),
  assignee: z.string().optional().describe('Assignee account ID'),
  labels: z.array(z.string()).optional().describe('Subtask labels'),
  components: z.array(z.string()).optional().describe('Component names'),
  format: z
    .enum(['markdown', 'adf', 'plain'])
    .optional()
    .default('markdown')
    .describe(
      'Description format: "markdown" (converts Markdown to ADF), "adf" (use as-is ADF object), "plain" (converts plain text to ADF with basic formatting). Default: "markdown"'
    ),
});

export type CreateSubtaskInput = z.infer<typeof CreateSubtaskInputSchema>;

// Get create meta
export const GetCreateMetaInputSchema = z.object({
  projectKey: z
    .string()
    .describe('Project key to get create metadata for')
    .refine((v) => isValidProjectKey(v), 'Invalid project key format'),
  issueTypeName: z
    .string()
    .optional()
    .describe('Specific issue type name to get metadata for (optional)'),
});

export type GetCreateMetaInput = z.infer<typeof GetCreateMetaInputSchema>;

// Get custom fields
export const GetCustomFieldsInputSchema = z.object({
  projectKey: z
    .string()
    .optional()
    .describe('Project key to filter custom fields (optional)')
    .refine((v) => (v ? isValidProjectKey(v) : true), 'Invalid project key format'),
});

export type GetCustomFieldsInput = z.infer<typeof GetCustomFieldsInputSchema>;
