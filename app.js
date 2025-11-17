// Arc Shopping List - Game Item Tracker
// Main application logic

/**
 * Main application class for ARC Raiders Shopping List
 * Manages item tracking across multiple projects and provides wiki integration
 */
class ArcShoppingList {
    /**
     * Initialize the shopping list application
     */
    constructor() {
        // Configuration constants
        this.config = {
            itemsPerPage: 20,
            paginationOptions: [10, 20, 50]
        };

        this.projects = {};
        this.state = {};
        this.wikiItems = [];
        this.currentPage = 1;
        this.itemsPerPage = this.config.itemsPerPage;

        // List of quest collectables that cannot be kept (mission items)
        this.nonKeepableQuestItems = new Set([
            'Burletta I',
            'Armored Patrol Key Card',
            'Battle Plans',
            'Battery Cell',
            "Celeste's Journal 1",
            "Celeste's Journal 2",
            'Communication Device',
            'Deflated Football',
            'Duct Tape',
            'ESR Analyzer',
            'Flag',
            'Helmet',
            'LiDAR Scanner',
            "Major Aiva's Mementos",
            'Possibly Toxic Plant',
            'Romance Book',
            'Detective Book',
            'Adventure Book',
            'First Wave Tape',
            'First Wave Compass',
            'First Wave Rations'
        ]);

        // Make app globally available for onclick handlers
        window.app = this;

        // Initialize theme system
        this.initializeTheme();



        this.init();
    }

    /**
     * Initialize the application by loading data and setting up the UI
     */
    async init() {
        try {
            this.showLoading();
            await this.loadProjectFiles();
            this.loadState();
            await this.initializeWikiData();
            this.setupTabs();
            this.renderAllItems();
            this.renderAllProjects(); // Render all project tabs initially
            this.hideLoading();
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Failed to load item data. Please check the JSON files.');
        }
    }

    showLoading() {
        // Don't destroy the DOM structure - just show a subtle loading state
    }

    hideLoading() {
        // Loading is complete
    }

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

    async loadProjectFiles() {
        const files = [
            { name: 'Expedition Project', file: 'expedition_project.json' },
            { name: 'Quest items', file: 'quest_items.json' },
            { name: 'Scrappy items', file: 'scrappy_items.json' },
            { name: 'Workshop items', file: 'workshop_items.json' }
        ];

        for (const fileInfo of files) {
            try {
                const response = await fetch(fileInfo.file);
                if (!response.ok) {
                    throw new Error(`Failed to load ${fileInfo.file}`);
                }
                const items = await response.json();
                this.projects[fileInfo.name] = items;
            } catch (error) {
                console.warn(`Could not load ${fileInfo.file}:`, error);
                // Continue with other files
            }
        }

        if (Object.keys(this.projects).length === 0) {
            throw new Error('No item files could be loaded');
        }
    }



    generateItemId(name, requirement = '') {
        // Include requirement in ID for unique tracking when items appear in multiple stations
        const baseId = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        if (requirement) {
            const reqId = requirement.toLowerCase().replace(/[^a-z0-9]/g, '-');
            return `${baseId}-${reqId}`;
        }
        return baseId;
    }

    generateGroupId(groupName) {
        return groupName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    }

    buildItemTotals() {
        this.itemTotals = {};

        // Build a registry of all item instances across all projects
        for (const [projectName, items] of Object.entries(this.projects)) {
            items.forEach(item => {
                if (!this.itemTotals[item.id]) {
                    this.itemTotals[item.id] = {
                        totalNeeded: 0,
                        instances: []
                    };
                }

                // Parse quantity (handle non-numeric values)
                const quantity = parseInt(item.quantity) || 1;
                this.itemTotals[item.id].totalNeeded += quantity;
                this.itemTotals[item.id].instances.push({
                    projectName,
                    quantity,
                    requirement: item.requirement
                });
            });
        }
    }

