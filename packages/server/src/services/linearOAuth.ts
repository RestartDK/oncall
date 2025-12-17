/**
 * Linear OAuth2 service for handling OAuth flow
 * Implements Authorization Code flow as per Linear's OAuth2 documentation
 */

interface TokenResponse {
	access_token: string;
	token_type: string;
	expires_in?: number;
	scope?: string;
}

/**
 * Exchanges an authorization code for an access token
 */
export async function exchangeCodeForToken(
	code: string
): Promise<TokenResponse> {
	const clientId = process.env.LINEAR_OAUTH_CLIENT_ID;
	const clientSecret = process.env.LINEAR_OAUTH_CLIENT_SECRET;
	const publicOrigin = process.env.PUBLIC_ORIGIN;

	if (!clientId || !clientSecret || !publicOrigin) {
		throw new Error(
			"LINEAR_OAUTH_CLIENT_ID, LINEAR_OAUTH_CLIENT_SECRET, and PUBLIC_ORIGIN environment variables are required"
		);
	}

	const redirectUri = `${publicOrigin}/api/auth/linear/callback`;

	const response = await fetch("https://api.linear.app/oauth/token", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: new URLSearchParams({
			grant_type: "authorization_code",
			code,
			redirect_uri: redirectUri,
			client_id: clientId,
			client_secret: clientSecret,
		}),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(
			`Failed to exchange code for token: ${response.status} ${errorText}`
		);
	}

	return (await response.json()) as TokenResponse;
}

/**
 * Builds the Linear OAuth authorization URL
 */
export function buildAuthorizationUrl(state: string): string {
	const clientId = process.env.LINEAR_OAUTH_CLIENT_ID;
	const publicOrigin = process.env.PUBLIC_ORIGIN;

	if (!clientId || !publicOrigin) {
		throw new Error(
			"LINEAR_OAUTH_CLIENT_ID and PUBLIC_ORIGIN environment variables are required"
		);
	}

	const redirectUri = `${publicOrigin}/api/auth/linear/callback`;

	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		response_type: "code",
		scope: "issues:create",
		state,
	});

	return `https://linear.app/oauth/authorize?${params.toString()}`;
}
