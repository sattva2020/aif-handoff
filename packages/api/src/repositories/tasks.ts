import { eq, asc } from "drizzle-orm";
import { existsSync } from "node:fs";
import {
  getDb,
  tasks,
  taskComments,
  projects,
  parseAttachments,
  getCanonicalPlanPath,
  persistTaskPlan,
} from "@aif/shared";
import type { Task } from "@aif/shared";

type TaskRow = typeof tasks.$inferSelect;
type CommentRow = typeof taskComments.$inferSelect;

export function toTaskResponse(task: TaskRow): Task {
  const { attachments, ...rest } = task;
  return { ...rest, attachments: parseAttachments(attachments) };
}

export function toCommentResponse(comment: CommentRow) {
  return {
    id: comment.id,
    taskId: comment.taskId,
    author: comment.author,
    message: comment.message,
    attachments: parseAttachments(comment.attachments),
    createdAt: comment.createdAt,
  };
}

export function findTaskById(id: string) {
  const db = getDb();
  const task = db.select().from(tasks).where(eq(tasks.id, id)).get();
  return { db, task };
}

export function listTasks(projectId?: string): TaskRow[] {
  const db = getDb();
  if (projectId) {
    return db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId))
      .orderBy(asc(tasks.status), asc(tasks.position))
      .all();
  }
  return db.select().from(tasks).orderBy(asc(tasks.status), asc(tasks.position)).all();
}

export function createTask(input: {
  projectId: string;
  title: string;
  description: string;
  attachments?: unknown[];
  priority?: number;
  autoMode?: boolean;
  isFix?: boolean;
}): TaskRow | undefined {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.insert(tasks)
    .values({
      id,
      projectId: input.projectId,
      title: input.title,
      description: input.description,
      attachments: JSON.stringify(input.attachments ?? []),
      priority: input.priority,
      autoMode: input.autoMode,
      isFix: input.isFix,
      reworkRequested: false,
      status: "backlog",
      position: 1000.0,
      lastHeartbeatAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return db.select().from(tasks).where(eq(tasks.id, id)).get();
}

export function updateTask(id: string, fields: Record<string, unknown>): TaskRow | undefined {
  const db = getDb();
  db.update(tasks)
    .set({ ...fields, updatedAt: new Date().toISOString() })
    .where(eq(tasks.id, id))
    .run();

  return db.select().from(tasks).where(eq(tasks.id, id)).get();
}

export function deleteTask(id: string): void {
  const db = getDb();
  db.delete(tasks).where(eq(tasks.id, id)).run();
  db.delete(taskComments).where(eq(taskComments.taskId, id)).run();
}

export function listComments(taskId: string) {
  const db = getDb();
  return db
    .select()
    .from(taskComments)
    .where(eq(taskComments.taskId, taskId))
    .orderBy(asc(taskComments.createdAt))
    .all();
}

export function createComment(input: {
  taskId: string;
  message: string;
  attachments?: unknown[];
}): CommentRow | undefined {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.insert(taskComments)
    .values({
      id,
      taskId: input.taskId,
      author: "human",
      message: input.message,
      attachments: JSON.stringify(input.attachments ?? []),
      createdAt: now,
    })
    .run();

  return db.select().from(taskComments).where(eq(taskComments.id, id)).get();
}

export function updateTaskPlan(
  taskId: string,
  planText: string | null,
  projectId: string,
  isFix: boolean,
): void {
  const db = getDb();
  const project = db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project) throw new Error("Project not found for task");

  persistTaskPlan({
    db,
    taskId,
    planText,
    projectRoot: project.rootPath,
    isFix,
    updatedAt: new Date().toISOString(),
  });
}

export function getTaskPlanFileStatus(taskId: string) {
  const db = getDb();
  const task = db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) return null;

  const project = db.select().from(projects).where(eq(projects.id, task.projectId)).get();
  if (!project) return null;

  const canonicalPlanPath = getCanonicalPlanPath({
    projectRoot: project.rootPath,
    isFix: task.isFix,
  });

  return {
    exists: existsSync(canonicalPlanPath),
    path: canonicalPlanPath,
  };
}
