let matches = JSON.parse(localStorage.getItem("matches")) || [];

let container = document.getElementById("matches");

matches.forEach(match => {
  let div = document.createElement("div");
  div.className = "card";

  div.innerHTML = `
    <h3>${match.team1} vs ${match.team2}</h3>
    <button onclick="bet()">Bet</button>
  `;

  container.appendChild(div);
});

function bet() {
  alert("Bet feature coming soon");
}

function vote() {
  alert("Voting feature coming soon");
}

function leaderboard() {
  alert("Leaderboard coming soon");
}

function goToAchievements() {
  window.location.href = "achievements.html";
}

function setFavTeam() {
  let team = prompt("Enter your favorite team:");
  if (team) {
    localStorage.setItem("favTeam", team);
    document.getElementById("favTeam").innerText = team;
  }
}

/* LOAD SAVED FAV TEAM */
let savedTeam = localStorage.getItem("favTeam");
if (savedTeam) {
  document.getElementById("favTeam").innerText = savedTeam;
}