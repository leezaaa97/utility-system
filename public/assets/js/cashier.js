// === 1. STATE MANAGEMENT ===
const API_BASE = "../api";
let currentCustomer = null;
let currentPayable = 0;

// === 2. DOM ELEMENT SELECTION ===
// Sidebar Items
const navIdentify = document.getElementById('navIdentify');
const navPaymentHist = document.getElementById('navPaymentHist');
const navUsageHist = document.getElementById('navUsageHist');

// Views
const viewDashboard = document.getElementById('viewDashboard');
const viewHistory = document.getElementById('viewHistory');

// Inputs & Buttons
const inputCustNic = document.getElementById('custNicInput');
const btnGetDetails = document.getElementById('btnGetDetails');
const btnPayBill = document.getElementById('btnPayBill');
const btnMethodCash = document.getElementById('btnMethodCash');
const btnViewHistoryFromModal = document.getElementById('btnViewHistoryFromModal');

// Modals
const modalAmount = document.getElementById('modalAmount');
const modalCash = document.getElementById('modalCash');
const closeButtons = document.querySelectorAll('.close-modal');

// === 3. NAVIGATION LOGIC (SIDEBAR) ===

function switchTab(tabName) {
    // Reset all nav items
    navIdentify.classList.remove('active');
    navPaymentHist.classList.remove('active');
    navUsageHist.classList.remove('active');

    if (tabName === 'dashboard') {
        navIdentify.classList.add('active');
        viewDashboard.classList.remove('hidden');
        viewHistory.classList.add('hidden');
    }
    else if (tabName === 'payment') {
        navPaymentHist.classList.add('active');
        viewDashboard.classList.add('hidden');
        viewHistory.classList.remove('hidden');
        loadPaymentHistory();
    }
    else if (tabName === 'usage') {
        navUsageHist.classList.add('active');
        viewDashboard.classList.add('hidden');
        viewHistory.classList.remove('hidden');
        loadUsageHistory();
    }
}

navIdentify.addEventListener('click', () => switchTab('dashboard'));
navPaymentHist.addEventListener('click', () => switchTab('payment'));
navUsageHist.addEventListener('click', () => switchTab('usage'));

