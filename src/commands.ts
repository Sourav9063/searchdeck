import * as vscode from 'vscode';
import { SearchPanel } from './panel/SearchPanel';

export function registerCommands(context: vscode.ExtensionContext): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand('vs-fzf.open', () => {
      SearchPanel.create(context);
    }),
    vscode.commands.registerCommand('vs-fzf.openNativeQuickOpen', () => {
      return vscode.commands.executeCommand('workbench.action.quickOpen');
    }),
    vscode.commands.registerCommand('vs-fzf.openNativeTextSearch', () => {
      return vscode.commands.executeCommand('workbench.action.quickTextSearch');
    }),
    vscode.commands.registerCommand('vs-fzf.openNativeSymbols', () => {
      return vscode.commands.executeCommand('workbench.action.showAllSymbols');
    }),
    vscode.commands.registerCommand('vs-fzf.focusSearch', () => {
      SearchPanel.active()?.focusSearch();
    }),
    vscode.commands.registerCommand('vs-fzf.newSearchTab', () => {
      SearchPanel.create(context);
    }),
    vscode.commands.registerCommand('vs-fzf.closeSearchTab', () => {
      SearchPanel.disposeActive();
    }),
    vscode.commands.registerCommand('vs-fzf.refresh', () => {
      return SearchPanel.active()?.refresh();
    }),
    vscode.commands.registerCommand('vs-fzf.clear', () => {
      SearchPanel.active()?.clear();
    }),
    vscode.commands.registerCommand('vs-fzf.openSelected', () => {
      return SearchPanel.active()?.openSelected(false);
    }),
    vscode.commands.registerCommand('vs-fzf.openSelectedToSide', () => {
      return SearchPanel.active()?.openSelected(true);
    }),
    vscode.commands.registerCommand('vs-fzf.copySelectedReference', () => {
      return SearchPanel.active()?.copySelectedReference();
    })
  ];
}

