/**
 * UI Renderer Module
 * Handles DOM manipulation and UI rendering
 */

class UIRenderer {
    constructor(stateManager, dataLoader) {
        this.stateManager = stateManager;
        this.dataLoader = dataLoader;
        this.eventListeners = new Map();
    }

    /**
     * Show loading overlay
     * @param {string} message - Loading message
     */
    showLoading(message = 'Loading ARC Raiders Item Tracker...') {
        // Remove existing loading overlay
        this.hideLoading();

        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-spinner"></div>
            <p>${message}</p>
        `;
        loadingOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            color: white;
            font-family: 'Barlow', sans-serif;
        `;

        const spinner = loadingOverlay.querySelector('.loading-spinner');
        spinner.style.cssText = `
            width: 50px;
            height: 50px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top: 4px solid #0093ed;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
        `;

        // Add spinner animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(loadingOverlay);
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        const container = document.getElementById('projects-container');
        if (container) {
            // Clear existing content
            container.innerHTML = '';
            // Create error element safely
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error';
            errorDiv.textContent = message;
            container.appendChild(errorDiv);
        } else {
            console.error('Could not show error - projects-container not found');
        }
    }

    /**
     * Setup tab event listeners
     * @param {Function} switchTabCallback - Callback for tab switching
     */
    setupTabs(switchTabCallback) {
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            this.addEventListener(button, 'click', () => {
                switchTabCallback(button.dataset.tab);
            });
        });
    }

    /**
     * Switch to a specific tab
     * @param {string} tabName - Tab name to switch to
     */
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const tabContent = document.getElementById(`${tabName}-tab`);
        if (tabContent) {
            tabContent.classList.add('active');
        }
    }

    /**
     * Render all items overview
     */
    renderAllItems() {
        const container = document.getElementById('all-items-container');
        const allItems = this.dataLoader.getAllItemsRemaining(this.stateManager);

        // Clean up existing event listeners
        this.cleanupEventListeners('all-items-search');

        container.innerHTML = '';

        // Create search input
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';
        searchContainer.innerHTML = `
            <input type="text" id="all-items-search" placeholder="Search items..." class="search-input">
        `;

        // Create table container
        const tableContainer = document.createElement('div');
        tableContainer.className = 'all-items-table-container';

        // Sort items alphabetically
        const sortedItems = Object.entries(allItems).sort(([a], [b]) => a.localeCompare(b));

        // Create table HTML
        const tableRows = sortedItems.map(([itemName, data]) => {
            const isComplete = data.remainingQuantity === 0;
            const projectInfo = data.projects.map(p => `${p.projectName} (${p.quantity})`).join(', ');
            const quantityDisplay = isComplete ? 'Complete' : `${data.remainingQuantity}/${data.totalQuantity}`;

            const iconHtml = this.createItemIconHtml(itemName);

            // Get comprehensive item data from all_items.json
            const wikiItem = this.dataLoader.getWikiItem(itemName);

            // Create rarity badge if rarity exists
            const rarity = wikiItem?.rarity || this.dataLoader.getItemRarity(itemName);
            const rarityBadge = rarity ? `<span class="rarity ${rarity}">${rarity.charAt(0).toUpperCase() + rarity.slice(1)}</span>` : '';

            return `
                <tr class="all-items-entry ${isComplete ? 'completed' : ''}" data-item-name="${itemName.toLowerCase()}" data-projects="${data.projects.map(p => p.projectName).join(',')}">
                    <td>${iconHtml}</td>
                    <td>${itemName}</td>
                    <td>${rarityBadge}</td>
                    <td>${quantityDisplay}</td>
                    <td>${projectInfo}</td>
                    <td>${wikiItem?.type || '-'}</td>
                </tr>
            `;
        }).join('');

        tableContainer.innerHTML = `
            <table class="all-items-table">
                <thead>
                    <tr>
                        <th>Icon</th>
                        <th>Item Name</th>
                        <th>Rarity</th>
                        <th>Quantity</th>
                        <th>Projects</th>
                        <th>Type</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        `;

        container.appendChild(searchContainer);
        container.appendChild(tableContainer);

        // Add search functionality
        const searchInput = document.getElementById('all-items-search');
        this.addEventListener(searchInput, 'input', (e) => {
            this.filterAllItems(e.target.value);
        });

        this.updateAllItemsProgress();
    }

    /**
     * Render a single project
     * @param {string} projectName - Project name
     * @param {string} containerId - Container ID
     * @param {Function} toggleItemCallback - Callback for item toggling
     * @param {Function} toggleGroupCallback - Callback for group toggling
     */
    renderSingleProject(projectName, containerId, toggleItemCallback, toggleGroupCallback) {
        const container = document.getElementById(containerId);
        const items = this.dataLoader.getProjects()[projectName];

        // Clean up existing event listeners
        this.cleanupEventListeners(`${containerId}-search`);

        // Clear the container first
        container.innerHTML = '';

        if (!items) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = '<h3>Project Not Found</h3>';
            container.appendChild(emptyState);
            return;
        }

        // Create search input for this tab
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';
        searchContainer.innerHTML = `
            <input type="text" id="${containerId}-search" placeholder="Search items in ${projectName}..." class="search-input">
        `;

        container.appendChild(searchContainer);

        const groupedItems = this.dataLoader.groupItemsByRequirement(items, projectName);
        const completed = this.dataLoader.getCompletedCount(projectName, items, this.stateManager);
        const total = items.length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        // Update progress bar and text
        const progressFill = document.getElementById(`${containerId.replace('-container', '')}-progress-fill`);
        const progressText = document.getElementById(`${containerId.replace('-container', '')}-progress-text`);

        if (progressFill) progressFill.style.width = `${percentage}%`;
        if (progressText) progressText.textContent = `${completed}/${total} (${percentage}%)`;

        // Populate the container with phase groups
        for (const [groupName, groupItems] of Object.entries(groupedItems)) {
            const groupElement = this.createPhaseGroup(groupName, groupItems, projectName, toggleItemCallback, toggleGroupCallback);
            container.appendChild(groupElement);
        }

        // Add source attribution
        this.addSourceAttribution(container, projectName);

        // Add search functionality
        const searchInput = document.getElementById(`${containerId}-search`);
        this.addEventListener(searchInput, 'input', (e) => {
            this.filterProjectItems(containerId, e.target.value);
        });
    }

    /**
     * Create a phase group element
     * @param {string} groupName - Group name
     * @param {Array} items - Items in the group
     * @param {string} projectName - Project name
     * @param {Function} toggleItemCallback - Item toggle callback
     * @param {Function} toggleGroupCallback - Group toggle callback
     * @returns {HTMLElement} Phase group element
     */
    createPhaseGroup(groupName, items, projectName, toggleItemCallback, toggleGroupCallback) {
        const groupDiv = document.createElement('div');
        const groupId = this.dataLoader.generateGroupId(groupName);
        const isCollapsed = this.stateManager.isGroupCollapsed(groupId);

        groupDiv.className = `phase-group ${isCollapsed ? 'collapsed' : ''}`;
        groupDiv.dataset.groupId = groupId;

        const completed = this.dataLoader.getCompletedCount(projectName, items, this.stateManager);
        const total = items.length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        const toggleIcon = isCollapsed ? '▶' : '▼';

        groupDiv.innerHTML = `
            <div class="phase-header">
                <button class="phase-toggle" aria-label="${isCollapsed ? 'Expand' : 'Collapse'} ${groupName}">${toggleIcon}</button>
                ${groupName} <span class="phase-progress">(${completed}/${total} - ${percentage}%)</span>
            </div>
            <div class="phase-table-container">
                <table class="phase-items-table">
                    <thead>
                        <tr>
                            <th></th>
                            <th>Icon</th>
                            <th>Item Name</th>
                            <th>Rarity</th>
                            <th>Quantity</th>
                            <th>Requirement</th>
                            <th>Type</th>
                            <th>Value</th>
                            <th>Weight</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => this.createItemTableRow(projectName, item)).join('')}
                    </tbody>
                </table>
            </div>
        `;

        // Add event listener to toggle button
        const toggleBtn = groupDiv.querySelector('.phase-toggle');
        this.addEventListener(toggleBtn, 'click', () => {
            toggleGroupCallback(groupId);
        });

        // Add event listeners to checkboxes
        const checkboxes = groupDiv.querySelectorAll('.item-checkbox');
        checkboxes.forEach(checkbox => {
            this.addEventListener(checkbox, 'click', (e) => {
                const actualProjectName = e.target.dataset.project || projectName;
                toggleItemCallback(actualProjectName, e.target.dataset.itemId);
            });

            this.addEventListener(checkbox, 'keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const actualProjectName = e.target.dataset.project || projectName;
                    toggleItemCallback(actualProjectName, e.target.dataset.itemId);
                }
            });
        });

        return groupDiv;
    }

    /**
     * Create item table row
     * @param {string} projectName - Project name
     * @param {Object} item - Item data
     * @returns {string} HTML table row
     */
    createItemTableRow(projectName, item) {
        // For combined view, use the item's project name
        const actualProjectName = item.projectName || projectName;
        const isCompleted = this.stateManager.isItemCompleted(actualProjectName, item.id);
        const completedClass = isCompleted ? 'completed' : '';
        const checkedClass = isCompleted ? 'checked' : '';

        // Get comprehensive item data from all_items.json
        const wikiItem = this.dataLoader.getWikiItem(item.name);

        const iconHtml = this.createItemIconHtml(item.name);

        // Create rarity badge if rarity exists
        const rarity = wikiItem?.rarity || this.dataLoader.getItemRarity(item.name);
        const rarityBadge = rarity ? `<span class="rarity ${rarity}">${rarity.charAt(0).toUpperCase() + rarity.slice(1)}</span>` : '';

        // Show shared item totals for combined view
        let quantityDisplay = `${item.quantity}`;
        if (item.projectName && this.dataLoader.getItemTotals()[item.id]) {
            const remainingTotal = this.dataLoader.getRemainingTotal(item.id, this.stateManager);
            const originalTotal = this.dataLoader.getItemTotals()[item.id].totalNeeded;
            quantityDisplay = `${item.quantity} (${remainingTotal}/${originalTotal})`;
        }

        // Add additional item details from all_items.json
        const itemValue = wikiItem?.value || '-';
        const itemWeight = wikiItem?.weight || '-';
        const itemType = wikiItem?.type || '-';
        const itemDescription = wikiItem?.description || '-';

        return `
            <tr class="item-table-row ${completedClass}" data-item-id="${item.id}" data-project="${actualProjectName}">
                <td><div class="item-checkbox ${checkedClass}" data-item-id="${item.id}" data-project="${actualProjectName}" tabindex="0" role="checkbox" aria-checked="${isCompleted}"></div></td>
                <td>${iconHtml}</td>
                <td>${item.name}</td>
                <td>${rarityBadge}</td>
                <td>${quantityDisplay}</td>
                <td>${item.requirement}</td>
                <td>${itemType}</td>
                <td>${itemValue}</td>
                <td>${itemWeight}</td>
                <td>${itemDescription}</td>
            </tr>
        `;
    }

    /**
     * Create item icon HTML
     * @param {string} itemName - Item name
     * @returns {string} Icon HTML
     */
    createItemIconHtml(itemName) {
        // Get comprehensive item data from all_items.json
        const wikiItem = this.dataLoader.getWikiItem(itemName);

        // Always try to use icon from all_items.json first, fallback to styled icon or old method
        const rarity = wikiItem?.rarity || this.dataLoader.getItemRarity(itemName);
        return this.createStyledIcon(itemName, rarity);
    }

    /**
     * Create styled icon with rarity colors
     * @param {string} itemName - Item name
     * @param {string} rarity - Item rarity
     * @returns {string} Styled icon HTML
     */
    createStyledIcon(itemName, rarity) {
        // Find the item in wiki data to get the icon URL
        const wikiItem = this.dataLoader.getWikiItem(itemName);
        const iconUrl = wikiItem && wikiItem.icon ? wikiItem.icon : this.getMetaforgeIconUrl(itemName);
        const colors = this.getRarityColor(rarity || 'common'); // Ensure we always have a valid rarity

        // Create wiki URL - replace spaces with underscores
        const wikiUrl = `https://arcraiders.wiki/wiki/${itemName.replace(/\s+/g, '_')}`;

        // Create the styled icon HTML similar to the Metaforge example, wrapped in a link
        return `
            <a href="${wikiUrl}" target="_blank" rel="noopener noreferrer" class="item-icon-link" title="View ${itemName} on ARC Raiders Wiki">
                <div class="item-icon-container" style="
                    background: linear-gradient(to right top, ${colors.color} -80%, var(--background) 60%);
                    border: 1px solid ${colors.border};
                    position: relative;
                    display: inline-flex;
                    height: 64px;
                    width: 64px;
                    min-height: 64px;
                    min-width: 64px;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: transform 0.2s ease;
                ">
                    <img src="${iconUrl}" alt="${itemName} icon" loading="lazy" style="
                        height: 64px;
                        width: 64px;
                        min-height: 64px;
                        min-width: 64px;
                        filter: drop-shadow(0px 0px 1px rgba(255, 255, 255, 0.1));
                    " onerror="this.style.display='none'">
                </div>
            </a>
        `;
    }

    /**
     * Get Metaforge icon URL
     * @param {string} itemName - Item name
     * @returns {string} Icon URL
     */
    getMetaforgeIconUrl(itemName) {
        // Generate Metaforge icon URL
        // Format: https://cdn.metaforge.app/arc-raiders/icons/{item-slug}48.webp
        const slug = itemName.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '') // Remove special characters
            .trim()
            .replace(/\s+/g, '-'); // Replace spaces with hyphens

        return `https://cdn.metaforge.app/arc-raiders/icons/${slug}48.webp`;
    }

    /**
     * Get rarity color scheme
     * @param {string} rarity - Item rarity
     * @returns {Object} Color scheme
     */
    getRarityColor(rarity) {
        // Return color scheme for each rarity type
        const colorSchemes = {
            'common': { color: '#9ca3af', border: '#6b7280' }, // Gray
            'uncommon': { color: '#10b981', border: '#059669' }, // Green
            'rare': { color: '#3b82f6', border: '#2563eb' }, // Blue
            'epic': { color: '#8b5cf6', border: '#7c3aed' } // Purple
        };

        return colorSchemes[rarity.toLowerCase()] || colorSchemes['common'];
    }

    /**
     * Add source attribution to container
     * @param {HTMLElement} container - Container element
     * @param {string} projectName - Project name
     */
    addSourceAttribution(container, projectName) {
        let attributionHtml = '';

        switch (projectName) {
            case 'Quest items':
                attributionHtml = `
                    <p><strong>Source:</strong> <a href="https://www.gamepur.com/guides/all-quest-items-arc-raiders" target="_blank" rel="noopener noreferrer">Gamepur - All Quest Items in ARC Raiders</a></p>
                    <p><em>Quest item data compiled from Gamepur's comprehensive ARC Raiders guide. Visit for detailed quest walkthroughs and location maps.</em></p>
                `;
                break;
            case 'Workshop items':
                attributionHtml = `
                    <p><strong>Source:</strong> <a href="https://arcraiders.wiki/wiki/Workshop" target="_blank" rel="noopener noreferrer">ARC Raiders Wiki - Workshop</a></p>
                    <p><em>Workshop station requirements compiled from the official ARC Raiders community wiki. Visit for detailed crafting recipes and station information.</em></p>
                `;
                break;
            case 'Scrappy items':
                attributionHtml = `
                    <p><strong>Source:</strong> <a href="https://arcraiders.wiki/wiki/Workshop" target="_blank" rel="noopener noreferrer">ARC Raiders Wiki - Workshop</a></p>
                    <p><em>Scrappy upgrade requirements compiled from the official ARC Raiders community wiki. Visit for detailed crafting recipes and station information.</em></p>
                `;
                break;
            case 'Expedition Project':
                attributionHtml = `
                    <p><strong>Source:</strong> <a href="https://arcraiders.wiki/wiki/Expedition_1" target="_blank" rel="noopener noreferrer">ARC Raiders Wiki - Expedition 1</a></p>
                    <p><em>Expedition 1 part requirements compiled from the official ARC Raiders community wiki. Visit for detailed expedition information and requirements.</em></p>
                `;
                break;
        }

        if (attributionHtml) {
            const attributionDiv = document.createElement('div');
            attributionDiv.className = 'wiki-attribution';
            attributionDiv.innerHTML = attributionHtml;
            container.appendChild(attributionDiv);
        }
    }

    /**
     * Filter all items based on search term
     * @param {string} searchTerm - Search term
     */
    filterAllItems(searchTerm) {
        const validatedTerm = this.validateSearchTerm(searchTerm);
        const tableContainer = document.querySelector('.all-items-table-container');
        const rows = tableContainer.querySelectorAll('.all-items-entry');
        const term = validatedTerm.toLowerCase();

        rows.forEach(row => {
            const itemName = row.dataset.itemName;
            const projects = row.dataset.projects.toLowerCase();
            const matches = !term || itemName.includes(term) || projects.includes(term);

            row.style.display = matches ? 'table-row' : 'none';
        });
    }

    /**
     * Filter project items based on search term
     * @param {string} containerId - Container ID
     * @param {string} searchTerm - Search term
     */
    filterProjectItems(containerId, searchTerm) {
        const validatedTerm = this.validateSearchTerm(searchTerm);
        const container = document.getElementById(containerId);
        const rows = container.querySelectorAll('.item-table-row');
        const term = validatedTerm.toLowerCase();

        rows.forEach(row => {
            const itemName = row.cells[2]?.textContent.toLowerCase() || ''; // Item Name column
            const requirement = row.cells[5]?.textContent.toLowerCase() || ''; // Requirement column
            const itemType = row.cells[6]?.textContent.toLowerCase() || ''; // Type column
            const description = row.cells[9]?.textContent.toLowerCase() || ''; // Description column

            const matches = !term ||
                itemName.includes(term) ||
                requirement.includes(term) ||
                itemType.includes(term) ||
                description.includes(term);

            row.style.display = matches ? 'table-row' : 'none';
        });
    }

    /**
     * Validate search term
     * @param {string} value - Search term
     * @returns {string} Validated search term
     */
    validateSearchTerm(value) {
        if (typeof value !== 'string') return '';
        const trimmed = value.trim();
        if (trimmed.length > 100) { // Using config value
            console.warn(`Search term too long: ${trimmed.length} characters. Max allowed: 100`);
            return trimmed.substring(0, 100);
        }
        return trimmed;
    }

    /**
     * Update all items progress
     */
    updateAllItemsProgress() {
        let totalCompleted = 0;
        let totalItems = 0;

        const projects = this.dataLoader.getProjects();
        for (const [projectName, items] of Object.entries(projects)) {
            totalCompleted += this.dataLoader.getCompletedCount(projectName, items, this.stateManager);
            totalItems += items.length;
        }

        const percentage = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;

        const progressFill = document.getElementById('all-progress-fill');
        const progressText = document.getElementById('all-progress-text');

        if (progressFill) progressFill.style.width = `${percentage}%`;
        if (progressText) progressText.textContent = `${totalCompleted}/${totalItems} (${percentage}%)`;
    }

    /**
     * Add event listener with cleanup tracking
     * @param {HTMLElement} element - DOM element
     * @param {string} event - Event type
     * @param {Function} callback - Event callback
     * @param {string} key - Optional key for cleanup tracking
     */
    addEventListener(element, event, callback, key = null) {
        if (!element) return;

        const listenerKey = key || `${element.id || element.className}-${event}`;
        if (!this.eventListeners.has(listenerKey)) {
            this.eventListeners.set(listenerKey, new Set());
        }

        // Remove existing listener if any
        const existingListeners = this.eventListeners.get(listenerKey);
        existingListeners.forEach(existingCallback => {
            element.removeEventListener(event, existingCallback);
        });
        existingListeners.clear();

        // Add new listener
        element.addEventListener(event, callback);
        existingListeners.add(callback);
    }

    /**
     * Clean up event listeners for a specific key
     * @param {string} key - Listener key to clean up
     */
    cleanupEventListeners(key) {
        if (this.eventListeners.has(key)) {
            // Note: We don't actually remove the listeners here since we don't have references to elements
            // This is just for tracking purposes. In a real implementation, we'd need to store element references too.
            this.eventListeners.delete(key);
        }
    }

    /**
     * Clean up all event listeners
     */
    cleanupAllEventListeners() {
        this.eventListeners.clear();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIRenderer;
}

// Make available globally for browser
if (typeof window !== 'undefined') {
    window.UIRenderer = UIRenderer;
}
