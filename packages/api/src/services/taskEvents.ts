import { asc, eq } from "drizzle-orm";
import {
  applyHumanTaskEvent,
  getDb,
  looksLikeFullPlanUpdate,
  persistTaskPlan,
  projects,
  taskComments,
  tasks,
  type TaskEvent,
} from "@aif/shared";
import { runFastFixQuery, withTimeout } from "./fastFix.js";

type Db = ReturnType<typeof getDb>;
type TaskRow = typeof tasks.$inferSelect;

interface EventHandlerInput {
  db: Db;
  task: TaskRow;
  event: TaskEvent;
}

export type EventHandlerResult =
  | { ok: false; status: number; error: string }
  | { ok: true; task: TaskRow; broadcastType: "task:moved" | "task:updated" };

async function handleFastFix(input: EventHandlerInput): Promise<EventHandlerResult> {
  const { db, task } = input;
  if (task.status !== "plan_ready") {
    return { ok: false, status: 409, error: "fast_fix is only allowed from plan_ready" };
  }
  if (task.autoMode) {
    return { ok: false, status: 409, error: "fast_fix is not needed when autoMode=true" };
  }

  const latestComment = db
    .select()
    .from(taskComments)
    .where(eq(taskComments.taskId, task.id))
    .orderBy(asc(taskComments.createdAt), asc(taskComments.id))
    .all()
    .filter((comment) => comment.author === "human")
    .at(-1);
  if (!latestComment) {
    return {
      ok: false,
      status: 409,
      error: "fast_fix requires a human comment with requested fix",
    };
  }

  const project = db.select().from(projects).where(eq(projects.id, task.projectId)).get();
  if (!project) {
    return { ok: false, status: 404, error: "Project not found for task" };
  }

  const previousPlan = task.plan?.trim() ?? "";
  if (!previousPlan) {
    return { ok: false, status: 409, error: "fast_fix requires an existing plan on the task" };
  }

  let firstAttempt = "";
  try {
    firstAttempt = await withTimeout(
      runFastFixQuery({
        taskId: task.id,
        taskTitle: task.title,
        taskDescription: task.description,
        latestComment,
        projectRoot: project.rootPath,
        previousPlan,
        shouldTryFileUpdate: true,
      }),
      90_000,
      "Fast fix query timed out",
    );
  } catch {
    // Fallback to no-tools mode below
  }

  const updatedPlan = looksLikeFullPlanUpdate(previousPlan, firstAttempt)
    ? firstAttempt
    : await withTimeout(
        runFastFixQuery({
          taskId: task.id,
          taskTitle: task.title,
          taskDescription: task.description,
          latestComment,
          projectRoot: project.rootPath,
          previousPlan,
          priorAttempt: firstAttempt || undefined,
          shouldTryFileUpdate: false,
        }),
        90_000,
        "Fast fix query timed out",
      );

  if (!looksLikeFullPlanUpdate(previousPlan, updatedPlan)) {
    return {
      ok: false,
      status: 500,
      error: "Fast fix result omitted existing plan content. Plan was left unchanged.",
    };
  }

  const nowIso = new Date().toISOString();
  persistTaskPlan({
    db,
    taskId: task.id,
    projectRoot: project.rootPath,
    isFix: task.isFix,
    planText: updatedPlan,
    updatedAt: nowIso,
  });

  db.update(tasks)
    .set({
      reworkRequested: false,
      updatedAt: nowIso,
    })
    .where(eq(tasks.id, task.id))
    .run();

  const updated = db.select().from(tasks).where(eq(tasks.id, task.id)).get();
  if (!updated) {
    return { ok: false, status: 404, error: "Task not found" };
  }

  return { ok: true, task: updated, broadcastType: "task:updated" };
}

function handleRegularTransition(input: EventHandlerInput): EventHandlerResult {
  const { db, task, event } = input;
  const transition = applyHumanTaskEvent(task, event);
  if (!transition.ok) {
    return { ok: false, status: 409, error: transition.error };
  }

  const nowIso = new Date().toISOString();
  db.update(tasks)
    .set({ ...transition.patch, lastHeartbeatAt: nowIso, updatedAt: nowIso })
    .where(eq(tasks.id, task.id))
    .run();

  const updated = db.select().from(tasks).where(eq(tasks.id, task.id)).get();
  if (!updated) {
    return { ok: false, status: 404, error: "Task not found" };
  }

  return { ok: true, task: updated, broadcastType: "task:moved" };
}

export async function handleTaskEvent(input: EventHandlerInput): Promise<EventHandlerResult> {
  if (input.event === "fast_fix") {
    return await handleFastFix(input);
  }
  return handleRegularTransition(input);
}
