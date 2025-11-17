/**
 * ARC Raiders Item Tracker - Main Application (Modular Version)
 * Orchestrates the application using separate modules for better maintainability
 */

class ArcShoppingList {
    /**
     * Initialize the shopping list application
     */
    constructor() {
        // Load configuration
        this.config = window.appConfig || {
            itemsPerPage: 20,
            paginationOptions: [10, 20, 50],
            loadingMessage: 'Loading ARC Raiders Item Tracker...'
        };

        // Initialize modules
        this.stateManager = new StateManager();
        this.dataLoader = new DataLoader();
        this.uiRenderer = new UIRenderer(this.stateManager, this.dataLoader);

        // Wiki pagination state
        this.currentPage = 1;
        this.itemsPerPage = this.config.itemsPerPage;

        // Make app globally available for onclick handlers
        window.app = this;

        this.init();
    }

    /**
     * Initialize the application by loading data and setting up the UI
     */
    async init() {
        try {
            this.uiRenderer.showLoading();
            await this.loadData();
            this.setupEventHandlers();
            this.renderInitialUI();
            this.uiRenderer.hideLoading();
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.uiRenderer.showError('Failed to load item data. Please check the JSON files.');
        }
    }

    /**
     * Load all application data
     */
    async loadData() {
        await Promise.all([
            this.dataLoader.loadProjectFiles(),
            this.dataLoader.loadWikiData()
        ]);
        this.stateManager.loadState();


    }

    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        // Tab switching
        this.uiRenderer.setupTabs((tabName) => this.switchTab(tabName));

