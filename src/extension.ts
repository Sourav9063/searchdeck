import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { initializeRecentFiles } from './search/recentFiles';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(...initializeRecentFiles(context));
  context.subscriptions.push(...registerCommands(context));
}
