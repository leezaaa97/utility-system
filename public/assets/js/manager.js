function switchView(viewId, element) {
    // Hide all sections
    const sections = document.querySelectorAll('.view-section');
    sections.forEach(section => section.classList.add('hidden'));

    // Show selected section
    const selectedSection = document.getElementById(viewId);
    if (selectedSection) {
        selectedSection.classList.remove('hidden');
    }

    // Update Sidebar Active State
    const navItems = document.querySelectorAll('.sidebar li');
    navItems.forEach(item => item.classList.remove('active'));
    
    // If clicked from sidebar, add active class
    if (element) {
        element.classList.add('active');
    } else {
        // If switched programmatically, find the link and activate it
        
    }

    // Trigger chart resize if needed
    resizeCharts();
}

function logout() {
    // API: /api/auth/logout
    alert("Logging out...");
}

// Chart Initialization (Using Chart.js) 
let charts = {};

document.addEventListener("DOMContentLoaded", function() {
    // Initialize Dashboard Charts
    initDashboardCharts();
    
    // Initialize Report Charts (placeholders)
    initReportCharts();

    // Populate Mock Data
    populateDailyTable();
    populateTopConsumersTable();
    
    // Initialize Export Center UI
    populateExportDays();
});


function initDashboardCharts() {
    // Daily Mini Chart
    const ctxDaily = document.getElementById('miniChartDaily').getContext('2d');
    new Chart(ctxDaily, {
        type: 'bar',
        data: {
            labels: ['M','T','W','T','F','S','S'],
            datasets: [{
                data: [30, 45, 20, 50, 40, 60, 45],
                backgroundColor: '#1F3A56',
                borderRadius: 4
            }]
        },
        options: { plugins: { legend: { display: false } }, scales: { x: {display:false}, y: {display:false} } }
    });

    // Monthly Mini Chart
    const ctxMonthly = document.getElementById('miniChartMonthly').getContext('2d');
    new Chart(ctxMonthly, {
        type: 'bar',
        data: {
            labels: ['W1','W2','W3','W4'],
            datasets: [{
                data: [120, 190, 300, 250],
                backgroundColor: '#1F3A56',
                borderRadius: 4
            }]
        },
        options: { plugins: { legend: { display: false } }, scales: { x: {display:false}, y: {display:false} } }
    });

    // Yearly Mini Chart
    const ctxYearly = document.getElementById('miniChartYearly').getContext('2d');
    new Chart(ctxYearly, {
        type: 'bar',
        data: {
            labels: ['Q1','Q2','Q3','Q4'],
            datasets: [{
                data: [500, 600, 750, 800],
                backgroundColor: '#1F3A56',
                borderRadius: 4
            }]
        },
        options: { plugins: { legend: { display: false } }, scales: { x: {display:false}, y: {display:false} } }
    });
}