        // Theme toggle
        this.initializeTheme();
    }

    /**
     * Render initial UI state
     */
    renderInitialUI() {
        // Render all tabs initially (like the original renderAllProjects method)
        this.renderAllProjects();
        this.uiRenderer.renderAllItems();
    }

    /**
     * Render all project tabs initially
     */
    renderAllProjects() {
        // Render all individual project tabs
        const projectMappings = [
            { tab: 'expedition', project: 'Expedition Project' },
            { tab: 'quests', project: 'Quest items' },
            { tab: 'scrappy', project: 'Scrappy items' },
            { tab: 'workshop', project: 'Workshop items' }
        ];

        projectMappings.forEach(({ tab, project }) => {
            this.uiRenderer.renderSingleProject(project, `${tab}-container`, (projectName, itemId) => this.toggleItem(projectName, itemId), (groupId) => this.toggleGroupCollapse(groupId));
        });
    }

    /**
     * Switch to a specific tab
     * @param {string} tabName - Tab name to switch to
     */
    switchTab(tabName) {
        this.uiRenderer.switchTab(tabName);

        // Render specific content based on tab
        if (tabName === 'wiki') {
            this.renderWikiTab();
        } else if (tabName !== 'all') {
            const projectName = this.getProjectNameFromTab(tabName);
            this.uiRenderer.renderSingleProject(projectName, `${tabName}-container`, (project, itemId) => this.toggleItem(project, itemId), (groupId) => this.toggleGroupCollapse(groupId));
        }
    }

    /**
     * Get project name from tab name
     * @param {string} tabName - Tab name
     * @returns {string} Project name
     */
    getProjectNameFromTab(tabName) {
        const mapping = {
            'expedition': 'Expedition Project',
            'quests': 'Quest items',
            'scrappy': 'Scrappy items',
            'workshop': 'Workshop items'
        };
        return mapping[tabName];
    }

    /**
     * Toggle item completion state
     * @param {string} projectName - Project name
     * @param {string} itemId - Item ID
     */
    toggleItem(projectName, itemId) {
        this.stateManager.toggleItem(projectName, itemId);

        // Rebuild item totals after state change
        this.dataLoader.buildItemTotals();

        // Update affected UI
        const tabName = this.getTabNameFromProject(projectName);
        if (tabName) {
            this.uiRenderer.renderSingleProject(projectName, `${tabName}-container`, (project, itemId) => this.toggleItem(project, itemId), (groupId) => this.toggleGroupCollapse(groupId));
        }

        // Refresh the combined "All Items" view
        this.uiRenderer.renderAllItems();
    }

    /**
     * Get tab name from project name
     * @param {string} projectName - Project name
     * @returns {string} Tab name
     */
    getTabNameFromProject(projectName) {
        const mapping = {
            'Expedition Project': 'expedition',
            'Quest items': 'quests',
            'Scrappy items': 'scrappy',
            'Workshop items': 'workshop'
        };
        return mapping[projectName];
    }

    /**
     * Toggle group collapse state
     * @param {string} groupId - Group ID
     */
    toggleGroupCollapse(groupId) {
        this.stateManager.toggleGroupCollapse(groupId);

        // Update UI for all elements with this group ID
        const groupElements = document.querySelectorAll(`[data-group-id="${groupId}"]`);
        const isCollapsed = this.stateManager.isGroupCollapsed(groupId);

        groupElements.forEach(groupElement => {
            groupElement.classList.toggle('collapsed', isCollapsed);

            const toggleBtn = groupElement.querySelector('.phase-toggle');
            if (toggleBtn) {
                const headerText = groupElement.querySelector('.phase-header').textContent.split(' (')[0];
                toggleBtn.textContent = isCollapsed ? '▶' : '▼';
                toggleBtn.setAttribute('aria-label', `${isCollapsed ? 'Expand' : 'Collapse'} ${headerText}`);
            }

            const tableContainer = groupElement.querySelector('.phase-table-container');
            if (tableContainer) {
                tableContainer.style.display = isCollapsed ? 'none' : 'block';
            }
        });
    }

    /**
     * Render the wiki tab
     */
    renderWikiTab() {
        const container = document.getElementById('wiki-container');

        // Check if search input was focused before re-rendering
        const wasSearchFocused = document.activeElement?.id === 'wiki-search';

        // Get current search term from existing element (if it exists)
        const existingSearchElement = document.getElementById('wiki-search');
        const searchTerm = (existingSearchElement?.value || '').toLowerCase().trim();

        const filteredItems = searchTerm ?
            this.dataLoader.getWikiItems().filter(item =>
                item.name.toLowerCase().includes(searchTerm) ||
                item.type.toLowerCase().includes(searchTerm) ||
                item.description.toLowerCase().includes(searchTerm) ||
                (item.rarity && item.rarity.includes(searchTerm))
            ) : this.dataLoader.getWikiItems();

        // Calculate pagination
        const totalPages = Math.ceil(filteredItems.length / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const currentItems = filteredItems.slice(startIndex, endIndex);

        // Create search and pagination controls
        const topControls = `
            <div class="wiki-controls-top">
                <div class="wiki-search-container">
                    <input type="text" id="wiki-search" placeholder="Search items by name, type, rarity, or description..." class="search-input" value="${searchTerm}">
                </div>
                <div class="page-size-selector">
                    <label>Items per page:</label>
                    <select id="items-per-page" onchange="app.changeItemsPerPage(this.value)">
                        ${this.config.paginationOptions.map(size =>
                            `<option value="${size}" ${this.itemsPerPage === size ? 'selected' : ''}>${size}</option>`
                        ).join('')}
                    </select>
                </div>
            </div>
        `;

        // Create bottom pagination controls
        const bottomPaginationControls = `
            <div class="wiki-pagination-bottom">
                <div class="page-navigation">
                    <button onclick="app.changePage(1)" ${this.currentPage === 1 ? 'disabled' : ''}>««</button>
                    <button onclick="app.changePage(${this.currentPage - 1})" ${this.currentPage === 1 ? 'disabled' : ''}>«</button>
                    <span>Page ${this.currentPage} of ${totalPages}</span>
                    <button onclick="app.changePage(${this.currentPage + 1})" ${this.currentPage === totalPages ? 'disabled' : ''}>»</button>
                    <button onclick="app.changePage(${totalPages})" ${this.currentPage === totalPages ? 'disabled' : ''}>»»</button>
                </div>
                <div class="item-count">
                    Showing ${startIndex + 1}-${Math.min(endIndex, filteredItems.length)} of ${filteredItems.length} items${searchTerm ? ` (filtered from ${this.dataLoader.getWikiItems().length} total)` : ''}
                </div>
            </div>
        `;

        // Create table rows for current page
        const tableRows = currentItems.map(item => `
            <tr>
                <td>${this.uiRenderer.createItemIconHtml(item.name)}</td>
                <td>${item.name}</td>
                <td><span class="rarity ${item.rarity}">${item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}</span></td>
                <td>${item.value}</td>
                <td>${item.weight}</td>
                <td>${item.type}</td>
                <td>${item.description}</td>
            </tr>
        `).join('');

        // Create loot table
        const lootTable = `
            <div class="project-card">
                <div class="project-header">
                    <h2 class="project-title">ARC Raiders Item Database</h2>
                    <div class="project-progress">
                        <span class="progress-text">${this.dataLoader.getWikiItems().length} Items Available</span>
                    </div>
                </div>
                <div class="project-content">
                    <div class="wiki-info">
                        <p><strong>Looting</strong> is the main source for acquiring items, gear and weapons in the rust belt and are often needed for Quests, Workshop Upgrades, Crafting or can be sold or recycled to break them down into smaller resources.</p>
                        <p>Use this reference to prioritize what to take and what to leave behind. Most loot is found in <strong>Containers</strong> throughout every map.</p>
                    </div>

                    ${topControls}

                    <div class="wiki-table-container">
                        <table class="wiki-loot-table">
                            <thead>
                                <tr>
                                    <th>Icon</th>
                                    <th>Item Name</th>
                                    <th>Rarity</th>
                                    <th>Value</th>
                                    <th>Weight</th>
                                    <th>Type</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRows}
                            </tbody>
                        </table>
                    </div>

                    ${bottomPaginationControls}

                    <div class="wiki-notes">
                        <h3>Loot Containers</h3>
                        <p>You can find different <strong>containers</strong> all throughout every map on the Rust Belt. Some are easier to open than others and some can be quite lucrative for Raiders.</p>

                        <h3>Recycling Notes</h3>
                        <ul>
                            <li>Recycling items during a raid only returns <strong>50% of usual components</strong></li>
                            <li>Salvaging yields fewer or lower-quality items, but can be done while Topside</li>
                            <li>Most recycling can only be done while in Speranza</li>
                        </ul>

                        <div class="wiki-attribution">
                            <p><strong>Source:</strong> <a href="https://metaforge.app/arc-raiders/database/items" target="_blank" rel="noopener noreferrer">MetaForge ARC Raiders Database</a></p>
                            <p><em>Data compiled from MetaForge's comprehensive ARC Raiders item database (Pages 1-13). Visit for the most up-to-date information and additional details.</em></p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = lootTable;

        // Add search functionality - get element reference AFTER setting innerHTML
        const wikiSearchElement = document.getElementById('wiki-search');
        if (wikiSearchElement) {
            // Remove existing event listener to avoid duplicates
            const existingHandler = wikiSearchElement._searchHandler;
            if (existingHandler) {
                wikiSearchElement.removeEventListener('input', existingHandler);
            }

            // Create new handler
            const searchHandler = (e) => {
                this.currentPage = 1; // Reset to first page when searching
                this.renderWikiTab();
            };

            // Store reference and add listener
            wikiSearchElement._searchHandler = searchHandler;
            wikiSearchElement.addEventListener('input', searchHandler);

            // Restore focus if it was focused before re-rendering
            if (wasSearchFocused) {
                wikiSearchElement.focus();
                // Set cursor to end of text
                wikiSearchElement.setSelectionRange(searchTerm.length, searchTerm.length);
            }
        }
    }

    /**
     * Change items per page
     * @param {string|number} newSize - New page size
     */
    changeItemsPerPage(newSize) {
        const validatedSize = this.validateItemsPerPage(newSize);
        if (validatedSize !== null) {
            this.itemsPerPage = validatedSize;
            this.currentPage = 1; // Reset to first page
            this.renderWikiTab();
        } else {
            // Reset the select element to the current valid value
            const selectElement = document.getElementById('items-per-page');
            if (selectElement) {
                selectElement.value = this.itemsPerPage;
            }
        }
    }

    /**
     * Validate items per page input
     * @param {string|number} value - Value to validate
     * @returns {number|null} Validated number or null
     */
    validateItemsPerPage(value) {
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 1 || num > 100) { // Using config value
            console.warn(`Invalid items per page: ${value}. Must be between 1 and 100`);
            return null;
        }
        return num;
    }

    /**
     * Change page
     * @param {number} newPage - New page number
     */
    changePage(newPage) {
        const wikiSearchElement = document.getElementById('wiki-search');
        const searchTerm = (wikiSearchElement?.value || '').toLowerCase().trim();
        const filteredItems = searchTerm ?
            this.dataLoader.getWikiItems().filter(item =>
                item.name.toLowerCase().includes(searchTerm) ||
                item.type.toLowerCase().includes(searchTerm) ||
                item.description.toLowerCase().includes(searchTerm) ||
                (item.rarity && item.rarity.includes(searchTerm))
            ) : this.dataLoader.getWikiItems();

        const totalPages = Math.ceil(filteredItems.length / this.itemsPerPage);
        if (newPage >= 1 && newPage <= totalPages) {
            this.currentPage = newPage;
            this.renderWikiTab();
        }
    }

    /**
     * Initialize theme system
     */
    initializeTheme() {
        // Set initial theme
        const currentTheme = this.stateManager.getTheme();
        this.setTheme(currentTheme);

        // Set up theme toggle button
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
    }

    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        const currentTheme = this.stateManager.getTheme();
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    /**
     * Set the theme
     * @param {string} theme - Theme name ('light' or 'dark')
     */
    setTheme(theme) {
        this.stateManager.setTheme(theme);
        document.documentElement.setAttribute('data-theme', theme);

        // Update toggle button
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            const themeText = themeToggle.querySelector('.theme-text');
            const themeIcon = themeToggle.querySelector('.theme-icon');

            if (theme === 'dark') {
                themeText.textContent = 'Light Mode';
                themeIcon.textContent = '☀️';
            } else {
                themeText.textContent = 'Dark Mode';
                themeIcon.textContent = '🌙';
            }
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ArcShoppingList();
});