    getRemainingTotal(itemId) {
        if (!this.itemTotals[itemId]) return 0;

        let remaining = this.itemTotals[itemId].totalNeeded;

        // Subtract completed instances
        for (const instance of this.itemTotals[itemId].instances) {
            if (this.state[instance.projectName]?.[itemId]) {
                remaining -= instance.quantity;
            }
        }

        return Math.max(0, remaining);
    }

    toggleGroupCollapse(groupId) {
        if (!this.state.collapsed) {
            this.state.collapsed = {};
        }

        this.state.collapsed[groupId] = !this.state.collapsed[groupId];
        this.saveState();

        // Update the UI - find all elements with this group ID
        const groupElements = document.querySelectorAll(`[data-group-id="${groupId}"]`);

        groupElements.forEach(groupElement => {
            const isCollapsed = this.state.collapsed[groupId];
            groupElement.classList.toggle('collapsed', isCollapsed);

            const toggleBtn = groupElement.querySelector('.phase-toggle');
            if (toggleBtn) {
                toggleBtn.textContent = isCollapsed ? '▶' : '▼';
                const headerText = groupElement.querySelector('.phase-header').textContent.split(' (')[0];
                toggleBtn.setAttribute('aria-label', `${isCollapsed ? 'Expand' : 'Collapse'} ${headerText}`);
            }

            // Hide/show the table container instead of phase-items
            const tableContainer = groupElement.querySelector('.phase-table-container');
            if (tableContainer) {
                tableContainer.style.display = isCollapsed ? 'none' : 'block';
            }
        });
    }

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

        // Initialize state for any new projects/items
        for (const [projectName, items] of Object.entries(this.projects)) {
            if (!this.state[projectName]) {
                this.state[projectName] = {};
            }

            for (const item of items) {
                if (this.state[projectName][item.id] === undefined) {
                    this.state[projectName][item.id] = false;
                }
            }
        }

        // Initialize collapse state
        if (!this.state.collapsed) {
            this.state.collapsed = {};
        }

