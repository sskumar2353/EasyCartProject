document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");

    if (loginForm) {
        loginForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value.trim();
            const errorMsg = document.getElementById("error-msg");

            // Basic validation
            if (!email || !password) {
                errorMsg.textContent = "Please enter both email and password.";
                return;
            }

            try {
                console.log("Attempting login...");  // Debugging Log
                const response = await fetch("https://ec-backend-0lvq.onrender.com/api/login", {
                    method: "POST", // Ensure this is POST, not GET
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ email, password }),
                });
                console.log("Response received:", response);
            
                const data = await response.json(); // Ensure JSON response
                console.log("Parsed JSON response:", data);
            
                if (response.ok) {
                    localStorage.setItem("user", JSON.stringify(data.user));
                    window.location.href = "afterlogin.html";
                }else {
                    alert(data.message || "Invalid credentials. Try again."); // Show pop-up
                }
                } catch (error) {
                    console.error("Login error:", error);
                    alert("Something went wrong. Please try again."); // Show pop-up
                }                            
        });
    }
});
