/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { Command } from '../commandManager';
import { getFilteredMarkdown } from '../util/filter';
import { MarkdownPreviewManager } from '../preview/previewManager';
import { DynamicMarkdownPreview } from '../preview/preview';

function process(original: string): string {
	// Remove folding indicators from the markdown
	// allow-any-unicode-next-line
	let processed = original.replace(/[▶▼]/g, '');
	// Remove compiled folding indicator from HTML
	processed = processed.replace(/\<span class="folding-indicator" data-line=".*">.*<\/span>/g, '');
	return processed;
}

export class ExportFilteredMarkdownCommand implements Command {
	public readonly id = 'markdown.exportFiltered';

	public constructor() { }

	public async execute(uri?: vscode.Uri) {
		const activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor || activeEditor?.document.uri.toString() !== uri?.toString()) {
			return;
		}
		const saveUri = await vscode.window.showSaveDialog();
		if (!saveUri) {
			return;
		}

		const content = process(await getFilteredMarkdown(activeEditor.document));
		if (!content) {
			return;
		}
		await vscode.workspace.fs.writeFile(saveUri, Buffer.from(content, 'utf8'));
	}
}

export class ExportRenderedHTMLCommand implements Command {
	public readonly id = 'markdown.exportRenderedHTML';

	public constructor(
		private readonly _previewManager: MarkdownPreviewManager,
	) { }

	public async execute() {
		const { activePreviewResource } = this._previewManager;
		if (!activePreviewResource) {
			return;
		}
		const preview = this._previewManager.findPreview(activePreviewResource) as DynamicMarkdownPreview;
		if (!preview) {
			return;
		}
		const html = process(preview.webview.webview.html);
		const saveUri = await vscode.window.showSaveDialog();
		if (!saveUri) {
			return;
		}
		if (html) {
			await vscode.workspace.fs.writeFile(saveUri, Buffer.from(html, 'utf8'));
		} else {
			vscode.window.showErrorMessage('No HTML content available to export.');
		}
	}
}
