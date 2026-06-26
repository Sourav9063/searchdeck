import * as vscode from 'vscode';
import { registerCommands } from './commands';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(...registerCommands(context));
}

export function deactivate(): void {}

