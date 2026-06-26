import type { PreviewModel, SerializedSection } from '../search/resultTypes';

export type WebviewToExtensionMessage =
  | { type: 'ready' }
  | { type: 'query'; query: string }
  | { type: 'select'; resultId: string }
  | { type: 'open'; side?: boolean }
  | { type: 'copyReference' }
  | { type: 'refresh' }
  | { type: 'clear' }
  | { type: 'close' }
  | { type: 'newTab' };

export interface ExtensionToWebviewState {
  type: 'state';
  query: string;
  selectedResultId?: string;
  sections: SerializedSection[];
  preview: PreviewModel;
  wrapPreview: boolean;
}

export type ExtensionToWebviewMessage =
  | ExtensionToWebviewState
  | { type: 'focusSearch' }
  | { type: 'command'; command: 'open' | 'openSide' | 'copyReference' | 'clear' | 'refresh' | 'close' | 'newTab' };

