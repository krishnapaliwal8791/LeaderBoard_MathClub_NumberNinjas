/**
 * ==================================================
 * SUPABASE CONFIGURATION
 * ==================================================
 */
const supabaseUrl = 'https://qituqinxtmobvvnmvdgo.supabase.co';
const supabaseKey = 'sb_publishable_rmRCvKb9-qCot4ViZHQ1sg_G4YfxRwH';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

/**
 * ==================================================
 * CONFIGURATION
 * ==================================================
 */
const eventConfig = {
    eventName: "NUMBER NINJAS",
    clubName: "Mathematics Club",
    tagline: "Think • Solve • Innovate",
    rounds: [
        { id: 1, name: "Round 1", title: "Mind Strike", tableName: "round1" },
        { id: 2, name: "Round 2", title: "Ninja Rush", tableName: "round2" },
        { id: 3, name: "Round 3", title: "Buzzer Battle", tableName: "round3" }
    ]
};

/**
 * ==================================================
 * STATE & DOM
 * ==================================================
 */
let state = {
    activeTabId: 1,
    currentData: [],
    previousRanks: {}, // Keyed by team.id
    autoRefreshEnabled: true,
    intervalSeconds: 5,
    countdownSeconds: 5,
    countdownTimer: null,
    isFetching: false,
    lastUpdateTimestamp: null
};

let paginationState = {
    currentPage: 1,
    pageSize: 20, // calculated dynamically
    timer: null
};

const DOM = {};

document.addEventListener('DOMContentLoaded', () => {
    cacheDOM();
    bindEvents();
    applyConfiguration();
    renderTabs();
    
    // Initial setup
    switchTab(1);
    startCountdown();
    startPaginationRotation();
});

function cacheDOM() {
    DOM.eventName = document.getElementById('event-name');
    DOM.clubName = document.getElementById('club-name');
    DOM.eventTagline = document.getElementById('event-tagline');
    DOM.fullscreenRoundName = document.getElementById('fullscreen-round-name');
    DOM.roundTracker = document.getElementById('round-tracker');
    
    DOM.leaderboardHead = document.getElementById('leaderboard-head');
    DOM.leaderboardBody = document.getElementById('leaderboard-body');
    DOM.loadingOverlay = document.getElementById('loading-overlay');
    DOM.pageIndicator = document.getElementById('page-indicator');
    
    // Panels & Drawer
    DOM.menuToggle = document.getElementById('menu-toggle');
    DOM.menuClose = document.getElementById('menu-close');
    DOM.sideDrawer = document.getElementById('side-drawer');
    DOM.toggleAutoRefresh = document.getElementById('auto-refresh-toggle');
    DOM.selectInterval = document.getElementById('refresh-interval-select');
    DOM.btnManualRefresh = document.getElementById('manual-refresh-btn');
    
    // Fullscreen
    DOM.btnFullscreen = document.getElementById('fullscreen-btn');
    DOM.btnExitFullscreen = document.getElementById('exit-fullscreen-btn');
    
    // Live Stats
    DOM.statRound = document.getElementById('stat-round');
    DOM.statTeams = document.getElementById('stat-teams');
    DOM.statTopTeam = document.getElementById('stat-top-team');
    DOM.statTopScore = document.getElementById('stat-top-score');
    
    // Status Dashboard
    DOM.connectionStatus = document.getElementById('connection-status');
    DOM.changeStatus = document.getElementById('change-status');
    DOM.nextRefresh = document.getElementById('next-refresh');
}