function initReportCharts() {
    // 1. Monthly Usage Trends (Multi-bar)
    const ctxUsage = document.getElementById('monthlyUsageChart').getContext('2d');
    charts.monthly = new Chart(ctxUsage, {
        type: 'bar',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [
                { label: 'Electricity', data: [65, 59, 80, 81], backgroundColor: '#1F3A56' },
                { label: 'Water', data: [28, 48, 40, 19], backgroundColor: '#2d86b8' },
                { label: 'Gas', data: [15, 20, 10, 30], backgroundColor: '#aebcc6' }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // 2. Annual Performance (Area)
    const ctxAnnual = document.getElementById('annualAreaChart').getContext('2d');
    charts.annual = new Chart(ctxAnnual, {
        type: 'line',
        data: {
            labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
            datasets: [{
                label: 'Growth',
                data: [10, 25, 30, 28, 40, 45, 50, 55, 60, 62, 65, 70],
                fill: true,
                backgroundColor: 'rgba(31, 58, 86, 0.2)',
                borderColor: '#1F3A56',
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // 3. Top Consumer (User Consumption)
    const ctxUser = document.getElementById('userConsumptionChart').getContext('2d');
    charts.user = new Chart(ctxUser, {
        type: 'bar',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr'],
            datasets: [{
                label: 'Usage',
                data: [120, 150, 100, 180],
                backgroundColor: '#667',
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });
}

// Data & Table Functions 

function generateDailyReport() {
    const date = document.getElementById('dailyDate').value;
    alert(`Fetching data for ${date || 'today'}...`);
    populateDailyTable(); 
}

function populateDailyTable() {
    const tbody = document.getElementById('dailyRevenueTable');
    tbody.innerHTML = '';
    
    // Mock Data
    const data = [
        { nic: '987654321V', type: 'Domestic', utility: 'Electricity', meter: 'E-1023', rate: '35.00', total: '4500.00' },
        { nic: '123456789V', type: 'Industrial', utility: 'Water', meter: 'W-9921', rate: '20.00', total: '2100.00' },
        { nic: '456123789V', type: 'Domestic', utility: 'Gas', meter: 'G-3321', rate: '40.00', total: '1200.00' },
    ];

    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.nic}</td>
            <td>${row.type}</td>
            <td>${row.utility}</td>
            <td>${row.meter}</td>
            <td>${row.rate}</td>
            <td>${row.total}</td>
        `;
        tbody.appendChild(tr);
    });
}

function fetchTopConsumers() {
    alert("Updating Top Consumers List...");
    populateTopConsumersTable();
}

function populateTopConsumersTable() {
    const tbody = document.getElementById('topConsumersTable');
    tbody.innerHTML = '';
    
    const data = [
        { rank: 1, nic: '88221133V', cat: 'Industrial', contact: '077-1234567', units: 5000 },
        { rank: 2, nic: '99112244V', cat: 'Commercial', contact: '071-9876543', units: 4200 },
        { rank: 3, nic: '11223344V', cat: 'Domestic', contact: '075-5555555', units: 3100 },
    ];

    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${row.rank}</td>
            <td>${row.nic}</td>
            <td>${row.cat}</td>
            <td>${row.contact}</td>
            <td>${row.units}</td>
            <td><button class="btn-primary" style="font-size:0.7rem; padding: 0.3rem 0.6rem;">View</button></td>
        `;
        tbody.appendChild(tr);
    });
}

// EXPORT CENTER 

// 1. Day Dropdown Logic (1-31)
function populateExportDays() {
    const daySelect = document.getElementById('exportDay');
    if(!daySelect) return;

    daySelect.innerHTML = '<option value="">Select Day</option>';
    for (let i = 1; i <= 31; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.innerText = i;
        daySelect.appendChild(option);
    }
}

// 2. Year Widget Logic
function toggleYearWidget() {
    const popup = document.getElementById('yearWidgetPopup');
    popup.classList.toggle('hidden');
}

function selectYear(year) {
    document.querySelectorAll('.year-option').forEach(el => el.classList.remove('selected'));
    event.target.classList.add('selected');
    document.getElementById('selectedYearDisplay').innerText = year;
}

// Close widget if clicking outside
document.addEventListener('click', function(event) {
    const wrapper = document.querySelector('.year-widget-wrapper');
    const popup = document.getElementById('yearWidgetPopup');
    if (wrapper && !wrapper.contains(event.target) && !popup.classList.contains('hidden')) {
        popup.classList.add('hidden');
    }
});

// 3. Redirection Logic (Report -> Export)
function redirectToExport(reportType) {
    // Switch View
    switchView('export-center');

    // Pre-fill Report Type
    const typeSelect = document.getElementById('exportReportType');
    if (typeSelect) {
        typeSelect.value = reportType;
        updateExportPreview();
    }
    
    // Scroll to top
    document.querySelector('.main-content').scrollTop = 0;
}

// 4. Update Preview Text
function updateExportPreview() {
    const type = document.getElementById('exportReportType').value;
    const previewText = document.getElementById('previewText');
    const previewBox = document.querySelector('.export-preview-box');
    
    if (type) {
        previewText.innerText = `Previewing: ${type} Report`;
        previewBox.style.backgroundColor = "#dce6ed"; 
    }
}

// 5. Trigger Export
function triggerExport() {
    const type = document.getElementById('exportReportType').value;
    const year = document.getElementById('selectedYearDisplay').innerText;
    
    if(!type || type === "Select Type") {
        alert("Please select a Report Type first.");
        return;
    }

    alert(`Exporting ${type} (Year: ${year})... Downloading now.`);
}

// Resize canvas when tab switches
function resizeCharts() {
    Object.values(charts).forEach(chart => chart.resize());
}