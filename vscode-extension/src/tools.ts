import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

// Local tool implementations the agentic loop can call. Every path is resolved against and
// constrained to the active workspace root — the model can never read/write outside it.

// Set once at activation from context.extensionPath. Using this instead of relying solely on
// vscode.workspace.workspaceFolders means the bridge works regardless of whether the Extension
// Development Host window happens to have the repo open as its workspace folder (it often
// doesn't, depending on how the debug session was launched / whether the folder was already
// open elsewhere and VS Code reused that window).
let _fallbackRoot: string | null = null;

export function setFallbackRepoRoot(extensionPath: string): void {
  // extensionPath is .../Testing_automation/vscode-extension — the repo root is its parent.
  _fallbackRoot = path.dirname(extensionPath);
}

export function workspaceRoot(): string {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (folder) return folder.uri.fsPath;
  if (_fallbackRoot) return _fallbackRoot;
  throw new Error('No workspace folder open and no fallback repo root set. Open the Testing_automation folder in VS Code first.');
}

function resolveInWorkspace(relativePath: string): string {
  const root = workspaceRoot();
  const resolved = path.resolve(root, relativePath);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error(`Path "${relativePath}" escapes the workspace root — refusing.`);
  }
  return resolved;
}

export const toolDefinitions: vscode.LanguageModelChatTool[] = [
  {
    name: 'read_file',
    description: 'Read a UTF-8 text file relative to the workspace root. Returns up to 20000 characters.',
    inputSchema: {
      type: 'object',
      properties: { path: { type: 'string', description: 'Path relative to the workspace root' } },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Write (overwrite) a UTF-8 text file relative to the workspace root, creating parent directories as needed.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path relative to the workspace root' },
        content: { type: 'string', description: 'Full file content to write' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'list_dir',
    description: 'List files and directories at a path relative to the workspace root.',
    inputSchema: {
      type: 'object',
      properties: { path: { type: 'string', description: 'Path relative to the workspace root (use "." for root)' } },
      required: ['path'],
    },
  },
  {
    name: 'run_command',
    description: 'Run a shell command with cwd at the workspace root (or a subdirectory). Used for npx playwright test, npm install, etc. 120s timeout.',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Shell command to execute' },
        cwd: { type: 'string', description: 'Working directory relative to the workspace root (optional)' },
      },
      required: ['command'],
    },
  },
];

// Per-stage permissions enforce role boundaries deterministically — so e.g. the Context Analyst
// physically cannot run tests or write test-case files even if it decides to. `canWrite(path)` is
// checked for write_file; `canRun` gates run_command.
export interface StagePerms {
  stageLabel: string;
  canRun: boolean;
  canWrite: (relPath: string) => boolean;
}

export async function executeTool(name: string, input: any, perms?: StagePerms): Promise<string> {
  switch (name) {
    case 'read_file': {
      const file = resolveInWorkspace(input.path);
      const content = fs.readFileSync(file, 'utf-8');
      return content.length > 20000 ? content.slice(0, 20000) + '\n...[truncated]' : content;
    }
    case 'write_file': {
      if (perms && !perms.canWrite(input.path)) {
        return `BLOCKED (role boundary): the ${perms.stageLabel} stage may not write "${input.path}" — that file belongs to a different pipeline stage. Produce ONLY your stage's own artifacts, then finish and hand off. Do not do a later stage's work.`;
      }
      const file = resolveInWorkspace(input.path);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, input.content, 'utf-8');
      return `Wrote ${Buffer.byteLength(input.content, 'utf-8')} bytes to ${input.path}`;
    }
    case 'list_dir': {
      const dir = resolveInWorkspace(input.path);
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      return entries.map((e) => `${e.isDirectory() ? 'dir ' : 'file'}  ${e.name}`).join('\n') || '(empty)';
    }
    case 'run_command': {
      if (perms && !perms.canRun) {
        return `BLOCKED (role boundary): the ${perms.stageLabel} stage cannot run shell commands (e.g. running tests, npx playwright). That is a later stage's job. Finish your own analysis/artifacts and hand off — do not run or generate tests here.`;
      }
      const cwd = input.cwd ? resolveInWorkspace(input.cwd) : workspaceRoot();
      return await new Promise<string>((resolve) => {
        exec(input.command, { cwd, timeout: 120000, maxBuffer: 5 * 1024 * 1024 }, (error, stdout, stderr) => {
          const parts = [`$ ${input.command}`, stdout, stderr];
          if (error) parts.push(`[exit code ${error.code ?? 1}]`);
          resolve(parts.filter(Boolean).join('\n').slice(0, 20000));
        });
      });
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
