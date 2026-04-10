import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import type { RuntimeMcpInput, RuntimeMcpInstallInput, RuntimeMcpStatus } from "../../types.js";

const CODEX_CONFIG_PATH = join(homedir(), ".codex", "config.toml");

interface CodexMcpServerEntry extends Record<string, unknown> {
  command: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
}

/**
 * Minimal TOML parser/writer for Codex MCP config.
 * Only handles the [mcp_servers.<name>] section format.
 * Does not depend on a full TOML library.
 */

function parseTomlString(rawValue: string): string {
  try {
    return JSON.parse(rawValue);
  } catch {
    return rawValue.replace(/^"(.*)"$/, "$1");
  }
}

function serializeTomlString(value: string): string {
  return JSON.stringify(value);
}

function parseMcpServers(toml: string): Record<string, CodexMcpServerEntry> {
  const servers: Record<string, CodexMcpServerEntry> = {};
  const envSectionRegex = /^\[mcp_servers\.([^\]]+)\.env\]\s*$/;
  const sectionRegex = /^\[mcp_servers\.([^. \]]+)\]\s*$/;
  let currentName: string | null = null;
  let currentSection: "main" | "env" | null = null;

  for (const line of toml.split("\n")) {
    const trimmed = line.trim();
    const envSectionMatch = envSectionRegex.exec(trimmed);
    if (envSectionMatch) {
      currentName = envSectionMatch[1];
      currentSection = "env";
      servers[currentName] ??= { command: "", args: [], env: {} };
      continue;
    }

    const sectionMatch = sectionRegex.exec(trimmed);
    if (sectionMatch) {
      currentName = sectionMatch[1];
      currentSection = "main";
      servers[currentName] ??= { command: "", args: [], env: {} };
      continue;
    }

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      currentName = null;
      currentSection = null;
      continue;
    }

    if (!currentName) continue;
    const kvMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
    if (!kvMatch) continue;
    const [, key, rawValue] = kvMatch;

    if (currentSection === "env") {
      (servers[currentName].env ??= {})[key] = parseTomlString(rawValue);
      continue;
    }

    if (key === "command") {
      servers[currentName].command = parseTomlString(rawValue);
    } else if (key === "cwd") {
      servers[currentName].cwd = parseTomlString(rawValue);
    } else if (key === "args") {
      try {
        servers[currentName].args = JSON.parse(rawValue.replace(/'/g, '"'));
      } catch {
        servers[currentName].args = [];
      }
    }
  }

  return servers;
}

function serializeMcpSection(name: string, entry: CodexMcpServerEntry): string {
  const lines = [`[mcp_servers.${name}]`];
  lines.push(`command = ${serializeTomlString(entry.command)}`);
  if (entry.args && entry.args.length > 0) {
    const argsStr = entry.args.map((a) => serializeTomlString(a)).join(", ");
    lines.push(`args = [ ${argsStr} ]`);
  }
  if (entry.cwd) {
    lines.push(`cwd = ${serializeTomlString(entry.cwd)}`);
  }
  if (entry.env && Object.keys(entry.env).length > 0) {
    lines.push("");
    lines.push(`[mcp_servers.${name}.env]`);
    for (const [envKey, envValue] of Object.entries(entry.env).sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      lines.push(`${envKey} = ${serializeTomlString(envValue)}`);
    }
  }
  return lines.join("\n");
}

function removeServerSections(toml: string, serverName: string): string {
  const mainSectionHeader = `[mcp_servers.${serverName}]`;
  const envSectionHeader = `[mcp_servers.${serverName}.env]`;
  const sectionHeaderRegex = /^\[[^\]]+\]\s*$/;
  const keptLines: string[] = [];
  let skipping = false;

  for (const line of toml.split("\n")) {
    const trimmed = line.trim();

    if (trimmed === mainSectionHeader || trimmed === envSectionHeader) {
      skipping = true;
      continue;
    }

    if (skipping && sectionHeaderRegex.test(trimmed)) {
      skipping = false;
    }

    if (!skipping) {
      keptLines.push(line);
    }
  }

  return keptLines.join("\n").trim();
}

async function readToml(): Promise<string> {
  try {
    return await readFile(CODEX_CONFIG_PATH, "utf-8");
  } catch {
    return "";
  }
}

async function writeToml(content: string): Promise<void> {
  const dir = dirname(CODEX_CONFIG_PATH);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(CODEX_CONFIG_PATH, content, "utf-8");
}

export async function getCodexMcpStatus(input: RuntimeMcpInput): Promise<RuntimeMcpStatus> {
  const toml = await readToml();
  const servers = parseMcpServers(toml);
  const installed = input.serverName in servers;
  return {
    installed,
    serverName: input.serverName,
    config: installed ? servers[input.serverName] : null,
  };
}

export async function installCodexMcpServer(input: RuntimeMcpInstallInput): Promise<void> {
  let toml = await readToml();
  toml = removeServerSections(toml, input.serverName);

  const section = serializeMcpSection(input.serverName, {
    command: input.command,
    args: input.args ?? [],
    cwd: input.cwd,
    env: input.env,
  });

  toml = toml ? `${toml}\n\n${section}\n` : `${section}\n`;
  await writeToml(toml);
}

export async function uninstallCodexMcpServer(input: RuntimeMcpInput): Promise<void> {
  const toml = removeServerSections(await readToml(), input.serverName);
  await writeToml(toml ? `${toml}\n` : "");
}
