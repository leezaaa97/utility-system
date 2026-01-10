// manager.js - The Intelligence Hub Logic
const API_BASE = '../api/ManagerMissingAPI.php';

// Global State Controller
let state = {
    utilityId: null,
    currentYear: new Date().getFullYear(),
    charts: {} // Store chart instances
};

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
});

async function initDashboard() {
    // 1. Fetch Metadata (Utilities, Dates)
    const res = await fetch(`${API_BASE}?action=get_init_data`);
    const data = await res.json();

    if (data.status === 'success') {
        populateUtilities(data.data.utilities);
    }

    // 2. Set Default State (Select first utility)
    const utilSelect = document.getElementById('globalUtilitySelect');
    if (utilSelect.options.length > 0) {
        state.utilityId = utilSelect.value;
        updateGlobalState(); // Triggers initial load
    }
}

function populateUtilities(list) {
    const select = document.getElementById('globalUtilitySelect');
    if (!list || list.length === 0) {
        select.innerHTML = '<option value="">No Utilities Found</option>';
        return;
    }

    select.innerHTML = list.map(u =>
        `<option value="${u.utility_id}">${u.name}</option>`
    ).join('');
}

// THE STATE CONTROLLER
async function updateGlobalState() {
    const select = document.getElementById('globalUtilitySelect');
    state.utilityId = select.value;

    showNotification("Refreshing Dashboard...", "info");

    await Promise.all([
        loadAnalytics(),
        loadCustomers(),
        loadLogs()
    ]);

    showNotification("Dashboard Updated", "success");
}

// TAB 1: ANALYTICS
async function loadAnalytics() {
    const url = `${API_BASE}?action=get_analytics&utility_id=${state.utilityId}&year=${state.currentYear}`;
    const res = await fetch(url);
    const json = await res.json();

    if (json.status === 'success') {
        const d = json.data;

        // 1. KPIs
        animateValue('kpi-daily', d.kpi.daily || 0, 'Rs. ');
        animateValue('kpi-monthly', d.kpi.monthly || 0, 'Rs. ');
        animateValue('kpi-active', d.kpi.active || 0, '');

        // 2. Revenue Chart
        renderRevenueChart(d.revenue_trend);

        // 3. Top Consumers
        renderTopConsumers(d.top_consumers);
    }
}

function renderRevenueChart(data) {
    const ctx = document.getElementById('revenueTrendChart').getContext('2d');

    if (state.charts.revenue) state.charts.revenue.destroy();

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const values = new Array(12).fill(0);
    data.forEach(item => {
        values[item.m - 1] = item.total;
    });

    state.charts.revenue = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Revenue (LKR)',
                data: values,
                borderColor: '#4F46E5',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Critical for fixed height container
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// Top Consumers Renderer (List Item Style)
function renderTopConsumers(list) {
    const container = document.getElementById('top-consumers-list');
    if (!list || list.length === 0) {
        container.innerHTML = '<div style="padding:20px; color:#999; text-align:center;">No Data Available</div>';
        return;
    }

    container.innerHTML = list.map((c, index) => `
        <div class="consumer-list-item">
            <div class="rank-badge">${index + 1}</div>
            <div class="consumer-info">
                <div class="consumer-name">${c.first_name} ${c.last_name}</div>
                <div class="consumer-meta"><i class="ph ph-gauge"></i> ${c.meter_no}</div>
            </div>
            <div class="consumer-amount">Rs. ${Number(c.total_paid).toLocaleString()}</div>
        </div>
    `).join('');
}


// TAB 2: CUSTOMERS
async function loadCustomers() {
    const res = await fetch(`${API_BASE}?action=get_customers&utility_id=${state.utilityId}`);
    const json = await res.json();

    const tbody = document.getElementById('customer-table-body');
    if (json.status === 'success' && json.data.length > 0) {
        tbody.innerHTML = json.data.slice(0, 50).map(c => `
            <tr>
                <td>${c.nic}</td>
                <td>${c.first_name} ${c.last_name}</td>
                <td>${c.meter_no || '-'}</td>
                <td>${c.utility || '-'}</td>
                <td><span class="badge ${c.status === 'Active' ? 'success' : 'warn'}">${c.status || 'N/A'}</span></td>
            </tr>
        `).join('');
    } else {
        tbody.innerHTML = '<tr><td colspan="5">No Customers Found</td></tr>';
    }
}

// TAB 3: LOGS Renderer (Activity Feed Style)
async function loadLogs() {
    const res = await fetch(`${API_BASE}?action=get_logs&utility_id=${state.utilityId}`);
    const json = await res.json();

    if (json.status === 'success') {
        const faults = document.getElementById('fault-log-list');
        faults.className = 'log-feed';
        faults.innerHTML = json.data.faults.map(f => `
            <div class="log-item fault">
                <div class="log-icon"><i class="ph ph-warning-octagon"></i></div>
                <div class="log-content">
                    <div class="log-header">
                        <span class="log-title">Fault Report</span>
                        <span class="log-time">${f.report_date}</span>
                    </div>
                    <div class="log-desc">Meter <b>${f.meter_no}</b>: ${f.description}</div>
                    <div style="margin-top:5px;">
                        <span class="status-badge ${f.status === 'Resolved' ? 'status-resolved' : 'status-pending'}">${f.status}</span>
                    </div>
                </div>
            </div>
        `).join('');

        const payments = document.getElementById('payment-log-list');
        payments.className = 'log-feed';
        payments.innerHTML = json.data.payments.map(p => `
             <div class="log-item payment">
                <div class="log-icon"><i class="ph ph-receipt"></i></div>
                <div class="log-content">
                    <div class="log-header">
                        <span class="log-title">Payment Received</span>
                        <span class="log-time">${p.payment_date}</span>
                    </div>
                    <div class="log-desc">Meter <b>${p.meter_no}</b></div>
                    <div style="margin-top:5px;">
                        <span class="status-badge status-paid">Rs. ${Number(p.amount).toLocaleString()}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

// PDF REPORTING
window.generateReport = function (type) {
    const url = `${API_BASE}?action=generate_report&type=${type}&utility_id=${state.utilityId}`;
    window.open(url, '_blank');
};

// UI UTILS
window.switchTab = function (tabId) {
    // Nav Active
    document.querySelectorAll('.nav-link-custom').forEach(el => el.classList.remove('active'));
    // Simple Active Toggle
    event.currentTarget.classList.add('active');

    // Content Active
    document.querySelectorAll('.tab-view').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');
};

function animateValue(id, value, prefix = '') {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerText = prefix + Number(value).toLocaleString();
}

window.showNotification = function (msg, type) {
    const area = document.getElementById('notification-area');
    const note = document.createElement('div');
    note.className = 'toast';
    note.innerHTML = `<i class="ph ph-${type === 'success' ? 'check-circle' : 'info'}"></i> ${msg}`;
    area.appendChild(note);
    setTimeout(() => note.remove(), 4000);
}

window.logout = function () {
    showNotification("Logging out...", "info");
    setTimeout(() => window.location.href = '../index.html', 1000);
};