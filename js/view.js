      const API_URL = "/api/gdp";
      const tableBody = document.getElementById("gdp-table-body");
      const messageBox = document.getElementById("message-box");
      const messageText = document.getElementById("message-text");
      const modal = document.getElementById('edit-modal');
      const modalClose = document.getElementById('modal-close');
      const modalCancel = document.getElementById('modal-cancel');
      const editForm = document.getElementById('edit-form');

      //function to show notifications
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

      // Fetch and display records
      async function fetchRecords() {
        try {
          const response = await fetch(API_URL);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const records = await response.json();
          renderRecords(records);
        } catch (error) {
          console.error("Error fetching records:", error);
          renderRecords([]);
          showMessage("Could not connect to the server or database.", "error");
        }
      }

      function formatGdpValue(value) {
        return value.toLocaleString("en-US");
      }

      function formatPopulation(value) {
        return value.toLocaleString("en-US");
      }

      function formatGdpPerCapita(value) {
        return value.toFixed(2);
      }

      function renderRecords(records) {
        tableBody.innerHTML = "";
        if (records.length === 0) {
          tableBody.innerHTML =
            '<tr><td colspan="7" class="text-center" style="padding: 30px; color: #666;">No GDP records found. <a href="index.html" style="color: var(--color-primary);">Add one now</a></td></tr>';
          return;
        }
        records.forEach((record) => {
          const row = document.createElement("tr");

          // Create cells
          const countryCell = document.createElement("td");
          countryCell.textContent = record.country;

          const yearCell = document.createElement("td");
          yearCell.textContent = record.year;

          const gdpValueCell = document.createElement("td");
          gdpValueCell.textContent = formatGdpValue(record.gdp_value);
          gdpValueCell.classList.add("text-right");

          const populationCell = document.createElement("td");
          populationCell.textContent = formatPopulation(record.population);
          populationCell.classList.add("text-right");

          const gdpPerCapitaCell = document.createElement("td");
          gdpPerCapitaCell.textContent = formatGdpPerCapita(record.gdp_per_capita);
          gdpPerCapitaCell.classList.add("text-right");

          const unitCell = document.createElement("td");
          unitCell.textContent = record.unit;

          const actionsCell = document.createElement("td");
          actionsCell.classList.add("text-center");

          //Edit button
          const editButton = document.createElement("button");
          editButton.textContent = "Edit";
          editButton.classList.add("action-btn", "action-edit");
          editButton.addEventListener("click", () => {
            editRecord(
              record.id,
              record.country,
              record.year,
              record.gdp_value,
              record.population,
              record.unit
            );
          });

          //Delete button
          const deleteButton = document.createElement("button");
          deleteButton.textContent = "Delete";
          deleteButton.classList.add("action-btn", "action-delete");
          deleteButton.addEventListener("click", () => {
            deleteRecord(record.id);
          });

          actionsCell.appendChild(editButton);
          actionsCell.appendChild(deleteButton);

          // Append all cells to the row
          row.appendChild(countryCell);
          row.appendChild(yearCell);
          row.appendChild(gdpValueCell);
          row.appendChild(populationCell);
          row.appendChild(gdpPerCapitaCell);
          row.appendChild(unitCell);
          row.appendChild(actionsCell);

          tableBody.appendChild(row);
        });
      }

      // Open  edit modal with prefilled data
      function editRecord(id, country, year, gdp_value, population, unit) {
        document.getElementById('edit-record-id').value = id;
        document.getElementById('edit-country').value = country;
        document.getElementById('edit-year').value = year;
        document.getElementById('edit-gdp-value').value = gdp_value;
        document.getElementById('edit-population').value = population;
        document.getElementById('edit-unit').value = unit;
        modal.classList.remove('hidden');
      }

      // Close modal function
      function closeModal() {
        modal.classList.add('hidden');
        editForm.reset();
      }

      modalClose.addEventListener('click', closeModal);
      modalCancel.addEventListener('click', closeModal);

      // Close modal when clicking outside
      window.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal();
        }
      });

      // Handle form submission for update
      editForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('edit-record-id').value;
        const country = document.getElementById('edit-country').value.trim();
        const year = parseInt(document.getElementById('edit-year').value, 10);
        const gdp_value = parseFloat(document.getElementById('edit-gdp-value').value);
        const population = parseInt(document.getElementById('edit-population').value, 10);
        const unit = document.getElementById('edit-unit').value;

        try {
          const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ country, year, gdp_value, population, unit }),
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Failed to update record.');
          }

          showMessage('Record updated successfully!', 'success');
          closeModal();
          fetchRecords();
        } catch (error) {
          console.error('Error:', error);
          showMessage(error.message, 'error');
        }
      });

      // delete confirmation
      function deleteRecord(id) {
        if (confirm('Are you sure you want to delete this record? This action cannot be undone.')) {
          fetch(`${API_URL}/${id}`, { method: 'DELETE' })
            .then(response => {
              if (!response.ok) {
                throw new Error('Failed to delete record.');
              }
              showMessage('Record deleted successfully!', 'success');
              fetchRecords();
            })
            .catch(error => {
              console.error('Error:', error);
              showMessage(error.message, 'error');
            });
        }
      }

      // Load records on page load
      document.addEventListener("DOMContentLoaded", fetchRecords);