/**
 * Linear service for creating issues using the Linear TypeScript SDK
 * 
 * Uses the Linear SDK to create issues directly from the backend,
 * removing the need for agent webhook tools.
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
}

interface CreateIssueResult {
  id: string;
  url: string;
}

/**
 * Creates a Linear issue using the Linear TypeScript SDK.
 * 
 * @param params - Issue creation parameters
 * @returns Issue ID and URL
 */
export async function createLinearIssue(
  params: CreateIssueParams
): Promise<CreateIssueResult> {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) {
    throw new Error("LINEAR_API_KEY environment variable is required");
  }

  const linear = new LinearClient({ apiKey });

  // Resolve team ID - prefer env, otherwise fetch teams
  let teamId = params.teamId || process.env.LINEAR_TEAM_ID;
  
  if (!teamId) {
    // Fallback: fetch teams and select by key or name
    const teams = await linear.teams();
    const team = teams.nodes.find(
      (t) => t.key === "ENG" || t.name === "Engineering"
    );
    
    if (!team?.id) {
      throw new Error("Unable to resolve Linear team ID. Set LINEAR_TEAM_ID env var or provide teamId in params.");
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
