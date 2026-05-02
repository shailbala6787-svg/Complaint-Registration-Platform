// Set current year in footer
document.addEventListener('DOMContentLoaded', () => {
    const yearElement = document.getElementById('year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }

    // Check which page we are on and initialize accordingly
    if (document.getElementById('complaints-container')) {
        displayComplaints();
    }

    if (document.getElementById('complaint-form')) {
        initForm();
    }
});

// Key for local storage
const STORAGE_KEY = 'resolveIt_complaints';

// Gemini API Key Placeholder
const GEMINI_API_KEY = 'AIzaSyDXvxFlbmgd7GZEH16ZAnqdTeU9QUTM6SQ';

async function generateAIQuestion(complaintDescription) {
    if (GEMINI_API_KEY === 'AIzaSyDXvxFlbmgd7GZEH16ZAnqdTeU9QUTM6SQ') {
        return "Please provide your Gemini API key in app.js to enable AI questions.";
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `You are a helpful assistant for a complaint registration platform. Based on the following complaint description, generate exactly one short, specific follow-up question to clarify the issue or gather necessary missing details. Do not provide any conversational filler, just the question.\n\nComplaint: ${complaintDescription}`
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 100
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Gemini API Error:', response.status, errorData);
            if (response.status === 400 && errorData.error?.message?.includes('API key not valid')) {
                return "Error: The provided Gemini API key is invalid. Please double-check the GEMINI_API_KEY variable in app.js.";
            }
            return `Error: Could not generate a question (Status ${response.status}).`;
        }

        const data = await response.json();
        if (data.candidates && data.candidates.length > 0) {
            return data.candidates[0].content.parts[0].text.trim();
        } else {
            console.error('Unexpected Gemini API response:', data);
            return "Could you please provide more details about this issue?";
        }
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        return "Could you please provide more details about this issue?";
    }
}

// Get complaints from local storage
function getComplaints() {
    const storedComplaints = localStorage.getItem(STORAGE_KEY);
    if (storedComplaints) {
        try {
            return JSON.parse(storedComplaints);
        } catch (e) {
            console.error('Error parsing complaints from local storage', e);
            return [];
        }
    }
    return [];
}

// Save complaints to local storage
function saveComplaints(complaints) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(complaints));
}

// Display complaints on the homepage
function displayComplaints() {
    const container = document.getElementById('complaints-container');
    const complaints = getComplaints();

    // Sort by date, newest first
    complaints.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (complaints.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="ph ph-folder-open" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 1rem;"></i>
                <h3>No Complaints Found</h3>
                <p>There are currently no registered complaints in the system.</p>
                <a href="new-complaint.html" class="btn"><i class="ph ph-plus"></i> File a Complaint</a>
            </div>
        `;
        return;
    }

    let html = '';

    complaints.forEach(complaint => {
        const date = new Date(complaint.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        html += `
            <div class="complaint-card">
                <div class="complaint-header">
                    <div class="complaint-name">${escapeHTML(complaint.name)}</div>
                    <div class="complaint-date">${date}</div>
                </div>
                <div class="complaint-meta">
                    <span><i class="ph ph-map-pin"></i> ${escapeHTML(complaint.city)}</span>
                    <span><i class="ph ph-phone"></i> ${escapeHTML(complaint.mobile)}</span>
                </div>
                <div class="complaint-text">
                    ${escapeHTML(complaint.complaintText).replace(/\n/g, '<br>')}
                </div>
                ${complaint.aiQuestion ? `
                <div class="ai-qa" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--card-border);">
                    <div style="color: var(--primary); font-weight: 500; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.25rem;">
                        <i class="ph ph-sparkle"></i> AI Question
                    </div>
                    <p style="font-size: 0.95rem; margin-bottom: 0.5rem;">${escapeHTML(complaint.aiQuestion)}</p>
                    <div style="color: var(--text-secondary); font-weight: 500; margin-bottom: 0.5rem; font-size: 0.85rem;">
                        User Response
                    </div>
                    <p style="font-size: 0.9rem; color: var(--text-secondary);">${escapeHTML(complaint.aiAnswer || 'No response provided.')}</p>
                </div>
                ` : ''}
            </div>
        `;
    });

    container.innerHTML = html;
}

// Initialize form handling
function initForm() {
    const form = document.getElementById('complaint-form');
    const btnNext = document.getElementById('btn-next');
    const btnSubmit = document.getElementById('btn-submit');
    const aiSection = document.getElementById('ai-section');
    const aiQuestionText = document.getElementById('ai-question-text');

    let generatedQuestion = '';

    btnNext.addEventListener('click', async () => {
        // Basic validation before showing AI section
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const complaintText = document.getElementById('complaintText').value.trim();

        // UI updates
        btnNext.disabled = true;
        btnNext.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Generating...';
        aiSection.style.display = 'block';
        aiQuestionText.textContent = 'Generating a follow-up question based on your complaint...';

        // Fetch question
        generatedQuestion = await generateAIQuestion(complaintText);

        // Display question and update buttons
        aiQuestionText.textContent = generatedQuestion;
        btnNext.style.display = 'none';
        btnSubmit.style.display = 'flex'; // It was display:none, make it match others
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Get form values
        const name = document.getElementById('name').value.trim();
        const city = document.getElementById('city').value.trim();
        const mobile = document.getElementById('mobile').value.trim();
        const complaintText = document.getElementById('complaintText').value.trim();
        const aiAnswer = document.getElementById('aiAnswer') ? document.getElementById('aiAnswer').value.trim() : '';

        if (!name || !city || !mobile || !complaintText) {
            alert('Please fill in all required fields.');
            return;
        }

        // Create new complaint object
        const newComplaint = {
            id: Date.now().toString(),
            name,
            city,
            mobile,
            complaintText,
            aiQuestion: generatedQuestion,
            aiAnswer,
            date: new Date().toISOString()
        };

        // Save to local storage
        const complaints = getComplaints();
        complaints.push(newComplaint);
        saveComplaints(complaints);

        // Redirect to homepage
        window.location.href = 'index.html';
    });
}

// Basic HTML escaper to prevent XSS
function escapeHTML(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
