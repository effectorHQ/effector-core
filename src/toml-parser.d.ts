/**
 * Parsed effector.toml interface section.
 */
export interface EffectorInterface {
  input: string | null;
  output: string | null;
  context: string[];
  nondeterminism: string | null;
  idempotent: boolean;
  tokenBudget: number | null;
  latencyP50: number | null;
}

/**
 * Parsed effector.toml permissions section.
 */
export interface EffectorPermissions {
  network: boolean;
  subprocess: boolean;
  envRead: string[];
  envWrite: string[];
  filesystem: boolean;
}

/**
 * A parsed effector.toml definition.
 */
export interface EffectorDef {
  name: string | null;
  version: string | null;
  type: string | null;
  description: string | null;
  interface: EffectorInterface;
  permissions: EffectorPermissions;
}

/**
 * Parse an effector.toml file content into an EffectorDef.
 * Section-aware: extracts fields scoped to [effector], [effector.interface], [effector.permissions].
 */
export function parseEffectorToml(content: string): EffectorDef;

/**
 * Scan a directory for effector.toml files and return a Map keyed by "name@version".
 */
export function loadRegistryAsMap(searchDir: string): Map<string, EffectorDef>;

/**
 * Scan a directory for effector.toml files and return an array of definitions.
 */
export function loadRegistryAsArray(searchDir: string): EffectorDef[];
