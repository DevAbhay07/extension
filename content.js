// AI Document Summarizer - Content Script

console.log('AI Summarizer content script loaded on:', window.location.href);

// Listen for messages from popup and background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getSelectedText') {
        const selectedText = window.getSelection().toString().trim();
        sendResponse({ text: selectedText });
        return true;
    }
    
    if (request.action === 'showSummaryResult') {
        showSummaryNotification(request.summary, request.originalText);
        sendResponse({ success: true });
        return true;
    }
    
    if (request.action === 'showSummaryError') {
        showErrorNotification(request.error);
        sendResponse({ success: true });
        return true;
    }
});

// Show summary result as a beautiful overlay
function showSummaryNotification(summary, originalText) {
    // Remove existing notification
    const existing = document.getElementById('ai-summary-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.id = 'ai-summary-notification';
    notification.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            max-width: 420px;
            background: white;
            border: 2px solid #667eea;
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 12px 40px rgba(0,0,0,0.15);
            z-index: 2147483647;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 14px;
            line-height: 1.6;
            animation: slideIn 0.3s ease-out;
        ">
            <style>
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            </style>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid #f0f0f0; padding-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 18px;">🤖</span>
                    <strong style="color: #667eea; font-size: 16px; font-weight: 600;">AI Summary</strong>
                </div>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
                    background: none;
                    border: none;
                    font-size: 18px;
                    cursor: pointer;
                    color: #999;
                    padding: 4px;
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                " onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='none'">×</button>
            </div>
            <div style="max-height: 240px; overflow-y: auto; margin-bottom: 16px; color: #333; padding-right: 8px;">
                ${summary.replace(/\n/g, '<br>')}
            </div>
            <div style="font-size: 12px; color: #666; background: #f8f9fa; padding: 12px; border-radius: 8px;">
                <strong>Original:</strong> ${originalText.substring(0, 120)}${originalText.length > 120 ? '...' : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 15 seconds
    setTimeout(() => {
        if (document.getElementById('ai-summary-notification')) {
            notification.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => notification.remove(), 300);
        }
    }, 15000);
}

// Show error notification
function showErrorNotification(error) {
    const notification = document.createElement('div');
    notification.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            max-width: 380px;
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
            border-radius: 12px;
            padding: 16px;
            z-index: 2147483647;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 14px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.1);
            animation: slideIn 0.3s ease-out;
        ">
            <style>
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            </style>
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 16px;">❌</span>
                <strong>Error:</strong> ${error}
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
    }, 6000);
}

// Listen for text selection to show quick summarize option
let selectionTimeout = null;

document.addEventListener('mouseup', (e) => {
    if (selectionTimeout) clearTimeout(selectionTimeout);
    
    selectionTimeout = setTimeout(() => {
        const selectedText = window.getSelection().toString().trim();
        
        // Remove existing button
        const existingButton = document.getElementById('ai-quick-summarize-btn');
        if (existingButton) existingButton.remove();
        
        // Show button if text is selected (minimum 40 characters)
        if (selectedText && selectedText.length > 40) {
            showQuickSummarizeButton(selectedText, e.pageX, e.pageY);
        }
    }, 300);
});

function showQuickSummarizeButton(selectedText, x, y) {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    const button = document.createElement('button');
    button.id = 'ai-quick-summarize-btn';
    button.innerHTML = '🤖 Summarize';
    
    // Position button near selection
    const buttonX = Math.min(rect.right + window.scrollX, window.innerWidth - 130);
    const buttonY = rect.bottom + window.scrollY + 8;
    
    button.style.cssText = `
        position: absolute;
        top: ${buttonY}px;
        left: ${buttonX}px;
        z-index: 2147483647;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
        transition: all 0.2s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        user-select: none;
    `;
    
    button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        button.innerHTML = '⏳ Processing...';
        button.disabled = true;
        button.style.background = '#9e9e9e';
        
        chrome.storage.sync.get(['geminiApiKey'], (result) => {
            if (!result.geminiApiKey) {
                showErrorNotification('Please set your API key in the extension popup first.');
                button.remove();
                return;
            }
            
            chrome.runtime.sendMessage({
                action: 'summarize',
                text: selectedText,
                compression: 'regular',
                apiKey: result.geminiApiKey
            }, (response) => {
                if (response && response.success) {
                    showSummaryNotification(response.summary, selectedText);
                } else {
                    showErrorNotification(response?.error || 'Failed to generate summary');
                }
                button.remove();
            });
        });
    });
    
    button.addEventListener('mouseover', () => {
        if (!button.disabled) {
            button.style.transform = 'scale(1.05)';
            button.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
        }
    });
    
    button.addEventListener('mouseout', () => {
        if (!button.disabled) {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.3)';
        }
    });
    
    document.body.appendChild(button);
    
    // Remove button after 8 seconds or when clicking elsewhere
    const removeTimeout = setTimeout(() => {
        if (button.parentNode) {
            button.style.opacity = '0';
            setTimeout(() => button.remove(), 200);
        }
    }, 8000);
    
    const clickHandler = (e) => {
        if (!button.contains(e.target)) {
            clearTimeout(removeTimeout);
            button.style.opacity = '0';
            setTimeout(() => button.remove(), 200);
            document.removeEventListener('click', clickHandler);
        }
    };
    
    setTimeout(() => {
        document.addEventListener('click', clickHandler);
    }, 100);
}