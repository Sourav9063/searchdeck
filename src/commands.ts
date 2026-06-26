import * as vscode from 'vscode';
import { SearchPanel } from './panel/SearchPanel';

export function registerCommands(context: vscode.ExtensionContext): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand('searchdeck.open', () => {
      SearchPanel.create(context);
    }),
    vscode.commands.registerCommand('searchdeck.openNativeQuickOpen', () => {
      return vscode.commands.executeCommand('workbench.action.quickOpen');
    }),
    vscode.commands.registerCommand('searchdeck.openNativeTextSearch', () => {
      return vscode.commands.executeCommand('workbench.action.quickTextSearch');
    }),
    vscode.commands.registerCommand('searchdeck.openNativeSymbols', () => {
      return vscode.commands.executeCommand('workbench.action.showAllSymbols');
    }),
    vscode.commands.registerCommand('searchdeck.focusSearch', () => {
      SearchPanel.active()?.focusSearch();
    }),
    vscode.commands.registerCommand('searchdeck.newSearchTab', () => {
      SearchPanel.create(context);
    }),
    vscode.commands.registerCommand('searchdeck.closeSearchTab', () => {
      SearchPanel.disposeActive();
    }),
    vscode.commands.registerCommand('searchdeck.refresh', () => {
      return SearchPanel.active()?.refresh();
    }),
    vscode.commands.registerCommand('searchdeck.clear', () => {
      SearchPanel.active()?.clear();
    }),
    vscode.commands.registerCommand('searchdeck.openSelected', () => {
      return SearchPanel.active()?.openSelected(false);
    }),
    vscode.commands.registerCommand('searchdeck.openSelectedToSide', () => {
      return SearchPanel.active()?.openSelected(true);
    }),
    vscode.commands.registerCommand('searchdeck.copySelectedReference', () => {
      return SearchPanel.active()?.copySelectedReference();
    })
  ];
}
