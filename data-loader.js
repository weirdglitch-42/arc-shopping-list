/**
 * Data Loader Module
 * Handles loading and processing of JSON data files
 */

class DataLoader {
    constructor() {
        this.projects = {};
        this.wikiItems = [];
        this.itemTotals = {};
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
            "Major Aiva's Mementos",
            'Possibly Toxic Plant',
            'Romance Book',
            'Detective Book',
            'Adventure Book',
            'First Wave Tape',
            'First Wave Compass',
            'First Wave Rations'
        ]);
    }

    /**
     * Load all project JSON files
     * @returns {Promise<void>}
     */
    async loadProjectFiles() {
        const files = [
            { name: 'Expedition Project', file: 'expedition_project.json' },
            { name: 'Quest items', file: 'quest_items.json' },
            { name: 'Scrappy items', file: 'scrappy_items.json' },
            { name: 'Workshop items', file: 'workshop_items.json' }
        ];

        const loadPromises = files.map(async ({ name, file }) => {
            try {
                const response = await fetch(file);
                if (!response.ok) {
                    throw new Error(`Failed to load ${file}: ${response.status}`);
                }
                const items = await response.json();
                this.projects[name] = items;
            } catch (error) {
                console.warn(`Could not load ${file}:`, error);
                // Continue with other files
            }
        });

        await Promise.all(loadPromises);

        if (Object.keys(this.projects).length === 0) {
            throw new Error('No item files could be loaded');
        }

        // Build item totals registry
        this.buildItemTotals();
    }

    /**
     * Load wiki data from all_items.json
     * @returns {Promise<void>}
     */
    async loadWikiData() {
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

    /**
     * Build registry of all item instances across projects
     */
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
                const quantity = parseInt(item.quantity, 10) || 1;
                this.itemTotals[item.id].totalNeeded += quantity;
                this.itemTotals[item.id].instances.push({
                    projectName,
                    quantity,
                    requirement: item.requirement
                });
            });
        }
    }

    /**
     * Get remaining quantity for an item across all projects
     * @param {string} itemId - Item ID
     * @param {Object} stateManager - State manager instance
     * @returns {number} Remaining quantity needed
     */
    getRemainingTotal(itemId, stateManager) {
        if (!this.itemTotals[itemId]) return 0;

        let remaining = this.itemTotals[itemId].totalNeeded;

        // Subtract completed instances
        for (const instance of this.itemTotals[itemId].instances) {
            if (stateManager.isItemCompleted(instance.projectName, itemId)) {
                remaining -= instance.quantity;
            }
        }

        return Math.max(0, remaining);
    }

    /**
     * Generate unique item ID
     * @param {string} name - Item name
     * @param {string} requirement - Item requirement (optional)
     * @returns {string} Unique item ID
     */
    generateItemId(name, requirement = '') {
        // Include requirement in ID for unique tracking when items appear in multiple stations
        const baseId = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        if (requirement) {
            const reqId = requirement.toLowerCase().replace(/[^a-z0-9]/g, '-');
            return `${baseId}-${reqId}`;
        }
        return baseId;
    }

    /**
     * Generate group ID from group name
     * @param {string} groupName - Group name
     * @returns {string} Group ID
     */
    generateGroupId(groupName) {
        return groupName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    }

    /**
     * Group items by requirement
     * @param {Array} items - Items array
     * @param {string} projectName - Project name
     * @returns {Object} Grouped items
     */
    groupItemsByRequirement(items, projectName) {
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
        if (projectName === 'Quest items') {
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

        return groups;
    }

    /**
     * Get all items with remaining quantities
     * @param {Object} stateManager - State manager instance
     * @returns {Object} Items with remaining quantities
     */
    getAllItemsRemaining(stateManager) {
        const remainingItems = {};

        // First pass: collect all item instances by name across all projects
        for (const [projectName, items] of Object.entries(this.projects)) {
            items.forEach(item => {
                const itemName = item.name;

                // Skip non-keepable quest items from the combined view
                if (projectName === 'Quest items' && this.nonKeepableQuestItems.has(itemName)) {
                    return;
                }

                const quantity = parseInt(item.quantity, 10) || 1;

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
                    if (!stateManager.isItemCompleted(projectName, specificId)) {
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

    /**
     * Get completed count for a project
     * @param {string} projectName - Project name
     * @param {Array} items - Items array
     * @param {Object} stateManager - State manager instance
     * @returns {number} Completed count
     */
    getCompletedCount(projectName, items, stateManager) {
        // Handle the combined "all" view
        if (projectName === 'all') {
            return items.reduce((count, item) => {
                const actualProjectName = item.projectName || projectName;
                return count + (stateManager.isItemCompleted(actualProjectName, item.id) ? 1 : 0);
            }, 0);
        }

        return items.reduce((count, item) => {
            return count + (stateManager.isItemCompleted(projectName, item.id) ? 1 : 0);
        }, 0);
    }

    /**
     * Get wiki item by name
     * @param {string} itemName - Item name
     * @returns {Object|null} Wiki item data or null
     */
    getWikiItem(itemName) {
        return this.wikiItems.find(item =>
            item.name.toLowerCase() === itemName.toLowerCase()
        ) || null;
    }

    /**
     * Get item rarity from wiki data
     * @param {string} itemName - Item name
     * @returns {string} Item rarity or empty string
     */
    getItemRarity(itemName) {
        const wikiItem = this.getWikiItem(itemName);
        return wikiItem ? wikiItem.rarity : '';
    }

    /**
     * Get projects data
     * @returns {Object} Projects data
     */
    getProjects() {
        return { ...this.projects };
    }

    /**
     * Get wiki items
     * @returns {Array} Wiki items array
     */
    getWikiItems() {
        return [...this.wikiItems];
    }

    /**
     * Get item totals
     * @returns {Object} Item totals registry
     */
    getItemTotals() {
        return { ...this.itemTotals };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataLoader;
}

// Make available globally for browser
if (typeof window !== 'undefined') {
    window.DataLoader = DataLoader;
}
