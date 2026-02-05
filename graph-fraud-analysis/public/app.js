// ============================================
// Fraud Analytics Dashboard - JavaScript
// ============================================

// State
const state = {
    currentView: 'dashboard',
    fraudPatterns: [],
    persons: [],
    stats: null
};

// DOM Elements
const views = {
    dashboard: document.getElementById('dashboardView'),
    alerts: document.getElementById('alertsView'),
    users: document.getElementById('usersView'),
    'ktp-check': document.getElementById('ktpCheckView')
};

// ============================================
// API Functions
// ============================================
async function fetchAPI(endpoint) {
    try {
        const response = await fetch(`/api${endpoint}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        return null;
    }
}

async function loadStats() {
    const stats = await fetchAPI('/stats');
    if (stats) {
        state.stats = stats;
        document.getElementById('statPersons').textContent = stats.persons.toLocaleString();
        document.getElementById('statRegistrations').textContent = stats.registrations.toLocaleString();
        document.getElementById('statFraudPatterns').textContent = stats.fraudPatterns.toLocaleString();
        document.getElementById('statHighRisk').textContent = stats.highRisk.toLocaleString();
        document.getElementById('alertBadge').textContent = stats.fraudPatterns;

        // Update connection status
        const dbStatus = document.getElementById('dbStatus');
        dbStatus.innerHTML = '<span class="status-dot connected"></span><span>Neo4j Connected</span>';
    } else {
        const dbStatus = document.getElementById('dbStatus');
        dbStatus.innerHTML = '<span class="status-dot error"></span><span>Connection Error</span>';
    }
}

async function loadFraudSummary() {
    const summary = await fetchAPI('/fraud-summary');
    if (summary && summary.length > 0) {
        renderFraudChart(summary);
    }
}

async function loadFraudPatterns() {
    const patterns = await fetchAPI('/fraud-patterns');
    if (patterns) {
        state.fraudPatterns = patterns;
        renderRecentAlerts(patterns.slice(0, 5));
        renderAlertsTable(patterns);
    }
}

async function loadPersons(search = '') {
    const endpoint = search ? `/persons?search=${encodeURIComponent(search)}` : '/persons';
    const persons = await fetchAPI(endpoint);
    if (persons) {
        state.persons = persons;
        renderPersonsTable(persons);
    }
}

async function loadPersonDetail(personId) {
    const person = await fetchAPI(`/person/${personId}`);
    if (person) {
        renderPersonModal(person);
        document.getElementById('userModal').classList.add('active');
    }
}

async function analyzeKTP(ktpNumber) {
    const analysis = await fetchAPI(`/ktp-analysis/${ktpNumber}`);
    if (analysis) {
        renderKTPResult(analysis);
    }
}

// ============================================
// Render Functions
// ============================================
function renderFraudChart(summary) {
    const container = document.getElementById('fraudChart');
    const maxCount = Math.max(...summary.map(s => s.count));

    const typeLabels = {
        'SHARED_KTP': 'Shared KTP',
        'EMAIL_CLUSTER': 'Email Cluster',
        'AGENT_MIDDLEMAN': 'Agent/Middleman',
        'POLICY_VIOLATION': 'Policy Violation'
    };

    container.innerHTML = summary.map(item => {
        const percentage = (item.count / maxCount) * 100;
        const severityClass = item.severity.toLowerCase();
        return `
            <div class="chart-bar">
                <span class="chart-bar-label">${typeLabels[item.type] || item.type}</span>
                <div class="chart-bar-container">
                    <div class="chart-bar-fill ${severityClass}" style="width: ${percentage}%"></div>
                </div>
                <span class="chart-bar-value">${item.count}</span>
            </div>
        `;
    }).join('');
}

function renderRecentAlerts(alerts) {
    const container = document.getElementById('recentAlerts');

    if (alerts.length === 0) {
        container.innerHTML = '<div class="loading">No alerts found</div>';
        return;
    }

    const icons = {
        'SHARED_KTP': '🔗',
        'EMAIL_CLUSTER': '📧',
        'AGENT_MIDDLEMAN': '🏢',
        'POLICY_VIOLATION': '⚠️'
    };

    container.innerHTML = alerts.map(alert => `
        <div class="alert-item ${alert.severity.toLowerCase()}">
            <span class="alert-icon">${icons[alert.type] || '🚨'}</span>
            <div class="alert-content">
                <div class="alert-type">${alert.type.replace(/_/g, ' ')}</div>
                <div class="alert-desc">${alert.description}</div>
            </div>
        </div>
    `).join('');
}

function renderAlertsTable(patterns) {
    const tbody = document.getElementById('alertsTableBody');

    if (patterns.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading">No fraud patterns detected</td></tr>';
        return;
    }

    tbody.innerHTML = patterns.map(pattern => `
        <tr>
            <td>
                <span class="severity-badge ${pattern.severity.toLowerCase()}">
                    ${pattern.severity === 'HIGH' ? '🔴' : pattern.severity === 'MEDIUM' ? '🟠' : '🔵'}
                    ${pattern.severity}
                </span>
            </td>
            <td>${pattern.type.replace(/_/g, ' ')}</td>
            <td>${truncateText(pattern.description, 60)}</td>
            <td>${pattern.persons ? pattern.persons.length : 0}</td>
            <td>
                ${pattern.persons && pattern.persons.length > 0 ? `
                    <button class="btn-outline btn-sm" onclick="loadPersonDetail('${pattern.persons[0].id}')">
                        View Details
                    </button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

function renderPersonsTable(persons) {
    const tbody = document.getElementById('usersTableBody');

    if (persons.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading">No users found</td></tr>';
        return;
    }

    tbody.innerHTML = persons.map(person => {
        const isSuspicious = person.isAgent || person.registrations > 5;
        return `
            <tr>
                <td><strong>${person.name}</strong></td>
                <td style="font-family: 'Courier New', monospace; font-size: 12px;">${person.ktp}</td>
                <td>${person.gender}</td>
                <td>${person.emails.length}</td>
                <td>${person.registrations}</td>
                <td>
                    ${isSuspicious
                ? '<span class="severity-badge high">⚠️ Suspicious</span>'
                : '<span class="severity-badge low">✓ Normal</span>'
            }
                </td>
                <td>
                    <button class="btn-outline btn-sm" onclick="loadPersonDetail('${person.id}')">
                        View
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function renderPersonModal(person) {
    const body = document.getElementById('userModalBody');

    const genderIcon = person.gender === 'Male' ? '👨' : '👩';

    body.innerHTML = `
        <div class="user-detail-header">
            <div class="user-avatar-lg">${genderIcon}</div>
            <div class="user-header-info">
                <h2>${person.name}</h2>
                <span class="ktp-display">${person.ktpNumber}</span>
                ${person.isAgent ? '<span class="severity-badge high" style="margin-left: 12px;">🏢 Agent Account</span>' : ''}
            </div>
        </div>
        
        <div class="detail-grid">
            <div class="detail-section">
                <h4><span>👤</span> Personal Info</h4>
                <ul class="detail-list">
                    <li><strong>Gender:</strong> ${person.gender}</li>
                    <li><strong>Birth Date:</strong> ${person.birthDate}</li>
                    <li><strong>Marital Status:</strong> ${person.maritalStatus}</li>
                    ${person.agentCompany ? `<li><strong>Company:</strong> ${person.agentCompany}</li>` : ''}
                </ul>
            </div>
            
            <div class="detail-section">
                <h4><span>📧</span> Contact</h4>
                <ul class="detail-list">
                    ${person.emails.map(email => `<li>${email}</li>`).join('')}
                    ${person.phones.map(phone => `<li>${phone.number} (${phone.type})</li>`).join('')}
                </ul>
            </div>
            
            <div class="detail-section">
                <h4><span>📍</span> Address</h4>
                <ul class="detail-list">
                    ${person.address ? `
                        <li>${person.address.street}</li>
                        <li>${person.address.district}, ${person.address.city}</li>
                        <li>${person.address.province} ${person.address.postalCode}</li>
                    ` : '<li>No address on file</li>'}
                </ul>
            </div>
            
            <div class="detail-section">
                <h4><span>🏦</span> Bank Accounts</h4>
                <ul class="detail-list">
                    ${person.banks && person.banks.length > 0
            ? person.banks.map(bank => `<li>${bank.bank}: ${bank.account}</li>`).join('')
            : '<li>No bank accounts</li>'
        }
                </ul>
            </div>
            
            <div class="detail-section">
                <h4><span>💼</span> Work History</h4>
                <ul class="detail-list">
                    ${person.workHistory && person.workHistory.length > 0
            ? person.workHistory.map(work => `<li><strong>${work.role}</strong> at ${work.company}</li>`).join('')
            : '<li>No work history</li>'
        }
                </ul>
            </div>
            
            <div class="detail-section">
                <h4><span>📱</span> Social Media</h4>
                <ul class="detail-list">
                    ${person.socialMedia && person.socialMedia.length > 0
            ? person.socialMedia.map(social => `<li>${social.platform}: ${social.handle}</li>`).join('')
            : '<li>No social media</li>'
        }
                </ul>
            </div>
        </div>
        
        ${person.registrations && person.registrations.length > 0 ? `
            <div class="detail-section" style="margin-top: 24px;">
                <h4><span>📝</span> Registrations (${person.registrations.length})</h4>
                <ul class="detail-list">
                    ${person.registrations.slice(0, 10).map(reg => `
                        <li><strong>${reg.product}</strong> - ${reg.status} (${reg.id})</li>
                    `).join('')}
                    ${person.registrations.length > 10 ? `<li>... and ${person.registrations.length - 10} more</li>` : ''}
                </ul>
            </div>
        ` : ''}
    `;
}

function renderKTPResult(analysis) {
    const container = document.getElementById('ktpResults');

    const isSuspicious = analysis.isSuspicious;
    const totalPersons = analysis.persons.length;

    let violationsHTML = '';
    if (Object.keys(analysis.productCounts).length > 0) {
        const limits = {
            'DigitalCertificate': 1,
            'DigitalToken': 2,
            'DigitalSign': 10,
            'DigitalJump': 100
        };

        const violations = [];
        Object.entries(analysis.productCounts).forEach(([product, count]) => {
            if (limits[product] && count > limits[product]) {
                violations.push({ product, count, limit: limits[product] });
            }
        });

        if (violations.length > 0) {
            violationsHTML = `
                <div class="product-violations">
                    <h4>⚠️ Product Limit Violations</h4>
                    ${violations.map(v => `
                        <div class="violation-item">
                            <span>${v.product}</span>
                            <span><strong>${v.count}</strong> / ${v.limit} (exceeded by ${v.count - v.limit})</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }

    container.innerHTML = `
        <div class="ktp-result-card">
            <div class="ktp-result-header">
                <h2>${analysis.ktp}</h2>
                <span class="status-tag ${isSuspicious ? 'suspicious' : 'clean'}">
                    ${isSuspicious ? '⚠️ Suspicious' : '✓ Clean'}
                </span>
            </div>
            <div class="ktp-result-body">
                ${totalPersons > 1 ? `
                    <div class="product-violations" style="margin-bottom: 24px; border-color: rgba(245, 158, 11, 0.3); background: rgba(245, 158, 11, 0.1);">
                        <h4 style="color: var(--warning);">⚠️ Multiple Identities Detected</h4>
                        <p style="font-size: 14px; color: var(--text-secondary);">
                            This KTP number is associated with ${totalPersons} different user accounts.
                        </p>
                    </div>
                ` : ''}
                
                <div class="ktp-person-list">
                    <h4 style="margin-bottom: 16px; color: var(--text-muted); font-size: 13px; text-transform: uppercase;">
                        Associated Users (${totalPersons})
                    </h4>
                    ${analysis.persons.map(person => `
                        <div class="ktp-person-item">
                            <div class="person-avatar">👤</div>
                            <div class="person-info">
                                <h4>${person.name}</h4>
                                <p>${person.emailCount} email(s) • ${person.regCount} registration(s)</p>
                            </div>
                            <button class="btn-outline btn-sm" onclick="loadPersonDetail('${person.id}')">
                                View Details
                            </button>
                        </div>
                    `).join('')}
                </div>
                
                ${violationsHTML}
                
                <div class="detail-section" style="margin-top: 24px;">
                    <h4><span>📊</span> Product Registration Summary</h4>
                    <ul class="detail-list">
                        ${Object.entries(analysis.productCounts).map(([product, count]) => `
                            <li><strong>${product}:</strong> ${count} registration(s)</li>
                        `).join('') || '<li>No registrations found</li>'}
                    </ul>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// Utility Functions
// ============================================
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function switchView(viewName) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.view === viewName);
    });

    // Show/hide views
    Object.entries(views).forEach(([name, element]) => {
        element.classList.toggle('active', name === viewName);
    });

    state.currentView = viewName;

    // Load data for view
    switch (viewName) {
        case 'dashboard':
            loadStats();
            loadFraudSummary();
            loadFraudPatterns();
            break;
        case 'alerts':
            loadFraudPatterns();
            break;
        case 'users':
            loadPersons();
            break;
    }
}

function applyFilters() {
    const severity = document.getElementById('severityFilter').value;
    const type = document.getElementById('typeFilter').value;

    let filtered = [...state.fraudPatterns];

    if (severity) {
        filtered = filtered.filter(p => p.severity === severity);
    }
    if (type) {
        filtered = filtered.filter(p => p.type === type);
    }

    renderAlertsTable(filtered);
}

// ============================================
// Event Listeners
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Initial load
    switchView('dashboard');

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchView(item.dataset.view);
        });
    });

    // Search
    document.getElementById('searchBtn').addEventListener('click', () => {
        const query = document.getElementById('userSearch').value;
        loadPersons(query);
    });

    document.getElementById('userSearch').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loadPersons(e.target.value);
        }
    });

    // Filters
    document.getElementById('severityFilter').addEventListener('change', applyFilters);
    document.getElementById('typeFilter').addEventListener('change', applyFilters);

    // KTP Analysis
    document.getElementById('ktpSearchBtn').addEventListener('click', () => {
        const ktp = document.getElementById('ktpInput').value.trim();
        if (ktp.length === 16) {
            analyzeKTP(ktp);
        } else {
            alert('Please enter a valid 16-digit KTP number');
        }
    });

    document.getElementById('ktpInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const ktp = e.target.value.trim();
            if (ktp.length === 16) {
                analyzeKTP(ktp);
            }
        }
    });

    // Modal
    document.getElementById('closeModal').addEventListener('click', () => {
        document.getElementById('userModal').classList.remove('active');
    });

    document.querySelector('.modal-overlay').addEventListener('click', () => {
        document.getElementById('userModal').classList.remove('active');
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.getElementById('userModal').classList.remove('active');
        }
    });
});

// Refresh data periodically
setInterval(() => {
    if (state.currentView === 'dashboard') {
        loadStats();
    }
}, 30000);
