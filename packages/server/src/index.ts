import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getSignedUrl } from "./services/elevenlabs";
import { detectIntent, IntentResultSchema } from "./services/intentDetector";
import {
	generateMockup,
	type MockupRequest,
} from "./services/mockupGenerator";
import { createLinearIssue } from "./services/linear";

const app = new Hono();

// Extract schemas to break type inference cycles
const IntentRequestSchema = z.object({
	transcript: z.string().min(1, "Transcript text is required"),
});

const MockupRequestSchema = z.object({
	component: z.string().min(1, "Component type is required"),
	intent: z.string().min(1, "Intent is required"),
	context: z.string().nullable().optional(),
	brandColors: z
		.object({
			primary: z.string().optional(),
			secondary: z.string().optional(),
			accent: z.string().optional(),
		})
		.optional(),
});

const LinearIssueRequestSchema = z.object({
	title: z.string().min(1, "Title is required"),
	description: z.string().min(1, "Description is required"),
	teamId: z.string().optional(),
	assigneeId: z.string().optional(),
	projectId: z.string().optional(),
	labelIds: z.array(z.string()).optional(),
	priority: z.number().optional(),
});

const route = app
	/**
	 * GET /health
	 * Health check endpoint for Docker and monitoring.
	 */
	.get("/health", async (c) => {
		return c.json({ status: "ok" });
	})
	/**
	 * GET /signed-url
	 * Returns a short-lived signed URL for browser WebSocket connection to ElevenLabs.
	 * The API key is never exposed to the client.
	 */
	.get("/signed-url", async (c) => {
		try {
			fetch(
				"http://127.0.0.1:7245/ingest/f0605e8a-dbe2-42bd-9d1d-9c2fc6e6c45d",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						sessionId: "debug-session",
						runId: "run1",
						hypothesisId: "A",
						location: "server/src/index.ts:/signed-url",
						message: "Signed URL route hit",
						data: {},
						timestamp: Date.now(),
					}),
				}
			).catch(() => {});
			// #endregion
			const signedUrl = await getSignedUrl();
			// #region agent log
			fetch(
				"http://127.0.0.1:7245/ingest/f0605e8a-dbe2-42bd-9d1d-9c2fc6e6c45d",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						sessionId: "debug-session",
						runId: "run1",
						hypothesisId: "A",
						location: "server/src/index.ts:/signed-url",
						message: "Signed URL generated",
						data: {
							urlLength: signedUrl.length,
							urlPreview: signedUrl.substring(0, 32) + "...",
						},
						timestamp: Date.now(),
					}),
				}
			).catch(() => {});
			// #endregion
			return c.json({ signedUrl });
		} catch (error) {
			console.error("Failed to get signed URL:", error);
			// #region agent log
			fetch(
				"http://127.0.0.1:7245/ingest/f0605e8a-dbe2-42bd-9d1d-9c2fc6e6c45d",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						sessionId: "debug-session",
						runId: "run1",
						hypothesisId: "A",
						location: "server/src/index.ts:/signed-url",
						message: "Signed URL route error",
						data: {
							error: error instanceof Error ? error.message : String(error),
						},
						timestamp: Date.now(),
					}),
				}
			).catch(() => {});
			// #endregion
			return c.json(
				{
					error:
						error instanceof Error ? error.message : "Failed to get signed URL",
				},
				500
			);
		}
	})

	/**
	 * POST /intent
	 * Analyzes transcript text to detect UI-related requests.
	 * Returns structured intent data with confidence score.
	 */
	.post("/intent", zValidator("json", IntentRequestSchema), async (c) => {
		try {
			const { transcript } = c.req.valid("json");
			const result = await detectIntent(transcript);
			return c.json(result);
		} catch (error) {
			console.error("Failed to detect intent:", error);
			return c.json(
				{
					error:
						error instanceof Error ? error.message : "Failed to detect intent",
				},
				500
			);
		}
	})

	/**
	 * POST /mockup
	 * Generates HTML/CSS mockup variants based on detected intent.
	 * Returns 1-2 design variants that can be rendered in an iframe.
	 */
	.post("/mockup", zValidator("json", MockupRequestSchema), async (c) => {
		try {
			const request = c.req.valid("json") as MockupRequest;
			const result = await generateMockup(request);
			return c.json(result);
		} catch (error) {
			console.error("Failed to generate mockup:", error);
			return c.json(
				{
					error:
						error instanceof Error
							? error.message
							: "Failed to generate mockup",
				},
				500
			);
		}
	})

	/**
	 * POST /linear/issues
	 * Creates a Linear issue using the Linear TypeScript SDK.
	 * Returns the created issue ID and URL.
	 */
	.post("/linear/issues", zValidator("json", LinearIssueRequestSchema), async (c) => {
		try {
			const request = c.req.valid("json");
			const result = await createLinearIssue(request);
			return c.json(result);
		} catch (error) {
			console.error("Failed to create Linear issue:", error);
			return c.json(
				{
					error:
						error instanceof Error
							? error.message
							: "Failed to create Linear issue",
				},
				500
			);
		}
	});

export type AppType = typeof route;

export default app;