function bindEvents() {
    // Menu Drawer
    DOM.menuToggle.addEventListener('click', () => {
        DOM.sideDrawer.classList.add('open');
    });
    DOM.menuClose.addEventListener('click', () => {
        DOM.sideDrawer.classList.remove('open');
    });

    // Controls
    DOM.toggleAutoRefresh.addEventListener('change', (e) => {
        state.autoRefreshEnabled = e.target.checked;
        if (!state.autoRefreshEnabled) {
            DOM.nextRefresh.textContent = 'Auto-refresh OFF';
        } else {
            resetCountdown();
        }
    });

    DOM.selectInterval.addEventListener('change', (e) => {
        state.intervalSeconds = parseInt(e.target.value, 10);
        if (state.autoRefreshEnabled) {
            resetCountdown();
        }
    });

    DOM.btnManualRefresh.addEventListener('click', () => {
        if (!state.isFetching) {
            resetCountdown();
            fetchData(true);
        }
    });
    
    // Fullscreen
    DOM.btnFullscreen.addEventListener('click', () => {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
    });
    DOM.btnExitFullscreen.addEventListener('click', () => {
        document.exitFullscreen();
    });
    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) {
            document.body.classList.add('fullscreen-active');
            DOM.sideDrawer.classList.remove('open');
            window.scrollTo(0, 0);
        } else {
            document.body.classList.remove('fullscreen-active');
        }
        // Recalculate page size immediately when layout changes
        setTimeout(() => renderLeaderboard(), 100);
    });
    window.addEventListener('resize', () => {
        if (document.fullscreenElement) {
            renderLeaderboard();
        }
    });
}

function applyConfiguration() {
    DOM.eventName.textContent = eventConfig.eventName;
    DOM.clubName.textContent = eventConfig.clubName;
    DOM.eventTagline.textContent = eventConfig.tagline;
}

/**
 * ==================================================
 * TAB LOGIC
 * ==================================================
 */
function renderTabs() {
    DOM.roundTracker.innerHTML = ''; 

    eventConfig.rounds.forEach(round => {
        const isActive = round.id === state.activeTabId;
        const cardClass = isActive ? 'live' : 'completed'; 
        const statusClass = isActive ? 'status-live' : 'status-completed';
        const statusText = isActive ? 'Active' : 'Select';

        const card = document.createElement('div');
        card.className = `round-card ${cardClass}`;
        card.style.cursor = state.isFetching ? 'not-allowed' : 'pointer';
        
        card.innerHTML = `
            <div class="round-name">${round.name}</div>
            <div class="round-title">${round.title}</div>
            <div class="round-status ${statusClass}" style="${!isActive ? 'background-color: var(--card-bg); color: var(--text-muted);' : ''}">${statusText}</div>
        `;

        card.addEventListener('click', () => {
            if (!state.isFetching) switchTab(round.id);
        });

        DOM.roundTracker.appendChild(card);
    });
}

function switchTab(tabId) {
    if (state.activeTabId === tabId && state.currentData.length > 0) return;
    state.activeTabId = tabId;
    state.previousRanks = {}; 
    state.currentData = [];
    state.lastUpdateTimestamp = null;
    paginationState.currentPage = 1;
    DOM.changeStatus.textContent = 'Waiting for data...';
    
    const round = eventConfig.rounds.find(r => r.id === tabId);
    if (round) {
        DOM.fullscreenRoundName.textContent = `${round.name} - ${round.title}`;
    }
    
    renderTabs();
    renderTableHeader();
    resetCountdown();
    fetchData(true); 
}

/**
 * ==================================================
 * PAGINATION LOGIC
 * ==================================================
 */
function startPaginationRotation() {
    if (paginationState.timer) clearInterval(paginationState.timer);
    
    // Rotate pages every 12 seconds
    paginationState.timer = setInterval(() => {
        if (!document.fullscreenElement) return; // Only rotate in fullscreen
        if (state.currentData.length === 0) return;
        
        const totalPages = Math.ceil(state.currentData.length / paginationState.pageSize);
        if (totalPages <= 1) return; // No rotation needed

        paginationState.currentPage++;
        if (paginationState.currentPage > totalPages) {
            paginationState.currentPage = 1;
        }
        
        renderLeaderboard();
    }, 12000);
}

function calculatePageSize() {
    if (!document.fullscreenElement) return state.currentData.length;
    
    const container = document.querySelector('.table-container');
    const thead = document.getElementById('leaderboard-head');
    
    // Available height: Container height minus thead, page indicator, and some padding
    const availableHeight = container.getBoundingClientRect().height - thead.getBoundingClientRect().height - 50; 
    
    // Use the 6vh specified in CSS, or a rough pixel estimate
    const rowHeight = Math.max(window.innerHeight * 0.06, 40); 
    let size = Math.floor(availableHeight / rowHeight);
    
    return Math.max(size, 5); // Ensure at least 5 rows
}


/**
 * ==================================================
 * FETCH DATA & REFRESH LOGIC
 * ==================================================
 */
