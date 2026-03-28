import { eq } from "drizzle-orm";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  getDb,
  projects,
  initProjectDirectory,
  validateProjectRootPath,
  logger,
} from "@aif/shared";

type ProjectRow = typeof projects.$inferSelect;

const log = logger("projects-repo");

export function listProjects(): ProjectRow[] {
  const db = getDb();
  return db.select().from(projects).all();
}

export function findProjectById(id: string): ProjectRow | undefined {
  const db = getDb();
  return db.select().from(projects).where(eq(projects.id, id)).get();
}

export function createProject(input: {
  name: string;
  rootPath: string;
  plannerMaxBudgetUsd?: number | null;
  planCheckerMaxBudgetUsd?: number | null;
  implementerMaxBudgetUsd?: number | null;
  reviewSidecarMaxBudgetUsd?: number | null;
}): { project: ProjectRow | undefined; pathError?: string } {
  const pathError = validateProjectRootPath(input.rootPath);
  if (pathError) return { project: undefined, pathError };

  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.insert(projects)
    .values({
      id,
      name: input.name,
      rootPath: input.rootPath,
      plannerMaxBudgetUsd: input.plannerMaxBudgetUsd ?? null,
      planCheckerMaxBudgetUsd: input.planCheckerMaxBudgetUsd ?? null,
      implementerMaxBudgetUsd: input.implementerMaxBudgetUsd ?? null,
      reviewSidecarMaxBudgetUsd: input.reviewSidecarMaxBudgetUsd ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  try {
    initProjectDirectory(input.rootPath);
  } catch (err) {
    log.warn(
      { projectId: id, rootPath: input.rootPath, err },
      "Project directory initialization failed",
    );
  }

  return { project: db.select().from(projects).where(eq(projects.id, id)).get() };
}

export function updateProject(
  id: string,
  input: {
    name: string;
    rootPath: string;
    plannerMaxBudgetUsd?: number | null;
    planCheckerMaxBudgetUsd?: number | null;
    implementerMaxBudgetUsd?: number | null;
    reviewSidecarMaxBudgetUsd?: number | null;
  },
): { project: ProjectRow | undefined; pathError?: string } {
  const pathError = validateProjectRootPath(input.rootPath);
  if (pathError) return { project: undefined, pathError };

  const db = getDb();
  db.update(projects)
    .set({
      name: input.name,
      rootPath: input.rootPath,
      plannerMaxBudgetUsd: input.plannerMaxBudgetUsd ?? null,
      planCheckerMaxBudgetUsd: input.planCheckerMaxBudgetUsd ?? null,
      implementerMaxBudgetUsd: input.implementerMaxBudgetUsd ?? null,
      reviewSidecarMaxBudgetUsd: input.reviewSidecarMaxBudgetUsd ?? null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(projects.id, id))
    .run();

  return { project: db.select().from(projects).where(eq(projects.id, id)).get() };
}

export function deleteProject(id: string): void {
  const db = getDb();
  db.delete(projects).where(eq(projects.id, id)).run();
}

export function getProjectMcpServers(projectId: string): Record<string, unknown> {
  const project = findProjectById(projectId);
  if (!project) return {};

  const mcpPath = resolve(project.rootPath, ".mcp.json");
  if (!existsSync(mcpPath)) return {};

  try {
    const raw = readFileSync(mcpPath, "utf-8");
    const parsed = JSON.parse(raw);
    return parsed.mcpServers ?? {};
  } catch {
    return {};
  }
}
