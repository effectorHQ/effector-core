import type { EffectorDef } from './toml-parser.js';

/**
 * Supported compile targets.
 */
export type CompileTarget = 'mcp' | 'openai-agents' | 'langchain' | 'json';

/**
 * Information about a compile target.
 */
export interface TargetInfo {
  name: string;
  description: string;
  format: string;
}

/**
 * Custom compile function signature.
 */
export type CompileFn = (effectorDef: EffectorDef) => string;

/**
 * Compile an effector definition to a specific runtime target.
 * @param effectorDef - Parsed effector definition (with optional skillContent)
 * @param target - Target runtime (default: 'json')
 */
export function compile(effectorDef: EffectorDef & { skillContent?: string }, target?: CompileTarget | string): string;

/**
 * List all available compile targets (built-in + custom).
 */
export function listTargets(): TargetInfo[];

/**
 * Register a custom compile target.
 * @param name - Target name (must not conflict with built-in targets)
 * @param compileFn - Function that takes an EffectorDef and returns compiled output
 * @param options - Optional metadata (description, format)
 */
export function registerTarget(
  name: string,
  compileFn: CompileFn,
  options?: { description?: string; format?: string }
): void;

/**
 * Unregister a custom compile target.
 */
export function unregisterTarget(name: string): boolean;
