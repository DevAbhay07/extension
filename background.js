// AI Document Summarizer - Background Script

console.log('Background script loaded');

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'summarize') {
        handleSummarization(request, sendResponse);
        return true; // Keep message channel open for async response
    }
});

async function handleSummarization(request, sendResponse) {
    try {
        const { text, compression, apiKey } = request;
        
        console.log('Starting summarization with compression:', compression);
        
        // Validate inputs
        if (!text || text.trim().length === 0) {
            throw new Error('No text provided for summarization');
        }
        
        if (!apiKey || !apiKey.startsWith('AIza')) {
            throw new Error('Invalid API key format');
        }
        
        // Create compression ratio mapping (same as Streamlit app)
        const compressionMap = {
            'brief': '25%',
            'regular': '50%', 
            'detailed': '75%'
        };
        
        const compressionRatio = compressionMap[compression] || '50%';
        
        // Build prompt based on compression ratio (matching Streamlit app exactly)
        let prompt;
        if (compressionRatio === '25%') {
            prompt = `Summarize the following text to 25% of its original length. Keep only the most essential information:\n\n${text}`;
        } else if (compressionRatio === '50%') {
            prompt = `Summarize the following text to 50% of its original length. Maintain key points and important details:\n\n${text}`;
        } else if (compressionRatio === '75%') {
            prompt = `Summarize the following text to 75% of its original length. Preserve most details while making it more concise:\n\n${text}`;
        } else {
            prompt = `Create a clear and concise summary of the following text, maintaining all important information:\n\n${text}`;
        }
        
        // Call Google Gemini API with correct format
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }]
        };
        
        console.log('Making API request to Gemini');
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API response error:', response.status, errorText);
            
            let errorMessage;
            if (response.status === 400) {
                errorMessage = 'Invalid API key or request format. Please check your API key.';
            } else if (response.status === 403) {
                errorMessage = 'API key access denied. Please verify your key has permission.';
            } else if (response.status === 429) {
                errorMessage = 'Rate limit exceeded. Please wait and try again.';
            } else if (response.status === 404) {
                errorMessage = 'API endpoint not found. Please check your API key.';
            } else {
                errorMessage = `API request failed with status ${response.status}`;
            }
            
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        console.log('API response received:', data);
        
        // Parse response (matching the structure from Google Gemini API)
        if (data.candidates && 
            data.candidates.length > 0 && 
            data.candidates[0].content && 
            data.candidates[0].content.parts && 
            data.candidates[0].content.parts.length > 0 &&
            data.candidates[0].content.parts[0].text) {
            
            const summary = data.candidates[0].content.parts[0].text;
            
            // Clean up the summary (same as Streamlit app)
            const cleanSummary = summary.replace(/[*#]/g, '').trim();
            
            console.log('Summarization successful');
            sendResponse({ success: true, summary: cleanSummary });
        } else {
            console.error('Unexpected API response format:', data);
            
            // Check for safety ratings or other issues
            if (data.candidates && data.candidates.length > 0 && data.candidates[0].finishReason) {
                throw new Error(`Content blocked: ${data.candidates[0].finishReason}`);
            }
            
            throw new Error('No valid response content received from API');
        }
        
    } catch (error) {
        console.error('Summarization error:', error);
        sendResponse({ 
            success: false, 
            error: error.message || 'Unknown error occurred' 
        });
    }
}

// Create context menu for right-click summarization
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "summarizeSelection",
        title: "🤖 Summarize selected text",
        contexts: ["selection"]
    });
    
    console.log('Context menu created');
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "summarizeSelection" && info.selectionText) {
        console.log('Context menu clicked with selected text');
        
        chrome.storage.sync.get(['geminiApiKey'], (result) => {
            if (!result.geminiApiKey) {
                // Open popup to set API key
                chrome.action.openPopup();
                return;
            }
            
            // Summarize the selected text with default compression
            handleSummarization({
                text: info.selectionText,
                compression: 'regular',
                apiKey: result.geminiApiKey
            }, (response) => {
                if (response.success) {
                    // Show result in a notification on the page
                    chrome.tabs.sendMessage(tab.id, {
                        action: 'showSummaryResult',
                        summary: response.summary,
                        originalText: info.selectionText
                    });
                } else {
                    chrome.tabs.sendMessage(tab.id, {
                        action: 'showSummaryError',
                        error: response.error
                    });
                }
            });
        });
    }
});