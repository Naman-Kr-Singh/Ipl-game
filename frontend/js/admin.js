function addMatch() {
  let team1 = document.getElementById("team1").value;
  let team2 = document.getElementById("team2").value;

  let matches = JSON.parse(localStorage.getItem("matches")) || [];

  matches.push({ team1, team2 });

  localStorage.setItem("matches", JSON.stringify(matches));

  alert("Match Added!");
}