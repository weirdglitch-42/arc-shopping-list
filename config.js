/**
 * Configuration file for ARC Raiders Item Tracker
 * Contains all configurable constants and settings
 */

const config = {
    // Pagination settings
    itemsPerPage: 20,
    paginationOptions: [10, 20, 50],

    // UI settings
    loadingMessage: 'Loading ARC Raiders Item Tracker...',

    // Theme settings
    defaultTheme: 'light',

    // Search settings
    searchDebounceMs: 300,

    // Data validation
    maxSearchLength: 100,
    maxItemsPerPage: 100,

    // API settings (if needed in future)
    apiTimeout: 10000,

    // Development settings
    enableDebugLogging: false
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
}

// Make available globally for browser
if (typeof window !== 'undefined') {
    window.appConfig = config;
}
