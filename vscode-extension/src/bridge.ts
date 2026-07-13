import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { toolDefinitions, executeTool, workspaceRoot, StagePerms } from './tools';

// Structured event types so callers (the HTTP bridge, the webview) can render tool calls/results
// as distinct UI elements instead of fuzzy-parsing markers out of a flat text stream.
export type LogEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_call'; name: string; input: unknown; text: string }
  | { type: 'tool_result'; text: string };
export type LogFn = (event: LogEvent) => void;

const MAX_TOOL_ITERATIONS = 25;
const MAX_TURN_RETRIES = 6; // in-place retries for a single model turn before giving up on the stage

// Transient Copilot/model-stream failures worth retrying in place (vs a real logic error).
function isTransientLmError(err: any): boolean {
  const m = (err && (err.message || err.code || String(err))) || '';
  return /input stream|stream|ECONNRESET|ETIMEDOUT|network|fetch failed|socket|timeout|rate.?limit|429|502|503|504|temporar|premature|overloaded/i.test(String(m));
}

// Agent stage -> its .github/agents/*.md file. Mirrors .github/agents/playwright-orchestrator.md's
// pipeline order. Test Healer is conditional in the real pipeline (only needed when the Executor
// finds issues) — it's still listed here so it's visible/reachable in the UI, but the UI drives a
// loop-back to test-executor-analyst after healing rather than treating it as strictly linear
// (see runAgentStageForProject's `afterHealing` handling and the frontend's proceed-from-healer case).
export const PIPELINE_STAGES: { id: string; file: string; label: string }[] = [
  { id: 'context-analyst', file: 'playwright-context-analyst.md', label: 'Context Analyst' },
  { id: 'test-planner', file: 'playwright-test-planner.md', label: 'Test Planner' },
  { id: 'test-generator', file: 'playwright-test-generator.md', label: 'Test Generator' },
  { id: 'test-executor-analyst', file: 'playwright-test-executor-analyst.md', label: 'Test Executor & Analyser' },
  { id: 'test-healer', file: 'playwright-test-healer.md', label: 'Test Healer (if needed)' },
];

// Deterministic role boundaries per stage: which files a stage may write, and whether it may run
// shell commands. This is what stops (e.g.) the Context Analyst from running tests or writing test
// cases — enforced in code, not just asked for in the prompt. Prefixes are relative to the active
// project directory (projects/<project>/).
const STAGE_RULES: Record<string, { canRun: boolean; writePrefixes: string[] }> = {
  'context-analyst': {
    canRun: false, // analysis + reading the design image only; must not run tests
    writePrefixes: ['specs/test-strategy.md', 'specs/project-memory.md', 'specs/design-spec.md'],
  },
  'test-planner': {
    canRun: true, // may explore the UI, but owns the PLAN, not the tests
    writePrefixes: ['docs/actualtestcases.csv', 'specs/master-test-plan.md', 'specs/selectors.md', 'specs/ui-map.md', 'specs/figma-map.md', 'specs/design-spec.md', 'specs/screenshots/', 'specs/project-memory.md'],
  },
  'test-generator': {
    canRun: true, // writes + runs the spec files it generates
    writePrefixes: ['tests/', 'specs/project-memory.md'],
  },
  'test-executor-analyst': {
    canRun: true, // runs the suite, writes the report + logs defects
    writePrefixes: ['specs/test-execution-report.md', 'specs/test-analysis.md', 'docs/issues.csv'],
  },
  'test-healer': {
    canRun: true, // fixes test-side issues, may re-run
    writePrefixes: ['tests/', 'specs/test-analysis.md', 'docs/issues.csv', 'specs/project-memory.md'],
  },
};

function buildPerms(stageId: string, project: string, label: string): StagePerms {
  const rule = STAGE_RULES[stageId] || { canRun: true, writePrefixes: [] as string[] };
  const projPrefix = `projects/${project}/`;
  return {
    stageLabel: label,
    canRun: rule.canRun,
    canWrite: (rawPath: string) => {
      // Normalise the agent's path to project-relative, then check the allowlist.
      const norm = rawPath.replace(/^\.\//, '').replace(/\\/g, '/');
      const rel = norm.startsWith(projPrefix) ? norm.slice(projPrefix.length) : norm;
      // Never allow writing OUTSIDE the active project.
      if (norm.startsWith('projects/') && !norm.startsWith(projPrefix)) return false;
      return rule.writePrefixes.some((p) => (p.endsWith('/') ? rel.startsWith(p) : rel === p));
    },
  };
}

function listSkills(root: string): string[] {
  const skillsDir = path.join(root, '.github', 'skills');
  if (!fs.existsSync(skillsDir)) return [];
  return fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => path.join('.github', 'skills', e.name, 'SKILL.md'))
    .filter((p) => fs.existsSync(path.join(root, p)));
}

