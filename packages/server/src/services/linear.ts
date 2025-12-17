/**
 * Linear service for creating issues using the Linear TypeScript SDK
 * 
 * Uses OAuth access tokens from user sessions (OAuth-only; no API keys).
 */

import { LinearClient } from "@linear/sdk";

interface CreateIssueParams {
  title: string;
  description: string;
  teamId?: string;
  assigneeId?: string;
  projectId?: string;
  labelIds?: string[];
  priority?: number;
  accessToken: string; // OAuth access token from session
}

interface CreateIssueResult {
  id: string;
  url: string;
}

/**
 * Creates a Linear issue using the Linear TypeScript SDK with OAuth access token.
 * 
 * @param params - Issue creation parameters including OAuth accessToken
 * @returns Issue ID and URL
 */
export async function createLinearIssue(
  params: CreateIssueParams
): Promise<CreateIssueResult> {
  if (!params.accessToken) {
    throw new Error("OAuth access token is required. Please connect your Linear account.");
  }

  const linear = new LinearClient({ accessToken: params.accessToken });

  // Resolve team ID - fetch teams if not provided
  let teamId = params.teamId;
  
  if (!teamId) {
    // Fetch teams and select the first available team
    const teams = await linear.teams();
    const team = teams.nodes[0];
    
    if (!team?.id) {
      throw new Error("Unable to resolve Linear team ID. Please provide teamId in params.");
    }
    
    teamId = team.id;
  }

  // Create the issue
  const payload = await linear.createIssue({
    teamId,
    title: params.title,
    description: params.description,
    ...(params.assigneeId && { assigneeId: params.assigneeId }),
    ...(params.projectId && { projectId: params.projectId }),
    ...(params.labelIds && params.labelIds.length > 0 && { labelIds: params.labelIds }),
    ...(params.priority !== undefined && { priority: params.priority }),
  });

  if (!payload.success || !payload.issue) {
    throw new Error("Linear createIssue failed");
  }

  // Fetch the issue to get id and url (issue is a LinearFetch that needs to be resolved)
  const issue = await payload.issue;

  return {
    id: issue.id,
    url: issue.url,
  };
}
