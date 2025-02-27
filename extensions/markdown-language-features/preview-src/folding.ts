/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { FromWebviewMessage } from '../types/previewMessaging';
import { MessagePoster } from './messaging';

export function initFolding(host: MessagePoster) {
	// 监听折叠指示器的点击事件
	document.addEventListener('click', function (event) {
		// 检查点击的是否是折叠指示器或其子元素
		const target = event.target as HTMLElement;
		const foldingIndicator = target.closest('.folding-indicator') as HTMLElement;
		if (foldingIndicator) {
			const lineAttr = foldingIndicator.getAttribute('data-line');
			if (lineAttr) {
				const lineNumber = parseInt(lineAttr, 10);
				// 确定当前折叠状态
				const isCollapsed = foldingIndicator.querySelector('.codicon-chevron-right') !== null;

				// 发送消息到扩展
				const message: FromWebviewMessage.ToggleFolding = {
					type: 'toggleFolding',
					line: lineNumber,
					source: 'markdown.preview',
					isCollapsed: isCollapsed
				};
				host.postMessage(message.type, message);
			}
		}
	});
}
