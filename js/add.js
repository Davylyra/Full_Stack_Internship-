      const API_URL = "/api/gdp";
      const gdpForm = document.getElementById("gdp-form");
      const messageBox = document.getElementById("message-box");
      const messageText = document.getElementById("message-text");
      const populationInput = document.getElementById("population");
      const gdpValueInput = document.getElementById("gdp-value");
      const gdpPerCapitaInput = document.getElementById("gdp-per-capita");

      // function to show notifications
      function showMessage(message, type = "success") {
        messageText.textContent = message;
        messageBox.classList.remove(
          "message-success",
          "message-error",
          "hidden",
          "show"
        );
        if (type === "success") {
          messageBox.classList.add("message-success");
        } else if (type === "error") {
          messageBox.classList.add("message-error");
        }
        messageBox.classList.add("show");
        setTimeout(() => {
          messageBox.classList.remove("show");
        }, 4000);
      }

      // Auto-calculate GDP per capita
      function calculateGdpPerCapita() {
        const population = parseFloat(populationInput.value);
        const gdpValue = parseFloat(gdpValueInput.value);

        if (population > 0 && gdpValue > 0) {
          const perCapita = (gdpValue * 1_000_000_000) / population;
          gdpPerCapitaInput.value = perCapita.toFixed(2);
        } else {
          gdpPerCapitaInput.value = "";
        }
      }

      populationInput.addEventListener("input", calculateGdpPerCapita);
      gdpValueInput.addEventListener("input", calculateGdpPerCapita);

      // Handle form submission
      gdpForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const country = document.getElementById("country").value.trim();
        const year = parseInt(document.getElementById("year").value, 10);
        const gdp_value = parseFloat(document.getElementById("gdp-value").value);
        const population = parseInt(document.getElementById("population").value, 10);
        const unit = document.getElementById("unit").value;

        if (!country || !year || !gdp_value || !population || !unit) {
          showMessage("Please fill in all required fields.", "error");
          return;
        }

        try {
          const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ country, year, gdp_value, population, unit }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || "Failed to create record.");
          }

          showMessage("GDP record added successfully!", "success");
          gdpForm.reset();
          gdpPerCapitaInput.value = "";
        } catch (error) {
          console.error("Error:", error);
          showMessage(error.message, "error");
        }
      });