// AI Document Summarizer - Popup Script

let apiKey = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Popup loaded');
    initializePopup();
});

async function initializePopup() {
    // Check for existing API key
    const result = await chrome.storage.sync.get(['geminiApiKey']);
    if (result.geminiApiKey) {
        apiKey = result.geminiApiKey;
        showMainContent();
    } else {
        showApiSetup();
    }
    
    // Setup event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // API Key setup
    document.getElementById('save-api-key').addEventListener('click', saveApiKey);
    document.getElementById('api-key-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            saveApiKey();
        }
    });
    
    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });
    
    // Text summarization
    document.getElementById('summarize-text').addEventListener('click', summarizeText);
    
    // Selected text functionality
    document.getElementById('get-selected').addEventListener('click', getSelectedText);
    document.getElementById('summarize-selected').addEventListener('click', summarizeSelected);
}

async function saveApiKey() {
    const input = document.getElementById('api-key-input');
    const key = input.value.trim();
    
    if (!key) {
        showMessage('Please enter a valid API key', 'error');
        return;
    }
    
    if (!key.startsWith('AIza')) {
        showMessage('Invalid API key format. Key should start with "AIza"', 'error');
        return;
    }
    
    if (key.length < 30) {
        showMessage('API key appears too short. Please check your key.', 'error');
        return;
    }
    
    try {
        // Save API key directly without testing (for speed)
        await chrome.storage.sync.set({ geminiApiKey: key });
        apiKey = key;
        showMessage('API key saved successfully!', 'success');
        
        setTimeout(() => {
            showMainContent();
        }, 800);
        
    } catch (error) {
        console.error('Error testing API key:', error);
        showMessage('Error testing API key: ' + error.message, 'error');
    }
}

function showApiSetup() {
    document.getElementById('api-section').classList.remove('hidden');
    document.getElementById('main-content').classList.add('hidden');
}

function showMainContent() {
    document.getElementById('api-section').classList.add('hidden');
    document.getElementById('main-content').classList.remove('hidden');
}

function switchTab(tabName) {
    // Remove active class from all tabs and contents
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.content').forEach(content => content.classList.remove('active'));
    
    // Add active class to selected tab and content
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-content`).classList.add('active');
    
    // Hide result when switching tabs
    hideResult();
}

function showMessage(text, type) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = `message ${type} show`;
    
    setTimeout(() => {
        messageEl.classList.remove('show');
    }, 4000);
}

function showLoading() {
    document.getElementById('loading').classList.add('show');
    hideResult();
}

function hideLoading() {
    document.getElementById('loading').classList.remove('show');
}

function showResult(summary) {
    document.getElementById('result-text').textContent = summary;
    document.getElementById('result').classList.add('show');
    hideLoading();
}

function hideResult() {
    document.getElementById('result').classList.remove('show');
}

async function summarizeText() {
    const text = document.getElementById('text-input').value.trim();
    const compression = document.getElementById('compression-text').value;
    
    if (!text) {
        showMessage('Please enter some text to summarize', 'error');
        return;
    }
    
    if (!apiKey) {
        showMessage('Please set your API key first', 'error');
        showApiSetup();
        return;
    }
    
    await performSummarization(text, compression);
}


async function getSelectedText() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getSelectedText' });
        
        if (response && response.text) {
            document.getElementById('selected-text').value = response.text;
            showMessage('Text captured successfully!', 'success');
        } else {
            showMessage('No text selected. Please select text on the webpage first.', 'error');
        }
    } catch (error) {
        console.error('Error getting selected text:', error);
        showMessage('Error: Please refresh the webpage and try again.', 'error');
    }
}

async function summarizeSelected() {
    const text = document.getElementById('selected-text').value.trim();
    const compression = document.getElementById('compression-selected').value;
    
    if (!text) {
        showMessage('Please get selected text first', 'error');
        return;
    }
    
    if (!apiKey) {
        showMessage('Please set your API key first', 'error');
        showApiSetup();
        return;
    }
    
    await performSummarization(text, compression);
}

async function performSummarization(text, compression) {
    if (!text || text.length < 10) {
        showMessage('Text is too short to summarize (minimum 10 characters)', 'error');
        return;
    }
    
    if (text.length > 100000) {
        showMessage('Text is too long (maximum 100,000 characters)', 'error');
        return;
    }
    
    showLoading();
    
    try {
        console.log('Sending summarization request:', { textLength: text.length, compression });
        
        const response = await chrome.runtime.sendMessage({
            action: 'summarize',
            text: text,
            compression: compression,
            apiKey: apiKey
        });
        
        console.log('Received response:', response);
        
        if (response && response.success) {
            if (response.summary && response.summary.trim()) {
                showResult(response.summary);
            } else {
                showMessage('API returned empty summary. Please try again.', 'error');
                hideLoading();
            }
        } else {
            const errorMsg = response?.error || 'Failed to generate summary';
            showMessage('Error: ' + errorMsg, 'error');
            hideLoading();
            
            // If API key error, show setup again
            if (errorMsg.toLowerCase().includes('api key')) {
                apiKey = null;
                showApiSetup();
            }
        }
        
    } catch (error) {
        console.error('Summarization error:', error);
        showMessage('Extension error: ' + error.message, 'error');
        hideLoading();
    }
}