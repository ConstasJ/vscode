/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
export async function getFilteredMarkdown(markdownDocument: vscode.TextDocument): Promise<string> {
	let filteredMarkdown = '';
	const editor = vscode.window.visibleTextEditors.find(editor => editor.document.uri.toString() === markdownDocument.uri.toString());

	if (editor) {
		// Get Collapsed Regions
		const foldingStates = await vscode.commands.executeCommand<{
			start: number;
			end: number;
			kind?: string;
			isCollapsed: boolean;
		}[]>('_executeFoldingStateProvider', markdownDocument.uri) || [];

		// Create a quick lookup for collapsed lines
		const collapsedLines = new Set<number>();
		// Store collapsed code block ranges
		const collapsedCodeBlockRanges = new Set<string>();

		// Store collapsed ranges
		const collapsedRanges: { start: number; end: number }[] = [];

		for (const state of foldingStates) {
			if (state.isCollapsed) {
				// transform to 1-based line numbers
				collapsedLines.add(state.start + 1);
				// store the entire range
				collapsedRanges.push({ start: state.start + 1, end: state.end + 1 });

				// Check if the folding region is a code block
				// We need to check the first line of the folding region
				// to see if it starts with ``` or ~~~
				const startLineNumber = state.start;
				const text = markdownDocument.getText(new vscode.Range(
					startLineNumber, 0,
					startLineNumber, markdownDocument.lineAt(startLineNumber).text.length
				)).trim();

				if (text.startsWith('```') || text.startsWith('~~~')) {
					// Store the range of the code block
					collapsedCodeBlockRanges.add(`${state.start + 1}:${state.end + 1}`);
				}
			}
		}

		// Sort the collapsed ranges, processing the outermost ranges first
		collapsedRanges.sort((a, b) => {
			// If one range completely contains the other, the one that is contained should come first
			if (a.start <= b.start && a.end >= b.end) { return -1; }
			if (b.start <= a.start && b.end >= a.end) { return 1; }
			// Otherwise sort by start line number
			return a.start - b.start;
		});

		const text = markdownDocument.getText();
		const lines = text.replace(/\r\n/g, '\n').split('\n');
		filteredMarkdown = lines.map((line, i) => {
			const lineNumber = i + 1; // 1-based line number

			// Check if the current line is in any of the collapsed code block ranges
			const isInCodeBlock = Array.from(collapsedCodeBlockRanges).some(range => {
				const [start, end] = range.split(':').map(Number);
				return lineNumber >= start && lineNumber <= end;
			});

			// If the line is in a collapsed code block, ignore it (including the first line)
			if (isInCodeBlock) {
				return null;
			}

			// Check if the current line is inside any outer collapsed region
			// Look for collapsed regions that contain the current line but do not start with the current line
			const isInsideOuterCollapsedRegion = collapsedRanges.some(range =>
				range.start < lineNumber && lineNumber <= range.end && collapsedLines.has(range.start)
			);

			// If the line is inside an outer collapsed region, ignore it
			if (isInsideOuterCollapsedRegion) {
				return null;
			}

			const foldingStart = foldingStates.find(fold => fold.start + 1 === lineNumber);
			const isFoldingStart = !!foldingStart;
			const isCollapsed = collapsedLines.has(lineNumber);

			if (isCollapsed && isFoldingStart) {
				// For collapsed regions, we want to show the folding start line
				// allow-any-unicode-next-line
				return '▶' + line + '  ';
			}

			// allow-any-unicode-next-line
			return (isFoldingStart ? (isCollapsed ? '▶' : '▼') : '') + line + '  ';
		}).filter(line => line !== null).join('\n');
	} else {
		const text = markdownDocument.getText();
		const lines = text.split('\n');
		filteredMarkdown = lines.map(line => line + '  ').join('\n');
	}

	return filteredMarkdown;
}