// --- HELPER: Notification System (Matched to your Admin/Officer style) ---
window.showNotification = function (message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) {
        alert(message);
        return;
    }
    const toast = document.createElement('div');
    toast.className = `toast-message ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
};

// === 4. DASHBOARD & DATA LOGIC ===

btnGetDetails.addEventListener('click', async () => {
    const custNic = inputCustNic.value.trim();
    if(!custNic) {
        showNotification("Please enter a Customer NIC or Meter No", "error");
        return;
    }

    try {
        // Uses your billing.php GET search logic
        const response = await fetch(`${API_BASE}/billing.php?search=${encodeURIComponent(custNic)}`);
        const data = await response.json();

        if (data && data.length > 0) {
            // Your PHP returns an array; we take the first matching pending bill
            populateDashboard(data[0]);
            showNotification("Customer Found", "success");
        } else {
            showNotification("No pending bills found for this customer.", "error");
            resetDashboardUI();
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        showNotification("Server error. Check database connection.", "error");
    }
});



function populateDashboard(data) {
    currentCustomer = data; // Stores all fields (meter_no, bill_id, etc.)
    currentPayable = parseFloat(data.amount);

    // Update UI elements from your billing.php SQL results
    document.getElementById('dispCustNic').innerText = `${data.first_name} ${data.last_name} (${data.meter_no})`;
    document.getElementById('dispCustAddr').innerText = `Outstanding: Rs. ${data.outstanding_balance}`;

    document.getElementById('dashPayable').innerText = currentPayable.toLocaleString(undefined, {minimumFractionDigits: 2});
    document.getElementById('dashLastBill').innerText = parseFloat(data.amount).toLocaleString();
    document.getElementById('dashStatus').innerText = data.status;

    const statusCard = document.getElementById('cardStatus');
    statusCard.className = 'card ' + (data.status === 'Pending' ? 'card-pink' : 'card-green');
}

function resetDashboardUI() {
    currentCustomer = null;
    document.getElementById('dispCustNic').innerText = "-";
    document.getElementById('dashPayable').innerText = "0";
    document.getElementById('dashStatus').innerText = "Inactive";
}

// === 5. HISTORY TABLE LOGIC ===

async function loadPaymentHistory() {
    document.getElementById('historyTitle').innerText = "Payment History";
    setupTableHeaders(['Start Date', 'End Date', 'Payment Date', 'Units', 'Total Bill', 'Total Paid', 'Status']);

    try {
        // Fetches readings for this meter
        const response = await fetch(`${API_BASE}/readings.php?meter_no=${currentCustomer.meter_no}`);
        const data = await response.json();
        renderTable(data, 'payment');
    } catch (e) {
        showNotification("Could not load payment history.", "error");
    }
}

async function loadUsageHistory() {
    document.getElementById('historyTitle').innerText = "Usage History";
    setupTableHeaders(['Start Date', 'End Date', 'Total Units Used', 'Total Bill']);

    try {
        const response = await fetch(`${API_BASE}/readings.php?meter_no=${currentCustomer.meter_no}`);
        const data = await response.json();
        renderTable(data, 'usage');
    } catch (e) {
        showNotification("Could not load usage history.", "error");
    }
}async function loadUsageHistory() {
     document.getElementById('historyTitle').innerText = "Usage History";
     setupTableHeaders(['Start Date', 'End Date', 'Total Units Used', 'Total Bill']);

     try {
         const response = await fetch(`${API_BASE}/readings.php?meter_no=${currentCustomer.meter_no}`);
         const data = await response.json();
         renderTable(data, 'usage');
     } catch (e) {
         showNotification("Could not load usage history.", "error");
     }
 }

function setupTableHeaders(headers) {
    const headerRow = document.getElementById('tableHeadRow');
    headerRow.innerHTML = '';
    headers.forEach(h => {
        const th = document.createElement('th');
        th.innerText = h;
        headerRow.appendChild(th);
    });
}

function renderTable(data, type) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No history records found.</td></tr>';
        return;
    }

    data.forEach(row => {
        const tr = document.createElement('tr');
        if (type === 'payment') {
            tr.innerHTML = `
                <td>${row.reading_date}</td><td>-</td><td>${row.reading_date}</td>
                <td><span class="unit-badge">${row.consumption}</span></td>
                <td><span class="bill-badge">Rs. ${row.cost || '0'}</span></td>
                <td><span class="bill-badge">Rs. ${row.cost || '0'}</span></td>
                <td><span class="status-complete">Complete</span></td>
            `;
        } else if (type === 'usage') {
            tr.innerHTML = `
                <td>${row.reading_date}</td><td>-</td>
                <td><span class="unit-badge">${row.consumption}</span></td>
                <td><span class="bill-badge">Rs. ${row.cost || '0'}</span></td>
            `;
        }
        tbody.appendChild(tr);
    });
}


// === 6. PAYMENT MODAL LOGIC ===

btnPayBill.addEventListener('click', () => {
    if (!currentCustomer) {
        showNotification("Please identify a customer first.", "error");
        return;
    }
    // Set the suggested amount to the actual payable amount
    document.getElementById('inputPaymentAmount').value = currentPayable;
    modalAmount.classList.remove('hidden');
});

btnMethodCash.addEventListener('click', async () => {
    const amountEntered = document.getElementById('inputPaymentAmount').value;
    if(!amountEntered || amountEntered <= 0) {
        showNotification("Invalid Amount", "error");
        return;
    }

    // Prepare data for billing.php POST
    const paymentData = {
        bill_id: currentCustomer.bill_id,
        amount: amountEntered
    };

    try {
        const response = await fetch(`${API_BASE}/billing.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paymentData)
        });

        const result = await response.json();

        if (result.status === 'success') {
            modalAmount.classList.add('hidden');
            modalCash.classList.remove('hidden');

            document.getElementById('calcPayable').innerText = parseFloat(amountEntered).toFixed(2);
            document.getElementById('inputCashReceived').value = "";
            document.getElementById('calcReturn').innerText = "0.00";

            showNotification("Payment successful!", "success");
        } else {
            showNotification("Payment failed: " + result.message, "error");
        }
    } catch (e) {
        showNotification("Error connecting to payment server.", "error");
    }
});

document.getElementById('inputCashReceived').addEventListener('input', (e) => {
    const payable = parseFloat(document.getElementById('calcPayable').innerText);
    const received = parseFloat(e.target.value);
    if(!isNaN(received)) {
        document.getElementById('calcReturn').innerText = (received - payable).toFixed(2);
    }
});

btnViewHistoryFromModal.addEventListener('click', () => {
    modalCash.classList.add('hidden');
    switchTab('payment');
});

closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        modalAmount.classList.add('hidden');
        modalCash.classList.add('hidden');
    });
});