        // Build item totals registry
        this.buildItemTotals();
    }

    async initializeWikiData() {
        try {
            const response = await fetch('all_items.json');
            if (!response.ok) {
                throw new Error(`Failed to load all_items.json: ${response.status}`);
            }
            const rawData = await response.json();

            // Transform the data to match the expected format
            this.wikiItems = rawData.map(item => ({
                name: item.name,
                rarity: item.rarity ? item.rarity.toLowerCase() : '',
                value: item.value,
                weight: item.stat_block && item.stat_block.weight ? `${item.stat_block.weight} kg` : '-',
                type: item.item_type,
                description: item.description || '',
                icon: item.icon,
                workbench: item.workbench,
                stat_block: item.stat_block,
                loadout_slots: item.loadout_slots,
                flavor_text: item.flavor_text,
                subcategory: item.subcategory,
                shield_type: item.shield_type,
                loot_area: item.loot_area,
                sources: item.sources,
                ammo_type: item.ammo_type,
                locations: item.locations
            }));

        } catch (error) {
            console.warn('Could not load wiki data from all_items.json:', error);
            // Fallback to empty array if JSON loading fails
            this.wikiItems = [];
        }
    }

    saveState() {
        try {
            localStorage.setItem('arc-shopping-list-state', JSON.stringify(this.state));
        } catch (error) {
            console.warn('Could not save state:', error);
        }
    }





    getItemIconHtml(itemName) {
        // Get comprehensive item data from all_items.json
        const wikiItem = this.wikiItems.find(wikiItem =>
            wikiItem.name.toLowerCase() === itemName.toLowerCase()
        );

        // Always try to use icon from all_items.json first, fallback to styled icon or old method
        const rarity = wikiItem?.rarity || this.getItemRarity(itemName);
        return this.createStyledIcon(itemName, rarity);
    }

    createItemHTML(projectName, item) {
        // For combined view, use the item's project name
        const actualProjectName = item.projectName || projectName;
        const isCompleted = this.state[actualProjectName]?.[item.id] || false;
        const completedClass = isCompleted ? 'completed' : '';
        const checkedClass = isCompleted ? 'checked' : '';

        const projectIndicator = item.projectName ? `<span class="item-project">(${item.projectName})</span>` : '';

        // Get comprehensive item data from all_items.json
        const wikiItem = this.wikiItems.find(wikiItem =>
            wikiItem.name.toLowerCase() === item.name.toLowerCase()
        );

        const iconHtml = this.getItemIconHtml(item.name);

        // Create rarity badge if rarity exists
        const rarity = wikiItem?.rarity || this.getItemRarity(item.name);
        const rarityBadge = rarity ? `<span class="rarity ${rarity}">${rarity.charAt(0).toUpperCase() + rarity.slice(1)}</span>` : '';

        // Show shared item totals for combined view
        let quantityDisplay = `Qty: ${item.quantity}`;
        if (item.projectName && this.itemTotals?.[item.id]) {
            const remainingTotal = this.getRemainingTotal(item.id);
            const originalTotal = this.itemTotals[item.id].totalNeeded;
            quantityDisplay = `Qty: ${item.quantity} (Total: ${remainingTotal}/${originalTotal})`;
        }

        // Add additional item details from all_items.json
        const itemValue = wikiItem?.value ? `<span class="item-value">Value: ${wikiItem.value}</span>` : '';
        const itemWeight = wikiItem?.weight ? `<span class="item-weight">Weight: ${wikiItem.weight}</span>` : '';
        const itemType = wikiItem?.type ? `<span class="item-type">Type: ${wikiItem.type}</span>` : '';
        const itemDescription = wikiItem?.description ? `<div class="item-description">${wikiItem.description}</div>` : '';

        // Use consistent layout across all tabs (header/details structure like All Items tab)
        return `
            <li class="item ${completedClass}">
                <div class="item-checkbox ${checkedClass}" data-item-id="${item.id}" data-project="${actualProjectName}" tabindex="0" role="checkbox" aria-checked="${isCompleted}"></div>
                <div class="item-content">
                    <div class="item-header">
                        <span class="item-name">${iconHtml}${item.name} ${rarityBadge} ${projectIndicator}</span>
                        <span class="item-quantity">${quantityDisplay}</span>
                    </div>
                    <div class="item-details">
                        <span class="item-requirement">${item.requirement}</span>
                        ${itemValue}
                        ${itemWeight}
                        ${itemType}
                    </div>
                    ${itemDescription}
                </div>
            </li>
        `;
    }

    createItemTableRow(projectName, item) {
        // For combined view, use the item's project name
        const actualProjectName = item.projectName || projectName;
        const isCompleted = this.state[actualProjectName]?.[item.id] || false;
        const completedClass = isCompleted ? 'completed' : '';
        const checkedClass = isCompleted ? 'checked' : '';

        // Get comprehensive item data from all_items.json
        const wikiItem = this.wikiItems.find(wikiItem =>
            wikiItem.name.toLowerCase() === item.name.toLowerCase()
        );

        const iconHtml = this.getItemIconHtml(item.name);

        // Create rarity badge if rarity exists
        const rarity = wikiItem?.rarity || this.getItemRarity(item.name);
        const rarityBadge = rarity ? `<span class="rarity ${rarity}">${rarity.charAt(0).toUpperCase() + rarity.slice(1)}</span>` : '';

        // Show shared item totals for combined view
        let quantityDisplay = `${item.quantity}`;
        if (item.projectName && this.itemTotals?.[item.id]) {
            const remainingTotal = this.getRemainingTotal(item.id);
            const originalTotal = this.itemTotals[item.id].totalNeeded;
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



    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.switchTab(button.dataset.tab);
            });
        });
    }

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
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Render specific content based on tab
        if (tabName === 'wiki') {
            this.renderWikiTab();
        } else if (tabName !== 'all') {
            const projectName = this.getProjectNameFromTab(tabName);
            this.renderSingleProject(projectName, `${tabName}-container`);
        }
    }

    getProjectNameFromTab(tabName) {
        const mapping = {
            'expedition': 'Expedition Project',
            'quests': 'Quest items',
            'scrappy': 'Scrappy items',
            'workshop': 'Workshop items'
        };
        return mapping[tabName];
    }

    getTabNameFromProject(projectName) {
        const mapping = {
            'Expedition Project': 'expedition',
            'Quest items': 'quests',
            'Scrappy items': 'scrappy',
            'Workshop items': 'workshop'
        };
        return mapping[projectName];
    }

    renderAllProjects() {
        // Render all individual project tabs
        const projectMappings = [
            { tab: 'expedition', project: 'Expedition Project' },
            { tab: 'quests', project: 'Quest items' },
            { tab: 'scrappy', project: 'Scrappy items' },
            { tab: 'workshop', project: 'Workshop items' }
        ];

        projectMappings.forEach(({ tab, project }) => {
            this.renderSingleProject(project, `${tab}-container`);
        });
    }

    renderAllItems() {
        const container = document.getElementById('all-items-container');
        const allItems = this.getAllItemsRemaining();

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

            const iconHtml = this.getItemIconHtml(itemName);

            // Get comprehensive item data from all_items.json
            const wikiItem = this.wikiItems.find(wikiItem =>
                wikiItem.name.toLowerCase() === itemName.toLowerCase()
            );

            // Create rarity badge if rarity exists
            const rarity = wikiItem?.rarity || this.getItemRarity(itemName);
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
        searchInput.addEventListener('input', (e) => {
            this.filterAllItems(e.target.value);
        });

        this.updateAllItemsProgress();
    }

    renderSingleProject(projectName, containerId) {
        const container = document.getElementById(containerId);
        const items = this.projects[projectName];

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
        const tabName = this.getTabNameFromProject(projectName);
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';
        searchContainer.innerHTML = `
            <input type="text" id="${tabName}-search" placeholder="Search items in ${projectName}..." class="search-input">
        `;

        container.appendChild(searchContainer);

        const groupedItems = this.groupItemsByRequirement(items);
        const completed = this.getCompletedCount(projectName, items);
        const total = items.length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        // Update progress bar and text
        const progressFill = document.getElementById(`${tabName}-progress-fill`);
        const progressText = document.getElementById(`${tabName}-progress-text`);

        if (progressFill) progressFill.style.width = `${percentage}%`;
        if (progressText) progressText.textContent = `${completed}/${total} (${percentage}%)`;

        // Populate the container with phase groups
        for (const [groupName, groupItems] of Object.entries(groupedItems)) {
            const groupElement = this.createPhaseGroup(groupName, groupItems, projectName);
            container.appendChild(groupElement);
        }

        // Add source attribution for quests
        if (projectName === 'Quest items') {
            const attributionDiv = document.createElement('div');
            attributionDiv.className = 'wiki-attribution';
            attributionDiv.innerHTML = `
                <p><strong>Source:</strong> <a href="https://www.gamepur.com/guides/all-quest-items-arc-raiders" target="_blank" rel="noopener noreferrer">Gamepur - All Quest Items in ARC Raiders</a></p>
                <p><em>Quest item data compiled from Gamepur's comprehensive ARC Raiders guide. Visit for detailed quest walkthroughs and location maps.</em></p>
            `;
            container.appendChild(attributionDiv);
        }

        // Add source attribution for workshop
        if (projectName === 'Workshop items') {
            const attributionDiv = document.createElement('div');
            attributionDiv.className = 'wiki-attribution';
            attributionDiv.innerHTML = `
                <p><strong>Source:</strong> <a href="https://arcraiders.wiki/wiki/Workshop" target="_blank" rel="noopener noreferrer">ARC Raiders Wiki - Workshop</a></p>
                <p><em>Workshop station requirements compiled from the official ARC Raiders community wiki. Visit for detailed crafting recipes and station information.</em></p>
            `;
            container.appendChild(attributionDiv);
        }

        // Add source attribution for scrappy
        if (projectName === 'Scrappy items') {
            const attributionDiv = document.createElement('div');
            attributionDiv.className = 'wiki-attribution';
            attributionDiv.innerHTML = `
                <p><strong>Source:</strong> <a href="https://arcraiders.wiki/wiki/Workshop" target="_blank" rel="noopener noreferrer">ARC Raiders Wiki - Workshop</a></p>
                <p><em>Scrappy upgrade requirements compiled from the official ARC Raiders community wiki. Visit for detailed crafting recipes and station information.</em></p>
            `;
            container.appendChild(attributionDiv);
        }

        // Add source attribution for expedition
        if (projectName === 'Expedition Project') {
            const attributionDiv = document.createElement('div');
            attributionDiv.className = 'wiki-attribution';
            attributionDiv.innerHTML = `
                <p><strong>Source:</strong> <a href="https://arcraiders.wiki/wiki/Expedition_1" target="_blank" rel="noopener noreferrer">ARC Raiders Wiki - Expedition 1</a></p>
                <p><em>Expedition 1 part requirements compiled from the official ARC Raiders community wiki. Visit for detailed expedition information and requirements.</em></p>
            `;
            container.appendChild(attributionDiv);
        }

        // Add search functionality
        const searchInput = document.getElementById(`${tabName}-search`);
        searchInput.addEventListener('input', (e) => {
            this.filterProjectItems(tabName, e.target.value);
        });
    }

    createPhaseGroup(groupName, items, projectName) {
        const groupDiv = document.createElement('div');
        const groupId = this.generateGroupId(groupName);
        const isCollapsed = this.state.collapsed?.[groupId] || false;

        groupDiv.className = `phase-group ${isCollapsed ? 'collapsed' : ''}`;
        groupDiv.dataset.groupId = groupId;

        const completed = this.getCompletedCount(projectName, items);
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
        toggleBtn.addEventListener('click', () => {
            this.toggleGroupCollapse(groupId);
        });

        // Add event listeners to checkboxes
        const checkboxes = groupDiv.querySelectorAll('.item-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('click', (e) => {
                const actualProjectName = e.target.dataset.project || projectName;
                this.toggleItem(actualProjectName, e.target.dataset.itemId);
            });

            checkbox.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const actualProjectName = e.target.dataset.project || projectName;
                    this.toggleItem(actualProjectName, e.target.dataset.itemId);
                }
            });
        });

        return groupDiv;
    }

    groupItemsByRequirement(items) {
        const groups = {};

        items.forEach(item => {
            // Split requirements by comma and handle multiple stations
            const requirements = item.requirement.split(',').map(req => req.trim());

            requirements.forEach(requirement => {
                if (!groups[requirement]) {
                    groups[requirement] = [];
                }
                // Create a copy of the item with the specific requirement and unique ID
                const itemForGroup = {
                    ...item,
                    requirement,
                    id: this.generateItemId(item.name, requirement)
                };
                groups[requirement].push(itemForGroup);
            });
        });

        // Filter out quest groups that only contain non-keepable items
        const filteredGroups = {};
        for (const [groupName, groupItems] of Object.entries(groups)) {
            // Check if all items in this group are non-keepable
            const hasKeepableItems = groupItems.some(item => !this.nonKeepableQuestItems.has(item.name));

            // Only include groups that have at least one keepable item
            if (hasKeepableItems) {
                filteredGroups[groupName] = groupItems;
            }
        }

        return filteredGroups;
    }



    getAllItemsRemaining() {
        const remainingItems = {};

        // First pass: collect all item instances by name across all projects
        for (const [projectName, items] of Object.entries(this.projects)) {
            items.forEach(item => {
                const itemName = item.name;

                // Skip non-keepable quest items from the combined view
                if (projectName === 'Quest items' && this.nonKeepableQuestItems.has(itemName)) {
                    return;
                }

                const quantity = parseInt(item.quantity) || 1;

                if (!remainingItems[itemName]) {
                    remainingItems[itemName] = {
                        totalQuantity: 0,
                        completedQuantity: 0,
                        projects: []
                    };
                }

                // Add this project's quantity to the total
                remainingItems[itemName].totalQuantity += quantity;

                // Check if this specific item instance is completed in this project
                let isCompleted = true;
                const requirements = item.requirement.split(',').map(req => req.trim());

                for (const requirement of requirements) {
                    const specificId = this.generateItemId(item.name, requirement);
                    if (!this.state[projectName]?.[specificId]) {
                        isCompleted = false;
                        break;
                    }
                }

                if (isCompleted) {
                    remainingItems[itemName].completedQuantity += quantity;
                }

                remainingItems[itemName].projects.push({
                    projectName,
                    quantity,
                    requirement: item.requirement,
                    completed: isCompleted
                });
            });
        }

        // Second pass: calculate remaining quantities
        for (const itemName in remainingItems) {
            const item = remainingItems[itemName];
            item.remainingQuantity = Math.max(0, item.totalQuantity - item.completedQuantity);
        }

        return remainingItems;
    }

    filterAllItems(searchTerm) {
        const tableContainer = document.querySelector('.all-items-table-container');
        const rows = tableContainer.querySelectorAll('.all-items-entry');
        const term = searchTerm.toLowerCase().trim();

        rows.forEach(row => {
            const itemName = row.dataset.itemName;
            const projects = row.dataset.projects.toLowerCase();
            const matches = !term || itemName.includes(term) || projects.includes(term);

            row.style.display = matches ? 'table-row' : 'none';
        });
    }

    filterProjectItems(tabName, searchTerm) {
        const container = document.getElementById(`${tabName}-container`);
        const rows = container.querySelectorAll('.item-table-row');
        const term = searchTerm.toLowerCase().trim();

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

    updateAllItemsProgress() {
        let totalCompleted = 0;
        let totalItems = 0;

        for (const [projectName, items] of Object.entries(this.projects)) {
            totalCompleted += this.getCompletedCount(projectName, items);
            totalItems += items.length;
        }

        const percentage = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;

        const progressFill = document.getElementById('all-progress-fill');
        const progressText = document.getElementById('all-progress-text');

        if (progressFill) progressFill.style.width = `${percentage}%`;
        if (progressText) progressText.textContent = `${totalCompleted}/${totalItems} (${percentage}%)`;
    }

    /**
     * Toggle the completion state of an item
     * @param {string} projectName - The name of the project containing the item
     * @param {string} itemId - The unique ID of the item to toggle
     */
    toggleItem(projectName, itemId) {
        if (!this.state[projectName]) {
            this.state[projectName] = {};
        }

        this.state[projectName][itemId] = !this.state[projectName][itemId];
        this.saveState();

        // Rebuild item totals after state change to ensure consistency
        this.buildItemTotals();

        // Update the specific project tab that contains this item
        const tabName = this.getTabNameFromProject(projectName);
        if (tabName) {
            this.renderSingleProject(projectName, `${tabName}-container`);
        }

        // Refresh the combined "All Items" view
        this.renderAllItems();
        this.updateAllItemsProgress();
    }

    getCompletedCount(projectName, items) {
        // Handle the combined "all" view
        if (projectName === 'all') {
            return items.reduce((count, item) => {
                const actualProjectName = item.projectName || projectName;
                return count + (this.state[actualProjectName]?.[item.id] ? 1 : 0);
            }, 0);
        }

        if (!this.state[projectName]) return 0;

        return items.reduce((count, item) => {
            return count + (this.state[projectName][item.id] ? 1 : 0);
        }, 0);
    }



    getItemRarity(itemName) {
        // Find item in wiki data and return its rarity
        const wikiItem = this.wikiItems.find(item =>
            item.name.toLowerCase() === itemName.toLowerCase()
        );
        return wikiItem ? wikiItem.rarity : '';
    }

    getMetaforgeIconUrl(itemName) {
        // Generate Metaforge icon URL
        // Format: https://cdn.metaforge.app/arc-raiders/icons/{item-slug}48.webp
        const slug = itemName.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '') // Remove special characters
            .trim()
            .replace(/\s+/g, '-'); // Replace spaces with hyphens

        return `https://cdn.metaforge.app/arc-raiders/icons/${slug}48.webp`;
    }

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

    createStyledIcon(itemName, rarity) {
        // Find the item in wiki data to get the icon URL
        const wikiItem = this.wikiItems.find(item =>
            item.name.toLowerCase() === itemName.toLowerCase()
        );
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
     * Render the wiki tab with item database, search, and pagination
     * Displays comprehensive item information from the MetaForge database
     */
    renderWikiTab() {
        const container = document.getElementById('wiki-container');

        // Cache DOM elements to avoid repeated lookups
        const wikiSearchElement = document.getElementById('wiki-search');
        const searchTerm = (wikiSearchElement?.value || '').toLowerCase().trim();

        const filteredItems = searchTerm ?
            this.wikiItems.filter(item =>
                item.name.toLowerCase().includes(searchTerm) ||
                item.type.toLowerCase().includes(searchTerm) ||
                item.description.toLowerCase().includes(searchTerm) ||
                (item.rarity && item.rarity.includes(searchTerm))
            ) : this.wikiItems;

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

        // Create bottom pagination controls (centered navigation and item count)
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
                    Showing ${startIndex + 1}-${Math.min(endIndex, filteredItems.length)} of ${filteredItems.length} items${searchTerm ? ` (filtered from ${this.wikiItems.length} total)` : ''}
                </div>
            </div>
        `;

        // Create table rows for current page
        const tableRows = currentItems.map(item => `
            <tr>
                <td>${this.createStyledIcon(item.name, item.rarity)}</td>
                <td>${item.name}</td>
                <td><span class="rarity ${item.rarity}">${item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}</span></td>
                <td>${item.value}</td>
                <td>${item.weight}</td>
                <td>${item.type}</td>
                <td>${item.description}</td>
            </tr>
        `).join('');

        // Create a comprehensive loot table based on Metaforge database
        const lootTable = `
            <div class="project-card">
                <div class="project-header">
                    <h2 class="project-title">ARC Raiders Item Database</h2>
                    <div class="project-progress">
                        <span class="progress-text">${this.wikiItems.length} Items Available</span>
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

        // Add search functionality - reuse cached element
        if (wikiSearchElement) {
            wikiSearchElement.addEventListener('input', (e) => {
                this.currentPage = 1; // Reset to first page when searching
                this.renderWikiTab();
            });
        }
    }

    changeItemsPerPage(newSize) {
        this.itemsPerPage = parseInt(newSize);
        this.currentPage = 1; // Reset to first page
        this.renderWikiTab();
    }

    changePage(newPage) {
        // Get current filtered items to calculate correct total pages
        const wikiSearchElement = document.getElementById('wiki-search');
        const searchTerm = (wikiSearchElement?.value || '').toLowerCase().trim();
        const filteredItems = searchTerm ?
            this.wikiItems.filter(item =>
                item.name.toLowerCase().includes(searchTerm) ||
                item.type.toLowerCase().includes(searchTerm) ||
                item.description.toLowerCase().includes(searchTerm) ||
                (item.rarity && item.rarity.includes(searchTerm))
            ) : this.wikiItems;

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
        // Load saved theme preference
        const savedTheme = localStorage.getItem('arc-shopping-list-theme');
        if (savedTheme === 'dark') {
            this.setTheme('dark');
        }

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
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    /**
     * Set the theme and save preference
     * @param {string} theme - 'light' or 'dark'
     */
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('arc-shopping-list-theme', theme);

        // Update toggle button text
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
