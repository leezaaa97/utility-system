// === 1. STATE MANAGEMENT ===
const API_BASE = "../api";
let customerMeters = []; // Stores all meter rows for the searched customer
let currentCustomer = null; // The currently selected meter/utility context
let selectedUtilityId = null;

// === HELPER: Notification System ===
window.showNotification = function (message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-message ${type}`;

    let icon = '';
    if (type === 'success') icon = '<i class="ph ph-check-circle me-2"></i>';
    else if (type === 'error') icon = '<i class="ph ph-warning-circle me-2"></i>';
    else icon = '<i class="ph ph-info me-2"></i>';

    toast.innerHTML = `
        <span>${icon} ${message}</span>
        <button class="toast-close" style="background:none; border:none; cursor:pointer;">&times;</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOutRight 0.5s ease-out forwards';
        toast.addEventListener('animationend', () => toast.remove());
    }, 5000);

    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.remove();
    });
};


// === INIT ===
document.addEventListener('DOMContentLoaded', () => {
    loadUtilities();

    // Logout Logic
    const logoutBtn = document.querySelector('.logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            showNotification('Logging out...', 'success');
            await fetch('../api/auth.php?action=logout');
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 1000);
        });
    }

    // Modal Close Logic
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('modalAmount').classList.add('hidden');
        });
    });
});

// === 2. UTILITY SYNCHRONIZATION ===
async function loadUtilities() {
    try {
        const response = await fetch(`${API_BASE}/cashierdashboard.php?action=get_utilities`);
        const data = await response.json();

        const dropdowns = [
            document.getElementById('inputUtilityType'),
            document.getElementById('historyUtilityType')
        ];

        if (Array.isArray(data)) {
            const options = data.map(u => `<option value="${u.utility_id}">${u.name}</option>`).join('');

            dropdowns.forEach(select => {
                if (select) {
                    select.innerHTML = '<option value="" disabled selected>Select Utility</option>' + options;
                    select.addEventListener('change', (e) => handleUtilityChange(e.target.value));
                }
            });
        }
    } catch (e) {
        console.error("Failed to load utilities", e);
    }
}

function handleUtilityChange(utilityId) {
    selectedUtilityId = utilityId; // Update global state

    // Sync all dropdowns
    document.getElementById('inputUtilityType').value = utilityId;
    const histSelect = document.getElementById('historyUtilityType');
    if (histSelect) histSelect.value = utilityId;

    updateDashboard(); // Refresh UI with new utility context
}


// === 3. DOM ELEMENTS & NAVIGATION ===
// Views
const viewDashboard = document.getElementById('viewDashboard');
const viewHistory = document.getElementById('viewHistory');

// Navbar
const navIdentify = document.getElementById('navIdentify');
const navPaymentHist = document.getElementById('navPaymentHist');
const navUsageHist = document.getElementById('navUsageHist');

// Inputs & Modals
const inputCustNic = document.getElementById('custNicInput');
const modalAmount = document.getElementById('modalAmount');


function switchTab(tabName) {
    navIdentify.classList.remove('active');
    navPaymentHist.classList.remove('active');
    navUsageHist.classList.remove('active');

    if (tabName === 'dashboard') {
        navIdentify.classList.add('active');
        viewDashboard.classList.remove('hidden');
        viewHistory.classList.add('hidden');
    }
    else {
        // Shared History View
        viewDashboard.classList.add('hidden');
        viewHistory.classList.remove('hidden');

        if (tabName === 'payment') {
            navPaymentHist.classList.add('active');
            loadHistory('payment');
        } else {
            navUsageHist.classList.add('active');
            loadHistory('usage');
        }
    }
}

navIdentify.addEventListener('click', () => switchTab('dashboard'));
navPaymentHist.addEventListener('click', () => switchTab('payment'));
navUsageHist.addEventListener('click', () => switchTab('usage'));


