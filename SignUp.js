document.addEventListener("DOMContentLoaded", function () {
    const signUpForm = document.getElementById("SignUpForm");

    signUpForm.addEventListener("submit", async function (event) {
        event.preventDefault(); // Prevent default form submission

        // Get form values
        const fullName = document.getElementById("FullName").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("ConfirmPassword").value;

        // Validate password and confirm password match
        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        // Send data to server
        try {
            const response = await fetch("http://localhost:5000/api/SignUp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fullName, email, password, profile_image: null, 
                    mobile: null, 
                    dietary_preferences: null }),
            });

            const result = await response.json();
            if (response.ok) {
                alert("Signup successful! Redirecting to login...");
                window.location.href = "Afterlogin.html"; // Redirect to Landing page
            } else {
                alert("Error: " + result.error);
            }
        } catch (error) {
            console.error("Error:", error);
            alert("An error occurred while signing up.");
        }
    });
});
