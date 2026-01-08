let selectedMeterId = null; 

function logout() {
    fetch('../api/auth.php?action=logout')
    .then(() => window.location.href = '../index.html')
    .catch(err => console.error("Logout failed", err));
}

const searchInput = document.getElementById('meter-search-input');
const suggestionsList = document.getElementById('suggestions-list');
const submitBtn = document.getElementById('submit-btn');

const displayCustId = document.getElementById('info-cust-id');
const displayStatus = document.getElementById('info-status');
const displayType = document.getElementById('info-type');

const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const prevReadInput = document.getElementById('prev-reading-input');
const currentReadInput = document.getElementById('current-reading');

searchInput.addEventListener('input', function() {
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

document.addEventListener('click', function(e) {
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
        if(data.status === 'success') {
            const info = data.details;
            
            displayCustId.textContent = info.customer_id + " (" + info.first_name + ")";
            displayStatus.textContent = info.status;
            displayType.textContent = info.utility_name || "Unknown";

            prevReadInput.value = data.prev_reading;
            
            const today = new Date().toISOString().split('T')[0];
            startDateInput.value = today;
            endDateInput.value = today;
        }
    });
}

submitBtn.addEventListener('click', function() {
    if (!selectedMeterId) {
        alert("Please search and select a meter first.");
        return;
    }

    const currentVal = parseFloat(currentReadInput.value);
    const prevVal = parseFloat(prevReadInput.value);
    const dateVal = endDateInput.value;

    if (!currentVal || !dateVal) {
        alert("Please fill in Current Reading and Date.");
        return;
    }
    if (currentVal < prevVal) {
        alert("Error: Current reading cannot be less than Previous reading.");
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
            alert("Reading Saved Successfully!");
            searchInput.value = '';
            currentReadInput.value = '';
            prevReadInput.value = '';
            displayCustId.textContent = '-';
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
        alert("Please search and select a meter first to report a fault.");
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

faultDesc.addEventListener('input', function() {
    charCount.textContent = `${this.value.length}/1000`;
});

submitFaultBtn.addEventListener('click', () => {
    const description = faultDesc.value.trim();
    if (!description) {
        alert("Please enter a description.");
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
            alert("Fault Reported Successfully!");
            modal.style.display = 'none';
        } else {
            alert("Error: " + data.message);
        }
    })
    .catch(err => console.error("Fault Report Error:", err));
});