// === 4. DATA LOGIC (SEARCH & DASHBOARD) ===
document.getElementById('btnGetDetails').addEventListener('click', async () => {
    const custNic = inputCustNic.value.trim();
    if (!custNic) {
        showNotification("Please enter a Customer NIC or Meter No", "error");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/billing.php?search=${encodeURIComponent(custNic)}`);
        const data = await response.json();

        if (data.status === 'error') {
            showNotification(data.message || "Error searching customer", "error");
            return;
        }

        if (Array.isArray(data) && data.length > 0) {
            customerMeters = data; // Store ALL rows (meters)

            // Default to first meter's utility
            const firstMeter = data[0];
            if (firstMeter.utility_id) {
                handleUtilityChange(firstMeter.utility_id);
            }

            showNotification("Customer Found", "success");
        } else {
            showNotification("No records found.", "error");
            resetDashboardUI();
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        showNotification("Server error. Check database connection.", "error");
    }
});

function updateDashboard() {
    if (!customerMeters || customerMeters.length === 0) return;

    // Find meter matching selected utility
    const match = customerMeters.find(m => m.utility_id == selectedUtilityId);

    if (match) {
        currentCustomer = match;

        // Update Info
        document.getElementById('dispCustNic').innerText = `${match.first_name} ${match.last_name} (${match.meter_no})`;
        document.getElementById('dispCustAddr').innerText = match.address || "-";

        // Update Cards
        const payable = match.amount ? parseFloat(match.amount) : 0;
        document.getElementById('dashPayable').innerText = payable.toLocaleString(undefined, { minimumFractionDigits: 2 });

        const lastBill = match.last_bill_amount ? parseFloat(match.last_bill_amount) : 0;
        document.getElementById('dashLastBill').innerText = lastBill.toLocaleString(undefined, { minimumFractionDigits: 2 });

        document.getElementById('dashStatus').innerText = match.meter_status || "Unknown";
        document.getElementById('cardStatus').className = 'card ' + (match.meter_status === 'Active' ? 'card-green' : 'card-pink');

        // Refresh History if visible
        const isHistoryVisible = !viewHistory.classList.contains('hidden');
        if (isHistoryVisible) {
            const mode = navPaymentHist.classList.contains('active') ? 'payment' : 'usage';
            loadHistory(mode);
        }

    } else {
        // Customer exists but has no meter for this utility
        currentCustomer = null;
        document.getElementById('dispCustNic').innerText = "N/A for this Utility";
        document.getElementById('dashPayable').innerText = "0.00";
        document.getElementById('dashLastBill').innerText = "0.00";
        document.getElementById('dashStatus').innerText = "-";
        document.getElementById('cardStatus').className = 'card card-green';

        // Clear Table
        document.getElementById('tableBody').innerHTML = '<tr><td colspan="5" style="text-align:center;">No meter for selected utility.</td></tr>';
    }
}

function resetDashboardUI() {
    customerMeters = [];
    currentCustomer = null;
    document.getElementById('dispCustNic').innerText = "-";
    document.getElementById('dispCustAddr').innerText = "-";
    document.getElementById('dashPayable').innerText = "0";
    document.getElementById('dashLastBill').innerText = "0";
    document.getElementById('tableBody').innerHTML = '';
}


// === 5. HISTORY LOGIC ===
async function loadHistory(mode) {
    if (!currentCustomer) {
        document.getElementById('tableBody').innerHTML = '<tr><td colspan="5" style="text-align:center;">Please select an active customer & utility.</td></tr>';
        return;
    }

    const isPayment = mode === 'payment';
    document.getElementById('historyTitle').innerText = isPayment ? "Payment History" : "Usage History";

    // Setup Headers
    const headerRow = document.getElementById('tableHeadRow');
    const headers = isPayment
        ? ['Reading Date', 'Generated Date', 'Units', 'Bill Amount', 'Status']
        : ['Reading Date', 'Generated Date', 'Units', 'Bill Amount'];

    headerRow.innerHTML = headers.map(h => `<th>${h}</th>`).join('');

    try {
        const response = await fetch(`${API_BASE}/cashierdashboard.php?action=history&meter_no=${currentCustomer.meter_no}`);
        const data = await response.json();
        renderTable(data, mode);
    } catch (e) {
        showNotification(`Could not load ${mode} history.`, "error");
    }
}

function renderTable(data, mode) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No history records found.</td></tr>';
        return;
    }

    data.forEach(row => {
        const tr = document.createElement('tr');
        if (mode === 'payment') {
            tr.innerHTML = `
                <td>${row.reading_date}</td>
                <td>${row.generated_date ? row.generated_date.split(' ')[0] : '-'}</td>
                <td><span class="unit-badge">${row.consumption}</span></td>
                <td><span class="bill-badge">Rs. ${row.cost || '0'}</span></td>
                <td><span class="${row.status === 'Paid' ? 'status-complete' : 'status-pending'}">${row.status}</span></td>
            `;
        } else {
            tr.innerHTML = `
                <td>${row.reading_date}</td>
                <td>${row.generated_date ? row.generated_date.split(' ')[0] : '-'}</td>
                <td><span class="unit-badge">${row.consumption}</span></td>
                <td><span class="bill-badge">Rs. ${row.cost || '0'}</span></td>
            `;
        }
        tbody.appendChild(tr);
    });
}


// === 6. PAYMENT LOGIC ===

document.getElementById('btnPayBill').addEventListener('click', () => {
    if (!currentCustomer) {
        showNotification("Please identify a customer first.", "error");
        return;
    }

    const amount = currentCustomer.amount ? parseFloat(currentCustomer.amount) : 0;

    // If no pending bill or amount is zero, warn user.
    if (!amount || amount <= 0) {
        showNotification("No pending amount to pay.", "info");
        return;
    }

    document.getElementById('inputPaymentAmount').value = amount.toFixed(2);
    modalAmount.classList.remove('hidden');
});

// Important: Matches ID in dashboard_cashier.html
document.getElementById('btnConfirmPayment').addEventListener('click', async () => {
    if (!currentCustomer || !currentCustomer.bill_id) {
        showNotification("Invalid bill context.", "error");
        return;
    }

    const amount = document.getElementById('inputPaymentAmount').value;

    const paymentData = {
        bill_id: currentCustomer.bill_id,
        amount: amount
    };

    try {
        const response = await fetch(`${API_BASE}/billing.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paymentData)
        });

        const result = await response.json();

        if (result.status === 'success') {
            showNotification("Payment successful!", "success");
            modalAmount.classList.add('hidden');

            // Wait briefly then reset
            setTimeout(() => {
                resetDashboardUI();
                inputCustNic.value = "";
            }, 1000);

        } else {
            showNotification("Payment failed: " + result.message, "error");
        }
    } catch (e) {
        showNotification("Error connecting to payment server.", "error");
    }
});