function loadAgentPrompt(agentFile: string): string {
  const root = workspaceRoot();
  const full = path.join(root, '.github', 'agents', agentFile);
  const raw = fs.readFileSync(full, 'utf-8');
  // Strip the YAML frontmatter delimiters but keep the body as the system prompt.
  const body = raw.replace(/^---\n[\s\S]*?\n---\n/, '').trim();

  // Agent bodies reference skills by NAME only (e.g. "use the `figma-design-validation` skill")
  // without ever stating a path — the model can't act on a skill it doesn't know how to find.
  // Make every skill file's exact path explicit so read_file can reach it directly.
  const skillPaths = listSkills(root);
  const skillsBlock = skillPaths.length
    ? `\n\n---\nAvailable skills (read the relevant one with read_file before following it):\n${skillPaths
        .map((p) => `- ${p}`)
        .join('\n')}\n---`
    : '';

  return body + skillsBlock;
}

async function selectModel(): Promise<vscode.LanguageModelChat> {
  let models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
  if (models.length === 0) {
    models = await vscode.lm.selectChatModels({});
  }
  if (models.length === 0) {
    throw new Error(
      'No language model available. Install/sign in to GitHub Copilot Chat in this VS Code window and try again.'
    );
  }
  return models[0];
}

// A design-source image (the "source of truth") passed into the model as a vision part.
export interface DesignImage {
  mime: string;
  base64: string;
  name?: string;
}

export async function runAgentStage(
  agentFile: string,
  userPrompt: string,
  log: LogFn,
  token: vscode.CancellationToken,
  images: DesignImage[] = [],
  perms?: StagePerms
): Promise<string> {
  const model = await selectModel();
  const systemPrompt = loadAgentPrompt(agentFile);

  // Filter the toolset to match this stage's permissions (e.g. remove run_command when the stage
  // may not run commands) so the model isn't even offered a tool it's forbidden to use.
  const stageTools = perms && !perms.canRun ? toolDefinitions.filter((t) => t.name !== 'run_command') : toolDefinitions;
  const boundaryNote = perms
    ? `\n---\nROLE BOUNDARY (enforced): You are the ${perms.stageLabel}. Do ONLY your stage's job and then STOP and hand off. You may write only your stage's own files; ${perms.canRun ? '' : 'you CANNOT run shell commands (no running or generating tests here); '}attempts outside your lane are blocked. Never do a later stage's work even if you could.`
    : '';
  const promptText = `${systemPrompt}\n\n---\nWorkspace root: ${workspaceRoot()}\nAll file paths you pass to tools must be relative to this root.${boundaryNote}\n---\n\nTask:\n${userPrompt}`;

  // The first user message carries the text prompt plus any design-source-of-truth images as
  // vision parts, so the model can SEE the intended design and derive expected test cases from it
  // (the live UI is validated AGAINST this — never used as the source of truth).
  const firstParts: Array<vscode.LanguageModelTextPart | vscode.LanguageModelDataPart> = [
    new vscode.LanguageModelTextPart(promptText),
  ];
  for (const img of images) {
    try {
      firstParts.push(vscode.LanguageModelDataPart.image(Buffer.from(img.base64, 'base64'), img.mime));
      log({ type: 'text', text: `\n[attached design source: ${img.name || 'image'} — the model can see this]\n` });
    } catch (err: any) {
      log({ type: 'text', text: `\n[could not attach image ${img.name}: ${err.message}]\n` });
    }
  }

  const messages: vscode.LanguageModelChatMessage[] = [vscode.LanguageModelChatMessage.User(firstParts)];

  let finalText = '';

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    if (token.isCancellationRequested) {
      log({ type: 'text', text: '\n[cancelled]\n' });
      break;
    }

    // ONE model turn, with in-place retry that PRESERVES the message history. A transient stream
    // hiccup ("Error in input stream", reset, rate-limit) retries just this turn with exponential
    // backoff — the stage RESUMES from here instead of restarting from scratch. Any tokens already
    // streamed from a failed attempt are discarded (we reset the accumulators each attempt).
    let toolCalls: vscode.LanguageModelToolCallPart[] = [];
    let assistantParts: (vscode.LanguageModelTextPart | vscode.LanguageModelToolCallPart)[] = [];
    let turnText = '';
    for (let attempt = 0; ; attempt++) {
      toolCalls = [];
      assistantParts = [];
      turnText = '';
      try {
        const response = await model.sendRequest(messages, { tools: stageTools }, token);
        for await (const part of response.stream) {
          if (part instanceof vscode.LanguageModelTextPart) {
            turnText += part.value;
            log({ type: 'text', text: part.value });
            assistantParts.push(part);
          } else if (part instanceof vscode.LanguageModelToolCallPart) {
            toolCalls.push(part);
            assistantParts.push(part);
          }
        }
        break; // turn succeeded
      } catch (err: any) {
        if (token.isCancellationRequested) throw err;
        if (attempt < MAX_TURN_RETRIES && isTransientLmError(err)) {
          const backoffMs = Math.min(15000, 1000 * 2 ** attempt);
          log({ type: 'text', text: `\n[stream hiccup — resuming this step in ${Math.round(backoffMs / 1000)}s (retry ${attempt + 1}/${MAX_TURN_RETRIES}, no work lost)…]\n` });
          await new Promise((r) => setTimeout(r, backoffMs));
          continue;
        }
        throw err; // exhausted or non-transient → surface to caller
      }
    }

    finalText += turnText;

    // Drop the heavy design-image bytes from the first message after turn 0. The model has now
    // "seen" them and its extracted description is in the history (and it writes design-spec.md).
    // Re-uploading full-res screenshots on EVERY subsequent turn is the main cause of "Error in
    // input stream" on flaky networks — it makes every turn as fragile as the first. Keep the prompt
    // text; swap the image data parts for a short note. (During turn 0's own in-loop retries the
    // images are still attached, because the model hasn't succeeded in seeing them yet.)
    if (iteration === 0 && images.length) {
      messages[0] = vscode.LanguageModelChatMessage.User([
        new vscode.LanguageModelTextPart(
          promptText +
            `\n\n[The ${images.length} design image(s) were attached on the first step and you already described them above; to keep each step lightweight and resilient they are not re-sent. Rely on your extracted description and the design-spec you write — do not ask for the images again.]`
        ),
      ]);
    }

    if (toolCalls.length === 0) {
      break; // model produced a final answer with no further tool calls
    }

    messages.push(vscode.LanguageModelChatMessage.Assistant(assistantParts));

    const resultParts: vscode.LanguageModelToolResultPart[] = [];
    for (const call of toolCalls) {
      const callLabel = `${call.name}(${JSON.stringify(call.input)})`;
      log({ type: 'tool_call', name: call.name, input: call.input, text: callLabel });
      let resultText: string;
      try {
        resultText = await executeTool(call.name, call.input, perms);
      } catch (err: any) {
        resultText = `ERROR: ${err.message ?? String(err)}`;
      }
      log({ type: 'tool_result', text: resultText.slice(0, 500) + (resultText.length > 500 ? '...' : '') });
      // Cap what's fed BACK into the model's message history. On big projects, many large file reads
      // accumulate and get re-sent every iteration, ballooning the request until it fails with
      // "Error in input stream". 10KB/result keeps enough content while bounding total payload.
      const MODEL_RESULT_CAP = 10000;
      const modelText =
        resultText.length > MODEL_RESULT_CAP
          ? resultText.slice(0, MODEL_RESULT_CAP) + `\n…[truncated ${resultText.length - MODEL_RESULT_CAP} chars — read a specific section if you need more]`
          : resultText;
      resultParts.push(
        new vscode.LanguageModelToolResultPart(call.callId, [new vscode.LanguageModelTextPart(modelText)])
      );
    }
    messages.push(vscode.LanguageModelChatMessage.User(resultParts));
  }

  return finalText;
}

