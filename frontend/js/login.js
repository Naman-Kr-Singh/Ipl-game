function login() {
  let user = document.getElementById("username").value;
  let pass = document.getElementById("password").value;

  if (user === "admin" && pass === "admin") {
    localStorage.setItem("role", "admin");
    window.location.href = "admin.html";
  } else {
    localStorage.setItem("role", "user");
    window.location.href = "home.html";
  }
}