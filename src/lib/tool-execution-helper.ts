import { MessageData, ToolAction, z } from 'genkit';
import { ai, gemmaModel } from '../config/genkit.js';

export const ToolCallTraceSchema = z.object({
  toolName: z.string(),
  input: z.record(z.unknown()),
  outputPreview: z.string(),
});

export type ToolCallTrace = z.infer<typeof ToolCallTraceSchema>;

/**
 * Inspects Genkit's `response.messages` history to extract every tool call
 * and tool response executed during the autonomous turn loop.
 */
export function extractToolCallTraces(
  messages: MessageData[] | undefined
): ToolCallTrace[] {
  if (!messages || messages.length === 0) {
    return [];
  }

  const traces: ToolCallTrace[] = [];
  const pendingByName = new Map<string, Record<string, unknown>[]>();

  for (const msg of messages) {
    for (const part of msg.content) {
      if (part.toolRequest) {
        const name = part.toolRequest.name;
        const inputObj =
          part.toolRequest.input &&
          typeof part.toolRequest.input === 'object'
            ? (part.toolRequest.input as Record<string, unknown>)
            : {};
        const queue = pendingByName.get(name) || [];
        queue.push(inputObj);
        pendingByName.set(name, queue);
      }

      if (part.toolResponse) {
        const name = part.toolResponse.name;
        const queue = pendingByName.get(name) || [];
        const matchedInput = queue.shift() || {};
        const rawOut =
          typeof part.toolResponse.output === 'string'
            ? part.toolResponse.output
            : JSON.stringify(part.toolResponse.output);

        traces.push({
          toolName: name,
          input: matchedInput,
          outputPreview:
            rawOut.length > 260 ? rawOut.slice(0, 260) + '...' : rawOut,
        });
      }
    }
  }

  return traces;
}

/**
 * Executes `ai.generate` with Genkit tools.
 *
 * Uses native Genkit + Ollama tool calling by default.
 * If an attendee's local Ollama build returns `does not support tools` (because
 * their local model tag's Modelfile lacks a `{{ .Tools }}` block and they haven't
 * created `gemma4-lagos` from `Modelfile.gemma4-tools`), this helper automatically
 * falls back to a structured JSON tool-planner pass so the workshop never stalls!
 */
export async function generateWithToolsResilient(params: {
  system: string;
  prompt: string;
  messages?: MessageData[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: ToolAction<any, any>[];
  maxTurns?: number;
  temperature?: number;
}): Promise<{
  text: string;
  toolTraces: ToolCallTrace[];
  messages: MessageData[];
  usedFallbackPlanner: boolean;
}> {
  try {
    const response = await ai.generate({
      model: gemmaModel,
      system: params.system,
      prompt: params.prompt,
      messages: params.messages,
      tools: params.tools,
      maxTurns: params.maxTurns ?? 5,
      config: {
        temperature: params.temperature ?? 0.2,
      },
    });

    return {
      text: response.text,
      toolTraces: extractToolCallTraces(response.messages),
      messages: response.messages,
      usedFallbackPlanner: false,
    };
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);
    const isOllamaToolTemplateError =
      errMessage.toLowerCase().includes('does not support tools') ||
      errMessage.toLowerCase().includes('tool');

    if (!isOllamaToolTemplateError) {
      throw error;
    }

    console.warn(
      '\n[Workshop Tip] Your local Ollama model build reported it does not support native `tools` in its Modelfile.'
    );
    console.warn(
      '  -> To enable native Ollama tool calling, run: ollama create gemma4-lagos -f Modelfile.gemma4-tools'
    );
    console.warn(
      '  -> Automatically engaging Genkit Structured Tool-Planner fallback so your flow continues...\n'
    );

    const toolCatalogDescription = params.tools
      .map((t) => `- ${t.__action.name}: ${t.__action.description}`)
      .join('\n');

    const PlannerSchema = z.object({
      toolCalls: z
        .array(
          z.object({
            toolName: z.string(),
            arguments: z.record(z.unknown()),
          })
        )
        .describe('List of tools to call to answer the user request'),
    });

    const planRes = await ai.generate({
      model: gemmaModel,
      system: [
        'You are an autonomous tool planner for a Lagos, Portugal tourism agent.',
        'Decide which tools (0, 1, or more) should be invoked before answering the user.',
        'Available tools:\n' + toolCatalogDescription,
      ].join('\n'),
      prompt: params.prompt,
      output: { schema: PlannerSchema },
      config: { temperature: 0.1 },
    });

    const plannedCalls = planRes.output?.toolCalls || [];
    const toolTraces: ToolCallTrace[] = [];
    const gatheredContext: string[] = [];

    for (const call of plannedCalls) {
      const matchedTool = params.tools.find(
        (t) =>
          t.__action.name === call.toolName ||
          t.__action.name.endsWith(call.toolName)
      );
      if (matchedTool) {
        const result = await matchedTool(call.arguments || {});
        const serialized = JSON.stringify(result);
        toolTraces.push({
          toolName: matchedTool.__action.name,
          input: call.arguments || {},
          outputPreview:
            serialized.length > 260
              ? serialized.slice(0, 260) + '...'
              : serialized,
        });
        gatheredContext.push(
          `Tool [${matchedTool.__action.name}] returned:\n${serialized}`
        );
      }
    }

    const finalRes = await ai.generate({
      model: gemmaModel,
      system: params.system,
      prompt: [
        params.prompt,
        gatheredContext.length > 0
          ? `\n\n--- LIVE TOOL RESULTS ---\n${gatheredContext.join('\n\n')}`
          : '',
      ].join(''),
      config: { temperature: params.temperature ?? 0.2 },
    });

    return {
      text: finalRes.text,
      toolTraces,
      messages: finalRes.messages,
      usedFallbackPlanner: true,
    };
  }
}
