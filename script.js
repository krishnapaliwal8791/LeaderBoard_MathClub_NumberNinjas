/**
 * ==================================================
 * CONFIGURATION
 * ==================================================
 * Update these values to customize the event details.
 */
const eventConfig = {
    eventName: "NUMBER NINJAS",
    clubName: "MITS Mathematics Club",
    tagline: "Think • Solve • Innovate",
    currentRound: 3, // 1, 2, or 3
    rounds: [
        { id: 1, name: "Round 1", title: "Rapid Reckoning" },
        { id: 2, name: "Round 2", title: "Logic Labyrinth" },
        { id: 3, name: "Round 3", title: "Infinity Showdown" }
    ]
};

/**
 * ==================================================
 * TEAM DATA
 * ==================================================
 * Edit this array to update scores.
 * The system automatically calculates totals and ranks.
 */
const teams = [
    { name: "Euler Warriors", r1: 92, r2: 96, r3: 97 },
    { name: "Gauss Phantoms", r1: 88, r2: 90, r3: 82 },
    { name: "Ramanujan Geniuses", r1: 95, r2: 94, r3: 98 },
    { name: "Pythagoras Primes", r1: 85, r2: 89, r3: 75 },
    { name: "Fibonacci Sequence", r1: 91, r2: 93, r3: 88 },
    { name: "Newton Apples", r1: 78, r2: 85, r3: 80 },
    { name: "Turing Machines", r1: 89, r2: 92, r3: 91 },
    { name: "Cantor Infinities", r1: 75, r2: 70, r3: 65 },
    { name: "Newton Apples", r1: 78, r2: 85, r3: 80 },
    { name: "Turing Machines", r1: 89, r2: 92, r3: 91 },
    { name: "Cantor Infinities", r1: 75, r2: 70, r3: 65 }
];

/**
 * ==================================================
 * INITIALIZATION & LOGIC
 * ==================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    applyConfiguration();
    renderRoundTracker();
    renderLeaderboard();
});

function applyConfiguration() {
    document.getElementById('event-name').textContent = eventConfig.eventName;
    document.getElementById('club-name').textContent = eventConfig.clubName;
    document.getElementById('event-tagline').textContent = eventConfig.tagline;
}

function renderRoundTracker() {
    const trackerContainer = document.getElementById('round-tracker');
    trackerContainer.innerHTML = ''; // Clear existing

    eventConfig.rounds.forEach(round => {
        let status = 'Upcoming';
        let statusClass = 'status-upcoming';
        let cardClass = 'upcoming';

        if (round.id < eventConfig.currentRound) {
            status = 'Completed';
            statusClass = 'status-completed';
            cardClass = 'completed';
        } else if (round.id === eventConfig.currentRound) {
            status = 'Live';
            statusClass = 'status-live';
            cardClass = 'live';
        }

        const cardHTML = `
            <div class="round-card ${cardClass}">
                <div class="round-name">${round.name}</div>
                <div class="round-title">${round.title}</div>
                <div class="round-status ${statusClass}">${status}</div>
            </div>
        `;
        trackerContainer.innerHTML += cardHTML;
    });
}

function renderLeaderboard() {
    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = '';

    // Calculate totals
    const processedTeams = teams.map(team => {
        const total = (team.r1 || 0) + (team.r2 || 0) + (team.r3 || 0);
        return { ...team, total };
    });

    // Sort descending by total score
    processedTeams.sort((a, b) => b.total - a.total);

    // Render rows
    processedTeams.forEach((team, index) => {
        const rank = index + 1;
        const tr = document.createElement('tr');
        
        // Add special classes for top 3
        if (rank === 1) tr.classList.add('rank-1');
        else if (rank === 2) tr.classList.add('rank-2');
        else if (rank === 3) tr.classList.add('rank-3');

        // Create cells
        tr.innerHTML = `
            <td class="col-rank">${rank}</td>
            <td class="col-team">${team.name}</td>
            <td class="col-score">${team.r1}</td>
            <td class="col-score">${team.r2}</td>
            <td class="col-score">${team.r3}</td>
            <td class="col-total">${team.total}</td>
        `;

        tbody.appendChild(tr);
    });
}
