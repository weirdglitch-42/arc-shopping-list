/**
 * State Manager Module
 * Handles application state management and localStorage operations
 */

interface StateListener {
  (path: string, value: any): void;
}

interface StateObject {
  [key: string]: any;
}

class StateManager {
  private state: StateObject = {};
  private listeners: Map<string, Set<StateListener>> = new Map();

  /**
   * Initialize state from localStorage
   */
  loadState(): void {
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
  private initializeStateStructure(): void {
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
  private saveState(): void {
    try {
      localStorage.setItem('arc-shopping-list-state', JSON.stringify(this.state));
    } catch (error) {
      console.warn('Could not save state:', error);
    }
  }

  /**
   * Get state value by path
   * @param path - Dot-separated path (e.g., 'project.item.id')
   * @param defaultValue - Default value if path doesn't exist
   */
  get(path: string, defaultValue: any = undefined): any {
    const keys = path.split('.');
    let current: any = this.state;

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
   * @param path - Dot-separated path
   * @param value - Value to set
   */
  set(path: string, value: any): void {
    const keys = path.split('.');
    let current: any = this.state;

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
   * @param path - Dot-separated path
   */
  toggle(path: string): void {
    const currentValue = this.get(path, false);
    this.set(path, !currentValue);
  }

  /**
   * Check if item is completed
   * @param projectName - Project name
   * @param itemId - Item ID
   */
  isItemCompleted(projectName: string, itemId: string): boolean {
    return this.get(`${projectName}.${itemId}`, false);
  }

  /**
   * Set item completion state
   * @param projectName - Project name
   * @param itemId - Item ID
   * @param completed - Completion state
   */
  setItemCompleted(projectName: string, itemId: string, completed: boolean): void {
    this.set(`${projectName}.${itemId}`, completed);
  }

  /**
   * Toggle item completion state
   * @param projectName - Project name
   * @param itemId - Item ID
   */
  toggleItem(projectName: string, itemId: string): void {
    this.toggle(`${projectName}.${itemId}`);
  }

  /**
   * Check if group is collapsed
   * @param groupId - Group ID
   */
  isGroupCollapsed(groupId: string): boolean {
    return this.get(`collapsed.${groupId}`, false);
  }

  /**
   * Set group collapse state
   * @param groupId - Group ID
   * @param collapsed - Collapse state
   */
  setGroupCollapsed(groupId: string, collapsed: boolean): void {
    this.set(`collapsed.${groupId}`, collapsed);
  }

  /**
   * Toggle group collapse state
   * @param groupId - Group ID
   */
  toggleGroupCollapse(groupId: string): void {
    this.toggle(`collapsed.${groupId}`);
  }

  /**
   * Get current theme
   */
  getTheme(): string {
    return this.get('theme', 'light');
  }

  /**
   * Set theme
   * @param theme - Theme name ('light' or 'dark')
   */
  setTheme(theme: string): void {
    this.set('theme', theme);
    localStorage.setItem('arc-shopping-list-theme', theme);
  }

  /**
   * Add state change listener
   * @param path - State path to listen for
   * @param callback - Callback function
   */
  addListener(path: string, callback: StateListener): void {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }
    this.listeners.get(path)!.add(callback);
  }

  /**
   * Remove state change listener
   * @param path - State path
   * @param callback - Callback function to remove
   */
  removeListener(path: string, callback: StateListener): void {
    if (this.listeners.has(path)) {
      this.listeners.get(path)!.delete(callback);
    }
  }

  /**
   * Notify listeners of state change
   * @param path - Changed path
   * @param value - New value
   */
  private notifyListeners(path: string, value: any): void {
    if (this.listeners.has(path)) {
      this.listeners.get(path)!.forEach(callback => {
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
  getState(): StateObject {
    return { ...this.state };
  }

  /**
   * Clear all state
   */
  clearState(): void {
    this.state = {};
    this.initializeStateStructure();
    localStorage.removeItem('arc-shopping-list-state');
    localStorage.removeItem('arc-shopping-list-theme');
  }
}

// Make available globally for browser (required for our setup)
if (typeof window !== 'undefined') {
  (window as any).StateManager = StateManager;
}
