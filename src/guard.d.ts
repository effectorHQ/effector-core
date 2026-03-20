/**
 * Runtime type guards for AI agent tool I/O.
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata: {
    typeName?: string;
    requiredFields?: string[];
    presentFields?: string[];
    missingFields?: string[];
    required?: string[];
    missing?: string[];
  };
}

export interface GuardOptions {
  strict?: boolean;
  allowExtra?: boolean;
  onError?: 'throw' | 'log' | 'return';
}

export interface EffectorInterface {
  input?: string;
  output?: string;
  context?: string[];
}

export interface Guard {
  validateInput(data: unknown): ValidationResult;
  validateOutput(data: unknown): ValidationResult;
  validateContext(contextMap: Record<string, unknown>): ValidationResult;
  wrap<T extends (...args: any[]) => any>(fn: T): T;
}

/** Validate a data object against a declared Effector type name. */
export function validateAgainstType(
  data: unknown,
  typeName: string,
  options?: GuardOptions,
): ValidationResult;

/** Create a reusable guard for a specific interface declaration. */
export function createGuard(iface: EffectorInterface, options?: GuardOptions): Guard;

/** Wrap an async tool function with runtime type validation. */
export function guardCall<T extends (...args: any[]) => any>(
  fn: T,
  iface: EffectorInterface,
  options?: GuardOptions,
): T;

/** Create MCP middleware that validates tools/call requests and responses. */
export function guardMCP(
  handler: (request: any) => Promise<any>,
  effectorDef: { interface?: EffectorInterface },
  options?: GuardOptions,
): (request: any) => Promise<any>;