function startCountdown() {
    if (state.countdownTimer) clearInterval(state.countdownTimer);
    
    state.countdownTimer = setInterval(() => {
        if (state.lastUpdateTimestamp) {
            const secondsAgo = Math.floor((Date.now() - state.lastUpdateTimestamp) / 1000);
            DOM.changeStatus.textContent = `Updated ${secondsAgo}s ago`;
        }

        if (!state.autoRefreshEnabled) return;
        if (state.isFetching) return; 
        
        state.countdownSeconds--;
        
        if (state.countdownSeconds > 0) {
            DOM.nextRefresh.textContent = `Next refresh in: ${state.countdownSeconds}s`;
        } else {
            DOM.nextRefresh.textContent = `Next refresh in: 0s`;
            fetchData(false);
        }
    }, 1000);
}

function resetCountdown() {
    state.countdownSeconds = state.intervalSeconds;
    if (state.autoRefreshEnabled) {
        DOM.nextRefresh.textContent = `Next refresh in: ${state.countdownSeconds}s`;
    }
}

async function fetchData(isManual = false) {
    if (state.isFetching) return;
    state.isFetching = true;
    
    const round = eventConfig.rounds.find(r => r.id === state.activeTabId);
    if (!round) return;

    if (isManual || state.currentData.length === 0) {
        DOM.loadingOverlay.classList.add('active');
        DOM.btnManualRefresh.disabled = true;
        renderTabs(); 
    }

    let query = supabaseClient.from(round.tableName).select('*');
    
    if (state.activeTabId === 1 || state.activeTabId === 3) {
        query = query.order('score', { ascending: false });
    } else if (state.activeTabId === 2) {
        query = query.order('time_taken', { ascending: true });
    }

    const startTime = performance.now();
    const { data, error } = await query;
    const fetchDuration = performance.now() - startTime;

    state.isFetching = false;
    DOM.loadingOverlay.classList.remove('active');
    DOM.btnManualRefresh.disabled = false;
    renderTabs(); 

    if (error) {
        console.error('Error fetching data:', error);
        DOM.connectionStatus.innerHTML = '🔴 Offline';
        state.countdownSeconds = 5; 
        DOM.nextRefresh.textContent = 'Retrying in 5s...';
        return;
    }
    
    if (fetchDuration > 1000) {
        DOM.connectionStatus.innerHTML = '🟡 Slow';
    } else {
        DOM.connectionStatus.innerHTML = '🟢 Live';
    }
    
    processData(data);
    resetCountdown();
}

function processData(newData) {
    if (!newData) newData = [];
    
    let rankedData = newData.map((team, index) => ({
        ...team,
        rank: index + 1
    }));

    let dataChanged = false;
    let newPreviousRanks = {};

    rankedData.forEach(team => {
        const teamId = team.id;
        const prev = state.previousRanks[teamId];
        
        team.isUpdated = false;

        if (!prev) {
            team.isUpdated = true;
            dataChanged = true;
        } else {
            if (team.score !== prev.score || team.time_taken !== prev.time_taken || team.life !== prev.life || team.rank !== prev.rank) {
                team.isUpdated = true;
                dataChanged = true;
            }
        }
        
        newPreviousRanks[teamId] = { 
            rank: team.rank, 
            score: team.score, 
            time_taken: team.time_taken,
            life: team.life
        };
    });

    if (Object.keys(state.previousRanks).length !== rankedData.length && rankedData.length > 0) {
        dataChanged = true;
    }

    // Always update currentData internally so pagination works on the latest set
    state.currentData = rankedData;
    state.previousRanks = newPreviousRanks;

    if (dataChanged || state.currentData.length === 0) {
        state.lastUpdateTimestamp = Date.now();
        DOM.changeStatus.textContent = 'Updated just now';
        
        renderTableHeader();
        renderLeaderboard();
        updateStatisticsPanel();
    }
}

/**
 * ==================================================
 * RENDERING
 * ==================================================
 */
