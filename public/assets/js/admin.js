document.addEventListener('DOMContentLoaded', function () {
    // --- SELECTORS ---
    const tabs = document.querySelectorAll('.nav-link-custom');
    const tabContents = document.querySelectorAll('.tab-pane');

    // Forms
    const addUserFormWrapper = document.getElementById('add-new-user-form');
    const assignMeterFormWrapper = document.getElementById('assign-meter-form');
    const editCustomerFormWrapper = document.getElementById('edit-customer-form');
    const addTariffFormWrapper = document.getElementById('add-tariff-form');
    const disableEditingDialog = document.getElementById('disable-editing-modal');

    // Submit Buttons / Forms
    const addUserForm = document.getElementById('add-user-form-submit');
    const editCustomerForm = document.getElementById('edit-customer-form-submit');
    const addTariffForm = document.getElementById('add-tariff-form-submit');

    // Logout
    const logoutBtn = document.querySelector('.logout');

    // --- HELPER: Notification System ---
    window.showNotification = function (message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return; // Fallback if HTML missing

        const toast = document.createElement('div');
        toast.className = `toast-message ${type}`;

        // Icon based on type
        let icon = '';
        if (type === 'success') icon = '<i class="fas fa-check-circle me-2"></i>';
        else if (type === 'error') icon = '<i class="fas fa-exclamation-circle me-2"></i>';
        else icon = '<i class="fas fa-info-circle me-2"></i>';

        toast.innerHTML = `
            <span>${icon} ${message}</span>
            <button class="toast-close">&times;</button>
        `;

        container.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            toast.style.animation = 'fadeOutRight 0.5s ease-out forwards';
            toast.addEventListener('animationend', () => toast.remove());
        }, 5000);

        // Click to remove
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.style.animation = 'fadeOutRight 0.3s ease-out forwards';
            toast.addEventListener('animationend', () => toast.remove());
        });
    };

    // --- HELPER: API Fetch Wrapper ---
    async function apiFetch(url, options = {}) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                if (response.status === 401) {
                    showNotification("Session expired. Please log in again.", "error");
                    window.location.href = '../index.html';
                    return null;
                }
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            // console.log(`[API] ${url} =>`, data);
            return data;
        } catch (error) {
            console.error('API Error:', error);
            showNotification('Network error/API failure. Check console.', 'error');
            return null;
        }
    }

    // --- LOGOUT LOGIC ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            // Show notification immediately
            showNotification('Logging out...', 'success');

            // Perform logout in background
            await apiFetch('../api/auth.php?action=logout');

            // Short delay to let user see the message before redirect
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 1000);
        });
    }

    // --- TAB SWITCHING ---
    async function switchTab(tabId) {
        // Update Nav
        tabs.forEach(tab => tab.classList.remove('active'));
        const activeLink = document.querySelector(`.nav-link-custom[data-tab-id="${tabId}"]`);
        if (activeLink) activeLink.classList.add('active');

        // Update Content
        tabContents.forEach(content => content.classList.remove('show', 'active'));
        const activeContent = document.getElementById(`${tabId}-tab`);
        if (activeContent) activeContent.classList.add('show', 'active');

        // Load Data
        if (tabId === 'customers') {
            await loadCustomers();
            await loadTariffGroups(); // Populate dropdowns
        }
        else if (tabId === 'meters') await loadMeters();
        else if (tabId === 'tariffs') await loadTariffs();
        else if (tabId === 'dashboard') await loadDashboardStats();
    }

    // --- HELPER: Load Tariff Groups for Dropdowns ---
    async function loadTariffGroups() {
        const groups = await apiFetch('../api/tariffs.php?type=groups');
        if (groups && Array.isArray(groups)) {
            const options = groups.map(g => `<option value="${g.group_id}">${g.group_name}</option>`).join('');

            // Add User Form
            const addUserType = document.getElementById('add-user-type');
            if (addUserType) addUserType.innerHTML = `<option value="">Select Type</option>` + options;

            // Edit User Form (Update existing if needed)
            const editUserType = document.getElementById('edit-type');
            if (editUserType) editUserType.innerHTML = `<option value="">Select Type</option>` + options;

            // Filter (Customer tab)
            const filterType = document.getElementById('filter-customer-type');
            if (filterType) {
                const filterOptions = groups.map(g => `<option value="${g.group_name}">${g.group_name}</option>`).join('');
                filterType.innerHTML = `<option selected>Filter by Customer Type</option>` + filterOptions;
            }
        }
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = tab.getAttribute('data-tab-id');
            if (tabId) switchTab(tabId);
        });
    });

    // --- 1. LOAD CUSTOMERS ---
    async function loadCustomers() {
        const tbody = document.getElementById('custTable');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';

        const data = await apiFetch('../api/customers.php');
        tbody.innerHTML = '';

        // Handle Error Response
        if (data && data.status === 'error') {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error: ${data.message}</td></tr>`;
            return;
        }

        if (data && Array.isArray(data) && data.length > 0) {
            data.forEach(cust => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${cust.first_name} ${cust.last_name}</td>
                    <td>${cust.nic}</td>
                    <td>${cust.email || '-'}</td>
                    <td>${cust.phone || '-'}</td>
                    <td>${cust.type || 'N/A'}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-info" onclick="openEditCustomer(${cust.customer_id})"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-danger" onclick="deleteCustomer(${cust.customer_id})"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No customers found.</td></tr>';
        }
    }

    // --- 2. LOAD METERS ---
    async function loadMeterStatuses() {
        const select = document.getElementById('sort-meter-status');
        if (!select) return;

        const statuses = await apiFetch('../api/readings.php?action=get_statuses');
        if (statuses && Array.isArray(statuses)) {
            let options = '<option selected>Sort by Status</option>';
            statuses.forEach(s => {
                if (s) options += `<option value="${s}">${s}</option>`;
            });
            select.innerHTML = options;
        }
    }

    async function loadMeters() {
        await loadMeterStatuses(); // Refresh filters
        const tbody = document.getElementById('meterTable');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';

        // Use search endpoint with empty query to get all meters (limited fields)
        const data = await apiFetch('../api/readings.php?action=search&query=');
        tbody.innerHTML = '';

        if (data && Array.isArray(data) && data.length > 0) {
            data.forEach(m => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${m.meter_no}</td>
                    <td>${m.nic}</td>
                    <td>${m.utility_type || 'Unknown'}</td>
                    <td class="text-center"><span class="badge bg-success">${m.status || 'Active'}</span></td>
                    <td>${m.last_read_date || '-'}</td> <!-- Last Read -->
                    <td class="text-center">
                        <button class="btn btn-sm btn-info" onclick="openEditMeter(${m.meter_id}, '${m.meter_no}', '${m.status}')"><i class="fas fa-edit"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No meters found.</td></tr>';
        }
    }

    // --- DASHBOARD STATS ---
    async function loadDashboardStats() {
        // Fetch from new centralized analytics endpoint
        const res = await apiFetch('../api/analytics.php');

        if (res && res.status === 'success' && res.data) {
            const { customers, meters, tariffs } = res.data;

            // Total Customers
            const custEl = document.getElementById('stat-total-customers');
            if (custEl) custEl.innerText = Number(customers).toLocaleString(); // Format with commas

            // Active Meters (Matches HTML ID I added)
            const meterEl = document.getElementById('stat-active-meters');
            if (meterEl) meterEl.innerText = Number(meters).toLocaleString();

            // Active Tariffs
            const tariffEl = document.getElementById('stat-tariff-plans');
            if (tariffEl) tariffEl.innerText = Number(tariffs).toLocaleString();
        } else {
            console.warn('Failed to load dashboard stats');
        }
    }

    // --- TARIFF MASTER-DETAIL LOGIC ---
    let activeGroupId = null;
    let activeGroupData = null;

    // 1. Load Utilities for Dropdowns
    window.loadUtilities = async () => {
        try {
            const utils = await apiFetch('../api/tariffs.php?type=utilities');
            const select = document.getElementById('tg-utility-select');
            if (select && utils && Array.isArray(utils)) {
                // Deduplicate utils based on NAME to prevent UI duplicates if DB has multiple entries with different IDs
                const uniqueUtils = Array.from(new Map(utils.map(item => [item.name, item])).values());

                let options = '<option value="" disabled selected>Select Utility...</option>';
                uniqueUtils.forEach(u => {
                    options += `<option value="${u.utility_id}">${u.name}</option>`;
                });
                select.innerHTML = options;
            } else {
                console.warn('Utilities not loaded:', utils);
            }
        } catch (e) {
            console.error('Error loading utilities:', e);
        }
    };

    // 2. Load Tariff Groups (Left Panel)
    window.loadTariffs = async () => {
        await loadUtilities(); // Ensure dropdowns are ready
        await loadTariffGroupsList();
    };

    window.loadTariffGroupsList = async () => {
        const listEl = document.getElementById('tariff-groups-list');
        if (!listEl) return;

        listEl.innerHTML = '<div class="text-center p-3 text-muted">Loading...</div>';

        const groups = await apiFetch('../api/tariffs.php?type=groups');
        listEl.innerHTML = '';

        if (!groups) {
            console.error('Failed to fetch tariff groups');
            listEl.innerHTML = '<div class="text-center p-3 text-danger">Error loading data.</div>';
            return;
        }

        if (groups && Array.isArray(groups) && groups.length > 0) {
            groups.forEach(group => {
                const item = document.createElement('button');
                item.className = `list-group-item list-group-item-action d-flex justify-content-between align-items-center ${activeGroupId == group.group_id ? 'active' : ''}`;
                item.dataset.groupId = group.group_id; // Store ID for easy selection
                item.onclick = () => loadGroupDetails(group);

                // Content
                item.innerHTML = `
                    <div>
                        <div class="fw-bold">${group.group_name}</div>
                        <small class="${activeGroupId == group.group_id ? 'text-light' : 'text-muted'}">Fixed: ${group.fixed_charge}</small>
                    </div>
                    <span class="badge bg-${group.utility_type === 'Electricity' ? 'warning' : 'primary'} rounded-pill">${group.utility_type || 'N/A'}</span>
                `;
                listEl.appendChild(item);
            });

            // Auto-select first if none selected, or re-select active
            if (!activeGroupId && groups.length > 0) {
                loadGroupDetails(groups[0]);
            } else if (activeGroupId) {
                // Verify active still exists
                const stillExists = groups.find(g => g.group_id == activeGroupId);
                if (stillExists) loadGroupDetails(stillExists);
                else if (groups.length > 0) loadGroupDetails(groups[0]);
            }

        } else {
            listEl.innerHTML = '<div class="text-center p-3 text-muted">No tariff groups found.</div>';
        }
        // Also populate filters
        loadUtilities();
    };

    // 3. Load Group Details (Right Panel)
    window.loadGroupDetails = async (group) => {
        activeGroupId = group.group_id;
        activeGroupData = group; // Store for Edit

        // Highlight in list
        const listItems = document.querySelectorAll('#tariff-groups-list button');
        listItems.forEach(btn => btn.classList.remove('active', 'text-white'));
        // Find the button that was clicked or corresponds to this group (simple re-render or class toggle would be better, but re-render handled in loadTariffGroupsList usually)
        // For now, let's just update UI elements:

        document.getElementById('active-group-header').innerText = group.group_name;
        document.getElementById('active-group-meta').innerText = `${group.utility_type} | Fixed Charge: ${group.fixed_charge}`;

        const actionsDiv = document.getElementById('active-group-actions');
        actionsDiv.style.display = 'block';

        // Update Add Slab Button with current Group ID
        const addSlabBtn = actionsDiv.querySelector('.btn-primary'); // The specific Add Slab button
        if (addSlabBtn) {
            addSlabBtn.onclick = () => openslabForm('add', group.group_id);
        }

        // Load Slabs
        const tbody = document.getElementById('slabs-tbody');
        tbody.innerHTML = '<tr><td colspan="3" class="text-center p-4">Loading rates...</td></tr>';

        const slabs = await apiFetch(`../api/tariffs.php?type=slabs&group_id=${group.group_id}`);
        tbody.innerHTML = '';

        if (slabs && Array.isArray(slabs) && slabs.length > 0) {
            slabs.forEach(slab => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="ps-4">${slab.min_units} - ${slab.max_units}</td>
                    <td>Rs. ${slab.unit_price}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-secondary me-1" onclick="openslabForm('edit', ${group.group_id}, ${slab.slab_id}, ${slab.min_units}, ${slab.max_units}, ${slab.unit_price})"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteTariffSlab(${slab.slab_id})"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted p-4">No rate slabs defined for this group.</td></tr>';
        }

        // Update list active state visually without full reload
        // loadTariffGroupsList(); // REMOVED to prevent infinite loop

        // Toggle active class on list items
        const groupButtons = document.querySelectorAll('#tariff-groups-list button');
        groupButtons.forEach(btn => {
            if (btn.dataset.groupId == group.group_id) {
                btn.classList.add('active');
                btn.querySelector('small').classList.remove('text-muted');
                btn.querySelector('small').classList.add('text-light');
            } else {
                btn.classList.remove('active');
                btn.querySelector('small').classList.add('text-muted');
                btn.querySelector('small').classList.remove('text-light');
            }
        });
    };

    window.editActiveGroup = function () {
        if (activeGroupData) {
            opengroupForm('edit', activeGroupData.group_id, activeGroupData.group_name, activeGroupData.fixed_charge, activeGroupData.utility_type);
        }
    };

    window.deleteActiveGroup = async function () {
        if (!activeGroupId) return;
        if (!confirm(`Delete Group "${activeGroupData.group_name}" and all its rates?`)) return;

        const res = await apiFetch(`../api/tariffs.php?type=groups&id=${activeGroupId}`, { method: 'DELETE' });
        if (res && res.status === 'success') {
            activeGroupId = null;
            activeGroupData = null;
            loadTariffGroupsList();
            document.getElementById('slabs-tbody').innerHTML = '<tr><td colspan="3" class="text-center text-muted p-5">Select a tariff group.</td></tr>';
            document.getElementById('active-group-header').innerText = 'Select a Group';
            document.getElementById('active-group-meta').innerText = '';
            document.getElementById('active-group-actions').style.display = 'none';
        } else {
            alert(res.message || 'Failed to delete group');
        }
    };


    // --- ACTIONS: ADD CUSTOMER ---
    if (addUserForm) {
        addUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const fullName = document.getElementById('add-user-name').value;
            // Simple name split
            const nameParts = fullName.trim().split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ') || '';

            const payload = {
                first_name: firstName,
                last_name: lastName,
                nic: document.getElementById('add-user-nic').value,
                email: document.getElementById('add-user-email').value,
                phone: document.getElementById('add-user-phone').value,
                address: document.getElementById('add-user-address').value
            };

            const res = await apiFetch('../api/customers.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res && res.status === 'success') {
                showNotification('Customer added successfully', 'success');
                hideForm('add-new-user');
                loadCustomers();
                addUserForm.reset();
            } else {
                showNotification(res ? res.message : 'Error adding customer', 'error');
            }
        });
    }

    // --- ACTIONS: ASSIGN METER ---
    const btnAssignMeter = document.getElementById('btn-assign-meter');
    if (btnAssignMeter) {
        btnAssignMeter.addEventListener('click', async (e) => {
            e.preventDefault();
            const payload = {
                utility: document.getElementById('assign-meter-utility').value,
                nic: document.getElementById('assign-meter-nic').value,
                meter_no: document.getElementById('assign-meter-sn').value,
                date: document.getElementById('assign-meter-date').value
            };

            if (!payload.nic || !payload.meter_no) {
                showNotification("Please fill all required fields", "error");
                return;
            }

            const res = await apiFetch('../api/readings.php?action=assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res && res.status === 'success') {
                showNotification('Meter assigned successfully', 'success');
                hideForm('assign-meter');
                loadMeters();
            } else {
                showNotification(res ? res.message : 'Error assigning meter', 'error');
            }
        });
    }

    // --- METER SORTING/FILTERING ---
    window.sortMeterData = function () {
        const utilityFilter = document.getElementById('sort-meter-utility').value;
        const statusFilter = document.getElementById('sort-meter-status').value;

        const rows = document.querySelectorAll('#meterTable tr');
        rows.forEach(row => {
            const cells = row.getElementsByTagName('td');
            if (cells.length > 0) {
                const utility = cells[2].innerText;
                const status = cells[3].innerText;

                const matchesUtility = (utilityFilter === 'Sort by Utility Type') || (utility === utilityFilter);
                const matchesStatus = (statusFilter === 'Sort by Status') || (status.includes(statusFilter)); // Status is inside badge

                if (matchesUtility && matchesStatus) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            }
        });
    };

    // --- ACTIONS: TARIFF FORM (Master-Detail) ---
    const tariffGroupForm = document.getElementById('tariff-group-form-submit');
    if (tariffGroupForm) {
        tariffGroupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('tg-id').value;
            const method = id ? 'PUT' : 'POST';

            const payload = {
                group_id: id,
                group_name: document.getElementById('tg-name').value,
                fixed_charge: document.getElementById('tg-fixed').value,
                utility_id: document.getElementById('tg-utility-select').value
            };

            const res = await apiFetch('../api/tariffs.php?type=groups', {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res && res.status === 'success') {
                showNotification(res.message, 'success');
                hideForm('tariff-group');
                loadTariffs(); // Refreshes list
                loadTariffGroups(); // Refreshes other dropdowns
            } else {
                showNotification(res ? res.message : 'Action failed', 'error');
            }
        });
    }

    const tariffSlabForm = document.getElementById('tariff-slab-form-submit');
    if (tariffSlabForm) {
        tariffSlabForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('ts-id').value;
            const method = id ? 'PUT' : 'POST';

            const payload = {
                slab_id: id,
                group_id: document.getElementById('ts-group-id').value,
                min_units: document.getElementById('ts-min').value,
                max_units: document.getElementById('ts-max').value,
                unit_price: document.getElementById('ts-price').value
            };

            const res = await apiFetch('../api/tariffs.php?type=slabs', {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res && res.status === 'success') {
                showNotification(res.message, 'success');
                hideForm('tariff-slab');
                // Refresh Detail View
                if (activeGroupData) loadGroupDetails(activeGroupData);
            } else {
                showNotification(res ? res.message : 'Action failed', 'error');
            }
        });
    }

    // --- ACTIONS: DELETE ---
    window.deleteCustomer = async (id) => {
        if (!confirm('Delete this customer?')) return;
        const res = await apiFetch(`../api/customers.php?id=${id}`, { method: 'DELETE' });
        if (res && res.status === 'success') {
            loadCustomers();
        } else {
            showNotification(res ? res.message : 'Delete failed', 'error');
        }
    };

    window.deleteTariffGroup = async (id) => {
        if (!confirm('Delete this group?')) return;
        const res = await apiFetch(`../api/tariffs.php?type=groups&id=${id}`, { method: 'DELETE' });
        if (res && res.status === 'success') {
            showNotification(res.message, 'success');
            loadTariffs();
        } else {
            showNotification(res ? res.message : 'Delete failed', 'error');
        }
    };

    window.deleteTariffSlab = async (id) => {
        if (!confirm('Delete this slab?')) return;
        const res = await apiFetch(`../api/tariffs.php?type=slabs&id=${id}`, { method: 'DELETE' });
        if (res && res.status === 'success') {
            showNotification(res.message, 'success');
            loadTariffs();
        } else {
            showNotification(res ? res.message : 'Delete failed', 'error');
        }
    };

    // --- TARIFF FILTERING ---

    // Bind change event


    const btnViewMeters = document.getElementById('btn-view-meters');
    if (btnViewMeters) {
        btnViewMeters.addEventListener('click', () => {
            hideForm('assign-meter'); // Close form if open
            switchTab('meters');
        });
    }

    window.opengroupForm = function (mode, id, name, fixed, utility) {
        showForm('tariff-group');
        if (mode === 'edit') {
            document.getElementById('tariff-group-title').innerText = "Edit Tariff Group";
            document.getElementById('tg-id').value = id;
            document.getElementById('tg-name').value = name;
            document.getElementById('tg-fixed').value = fixed;
            document.getElementById('tg-utility-select').value = utility;
        } else {
            document.getElementById('tariff-group-title').innerText = "Add Tariff Group";
            document.getElementById('tariff-group-form-submit').reset();
            document.getElementById('tg-id').value = "";
        }
    };

    window.openslabForm = function (mode, groupId, slabId, min, max, price) {
        showForm('tariff-slab');
        if (mode === 'edit') {
            document.getElementById('tariff-slab-title').innerText = "Edit Tariff Slab";
            document.getElementById('ts-id').value = slabId;
            document.getElementById('ts-group-id').value = groupId; // Keep group ID
            document.getElementById('ts-min').value = min;
            document.getElementById('ts-max').value = max;
            document.getElementById('ts-price').value = price;
        } else {
            document.getElementById('tariff-slab-title').innerText = "Add Tariff Slab";
            document.getElementById('tariff-slab-form-submit').reset();
            document.getElementById('ts-id').value = "";
            document.getElementById('ts-group-id').value = groupId;
        }
    };

    // --- ACTIONS: EDIT METER ---
    window.openEditMeter = function (id, sn, status) {
        showForm('edit-meter');
        document.getElementById('edit-meter-id').value = id;
        document.getElementById('edit-meter-sn').value = sn;
        const statusEl = document.getElementById('edit-meter-status');
        if (statusEl) statusEl.value = status;
    };

    const editMeterForm = document.getElementById('edit-meter-form-submit');
    if (editMeterForm) {
        editMeterForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                meter_id: document.getElementById('edit-meter-id').value,
                status: document.getElementById('edit-meter-status').value
            };

            const res = await apiFetch('../api/readings.php?action=update_meter', {
                method: 'POST', // or PUT if endpoint supports it, using POST with action for now
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res && res.status === 'success') {
                showNotification('Meter updated successfully', 'success');
                hideForm('edit-meter');
                loadMeters();
            } else {
                showNotification(res ? res.message : 'Update failed', 'error');
            }
        });
    }

    // --- UTILITIES ---
    window.showForm = function (type, context = {}) {
        // Hide all first
        const formsToHide = [
            addUserFormWrapper,
            assignMeterFormWrapper,
            editCustomerFormWrapper,
            addTariffFormWrapper,
            disableEditingDialog,
            document.getElementById('tariff-group-form'),
            document.getElementById('tariff-slab-form'),
            document.getElementById('edit-meter-form')
        ];

        formsToHide.forEach(el => {
            if (el) el.style.display = 'none';
        });

        if (type === 'add-new-user' && addUserFormWrapper) addUserFormWrapper.style.display = 'block';
        if (type === 'assign-meter' && assignMeterFormWrapper) assignMeterFormWrapper.style.display = 'block';
        if (type === 'edit-customer' && editCustomerFormWrapper) editCustomerFormWrapper.style.display = 'block';
        if (type === 'edit-meter' && document.getElementById('edit-meter-form')) document.getElementById('edit-meter-form').style.display = 'block';

        if (type === 'tariff-group' && document.getElementById('tariff-group-form')) document.getElementById('tariff-group-form').style.display = 'block';
        if (type === 'tariff-slab' && document.getElementById('tariff-slab-form')) document.getElementById('tariff-slab-form').style.display = 'block';

        if (type === 'add-tariff' && addTariffFormWrapper) {
            addTariffFormWrapper.style.display = 'block';

            // Logic to toggle fields based on context (Add Group vs Add Slab)
            const groupNameInput = document.getElementById('tariff-group-name');
            const groupIdInput = document.getElementById('tariff-group-id');
            const fixedChargeInput = document.getElementById('tariff-fixed-charge');

            const slabStart = document.getElementById('tariff-slab-start');
            const slabEnd = document.getElementById('tariff-slab-end');
            const rate = document.getElementById('tariff-rate');
            const dates = document.getElementById('tariff-date-from'); // And parent row

            if (context.groupId) {
                // SLAB MODE
                document.querySelector('#add-tariff-form h5').innerText = "Add Slab";
                groupIdInput.value = context.groupId;

                // Hide Group Fields
                if (groupNameInput) groupNameInput.closest('.mb-3').style.display = 'none';
                if (fixedChargeInput) fixedChargeInput.closest('.mb-3').style.display = 'none';

                // Show Slab Fields
                if (slabStart) slabStart.closest('.row').style.display = 'flex';
                if (rate) rate.closest('.mb-3').style.display = 'block';
                if (dates) dates.closest('.row').style.display = 'none'; // Not used in API

            } else {
                // GROUP MODE
                document.querySelector('#add-tariff-form h5').innerText = "Add Tariff Group";
                groupIdInput.value = '';

                // Show Group Fields
                if (groupNameInput) groupNameInput.closest('.mb-3').style.display = 'block';
                if (fixedChargeInput) fixedChargeInput.closest('.mb-3').style.display = 'block';

                // Hide Slab Fields
                if (slabStart) slabStart.closest('.row').style.display = 'none';
                if (rate) rate.closest('.mb-3').style.display = 'none';
                if (dates) dates.closest('.row').style.display = 'none';
            }
        }
    };

    window.hideForm = function (type) {
        window.showForm('none'); // Hides all
    };

    // --- ACTIONS: QUICK ACCESS ---
    window.quickAccess = async function (tabId, formType) {
        // Switch tab first
        await switchTab(tabId);
        // Then show form
        window.showForm(formType);
    };

    // --- ACTIONS: EDIT CUSTOMER ---
    window.openEditCustomer = async function (id) {
        const custData = await apiFetch(`../api/customers.php?id=${id}`);
        if (custData && !custData.status) { // Assuming success returns data directly or check if it's not error
            showForm('edit-customer');
            // Populate fields
            document.getElementById('edit-customer-id').value = custData.customer_id;
            document.getElementById('edit-name').value = custData.first_name + ' ' + custData.last_name;
            document.getElementById('edit-nic').value = custData.nic;
            document.getElementById('edit-email').value = custData.email;
            document.getElementById('edit-contact').value = custData.phone;
            document.getElementById('edit-address').value = custData.address || '';
            // Set Type Dropdown (if loaded)
            const typeDropdown = document.getElementById('edit-type');
            if (typeDropdown) {
                if (custData.meter_id) {
                    typeDropdown.disabled = false;
                    typeDropdown.title = "Select Customer Type (Updates Active Meter)";
                    if (custData.type_id) typeDropdown.value = custData.type_id;
                } else {
                    typeDropdown.disabled = true;
                    typeDropdown.value = "";
                    typeDropdown.title = "Assign an Active Meter to set Customer Type";
                }
            }
        } else {
            showNotification("Failed to load customer details", "error");
        }
    };

    if (editCustomerForm) {
        editCustomerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const fullName = document.getElementById('edit-name').value;
            const nameParts = fullName.trim().split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ') || '';

            const payload = {
                customer_id: document.getElementById('edit-customer-id').value,
                first_name: firstName,
                last_name: lastName,
                nic: document.getElementById('edit-nic').value,
                email: document.getElementById('edit-email').value,
                phone: document.getElementById('edit-contact').value,
                address: document.getElementById('edit-address').value,
                type_id: document.getElementById('edit-type') ? document.getElementById('edit-type').value : null
            };

            const res = await apiFetch('../api/customers.php', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res && res.status === 'success') {
                showNotification('Customer updated successfully', 'success');
                hideForm('edit-customer');
                loadCustomers();
            } else {
                showNotification(res ? res.message : 'Update failed', 'error');
            }
        });
    }

    // --- FILTERS & SEARCH ---
    window.searchData = function () {
        // Filter Customers Table
        const query = document.getElementById('search-id-name').value.toLowerCase();
        const typeFilter = document.getElementById('filter-customer-type') ? document.getElementById('filter-customer-type').value : 'Filter by Customer Type';
        // Date sort not implemented client-side easily without parsing dates from hidden fields, skipping for now

        const rows = document.querySelectorAll('#custTable tr');
        rows.forEach(row => {
            const cells = row.getElementsByTagName('td');
            if (cells.length > 0) {
                const name = cells[0].innerText.toLowerCase();
                const nic = cells[1].innerText.toLowerCase();
                const type = cells[4].innerText; // "Domestic" hardcoded placeholder currently

                const matchesSearch = (name.includes(query) || nic.includes(query));
                const matchesType = (typeFilter === 'Filter by Customer Type') || (type === typeFilter); // Note: Type is placeholder in loadCustomers

                if (matchesSearch && matchesType) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            }
        });
    };

    // Bind search button/inputs if existing in HTML to this function
    // HTML has onclick="searchData()" for button. Inputs have onchange/input?
    // Let's ensure real-time search on input
    const searchInput = document.getElementById('search-id-name');
    if (searchInput) {
        searchInput.addEventListener('input', window.searchData);
    }

    // Initial Load
    switchTab('dashboard');
});

const CUSTOMER_API = "http://localhost/utility-system/api/customers.php";

// 1. Function to Load Customers
async function loadCustomers() {
    try {
        const response = await fetch(`${CUSTOMER_API}?action=list`);
        const customers = await response.json();

        // Make sure your HTML Table Body has id="customerTableBody"
        const tableBody = document.getElementById('customerTableBody');
        
        if (tableBody) {
            tableBody.innerHTML = ''; // Clear existing rows
            customers.forEach(cust => {
                const row = `<tr>
                    <td>${cust.customer_id}</td>
                    <td>${cust.full_name}</td>
                    <td>${cust.address}</td>
                    <td>${cust.phone}</td>
                    <td>${cust.outstanding_balance}</td>
                </tr>`;
                tableBody.innerHTML += row;
            });
        }
    } catch (error) {
        console.error("Error loading customers:", error);
    }
}

// 2. Listen for Form Submit (Add Customer)
// Make sure your HTML Form has id="addCustomerForm"
const addCustForm = document.getElementById('addCustomerForm');

if (addCustForm) {
    addCustForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Get values from HTML inputs (Ensure IDs match these)
        const name = document.getElementById('full_name').value;
        const address = document.getElementById('address').value;
        const phone = document.getElementById('phone').value;

        try {
            const response = await fetch(`${CUSTOMER_API}?action=add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    full_name: name,
                    address: address,
                    phone: phone
                })
            });

            const result = await response.json();
            alert(result.message);
            
            // Reload the table to show the new customer
            loadCustomers(); 
            
            // Close the form using your existing function (if applicable)
            if (window.hideForm) {
                window.hideForm('add_customer'); 
            }
            
        } catch (error) {
            console.error("Error adding customer:", error);
        }
    });
}

// 3. Automatically load customers when page opens
loadCustomers();
