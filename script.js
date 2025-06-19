// script.js

// -----------------------------------------------------------------------------
// Data Structure Definition for a Prompt Object
// -----------------------------------------------------------------------------
/*
A Prompt object will have the following structure:

{
  id: String, // Unique identifier for the prompt (e.g., 'prompt-' + Date.now())
  title: String, // Title of the prompt
  description: String, // A brief description of what the prompt does
  category: String, // Category the prompt belongs to (e.g., "Coding", "Writing", "Marketing")
  tags: Array<String>, // An array of keywords or tags
  basePrompt: String, // The template string of the prompt with placeholders like {variableName}
  variables: Array<Object>, // An array of variable objects that can be filled by the user
                           // Each variable object looks like: { name: String, defaultValue: String (optional) }
  createdAt: Number, // Timestamp (e.g., Date.now()) when the prompt was created
  updatedAt: Number // Timestamp (e.g., Date.now()) when the prompt was last updated
}

Example Prompt Object:
{
  id: "prompt-1687190400000",
  title: "Generate Python Function",
  description: "Creates a Python function stub based on a natural language description.",
  category: "Coding",
  tags: ["python", "code generation", "function"],
  basePrompt: "Write a Python function that {task_description}. The function should be named `{function_name}` and take the following arguments: {arguments_list}. It should return {return_type}.",
  variables: [
    { name: "task_description", defaultValue: "performs a specific task" },
    { name: "function_name", defaultValue: "my_function" },
    { name: "arguments_list", defaultValue: "arg1, arg2" },
    { name: "return_type", defaultValue: "None" }
  ],
  createdAt: 1687190400000,
  updatedAt: 1687190400000
}

Placeholders in `basePrompt` should match the `name` property of objects in the `variables` array.
*/

// -----------------------------------------------------------------------------
// Local Storage Management Functions
// -----------------------------------------------------------------------------
const LOCAL_STORAGE_KEY = 'promptLibraryDB';

/**
 * Retrieves all prompts from Local Storage.
 * @returns {Array<Object>} An array of prompt objects, or an empty array if none exist.
 */
function getPrompts() {
    const promptsJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
    try {
        return promptsJSON ? JSON.parse(promptsJSON) : [];
    } catch (error) {
        console.error("Error parsing prompts from Local Storage:", error);
        return []; // Return empty array or handle error as appropriate
    }
}

/**
 * Saves the entire array of prompts to Local Storage.
 * @param {Array<Object>} promptsArray - The array of prompt objects to save.
 */
function savePrompts(promptsArray) {
    if (!Array.isArray(promptsArray)) {
        console.error("Invalid input: savePrompts expects an array.");
        return;
    }
    try {
        const promptsJSON = JSON.stringify(promptsArray);
        localStorage.setItem(LOCAL_STORAGE_KEY, promptsJSON);
    } catch (error) {
        console.error("Error saving prompts to Local Storage:", error);
    }
}

/**
 * Adds a new prompt to the library in Local Storage.
 * @param {Object} promptObject - The prompt object to add.
 * @returns {boolean} True if successful, false otherwise.
 */
function addPrompt(promptObject) {
    if (typeof promptObject !== 'object' || promptObject === null || !promptObject.id) {
        console.error("Invalid prompt object:", promptObject);
        return false;
    }
    const prompts = getPrompts();
    if (prompts.some(p => p.id === promptObject.id)) {
        console.warn(`Prompt with ID ${promptObject.id} already exists. Use updatePrompt instead.`);
        return false;
    }
    prompts.push(promptObject);
    savePrompts(prompts);
    return true;
}

/**
 * Updates an existing prompt in the library in Local Storage.
 * @param {Object} updatedPromptObject - The prompt object to update (must have an ID).
 * @returns {boolean} True if successful, false if prompt not found or error.
 */
function updatePrompt(updatedPromptObject) {
    if (typeof updatedPromptObject !== 'object' || updatedPromptObject === null || !updatedPromptObject.id) {
        console.error("Invalid updated prompt object:", updatedPromptObject);
        return false;
    }
    const prompts = getPrompts();
    const promptIndex = prompts.findIndex(p => p.id === updatedPromptObject.id);

    if (promptIndex === -1) {
        console.warn(`Prompt with ID ${updatedPromptObject.id} not found. Cannot update.`);
        return false;
    }

    prompts[promptIndex] = { ...prompts[promptIndex], ...updatedPromptObject, updatedAt: Date.now() };
    savePrompts(prompts);
    return true;
}

/**
 * Deletes a prompt from the library in Local Storage by its ID.
 * @param {String} promptId - The ID of the prompt to delete.
 * @returns {boolean} True if successful, false if prompt not found or error.
 */
function deletePrompt(promptId) {
    if (!promptId || typeof promptId !== 'string') {
        console.error("Invalid prompt ID for deletion.");
        return false;
    }
    const prompts = getPrompts();
    const filteredPrompts = prompts.filter(p => p.id !== promptId);

    if (prompts.length === filteredPrompts.length) {
        console.warn(`Prompt with ID ${promptId} not found. Cannot delete.`);
        return false;
    }

    savePrompts(filteredPrompts);
    return true;
}

// -----------------------------------------------------------------------------
// Import / Export Functions
// -----------------------------------------------------------------------------

/**
 * Triggers the download of the entire prompt library as a JSON file.
 */
