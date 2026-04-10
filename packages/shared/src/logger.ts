import pino from "pino";
import "./loadEnv.js";

const level = process.env.LOG_LEVEL ?? "debug";

export function resolveLogDestination(env: NodeJS.ProcessEnv = process.env): 1 | 2 {
  const destination = env.LOG_DESTINATION?.trim().toLowerCase();
  return destination === "stderr" || destination === "2" ? 2 : 1;
}

const rootLogger = pino({ level }, pino.destination(resolveLogDestination()));

/** Create a child logger with a component name */
export function logger(component: string): pino.Logger {
  return rootLogger.child({ component });
}

export { rootLogger };
