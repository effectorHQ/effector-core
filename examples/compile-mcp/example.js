import { Effector } from '@effectorhq/core';

// Compile to MCP tool schema
const mcp = Effector.fromDir('../basic-validate').validate().compile('mcp');
console.log('MCP Tool Schema:');
console.log(mcp);

// Compile to OpenAI Agents format
const openai = Effector.fromDir('../basic-validate').compile('openai-agents');
console.log('\nOpenAI Agents FunctionTool:');
console.log(openai);