function formatTime(seconds) {
    if (seconds === null || seconds === undefined) return '00:00';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function renderTableHeader() {
    let headersHTML = `<tr>
        <th class="col-rank" style="width: 15%">Rank</th>
        <th class="col-team">Team Name</th>`;

    if (state.activeTabId === 1) {
        headersHTML += `<th class="col-total">Score</th>`;
    } else if (state.activeTabId === 2) {
        headersHTML += `<th class="col-total">Time Taken</th>`;
    } else if (state.activeTabId === 3) {
        headersHTML += `
            <th class="col-total">Score</th>
            <th class="col-score">Life</th>`;
    }
    
    headersHTML += `</tr>`;
    DOM.leaderboardHead.innerHTML = headersHTML;
}

function renderLeaderboard() {
    if (state.currentData.length === 0) {
        const colCount = state.activeTabId === 3 ? 4 : 3;
        DOM.leaderboardBody.innerHTML = `<tr><td colspan="${colCount}" style="text-align: center;">No data available</td></tr>`;
        DOM.pageIndicator.style.display = 'none';
        return;
    }

    if (DOM.leaderboardBody.querySelector('td[colspan]')) {
        DOM.leaderboardBody.innerHTML = '';
    }

    // Handle Pagination
    paginationState.pageSize = calculatePageSize();
    const totalPages = Math.ceil(state.currentData.length / paginationState.pageSize);
    
    if (paginationState.currentPage > totalPages) {
        paginationState.currentPage = 1;
    }

    let pageData = state.currentData;
    if (totalPages > 1 && document.fullscreenElement) {
        const startIdx = (paginationState.currentPage - 1) * paginationState.pageSize;
        const endIdx = startIdx + paginationState.pageSize;
        pageData = state.currentData.slice(startIdx, endIdx);
        
        DOM.pageIndicator.textContent = `Showing Teams ${startIdx + 1}–${Math.min(endIdx, state.currentData.length)} of ${state.currentData.length} | Page ${paginationState.currentPage}/${totalPages}`;
        DOM.pageIndicator.style.display = 'block';
    } else {
        DOM.pageIndicator.style.display = 'none';
    }

    // Smart DOM updating to prevent flicker
    const existingRows = Array.from(DOM.leaderboardBody.children);
    const existingRowsMap = {};
    existingRows.forEach(row => {
        if (row.id) existingRowsMap[row.id] = row;
    });

    pageData.forEach((team) => {
        const rowId = `team-row-${team.id}`;
        let tr = existingRowsMap[rowId];
        let isNewRow = false;
        
        if (!tr) {
            tr = document.createElement('tr');
            tr.id = rowId;
            isNewRow = true;
        }

        if (isNewRow || team.isUpdated) {
            let rowHTML = `
                <td class="col-rank">${team.rank}</td>
                <td class="col-team">${team.team_name || team.name || 'Unknown'}</td>`;

            if (state.activeTabId === 1) {
                rowHTML += `<td class="col-total">${team.score !== null ? team.score : 0}</td>`;
            } else if (state.activeTabId === 2) {
                rowHTML += `<td class="col-total">${formatTime(team.time_taken)}</td>`;
            } else if (state.activeTabId === 3) {
                rowHTML += `
                    <td class="col-total">${team.score !== null ? team.score : 0}</td>
                    <td class="col-score">${team.life !== null ? team.life : '-'}</td>`;
            }

            tr.innerHTML = rowHTML;
        }

        tr.className = tr.className.replace(/rank-[123]/g, '').trim();
        if (team.rank === 1) tr.classList.add('rank-1');
        else if (team.rank === 2) tr.classList.add('rank-2');
        else if (team.rank === 3) tr.classList.add('rank-3');

        DOM.leaderboardBody.appendChild(tr);
        delete existingRowsMap[rowId];
    });

    Object.values(existingRowsMap).forEach(row => row.remove());
}

function updateStatisticsPanel() {
    const round = eventConfig.rounds.find(r => r.id === state.activeTabId);
    DOM.statRound.textContent = round ? round.title : '-';
    
    DOM.statTeams.textContent = state.currentData.length;

    if (state.currentData.length > 0) {
        const topTeam = state.currentData[0];
        DOM.statTopTeam.textContent = topTeam.team_name || 'Unknown';
        
        if (state.activeTabId === 1 || state.activeTabId === 3) {
            DOM.statTopScore.textContent = topTeam.score !== null ? topTeam.score : 0;
        } else if (state.activeTabId === 2) {
            DOM.statTopScore.textContent = formatTime(topTeam.time_taken);
        }
    } else {
        DOM.statTopTeam.textContent = '-';
        DOM.statTopScore.textContent = '-';
    }
}
