console.log("Officer dashboard JS loaded.");


// --- HELPER: Notification System ---
window.showNotification = function (message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-message ${type}`;

    // Using Phosphor icons since they are already in the officer dashboard
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
// --- OFFICER DASHBOARD FUNCTIONALITY ---

let selectedMeterId = null;


const logoutBtn = document.querySelector('.logout');

if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            // Show notification immediately
            showNotification('Logging out...', 'success');

            // Perform logout in background
            await fetch('../api/auth.php?action=logout');

            // Short delay to let user see the message before redirect
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 1000);
        });
    }

const searchInput = document.getElementById('meter-search-input');
const suggestionsList = document.getElementById('suggestions-list');
const submitBtn = document.getElementById('submit-btn');

const displayCustId = document.getElementById('info-cust-id');
const displayCustName = document.getElementById('info-cust-name');
const displayStatus = document.getElementById('info-status');
const displayType = document.getElementById('info-type');

const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const prevReadInput = document.getElementById('prev-reading-input');
const currentReadInput = document.getElementById('current-reading');

searchInput.addEventListener('input', function () {
    const query = this.value.trim();
    suggestionsList.innerHTML = '';

    if (query.length > 0) {
        fetch(`../api/readings.php?action=search&query=${query}`)
            .then(res => res.json())
            .then(data => {
                if (data.length > 0) {
                    suggestionsList.style.display = 'block';
                    data.forEach(meter => {
                        const li = document.createElement('li');
                        li.textContent = `${meter.meter_no} - ${meter.first_name} ${meter.last_name}`;
                        li.onclick = () => selectMeter(meter.meter_id, meter.meter_no);
                        suggestionsList.appendChild(li);
                    });
                } else {
                    suggestionsList.style.display = 'none';
                }
            });
    } else {
        suggestionsList.style.display = 'none';
    }
});

document.addEventListener('click', function (e) {
    if (!searchInput.contains(e.target) && !suggestionsList.contains(e.target)) {
        suggestionsList.style.display = 'none';
    }
});

function selectMeter(meterId, meterNo) {
    selectedMeterId = meterId;
    searchInput.value = meterNo;
    suggestionsList.style.display = 'none';

    fetch(`../api/readings.php?action=get_details&meter_id=${meterId}`)
        .then(res => res.json())
        .then(data => {

            console.log("Details loaded for meter:", meterId);
            if (data.status === 'success') {
                const info = data.details;

                displayCustId.textContent = info.nic || "N/A";
                displayCustName.textContent = (info.first_name || "") + " " + (info.last_name || "");
                displayStatus.textContent = info.status;
                displayType.textContent = info.utility_name || "Unknown";

                prevReadInput.value = data.prev_reading;

                const today = new Date().toISOString().split('T')[0];
                startDateInput.value = today;
                endDateInput.value = today;
            }
        });
}

submitBtn.addEventListener('click', function () {
    if (!selectedMeterId) {
        showNotification("Please search and select a meter first.");
        return;
    }

    const currentVal = parseFloat(currentReadInput.value);
    const prevVal = parseFloat(prevReadInput.value);
    const dateVal = endDateInput.value;

    if (!currentVal || !dateVal) {
        showNotification("Please fill in Current Reading and Date.");
        return;
    }
    if (currentVal < prevVal) {
        showNotification("Error: Current reading cannot be less than Previous reading.");
        return;
    }

    fetch('../api/readings.php?action=submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            meter_id: selectedMeterId,
            prev_reading: prevVal,
            current_reading: currentVal,
            date: dateVal
        })
    })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                showNotification("Reading Saved Successfully!");
                searchInput.value = '';
                currentReadInput.value = '';
                prevReadInput.value = '';
                displayCustId.textContent = '-';
                displayCustName.textContent = '-';
                displayStatus.textContent = '-';
                displayType.textContent = '-';
                startDateInput.value = '';
                endDateInput.value = '';
                selectedMeterId = null;
            } else {
                alert("Error: " + data.message);
            }
        });
});

const modal = document.getElementById('fault-modal');
const openModalBtn = document.getElementById('open-fault-modal');
const closeModalBtn = document.getElementById('close-modal');
const submitFaultBtn = document.getElementById('submit-fault-btn');
const faultDesc = document.getElementById('fault-desc');
const charCount = document.querySelector('.char-count');

openModalBtn.addEventListener('click', () => {
    if (!selectedMeterId) {
        showNotification("Please search and select a meter first to report a fault.");
        return;
    }
    modal.style.display = 'flex';
    faultDesc.value = '';
    charCount.textContent = '0/1000';
});

closeModalBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

faultDesc.addEventListener('input', function () {
    charCount.textContent = `${this.value.length}/1000`;
});

submitFaultBtn.addEventListener('click', () => {
    const description = faultDesc.value.trim();
    if (!description) {
        showNotification("Please enter a description.");
        return;
    }

    fetch('../api/readings.php?action=report_fault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            meter_id: selectedMeterId,
            description: description
        })
    })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                showNotification("Fault Reported Successfully!");
                modal.style.display = 'none';
            } else {
                showNotification("Error: " + data.message);
            }
        })
        .catch(err => console.error("Fault Report Error:", err));
});