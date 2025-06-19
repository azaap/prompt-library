// prompt-view.js
document.addEventListener('DOMContentLoaded', () => {
    const promptTitleEl = document.getElementById('prompt-title');
    const promptDescriptionEl = document.getElementById('prompt-description');
    const promptTagsEl = document.getElementById('prompt-tags');
    const variablesContainerEl = document.getElementById('variables-container');
    const assembledPromptContainerEl = document.getElementById('assembled-prompt-container');
    const copyPromptBtn = document.getElementById('copy-prompt-btn');

    let currentPrompt = null;
    const variableInputs = {}; // To store references to input elements

    // Function to get prompt ID from URL query parameter
    function getPromptIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('id');
    }

    // Function to assemble prompt text based on variable inputs
    function assemblePromptText() {
        if (!currentPrompt) return "Error: Prompt data not loaded.";

        let assembledText = currentPrompt.basePrompt;
        if (currentPrompt.variables && currentPrompt.variables.length > 0) {
            currentPrompt.variables.forEach(variable => {
                const variableValue = variableInputs[variable.name] ? variableInputs[variable.name].value : (variable.defaultValue || '');
                // Using a global regex replace for each variable
                const placeholder = new RegExp(`\{${variable.name}\}`, 'g');
                assembledText = assembledText.replace(placeholder, variableValue);
            });
        }
        assembledPromptContainerEl.textContent = assembledText;
        return assembledText;
    }

    // Function to render variable input fields
    function renderVariableInputs() {
        variablesContainerEl.innerHTML = ''; // Clear previous inputs

        if (!currentPrompt || !currentPrompt.variables || currentPrompt.variables.length === 0) {
            variablesContainerEl.innerHTML = '<p>No configurable variables for this prompt.</p>';
            return;
        }

        currentPrompt.variables.forEach(variable => {
            const varId = `var-${variable.name}`;

            const label = document.createElement('label');
            label.setAttribute('for', varId);
            label.textContent = variable.name.replace(/_/g, ' ').replace(/\w/g, l => l.toUpperCase()) + ":"; // Format name for display

            let input;
            // Simple heuristic for textarea vs input: if default value is long or contains newlines
            if (variable.defaultValue && (variable.defaultValue.length > 80 || variable.defaultValue.includes('\n'))) {
                input = document.createElement('textarea');
                input.rows = 3;
            } else {
                input = document.createElement('input');
                input.type = 'text';
            }

            input.id = varId;
            input.name = variable.name;
            input.value = variable.defaultValue || '';
            input.placeholder = `Enter ${variable.name}...`;
            input.addEventListener('input', assemblePromptText); // Re-assemble on input change

            const inputGroup = document.createElement('div');
            inputGroup.className = 'variable-input-group';
            inputGroup.appendChild(label);
            inputGroup.appendChild(input);
            variablesContainerEl.appendChild(inputGroup);

            variableInputs[variable.name] = input; // Store reference
        });
    }

    // Function to load and display prompt data
    function loadPromptData() {
        const promptId = getPromptIdFromUrl();
        if (!promptId) {
            promptTitleEl.textContent = "Error";
            promptDescriptionEl.textContent = "No Prompt ID provided in URL.";
            variablesContainerEl.innerHTML = '';
            assembledPromptContainerEl.textContent = '';
            return;
        }

        // Assuming getPrompts() is available globally from script.js
        const allPrompts = typeof getPrompts === 'function' ? getPrompts() : [];
        currentPrompt = allPrompts.find(p => p.id === promptId);

        if (!currentPrompt) {
            promptTitleEl.textContent = "Error";
            promptDescriptionEl.textContent = `Prompt with ID "${promptId}" not found.`;
            document.title = "Prompt Not Found - Prompt Library";
            variablesContainerEl.innerHTML = '';
            assembledPromptContainerEl.textContent = '';
            copyPromptBtn.disabled = true;
            return;
        }

        document.title = `${currentPrompt.title} - Prompt Library`;
        promptTitleEl.textContent = currentPrompt.title;
        promptDescriptionEl.textContent = currentPrompt.description || 'No description provided.';

        if (currentPrompt.tags && currentPrompt.tags.length > 0) {
            promptTagsEl.innerHTML = ''; // Clear loading...
            currentPrompt.tags.forEach(tagText => {
                const tagSpan = document.createElement('span');
                tagSpan.textContent = tagText;
                promptTagsEl.appendChild(tagSpan);
            });
        } else {
            promptTagsEl.textContent = 'No tags.';
        }

        renderVariableInputs();
        assemblePromptText(); // Initial assembly
    }

    // Copy to clipboard functionality
    copyPromptBtn.addEventListener('click', () => {
        const textToCopy = assembledPromptContainerEl.textContent;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(textToCopy)
                .then(() => {
                    const originalButtonText = copyPromptBtn.textContent;
                    copyPromptBtn.textContent = 'Copied!';
                    copyPromptBtn.disabled = true;
                    setTimeout(() => {
                        copyPromptBtn.textContent = originalButtonText;
                        copyPromptBtn.disabled = false;
                    }, 1500);
                })
                .catch(err => {
                    console.error('Failed to copy text: ', err);
                    alert('Failed to copy text. See console for details.');
                });
        } else {
            // Fallback for older browsers (less common now)
            const textArea = document.createElement("textarea");
            textArea.value = textToCopy;
            textArea.style.position = "fixed"; // Avoid scrolling to bottom
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                const originalButtonText = copyPromptBtn.textContent;
                copyPromptBtn.textContent = 'Copied!';
                copyPromptBtn.disabled = true;
                setTimeout(() => {
                    copyPromptBtn.textContent = originalButtonText;
                    copyPromptBtn.disabled = false;
                }, 1500);
            } catch (err) {
                console.error('Fallback copy failed: ', err);
                alert('Failed to copy text using fallback. See console for details.');
            }
            document.body.removeChild(textArea);
        }
    });

    // Initial load
    loadPromptData();
});
```
