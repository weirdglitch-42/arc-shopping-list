/**
 * State Manager Module
 * Handles application state management and localStorage operations
 */

class StateManager {
    constructor() {
        this.state = {};
        this.listeners = new Map();
    }

    /**
     * Initialize state from localStorage
     */
    loadState() {
        try {
            const saved = localStorage.getItem('arc-shopping-list-state');
            if (saved) {
                this.state = JSON.parse(saved);
            }
        } catch (error) {
            console.warn('Could not load saved state:', error);
            this.state = {};
        }

        // Initialize state structure
        this.initializeStateStructure();
    }

    /**
     * Ensure state has proper structure
     */
    initializeStateStructure() {
        // Initialize collapse state
        if (!this.state.collapsed) {
            this.state.collapsed = {};
        }

        // Initialize theme preference
        if (!this.state.theme) {
            this.state.theme = localStorage.getItem('arc-shopping-list-theme') || 'light';
        }
    }

    /**
     * Save current state to localStorage
     */
    saveState() {
        try {
            localStorage.setItem('arc-shopping-list-state', JSON.stringify(this.state));
        } catch (error) {
            console.warn('Could not save state:', error);
        }
    }

    /**
     * Get state value by path
     * @param {string} path - Dot-separated path (e.g., 'project.item.id')
     * @param {*} defaultValue - Default value if path doesn't exist
     */
    get(path, defaultValue = undefined) {
        const keys = path.split('.');
        let current = this.state;

        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                return defaultValue;
            }
        }

        return current;
    }

    /**
     * Set state value by path
     * @param {string} path - Dot-separated path
     * @param {*} value - Value to set
     */
    set(path, value) {
        const keys = path.split('.');
        let current = this.state;

        // Navigate to the parent object
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current) || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }

        // Set the value
        const finalKey = keys[keys.length - 1];
        current[finalKey] = value;

        this.saveState();
        this.notifyListeners(path, value);
    }

    /**
     * Toggle boolean state value
     * @param {string} path - Dot-separated path
     */
    toggle(path) {
        const currentValue = this.get(path, false);
        this.set(path, !currentValue);
    }

    /**
     * Check if item is completed
     * @param {string} projectName - Project name
     * @param {string} itemId - Item ID
     */
    isItemCompleted(projectName, itemId) {
        return this.get(`${projectName}.${itemId}`, false);
    }

    /**
     * Set item completion state
     * @param {string} projectName - Project name
     * @param {string} itemId - Item ID
     * @param {boolean} completed - Completion state
     */
    setItemCompleted(projectName, itemId, completed) {
        this.set(`${projectName}.${itemId}`, completed);
    }

    /**
     * Toggle item completion state
     * @param {string} projectName - Project name
     * @param {string} itemId - Item ID
     */
    toggleItem(projectName, itemId) {
        this.toggle(`${projectName}.${itemId}`);
    }

    /**
     * Check if group is collapsed
     * @param {string} groupId - Group ID
     */
    isGroupCollapsed(groupId) {
        return this.get(`collapsed.${groupId}`, false);
    }

    /**
     * Set group collapse state
     * @param {string} groupId - Group ID
     * @param {boolean} collapsed - Collapse state
     */
    setGroupCollapsed(groupId, collapsed) {
        this.set(`collapsed.${groupId}`, collapsed);
    }

    /**
     * Toggle group collapse state
     * @param {string} groupId - Group ID
     */
    toggleGroupCollapse(groupId) {
        this.toggle(`collapsed.${groupId}`);
    }

    /**
     * Get current theme
     */
    getTheme() {
        return this.get('theme', 'light');
    }

    /**
     * Set theme
     * @param {string} theme - Theme name ('light' or 'dark')
     */
    setTheme(theme) {
        this.set('theme', theme);
        localStorage.setItem('arc-shopping-list-theme', theme);
    }

    /**
     * Add state change listener
     * @param {string} path - State path to listen for
     * @param {Function} callback - Callback function
     */
    addListener(path, callback) {
        if (!this.listeners.has(path)) {
            this.listeners.set(path, new Set());
        }
        this.listeners.get(path).add(callback);
    }

    /**
     * Remove state change listener
     * @param {string} path - State path
     * @param {Function} callback - Callback function to remove
     */
    removeListener(path, callback) {
        if (this.listeners.has(path)) {
            this.listeners.get(path).delete(callback);
        }
    }

    /**
     * Notify listeners of state change
     * @param {string} path - Changed path
     * @param {*} value - New value
     */
    notifyListeners(path, value) {
        if (this.listeners.has(path)) {
            this.listeners.get(path).forEach(callback => {
                try {
                    callback(path, value);
                } catch (error) {
                    console.error('Error in state listener:', error);
                }
            });
        }
    }

    /**
     * Get complete state object (for debugging)
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Clear all state
     */
    clearState() {
        this.state = {};
        this.initializeStateStructure();
        localStorage.removeItem('arc-shopping-list-state');
        localStorage.removeItem('arc-shopping-list-theme');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StateManager;
}

// Make available globally for browser
if (typeof window !== 'undefined') {
    window.StateManager = StateManager;
}
