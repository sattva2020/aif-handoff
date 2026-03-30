import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const mockQuery = vi.fn();
const mockFindProjectById = vi.fn();
const mockSendToClient = vi.fn();
const mockFindTaskById = vi.fn();
const mockToTaskResponse = vi.fn();

vi.mock("@anthropic-ai/claude-agent-sdk", () => ({
  query: (args: unknown) => mockQuery(args),
}));

vi.mock("../repositories/projects.js", () => ({
  findProjectById: (id: string) => mockFindProjectById(id),
}));

vi.mock("../repositories/tasks.js", () => ({
  findTaskById: (id: string) => mockFindTaskById(id),
  toTaskResponse: (row: unknown) => mockToTaskResponse(row),
}));

vi.mock("../ws.js", () => ({
  sendToClient: (...args: unknown[]) => mockSendToClient(...args),
}));

vi.mock("@aif/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@aif/shared")>();
  return {
    ...actual,
    getEnv: () => ({
      AGENT_BYPASS_PERMISSIONS: false,
    }),
  };
});

const { chatRouter } = await import("../routes/chat.js");

function createApp() {
  const app = new Hono();
  app.route("/chat", chatRouter);
  return app;
}

function streamOf(messages: Array<Record<string, unknown>>) {
  return async function* () {
    for (const msg of messages) {
      yield msg;
    }
  };
}

