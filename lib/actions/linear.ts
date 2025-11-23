import type { ActionHandler } from "./types";

const LINEAR_API_URL = "https://api.linear.app/graphql";

/**
 * Create an issue in Linear
 */
export const createIssue: ActionHandler = async (context, params) => {
    const { title, description, teamId, priority, assigneeId, labelIds } = params;

    if (!title || !teamId) {
        return {
            success: false,
            error: "Missing required fields: title, teamId",
        };
    }

    try {
        const mutation = `
      mutation IssueCreate($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            title
            identifier
            url
          }
        }
      }
    `;

        const variables = {
            input: {
                title,
                description,
                teamId,
                priority,
                assigneeId,
                labelIds,
            },
        };

        const response = await fetch(LINEAR_API_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${context.accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                query: mutation,
                variables,
            }),
        });

        const data = await response.json();

        if (data.errors) {
            return {
                success: false,
                error: `Linear API error: ${data.errors[0].message}`,
            };
        }

        return {
            success: true,
            data: data.data.issueCreate.issue,
        };
    } catch (error) {
        return {
            success: false,
            error: `Error creating issue: ${error}`,
        };
    }
};

/**
 * List teams in Linear
 */
export const listTeams: ActionHandler = async (context, params) => {
    try {
        const query = `
      query {
        teams {
          nodes {
            id
            name
            key
          }
        }
      }
    `;

        const response = await fetch(LINEAR_API_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${context.accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ query }),
        });

        const data = await response.json();

        if (data.errors) {
            return {
                success: false,
                error: `Linear API error: ${data.errors[0].message}`,
            };
        }

        return {
            success: true,
            data: {
                teams: data.data.teams.nodes,
            },
        };
    } catch (error) {
        return {
            success: false,
            error: `Error listing teams: ${error}`,
        };
    }
};

/**
 * Search issues in Linear
 */
export const searchIssues: ActionHandler = async (context, params) => {
    const { query, limit = 10 } = params;

    if (!query) {
        return {
            success: false,
            error: "Missing required field: query",
        };
    }

    try {
        const graphqlQuery = `
      query SearchIssues($query: String!, $first: Int!) {
        issueSearch(query: $query, first: $first) {
          nodes {
            id
            title
            identifier
            url
            state {
              name
            }
          }
        }
      }
    `;

        const response = await fetch(LINEAR_API_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${context.accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                query: graphqlQuery,
                variables: {
                    query,
                    first: limit,
                },
            }),
        });

        const data = await response.json();

        if (data.errors) {
            return {
                success: false,
                error: `Linear API error: ${data.errors[0].message}`,
            };
        }

        return {
            success: true,
            data: {
                issues: data.data.issueSearch.nodes,
            },
        };
    } catch (error) {
        return {
            success: false,
            error: `Error searching issues: ${error}`,
        };
    }
};

export const linearActions = {
    "create-issue": createIssue,
    "list-teams": listTeams,
    "search-issues": searchIssues,
};
