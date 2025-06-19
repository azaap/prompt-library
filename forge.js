// forge.js
document.addEventListener('DOMContentLoaded', () => {
    console.log('Intelligent Forge Page Initialized');

    // Element selectors
    const rawPromptInput = document.getElementById('raw-prompt-input');
    const promptTitleInput = document.getElementById('prompt-title');
    const promptDescriptionInput = document.getElementById('prompt-description');
    const promptCategoryInput = document.getElementById('prompt-category');
    const promptTagsInput = document.getElementById('prompt-tags');
    const basePromptInput = document.getElementById('base-prompt');
    const variablesListDiv = document.getElementById('variables-list');
    const addVariableBtn = document.getElementById('add-variable-btn');
    const savePromptBtn = document.getElementById('save-prompt-btn');

    // --- Initial state & Data ---
    let currentVariables = []; // Array of { name: string, defaultValue: string }

    // --- Utility Functions ---
    function escapeRegExp(string) {
        return string.replace(/[.*+\-?^\${}()|[\]\\]/g, '\\$&');
    }

    function generateUniqueId() {
        return 'prompt-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    // --- Core Functions ---

    function renderVariables() {
        variablesListDiv.innerHTML = '';
        if (currentVariables.length === 0) {
            variablesListDiv.innerHTML = '<p>No variables detected or added. Click "Add Variable Manually" or type placeholders like {variable_name} in the raw prompt area.</p>';
            return;
        }

        currentVariables.forEach((variable, index) => {
            const varItem = document.createElement('div');
            varItem.className = 'variable-item';

            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.value = variable.name;
            nameInput.placeholder = 'Variable Name (no spaces/special chars)';
            nameInput.setAttribute('aria-label', `Variable ${index + 1} Name`);
            nameInput.addEventListener('change', (e) => {
                // Basic validation for variable name (e.g., no spaces, matches typical placeholder content)
                const newName = e.target.value.trim().replace(/\s+/g, '_');
                if (newName !== currentVariables[index].name) {
                     // If name changes, we might need to update basePromptInput if user wants auto-update
                     // For now, user must manually ensure consistency or we do it on save.
                     currentVariables[index].name = newName;
                     e.target.value = newName; // Reflect sanitized name
                }
            });

            const valueInput = document.createElement('input');
            valueInput.type = 'text';
            valueInput.value = variable.defaultValue;
            valueInput.placeholder = 'Optional Default Value';
            valueInput.setAttribute('aria-label', `Variable ${index + 1} Default Value`);
            valueInput.addEventListener('change', (e) => {
                currentVariables[index].defaultValue = e.target.value;
            });

            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'Remove';
            removeBtn.type = 'button';
            removeBtn.className = 'remove-var-btn';
            removeBtn.addEventListener('click', () => {
                currentVariables.splice(index, 1);
                renderVariables();
                // Suggestion: update basePromptInput if a variable is removed.
                // This is complex as it requires knowing original placeholder.
                // For now, user manually edits basePromptInput.
            });

            const nameLabel = document.createElement('span');
            nameLabel.textContent = `Var ${index + 1}: `;
            nameLabel.style.fontWeight = 'bold';

            varItem.appendChild(nameLabel);
            varItem.appendChild(nameInput);
            varItem.appendChild(document.createTextNode(" Default: "));
            varItem.appendChild(valueInput);
            varItem.appendChild(removeBtn);
            variablesListDiv.appendChild(varItem);
        });
    }

    function parseRawPrompt(rawText) {
        let title = '';
        const lines = rawText.split('\n');
        if (lines.length > 0) {
            title = lines[0].trim();
        }
        promptTitleInput.value = title;

        if (lines.length > 1 && lines[1].trim() !== "") {
            promptDescriptionInput.value = lines.slice(1,3).join('\n').trim();
        } else {
             promptDescriptionInput.value = rawText.substring(0,100); // Fallback description
        }

        const variableRegex = /\{\s*([a-zA-Z0-9_]+)\s*\}/g;
        const underscoreRegex = /__([A-Z0-9_]+)__/g;
        const bracketRegex = /\\\[([a-zA-Z0-9_]+)\\\]/g; // Escaped: \[([a-zA-Z0-9_]+)\]

        const detectedVarsMap = new Map();
        let match;

        // Function to add to map and define order
        const addVar = (name) => {
            if (!detectedVarsMap.has(name)) {
                detectedVarsMap.set(name, { name: name, defaultValue: ''});
            }
        };

        // Detect in order of appearance
        let tempTextForOrder = rawText;
        const allPlaceholders = [];
        // Combine regexes carefully for order or run sequentially
        // This simplified order detection might not be perfect for interleaved patterns

        // First pass for {}
        while ((match = variableRegex.exec(rawText)) !== null) { allPlaceholders.push({name: match[1].trim(), index: match.index, type:1});}
        // Second pass for __
        while ((match = underscoreRegex.exec(rawText)) !== null) { allPlaceholders.push({name: match[1].trim(), index: match.index, type:2});}
        // Third pass for []
        while ((match = bracketRegex.exec(rawText)) !== null) { allPlaceholders.push({name: match[1].trim(), index: match.index, type:3});}

        allPlaceholders.sort((a,b) => a.index - b.index);
        allPlaceholders.forEach(p => addVar(p.name));

        currentVariables = Array.from(detectedVarsMap.values());

        // Set basePromptInput to rawText initially. User refines it.
        // On save, we will construct the final basePrompt by replacing original variable patterns with normalized {varName}
        basePromptInput.value = rawText;

        renderVariables();
    }

    function handleRawInputChange() {
        const rawText = rawPromptInput.value;
        parseRawPrompt(rawText);
    }

    function manuallyAddVariable() {
        currentVariables.push({ name: `newVariable${currentVariables.length + 1}`, defaultValue: '' });
        renderVariables();
    }

    function savePrompt() {
        const title = promptTitleInput.value.trim();
        const description = promptDescriptionInput.value.trim();
        const category = promptCategoryInput.value.trim();
        const tagsString = promptTagsInput.value.trim();
        let userBasePrompt = basePromptInput.value.trim();

        if (!title) {
            alert("Title is required.");
            promptTitleInput.focus();
            return;
        }
        if (!userBasePrompt) {
            alert("Base Prompt content is required.");
            basePromptInput.focus();
            return;
        }

        // Normalize base prompt: ensure all `currentVariables` are represented as {varName}
        // This step also replaces original detected patterns (__VAR__, [VAR]) with {varName}
        let finalBasePrompt = rawPromptInput.value; // Start from original raw to correctly replace initial patterns

        // Sort variables by length of name descending to avoid issues with substring replacement
        const sortedVarsForReplacement = [...currentVariables].sort((a, b) => b.name.length - a.name.length);

        sortedVarsForReplacement.forEach(variable => {
            const varName = variable.name;
            // Create regex for {varName}, __varName__, and [varName] to normalize them to {varName}
            const placeholderPatterns = [
                new RegExp(`\{\s*${escapeRegExp(varName)}\s*\}`, 'g'),
                new RegExp(`__${escapeRegExp(varName)}__`, 'g'),
                new RegExp(`\\\[\s*${escapeRegExp(varName)}\s*\\\]`, 'g') // Escaped: \[[varName]\]
            ];

            placeholderPatterns.forEach(pattern => {
                finalBasePrompt = finalBasePrompt.replace(pattern, `{${varName}}`);
            });
        });

        // If user directly edited basePromptInput, we should consider that.
        // This is tricky. For now, let's assume user wants the deconstructed raw_input to be the source of truth for structure,
        // and basePromptInput is for minor textual edits not affecting variable placeholders.
        // A more robust solution would parse basePromptInput.value itself.
        // If basePromptInput differs significantly from rawPromptInput after normalization, maybe warn user or use basePromptInput.value as source.
        // Let's use the user-edited basePromptInput as the source, and ensure variables are correctly bracketed.
        finalBasePrompt = userBasePrompt; // Trust user's edits in base prompt field
         sortedVarsForReplacement.forEach(variable => {
            const varName = variable.name;
            // Ensure that in the *user edited* base prompt, the variable is correctly formatted as {varName}
            // This means if user typed "VAR_NAME" but VAR_NAME is a variable, it should become {VAR_NAME}
            // This is complex. Simplification: We assume user writes {varName} in basePromptInput if they intend it as a variable.
            // The currentVariables list is the source of truth for what *is* a variable.
            // So, we ensure all names in currentVariables are {name} in finalBasePrompt.

            // This regex is to find the variable name if it's NOT already a placeholder
            // For example, if base is "Use NAME" and NAME is a var, it becomes "Use {NAME}"
            // This is very aggressive and might replace unintended text.
            // const bareWordRegex = new RegExp(`(?<!\{)\b${escapeRegExp(varName)}\b(?!\})`, 'g');
            // finalBasePrompt = finalBasePrompt.replace(bareWordRegex, `{${varName}}`);
            // The above is too risky. Let's assume user writes placeholders correctly in basePromptInput.
        });


        const tags = tagsString ? tagsString.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

        const newPrompt = {
            id: generateUniqueId(),
            title: title,
            description: description,
            category: category,
            tags: tags,
            basePrompt: finalBasePrompt, // This is the user-edited base prompt, assumed to have correct {placeholders}
            variables: currentVariables.map(v => ({ name: v.name, defaultValue: v.defaultValue || '' })), // Ensure clean variable objects
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        // Validate that all variables in currentVariables are present as {varName} in finalBasePrompt
        let allVarsPresent = true;
        currentVariables.forEach(v => {
            if (!finalBasePrompt.includes(`{${v.name}}`)) {
                allVarsPresent = false;
                console.warn(`Variable ${v.name} is defined but placeholder {${v.name}} not found in base prompt.`);
            }
        });

        if (!allVarsPresent) {
            if (!confirm("Warning: Some defined variables do not have corresponding placeholders like {variable_name} in the 'Base Prompt' field. Save anyway?")) {
                return;
            }
        }

        // Accessing addPrompt from script.js (loaded globally)
        if (typeof addPrompt === 'function') {
            if (addPrompt(newPrompt)) {
                alert('Prompt saved successfully!');
                // Clear form or redirect
                rawPromptInput.value = '';
                promptTitleInput.value = '';
                promptDescriptionInput.value = '';
                promptCategoryInput.value = '';
                promptTagsInput.value = '';
                basePromptInput.value = '';
                currentVariables = [];
                renderVariables();
                // window.location.href = 'index.html'; // Optional redirect
            } else {
                alert('Failed to save prompt. Check console for errors (e.g., duplicate ID, though unlikely here).');
            }
        } else {
            alert('Error: Cannot find save function. script.js might not be loaded correctly.');
        }
    }

    // --- Event Listeners ---
    rawPromptInput.addEventListener('input', handleRawInputChange);
    addVariableBtn.addEventListener('click', manuallyAddVariable);
    savePromptBtn.addEventListener('click', savePrompt);

    // --- Initial Call ---
    renderVariables();
});
```
