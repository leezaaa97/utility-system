document.addEventListener('DOMContentLoaded', function() {
    const tabs = document.querySelectorAll('.nav-link-custom');
    const tabContents = document.querySelectorAll('.tab-pane');
    const overlays = document.querySelectorAll('.overlay-form, #disable-editing-modal');
    
    const addUserForm = document.getElementById('add-new-user-form');
    const assignMeterForm = document.getElementById('assign-meter-form');
    const editCustomerForm = document.getElementById('edit-customer-form');
    const addTariffForm = document.getElementById('add-tariff-form');
    const disableModal = document.getElementById('disable-editing-modal');

    const addUserFormSubmit = document.getElementById('add-user-form-submit');
    const editCustomerFormSubmit = document.getElementById('edit-customer-form-submit');
    const addTariffFormSubmit = document.getElementById('add-tariff-form-submit');

    function hideAllForms() {
        overlays.forEach(overlay => {
            overlay.style.display = 'none';
        });
    }

    function switchTab(tabId) {
        tabs.forEach(tab => tab.classList.remove('active'));
        const newActiveLink = document.querySelector(`.nav-link-custom[data-tab-id="${tabId}"]`);
        if (newActiveLink) {
            newActiveLink.classList.add('active');
        }

        tabContents.forEach(content => content.classList.remove('show', 'active'));
        const selectedTab = document.getElementById(tabId + '-tab');
        if (selectedTab) {
            selectedTab.classList.add('show', 'active');
        }
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', function(e) {
            const tabId = this.getAttribute('data-tab-id');
            if (tabId) {
                e.preventDefault();
                hideAllForms(); 
                switchTab(tabId);
            }
        });
    });

    window.quickTabSearch = function() {
        const query = document.getElementById('dashboard-quick-search-input').value.toLowerCase().trim();
        
        if (query.length === 0) {
            return;
        }

        let targetTabId = 'dashboard';

        if (query.includes('customer') || query.includes('user') || query.includes('nic') || query.includes('client')) {
            targetTabId = 'customers';
        } else if (query.includes('meter') || query.includes('active') || query.includes('faulty') || query.includes('installation')) {
            targetTabId = 'meters';
        } else if (query.includes('tariff') || query.includes('rate') || query.includes('slab') || query.includes('charge')) {
            targetTabId = 'tariffs';
        }
        
        switchTab(targetTabId);
    }

    window.quickAccess = function(tabId, action) {
        switchTab(tabId); 
        
        setTimeout(() => {
            showForm(action);
        }, 150);
    }

    addUserFormSubmit.addEventListener('submit', function(e) {
        e.preventDefault();
        hideForm('add-new-user');
    });
    
    editCustomerFormSubmit.addEventListener('submit', function(e) {
        e.preventDefault();
        hideForm('edit-customer');
    });

    addTariffFormSubmit.addEventListener('submit', function(e) {
        e.preventDefault();
        hideForm('add-tariff');
    });

    window.showForm = function(type) {
        hideAllForms();
    
        const formMap = {
            'add-new-user': 'add-new-user-form',
            'assign-meter': 'assign-meter-form',
            'edit-customer': 'edit-customer-form',
            'add-tariff': 'add-tariff-form',
            'modify': 'disable-editing-modal'
        };

        const targetId = formMap[type];
        const targetElement = document.getElementById(targetId);

        if (targetElement) {
           targetElement.style.display = 'block';
           targetElement.style.visibility = 'visible'; 
           targetElement.style.opacity = '1';
        }
    }
    
    window.hideForm = function(type) {
        if (type === 'add-new-user') {
            addUserForm.style.display = 'none';
        } else if (type === 'assign-meter') {
            assignMeterForm.style.display = 'none';
        } else if (type === 'edit-customer') {
            editCustomerForm.style.display = 'none';
        } else if (type === 'add-tariff') {
            addTariffForm.style.display = 'none';
        } else if (type === 'modify') {
            disableModal.style.display = 'none';
        }
    }

    window.searchData = function() {
        const query = document.getElementById('search-id-name').value;
    }
    
    window.filterData = function() {
        const type = document.getElementById('filter-customer-type').value;
    }
    
    window.sortData = function() {
        const date = document.getElementById('sort-registration-date').value;
    }

    window.sortMeterData = function() {
         const utility = document.getElementById('sort-meter-utility').value;
         const status = document.getElementById('sort-meter-status').value;
    }

    window.sortTariffData = function() {
         const utility = document.getElementById('sort-tariffs-select').value;
    }

    switchTab('dashboard');
});
