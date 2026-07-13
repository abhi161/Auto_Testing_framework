import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { runAgentStage, runFullPipeline, PIPELINE_STAGES } from './bridge';
import { startBridgeServer, stopBridgeServer } from './bridgeServer';
import { setFallbackRepoRoot } from './tools';

let currentPanel: vscode.WebviewPanel | undefined;
let currentCts: vscode.CancellationTokenSource | undefined;

export function activate(context: vscode.ExtensionContext) {
  setFallbackRepoRoot(context.extensionPath);

  context.subscriptions.push(
    vscode.commands.registerCommand('playwrightAgent.openPanel', () => openPanel(context))
  );

  // Start the loopback bridge so a standalone web UI (outside VS Code) can drive the pipeline
  // through this window's Copilot model, as long as this window stays open.
  const port = vscode.workspace.getConfiguration('playwrightAgent').get<number>('bridgePort') ?? 5051;
  startBridgeServer(port)
    .then(({ port }) => console.log(`[playwrightAgent] bridge ready at http://localhost:${port}`))
    .catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('EADDRINUSE')) {
        vscode.window.showWarningMessage(
          `Playwright Agent bridge: port ${port} is already in use — another VS Code window may already be running it.`
        );
      } else {
        vscode.window.showWarningMessage(`Playwright Agent bridge failed to start: ${msg}`);
      }
    });

  context.subscriptions.push(
    vscode.commands.registerCommand('playwrightAgent.bridgeStatus', async () => {
      try {
        const r = await fetch(`http://127.0.0.1:${port}/health`);
        const j: any = await r.json();
        vscode.window.showInformationMessage(`Playwright Agent bridge OK on :${port} — model: ${j.model?.name ?? '(none)'}`);
      } catch (e) {
        vscode.window.showErrorMessage(`Playwright Agent bridge not reachable on :${port}: ${e instanceof Error ? e.message : String(e)}`);
      }
    })
  );
}

function openPanel(context: vscode.ExtensionContext) {
  if (currentPanel) {
    currentPanel.reveal();
    return;
  }

  currentPanel = vscode.window.createWebviewPanel(
    'playwrightAgentUI',
    'Playwright Agent Pipeline',
    vscode.ViewColumn.One,
    { enableScripts: true, retainContextWhenHidden: true }
  );

  currentPanel.webview.html = getWebviewHtml();

  currentPanel.onDidDispose(() => {
    currentPanel = undefined;
    currentCts?.cancel();
  });

  currentPanel.webview.onDidReceiveMessage(async (msg) => {
    if (msg.type === 'run') {
      currentCts?.cancel();
      currentCts = new vscode.CancellationTokenSource();
      const log = (evt: import('./bridge').LogEvent) => currentPanel?.webview.postMessage({ type: 'log', line: evt.text });

      try {
        if (msg.stage === 'full-pipeline') {
          await runFullPipeline(msg.prompt, log, currentCts.token);
        } else {
          const stage = PIPELINE_STAGES.find((s) => s.id === msg.stage);
          if (!stage) throw new Error(`Unknown stage: ${msg.stage}`);
          await runAgentStage(stage.file, msg.prompt, log, currentCts.token);
        }
        currentPanel?.webview.postMessage({ type: 'done' });
      } catch (err: any) {
        currentPanel?.webview.postMessage({ type: 'error', message: err.message ?? String(err) });
      }
    } else if (msg.type === 'cancel') {
      currentCts?.cancel();
    }
  });
}

function getWebviewHtml(): string {
  const htmlPath = path.join(__dirname, 'webview', 'index.html');
  return fs.readFileSync(htmlPath, 'utf-8');
}

export function deactivate() {
  currentCts?.cancel();
  return stopBridgeServer();
}
