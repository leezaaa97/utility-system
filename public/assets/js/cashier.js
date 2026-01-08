document.addEventListener('DOMContentLoaded', function () {
    const paymentModal = new bootstrap.Modal(document.getElementById('paymentModal'));
    const cashModal = new bootstrap.Modal(document.getElementById('cashPaymentModal'));

    window.showView = function(viewId) {
        document.querySelectorAll('.view-section').forEach(section => {
            section.classList.add('d-none');
        });
        document.getElementById(viewId).classList.remove('d-none');
        
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if(link.innerText.toLowerCase().includes(viewId.split('-')[0])) {
                link.classList.add('active');
            }
        });
    };

    document.getElementById("fetchCustomerBtn").addEventListener("click", function() {
        const customerID = document.getElementById("customerID").value;
        if (!customerID) return;
        
        document.querySelector(".pay strong").innerText = "Rs. 15,000.00";
        document.querySelector(".lastbill strong").innerText = "Rs. 13,000.00";
        document.querySelector(".status strong").innerText = "Active";
        document.getElementById("meterStatusCard").style.backgroundColor = "#a8e6a3";
    });

    document.querySelectorAll(".payment-btn").forEach(btn => {
        btn.addEventListener("click", function () {
            const amount = parseFloat(document.getElementById("paymentModalAmount").value);
            if (isNaN(amount) || amount <= 0) return;

            if (this.dataset.method === "cash") {
                document.getElementById("cashPayable").innerText = "Rs. " + amount.toFixed(2);
                paymentModal.hide();
                setTimeout(() => cashModal.show(), 200);
            } else {
                paymentModal.hide();
            }
        });
    });

    document.getElementById("calculateReturnBtn").addEventListener("click", function () {
        const received = parseFloat(document.getElementById("cashReceivedInput").value);
        const payable = parseFloat(document.getElementById("cashPayable").innerText.replace("Rs.", ""));

        if (!isNaN(received)) {
            const change = Math.max(0, received - payable);
            document.getElementById("cashReturn").innerText = "Rs. " + change.toFixed(2);
        }
    });

    window.handleLogout = function() {
        if (confirm("Are you sure you want to log out?")) {
            window.location.reload(); 
        }
    };
});
