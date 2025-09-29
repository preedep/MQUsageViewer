/**
 * SearchableSelect - A custom searchable dropdown component
 */
class SearchableSelect {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            placeholder: options.placeholder || 'Select an option...',
            noResultsText: options.noResultsText || 'No results found',
            loadingText: options.loadingText || 'Loading...',
            onSelect: options.onSelect || (() => {}),
            ...options
        };
        
        this.data = [];
        this.filteredData = [];
        this.selectedValue = '';
        this.selectedText = '';
        this.isOpen = false;
        this.selectedIndex = -1;
        
        this.init();
    }
    
    init() {
        this.createHTML();
        this.bindEvents();
    }
    
    createHTML() {
        this.container.innerHTML = `
            <div class="searchable-select">
                <input type="text" 
                       class="searchable-input" 
                       placeholder="${this.options.placeholder}"
                       readonly>
                <span class="dropdown-arrow">▼</span>
                <div class="dropdown-list"></div>
            </div>
        `;
        
        this.input = this.container.querySelector('.searchable-input');
        this.arrow = this.container.querySelector('.dropdown-arrow');
        this.dropdown = this.container.querySelector('.dropdown-list');
    }
    
    bindEvents() {
        // Click to open/close dropdown
        this.input.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggle();
        });
        
        // Input for filtering
        this.input.addEventListener('input', (e) => {
            if (!this.isOpen) {
                this.open();
            }
            this.filter(e.target.value);
        });
        
        // Keyboard navigation
        this.input.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });
        
        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.close();
            }
        });
        
        // Prevent dropdown from closing when clicking inside
        this.dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    
    handleKeydown(e) {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (!this.isOpen) {
                    this.open();
                } else {
                    this.navigateDown();
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (this.isOpen) {
                    this.navigateUp();
                }
                break;
            case 'Enter':
                e.preventDefault();
                if (this.isOpen && this.selectedIndex >= 0) {
                    this.selectItem(this.filteredData[this.selectedIndex]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                this.close();
                break;
        }
    }
    
    navigateDown() {
        if (this.selectedIndex < this.filteredData.length - 1) {
            this.selectedIndex++;
            this.updateSelection();
        }
    }
    
    navigateUp() {
        if (this.selectedIndex > 0) {
            this.selectedIndex--;
            this.updateSelection();
        }
    }
    
    updateSelection() {
        const items = this.dropdown.querySelectorAll('.dropdown-item:not(.no-results)');
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === this.selectedIndex);
        });
        
        // Scroll selected item into view
        if (this.selectedIndex >= 0 && items[this.selectedIndex]) {
            items[this.selectedIndex].scrollIntoView({
                block: 'nearest'
            });
        }
    }
    
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    open() {
        this.isOpen = true;
        this.input.removeAttribute('readonly');
        this.dropdown.classList.add('show');
        this.arrow.textContent = '▲';
        this.selectedIndex = -1;
        
        // Focus input for typing
        this.input.focus();
        
        // Show all items initially
        this.filter(this.input.value);
    }
    
    close() {
        this.isOpen = false;
        this.input.setAttribute('readonly', 'true');
        this.dropdown.classList.remove('show');
        this.arrow.textContent = '▼';
        this.selectedIndex = -1;
        
        // Restore selected text if no new selection
        if (this.selectedText && this.input.value !== this.selectedText) {
            this.input.value = this.selectedText;
        }
    }
    
    filter(searchText) {
        const searchLower = searchText.toLowerCase();
        this.filteredData = this.data.filter(item => 
            item.text.toLowerCase().includes(searchLower)
        );
        
        this.renderItems();
        this.selectedIndex = -1;
    }
    
    renderItems() {
        if (this.filteredData.length === 0) {
            this.dropdown.innerHTML = `
                <div class="dropdown-item no-results">${this.options.noResultsText}</div>
            `;
            return;
        }
        
        this.dropdown.innerHTML = this.filteredData
            .map((item, index) => `
                <div class="dropdown-item" data-value="${item.value}" data-index="${index}">
                    ${item.text}
                </div>
            `).join('');
        
        // Bind click events to items
        this.dropdown.querySelectorAll('.dropdown-item:not(.no-results)').forEach(item => {
            item.addEventListener('click', (e) => {
                const value = e.target.dataset.value;
                const selectedItem = this.filteredData.find(item => item.value === value);
                this.selectItem(selectedItem);
            });
        });
    }
    
    selectItem(item) {
        if (!item) return;
        
        this.selectedValue = item.value;
        this.selectedText = item.text;
        this.input.value = item.text;
        
        this.close();
        
        // Trigger callback
        this.options.onSelect(item.value, item.text);
    }
    
    setData(data) {
        this.data = data.map(item => ({
            value: typeof item === 'string' ? item : item.value,
            text: typeof item === 'string' ? item : item.text
        }));
        this.filteredData = [...this.data];
        
        if (this.isOpen) {
            this.renderItems();
        }
    }
    
    setValue(value) {
        const item = this.data.find(item => item.value === value);
        if (item) {
            this.selectItem(item);
        } else {
            this.clear();
        }
    }
    
    getValue() {
        return this.selectedValue;
    }
    
    getText() {
        return this.selectedText;
    }
    
    clear() {
        this.selectedValue = '';
        this.selectedText = '';
        this.input.value = '';
        this.close();
    }
    
    setPlaceholder(placeholder) {
        this.options.placeholder = placeholder;
        this.input.placeholder = placeholder;
    }
    
    setLoading(isLoading) {
        if (isLoading) {
            this.input.placeholder = this.options.loadingText;
            this.input.disabled = true;
        } else {
            this.input.placeholder = this.options.placeholder;
            this.input.disabled = false;
        }
    }
    
    disable() {
        this.input.disabled = true;
        this.close();
    }
    
    enable() {
        this.input.disabled = false;
    }
}

// Export for use in other modules
window.SearchableSelect = SearchableSelect;