describe("chat API", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
    mockQuery.mockReset();
    mockFindProjectById.mockReset();
    mockSendToClient.mockReset();
    mockFindTaskById.mockReset();
    mockToTaskResponse.mockReset();
    mockFindProjectById.mockReturnValue({
      id: "project-1",
      rootPath: "/tmp/project-1",
      name: "Test Project",
    });
  });

  it("returns 404 when project is not found", async () => {
    mockFindProjectById.mockReturnValueOnce(undefined);

    const res = await app.request("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "missing",
        message: "hello",
        clientId: "client-1",
      }),
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Project not found" });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("streams token and done events for successful response", async () => {
    mockQuery.mockImplementation(
      streamOf([
        {
          type: "stream_event",
          event: {
            type: "content_block_delta",
            delta: { type: "text_delta", text: "Hello " },
          },
        },
        {
          type: "stream_event",
          event: {
            type: "content_block_delta",
            delta: { type: "text_delta", text: "world" },
          },
        },
        { type: "result", subtype: "success" },
      ]),
    );

    const res = await app.request("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "project-1",
        message: "plain prompt",
        clientId: "client-1",
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.conversationId).toBe("string");

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const queryArgs = mockQuery.mock.calls[0][0] as { prompt: string };
    expect(queryArgs.prompt).toBe("plain prompt");

    expect(mockSendToClient).toHaveBeenNthCalledWith(
      1,
      "client-1",
      expect.objectContaining({
        type: "chat:token",
        payload: expect.objectContaining({ token: "Hello " }),
      }),
    );
    expect(mockSendToClient).toHaveBeenNthCalledWith(
      2,
      "client-1",
      expect.objectContaining({
        type: "chat:token",
        payload: expect.objectContaining({ token: "world" }),
      }),
    );
    expect(mockSendToClient).toHaveBeenNthCalledWith(
      3,
      "client-1",
      expect.objectContaining({
        type: "chat:done",
      }),
    );
  });

  it("prefixes prompt with /aif-explore when explore is enabled", async () => {
    mockQuery.mockImplementation(streamOf([{ type: "result", subtype: "success" }]));

    const res = await app.request("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "project-1",
        message: "investigate this",
        clientId: "client-1",
        explore: true,
      }),
    });

    expect(res.status).toBe(200);
    const queryArgs = mockQuery.mock.calls[0][0] as { prompt: string };
    expect(queryArgs.prompt).toBe("/aif-explore investigate this");
  });

  it("stores session from init message and uses resume for same conversation", async () => {
    mockQuery
      .mockImplementationOnce(
        streamOf([
          { type: "system", subtype: "init", session_id: "session-123" },
          { type: "result", subtype: "success" },
        ]),
      )
      .mockImplementationOnce(streamOf([{ type: "result", subtype: "success" }]));

    const conversationId = "conv-resume-1";

    const firstRes = await app.request("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "project-1",
        message: "first",
        clientId: "client-1",
        conversationId,
      }),
    });
    expect(firstRes.status).toBe(200);

    const secondRes = await app.request("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "project-1",
        message: "second",
        clientId: "client-1",
        conversationId,
      }),
    });
    expect(secondRes.status).toBe(200);

    const secondCall = mockQuery.mock.calls[1][0] as {
      options: { resume?: string };
    };
    expect(secondCall.options.resume).toBe("session-123");
  });

  it("returns 200 even when stream result subtype is non-success", async () => {
    mockQuery.mockImplementation(streamOf([{ type: "result", subtype: "error_max_turns" }]));

    const res = await app.request("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "project-1",
        message: "hello",
        clientId: "client-1",
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.conversationId).toBe("string");
    expect(mockSendToClient).toHaveBeenCalledWith(
      "client-1",
      expect.objectContaining({ type: "chat:done" }),
    );
  });

  it("returns 429 and emits chat:error for usage limit errors", async () => {
    mockQuery.mockImplementation(() => {
      throw new Error(
        "Claude Code returned an error result: You're out of extra usage · resets 7pm",
      );
    });

    const res = await app.request("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "project-1",
        message: "hello",
        clientId: "client-1",
        conversationId: "conv-limit-1",
      }),
    });

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.code).toBe("CHAT_USAGE_LIMIT");
    expect(body.error).toContain("out of extra usage");

    expect(mockSendToClient).toHaveBeenNthCalledWith(
      1,
      "client-1",
      expect.objectContaining({
        type: "chat:error",
        payload: expect.objectContaining({
          conversationId: "conv-limit-1",
          code: "CHAT_USAGE_LIMIT",
        }),
      }),
    );
    expect(mockSendToClient).toHaveBeenNthCalledWith(
      2,
      "client-1",
      expect.objectContaining({ type: "chat:done" }),
    );
  });

  it("streams tool_use_summary as visible token", async () => {
    mockQuery.mockImplementation(
      streamOf([
        { type: "tool_use_summary", summary: "Read 3 files in src/" },
        { type: "result", subtype: "success" },
      ]),
    );

    const res = await app.request("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "project-1",
        message: "read files",
        clientId: "client-1",
      }),
    });

    expect(res.status).toBe(200);
    expect(mockSendToClient).toHaveBeenCalledWith(
      "client-1",
      expect.objectContaining({
        type: "chat:token",
        payload: expect.objectContaining({ token: expect.stringContaining("Read 3 files") }),
      }),
    );
  });

  it("streams permission denials on success result", async () => {
    mockQuery.mockImplementation(
      streamOf([
        {
          type: "result",
          subtype: "success",
          permission_denials: [{ tool_name: "Bash", tool_use_id: "t1", tool_input: {} }],
        },
      ]),
    );

    const res = await app.request("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "project-1",
        message: "run something",
        clientId: "client-1",
      }),
    });

    expect(res.status).toBe(200);
    expect(mockSendToClient).toHaveBeenCalledWith(
      "client-1",
      expect.objectContaining({
        type: "chat:token",
        payload: expect.objectContaining({
          token: expect.stringContaining("Permission denied"),
        }),
      }),
    );
  });

  it("streams error details for error_max_turns result", async () => {
    mockQuery.mockImplementation(
      streamOf([{ type: "result", subtype: "error_max_turns", is_error: true, errors: [] }]),
    );

    const res = await app.request("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "project-1",
        message: "hello",
        clientId: "client-1",
      }),
    });

    expect(res.status).toBe(200);
    expect(mockSendToClient).toHaveBeenCalledWith(
      "client-1",
      expect.objectContaining({
        type: "chat:token",
        payload: expect.objectContaining({
          token: expect.stringContaining("max turns"),
        }),
      }),
    );
  });

  it("streams error details for error_max_budget_usd result", async () => {
    mockQuery.mockImplementation(
      streamOf([
        {
          type: "result",
          subtype: "error_max_budget_usd",
          is_error: true,
          errors: [],
          permission_denials: [{ tool_name: "Edit" }],
        },
      ]),
    );

    const res = await app.request("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "project-1",
        message: "hello",
        clientId: "client-1",
      }),
    });

    expect(res.status).toBe(200);
    // Should contain both budget error and permission denial
    const tokenCalls = mockSendToClient.mock.calls.filter(
      (c: unknown[]) => (c[1] as { type: string }).type === "chat:token",
    );
    const allTokens = tokenCalls
      .map((c: unknown[]) => (c[1] as { payload: { token: string } }).payload.token)
      .join("");
    expect(allTokens).toContain("Budget limit");
    expect(allTokens).toContain("Permission denied");
  });

  it("streams generic error with errors array", async () => {
    mockQuery.mockImplementation(
      streamOf([
        {
          type: "result",
          subtype: "error_during_execution",
          is_error: true,
          errors: ["Something went wrong"],
        },
      ]),
    );

    const res = await app.request("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "project-1",
        message: "hello",
        clientId: "client-1",
      }),
    });

    expect(res.status).toBe(200);
    expect(mockSendToClient).toHaveBeenCalledWith(
      "client-1",
      expect.objectContaining({
        type: "chat:token",
        payload: expect.objectContaining({
          token: expect.stringContaining("Something went wrong"),
        }),
      }),
    );
  });

  it("resolves task context when taskId is provided", async () => {
    const mockTaskRow = { id: "task-1", title: "Fix bug", status: "implementing" };
    mockFindTaskById.mockReturnValue(mockTaskRow);
    mockToTaskResponse.mockReturnValue({
      ...mockTaskRow,
      description: "Some bug",
      attachments: [],
      tags: [],
    });
    mockQuery.mockImplementation(streamOf([{ type: "result", subtype: "success" }]));

    const res = await app.request("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "project-1",
        message: "what is this task?",
        clientId: "client-1",
        taskId: "task-1",
      }),
    });

    expect(res.status).toBe(200);
    expect(mockFindTaskById).toHaveBeenCalledWith("task-1");
    expect(mockToTaskResponse).toHaveBeenCalledWith(mockTaskRow);
    // System prompt should contain task context
    const queryArgs = mockQuery.mock.calls[0][0] as {
      options: { systemPrompt: { append: string } };
    };
    expect(queryArgs.options.systemPrompt.append).toContain("Fix bug");
    expect(queryArgs.options.systemPrompt.append).toContain("implementing");
  });

  it("returns 500 and generic message for non-limit errors", async () => {
    mockQuery.mockImplementation(() => {
      throw new Error("unexpected failure");
    });

    const res = await app.request("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "project-1",
        message: "hello",
        clientId: "client-1",
        conversationId: "conv-error-1",
      }),
    });

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "Chat request failed",
      code: "CHAT_REQUEST_FAILED",
    });

    expect(mockSendToClient).toHaveBeenNthCalledWith(
      1,
      "client-1",
      expect.objectContaining({
        type: "chat:error",
        payload: expect.objectContaining({
          conversationId: "conv-error-1",
          code: "CHAT_REQUEST_FAILED",
          message: "Chat request failed",
        }),
      }),
    );
  });
});
