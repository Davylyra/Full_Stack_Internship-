// Variable to store the Admin Token for session
let adminToken = localStorage.getItem('adminToken');

document.addEventListener('DOMContentLoaded', () => {
    loadSchemes();
    checkAdminSession();

    // Mobile menu toggle
    const navbarToggle = document.querySelector('.navbar-toggle');
    const navbarMenu = document.querySelector('.navbar-menu');

    if (navbarToggle && navbarMenu) {
        navbarToggle.addEventListener('click', () => {
            navbarToggle.classList.toggle('active');
            navbarMenu.classList.toggle('active');
        });
    }

    // Application Submission Handler
    document.getElementById('applyForm').onsubmit = async e => {
        e.preventDefault();
        const data = {
            scheme_id: document.getElementById('scheme').value,
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value
        };

        const res = await fetch('/api/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        
        const msgElement = document.getElementById('msg');
        if (result.success) {
            msgElement.textContent = `Application Submitted! Your ID is ${result.id}.`;
            msgElement.innerHTML += `<br><a href="/pdf/${result.id}" target="_blank">Download PDF Receipt</a>`;
            e.target.reset();
        } else {
            msgElement.textContent = 'Error: ' + result.error;
        }
    };
    
    // Admin Login Handler
    document.getElementById('loginForm').onsubmit = async e => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const result = await res.json();
        const loginMsg = document.getElementById('loginMsg');
        
        if (result.success) {
            adminToken = result.token;
            localStorage.setItem('adminToken', adminToken);
            loginMsg.textContent = '';
            showAdminPanel();
        } else {
            loginMsg.textContent = 'Login Failed: Invalid credentials.';
        }
    };

    // Status Check Handler
    document.getElementById('statusCheckForm').onsubmit = async e => {
        e.preventDefault();
        const id = document.getElementById('appId').value;
        const res = await fetch(`/api/status/${id}`);
        const result = await res.json();
        const statusDiv = document.getElementById('statusResult');

        if (result.error) {
            statusDiv.innerHTML = `<p style="color:red;">Error: ${result.error}</p>`;
        } else {
            const statusClass = `status-${result.status.toLowerCase()}`;
            statusDiv.innerHTML = `
                <p>Application ID: <b>${result.id}</b></p>
                <p>Scheme: <b>${result.scheme_name}</b></p>
                <p>Status: <span class="${statusClass}">${result.status}</span></p>
                <p><a href="/pdf/${result.id}" target="_blank">Download Application Receipt</a></p>
            `;
        }
    };
});

async function loadSchemes() {
    const res = await fetch('/api/schemes');
    const schemes = await res.json();
    const select = document.getElementById('scheme');
    select.innerHTML = schemes.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
}

async function loadApplications() {
    const res = await fetch('/api/applications', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const apps = await res.json();
    const tbody = document.querySelector('#adminTable tbody');
    if (apps.error) {
         tbody.innerHTML = `<tr><td colspan="5" style="color:red;">Error loading data: ${apps.error}</td></tr>`;
         if (apps.error.includes('Unauthorized')) logout(); // Token expired or invalid
         return;
    }
    
    tbody.innerHTML = apps.map(app => `
        <tr>
            <td>${app.id}</td>
            <td>${app.name}</td>
            <td>${app.scheme_name}</td>
            <td>
                <select class="status" onchange="updateStatus(${app.id}, this.value)">
                    <option ${app.status==='Pending'?'selected':''}>Pending</option>
                    <option ${app.status==='Approved'?'selected':''}>Approved</option>
                    <option ${app.status==='Rejected'?'selected':''}>Rejected</option>
                </select>
            </td>
            <td><a href="/pdf/${app.id}" target="_blank">PDF</a></td>
        </tr>
    `).join('');
}

async function updateStatus(id, status) {
    await fetch(`/api/application/${id}`, {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status })
    });
    loadApplications();
}

function checkAdminSession() {
    if (adminToken) {
        showAdminPanel();
    } else {
        document.getElementById('adminLogin').style.display = 'block';
        document.getElementById('adminPanel').style.display = 'none';
    }
}

function showAdminPanel() {
    document.getElementById('adminLogin').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    loadApplications();
}

function logout() {
    adminToken = null;
    localStorage.removeItem('adminToken');
    checkAdminSession();
    document.getElementById('loginForm').reset();
    document.getElementById('loginMsg').textContent = '';
}