export async function runFullPipeline(
  projectPrompt: string,
  log: LogFn,
  token: vscode.CancellationToken
): Promise<void> {
  let carryOver = projectPrompt;
  for (const stage of PIPELINE_STAGES) {
    if (token.isCancellationRequested) return;
    log({ type: 'text', text: `\n===== ${stage.label} =====\n` });
    const output = await runAgentStage(stage.file, carryOver, log, token);
    // Feed a summary of what this stage produced into the next stage's task prompt.
    carryOver = `${projectPrompt}\n\nPrevious stage (${stage.label}) reported:\n${output}`;
  }
  log({ type: 'text', text: '\n===== Pipeline complete =====\n' });
}

// Project-scoped entry points used by the HTTP bridge. Each call runs exactly ONE agent turn
// (a fresh stage, or a follow-up question to the same stage) so the caller — the web UI — can
// implement the mockup's per-stage human-in-the-loop "Proceed" gate between calls, rather than
// the server racing through the whole pipeline unattended.
export function stageById(id: string) {
  const stage = PIPELINE_STAGES.find((s) => s.id === id);
  if (!stage) throw new Error(`Unknown stage: ${id}`);
  return stage;
}

export async function runAgentStageForProject(
  project: string,
  stageId: string,
  userPrompt: string,
  log: LogFn,
  token: vscode.CancellationToken,
  images: DesignImage[] = []
): Promise<string> {
  const stage = stageById(stageId);
  const designNote = images.length
    ? `\n\nA DESIGN SOURCE OF TRUTH (${images.length} image(s)) is attached to this message — the model can see it. It represents how the UI is INTENDED to look. Derive expected test cases from it; test the actual application URL AGAINST it; any difference between the live app and this design is a DEFECT. Never treat the live UI as the source of truth.`
    : '';
  const scopedPrompt = `Active project: ${project}\nAll specs/tests/docs paths are under projects/${project}/.${designNote}\n\n${userPrompt}`;
  const perms = buildPerms(stageId, project, stage.label);
  return runAgentStage(stage.file, scopedPrompt, log, token, images, perms);
}