function exportLibrary() {
    const prompts = getPrompts();
    if (prompts.length === 0) {
        alert("Library is empty. Nothing to export.");
        return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(prompts, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadAnchorNode.setAttribute("download", `prompt_library_backup_${timestamp}.json`);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    alert("Library exported successfully!");
}

/**
 * Handles the file selection for importing a library.
 * Reads the JSON file and replaces the current library.
 * @param {Event} event - The file input change event.
 */
function importLibrary(event) {
    const file = event.target.files[0];
    if (!file) {
        return; // No file selected
    }

    if (file.type !== "application/json") {
        alert("Invalid file type. Please select a JSON file.");
        event.target.value = null; // Reset file input
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedPrompts = JSON.parse(e.target.result);
            if (!Array.isArray(importedPrompts)) {
                throw new Error("Invalid JSON format: Expected an array of prompts.");
            }
            if (importedPrompts.length > 0) {
                const samplePrompt = importedPrompts[0];
                if (typeof samplePrompt.id === 'undefined' || typeof samplePrompt.title === 'undefined' || typeof samplePrompt.basePrompt === 'undefined') {
                    throw new Error("Invalid prompt structure in JSON file. Missing required fields (id, title, basePrompt).");
                }
            }

            if (confirm("Are you sure you want to replace your current library with the imported one? This action cannot be undone.")) {
                savePrompts(importedPrompts);
                alert("Library imported successfully! The page will now reload to reflect changes.");
                location.reload();
            }
        } catch (error) {
            console.error("Error importing library:", error);
            alert("Failed to import library: " + error.message);
        } finally {
            event.target.value = null;
        }
    };
    reader.onerror = function() {
        alert("Error reading file.");
        event.target.value = null;
    };
    reader.readAsText(file);
}

// -----------------------------------------------------------------------------
// Prompt Display Functions
// -----------------------------------------------------------------------------

// script.js - (replace existing renderPrompts function)

function renderPrompts(promptsToRender = null) {
    const mainContainer = document.getElementById('main-container');
    const noPromptsMessage = document.getElementById('no-prompts-message');

    if (!mainContainer || !noPromptsMessage) {
        console.error("Required elements (main-container or no-prompts-message) not found for rendering prompts.");
        return;
    }
    mainContainer.innerHTML = ''; // Clear existing prompts

    const prompts = promptsToRender === null ? getPrompts() : promptsToRender;

    if (prompts.length === 0) {
        mainContainer.style.display = 'none';
        noPromptsMessage.style.display = 'block';
        return;
    }

    mainContainer.style.display = 'flex'; // Ensure it's visible if it was hidden
    noPromptsMessage.style.display = 'none';

    prompts.forEach(prompt => {
        const card = document.createElement('div');
        card.className = 'prompt-card'; // Main class for card styling

        const titleEl = document.createElement('h3');
        titleEl.textContent = prompt.title || 'Untitled Prompt';
        // Class for title specific styling if needed: titleEl.classList.add('prompt-card-title');

        const descriptionEl = document.createElement('p');
        descriptionEl.className = 'description'; // Class for description styling
        const shortDesc = prompt.description ? (prompt.description.length > 120 ? prompt.description.substring(0, 117) + '...' : prompt.description) : 'No description available.';
        descriptionEl.textContent = shortDesc;

        const tagsContainerEl = document.createElement('div');
        tagsContainerEl.className = 'tags-container';
        if (prompt.tags && prompt.tags.length > 0) {
            prompt.tags.forEach(tagText => {
                const tagEl = document.createElement('span');
                tagEl.className = 'tag'; // Class for tag styling
                tagEl.textContent = tagText;
                tagsContainerEl.appendChild(tagEl);
            });
        } else {
            // Optionally add a placeholder like <span class="no-tags-text">No tags</span>
        }

        const viewButton = document.createElement('button');
        viewButton.textContent = 'View Details';
        viewButton.className = 'view-prompt-btn'; // Class for button styling
        viewButton.setAttribute('data-prompt-id', prompt.id);
        viewButton.addEventListener('click', () => {
            window.location.href = `prompt-view.html?id=${prompt.id}`;
        });

        card.appendChild(titleEl);
        card.appendChild(descriptionEl);
        card.appendChild(tagsContainerEl);
        card.appendChild(viewButton);
        mainContainer.appendChild(card);
    });
}

// Search Functionality
function filterPrompts() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const allPrompts = getPrompts();

    if (!searchTerm) {
        renderPrompts(allPrompts);
        return;
    }

    const filtered = allPrompts.filter(prompt => {
        const titleMatch = prompt.title && prompt.title.toLowerCase().includes(searchTerm);
        const descriptionMatch = prompt.description && prompt.description.toLowerCase().includes(searchTerm);
        const tagsMatch = prompt.tags && prompt.tags.some(tag => tag.toLowerCase().includes(searchTerm));
        return titleMatch || descriptionMatch || tagsMatch;
    });
    renderPrompts(filtered);
}

// Main application logic will go below
document.addEventListener('DOMContentLoaded', () => {
    console.log('Prompt Library Initialized');

    // Test Local Storage functions (optional - for testing, can be removed/commented out later):
    /*
    console.log("Current prompts:", getPrompts());
    // ... (rest of the test code)
    */

    // Event listeners for Import/Export buttons
    const exportBtn = document.getElementById('export-library-btn');
    const importBtn = document.getElementById('import-library-btn');
    const importInput = document.getElementById('import-library-input');

    if (exportBtn) {
        exportBtn.addEventListener('click', exportLibrary);
    } else {
        console.error("Export button not found in DOM");
    }

    if (importBtn && importInput) {
        importBtn.addEventListener('click', () => importInput.click());
        importInput.addEventListener('change', importLibrary);
    } else {
        console.error("Import button and/or input not found in DOM");
    }

    // Search input event listener
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', filterPrompts); // Use 'input' for live search
    } else {
        console.error("Search input not found in DOM");
    }

    // Initial render of prompts
    renderPrompts();
});
```
