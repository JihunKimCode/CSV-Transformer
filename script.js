// Scroll to top button
document.getElementById("scrollTop").addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
});

// Scroll to bottom button
document.getElementById("scrollBottom").addEventListener("click", () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
});

const clearButton = document.getElementById("clearButton");
function toggleClearButton() {
    const searchQueryValue = searchBar.value.trim();
    clearButton.style.display = searchQueryValue ? "block" : "none";
}

document.addEventListener("DOMContentLoaded", () => {
    let csvData = [];
    let activeFilters = {};
    let filteredData = [];
    let historyStack = []; // Stack to store history for undo/redo
    let historyIndex = -1; // Pointer to current history state
    const csvInput = document.getElementById("csvInput");
    const table = document.getElementById("csvTable");
    const filtersDiv = document.getElementById("filters");

    // Helper function to check if a row is blank
    function isRowBlank(row) {
        return row.every(cell => cell.trim() === "");
    }

    // Remove blank rows from the data
    function removeBlankRows(data) {
        return data.filter(row => !isRowBlank(row));
    }

    // Parse CSV data into an array of arrays
    function parseCSV(data) {
        const rows = data.split("\n").map(row => row.split(","));
        return rows.map(row => row.map(cell => cell.trim()));
    }

    // Save current state to history
    function saveHistory() {
        historyStack = historyStack.slice(0, historyIndex + 1); // Trim forward history
        historyStack.push(JSON.parse(JSON.stringify(csvData))); // Save current state
        historyIndex++;
    }

    // Undo action
    function undo() {
        if (historyIndex > 0) {
            historyIndex--;
            csvData = JSON.parse(JSON.stringify(historyStack[historyIndex]));
            renderFilters(csvData);
            renderFilteredTable();
        }
    }

    // Redo action
    function redo() {
        if (historyIndex < historyStack.length - 1) {
            historyIndex++;
            csvData = JSON.parse(JSON.stringify(historyStack[historyIndex]));
            renderFilters(csvData);
            renderFilteredTable();
        }
    }

    // Render the table with given data
    function renderTable(data) {
        // Hide or Show buttons
        const uploadBtn = document.querySelectorAll('.uploadCSV');
        uploadBtn.forEach(button => {
            button.style.display = 'none';
        });
        document.getElementById("startEmpty").style.display = 'none';

        const buttons = document.querySelectorAll('.buttons');
        buttons.forEach(button => {
            button.style.display = 'flex';
        });

        const searchContainer = document.querySelectorAll('.search-container');
        searchContainer.forEach(bar => {
            bar.style.display = 'flex';
        });

        filteredData = data;
        table.innerHTML = "";

        // Render the header row
        const headers = csvData[0];
        const headerRow = document.createElement("tr");
        headerRow.classList.add('thead');
        const rowNumberHeader = document.createElement("th");
        rowNumberHeader.innerText = "Row #";
        headerRow.appendChild(rowNumberHeader); // Add row number header
        headers.forEach((header, i) => {
            const th = document.createElement("th");
            th.innerText = header;
            th.addEventListener("click", () => sortColumn(i)); // Enable sorting on click
            headerRow.appendChild(th);
        });

        // Add "Remove" column header
        const actionTh = document.createElement("th");
        actionTh.innerText = "Remove";
        headerRow.appendChild(actionTh);
        table.appendChild(headerRow);

        // Render data rows
        for (let i = 1; i < data.length; i++) {
            const row = document.createElement("tr");
            const rowNumberTd = document.createElement("td");
            rowNumberTd.innerText = i; // Display row number
            row.appendChild(rowNumberTd);

            data[i].forEach((cell, colIndex) => {
                const td = document.createElement("td");
                td.contentEditable = "true";
                td.innerText = cell;

                // Update the cell value in csvData
                td.addEventListener("input", () => {
                    const originalRowIndex = csvData.findIndex(
                        originalRow => originalRow.join(",") === data[i].join(",")
                    );
                    csvData[originalRowIndex][colIndex] = td.innerText.trim();
                    saveHistory(); // Save state after any modification
                });

                row.appendChild(td);
            });

            // Add "Remove Row" button
            const removeTd = document.createElement("td");
            const removeBtn = document.createElement("button");
            removeBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
            removeBtn.classList.add('remove-btn');  // Apply the custom class
            removeBtn.addEventListener("click", () => {
                const originalRowIndex = csvData.findIndex(
                    originalRow => originalRow.join(",") === data[i].join(",")
                );
                csvData.splice(originalRowIndex, 1);
                saveHistory(); // Save state after deletion
                renderFilteredTable();
            });
            removeTd.appendChild(removeBtn);
            row.appendChild(removeTd);
            table.appendChild(row);
        }
    }

    // Event listener for the search bar
    searchBar.addEventListener("input", renderFilteredTable); // Trigger render on search input
    document.getElementById('clearButton').addEventListener("click",clearSearchQuery);
    function clearSearchQuery() {
        searchBar.value = "";
        renderFilteredTable();
        toggleClearButton();
        searchBar.focus();
    };

    // Render the filter dropdowns
    function renderFilters(data) {
        filtersDiv.innerHTML = "";
        activeFilters = {}; // Reset active filters

        const headers = data[0];
        headers.forEach((header, colIndex) => {
            const select = document.createElement("select");
            select.classList.add("headerFilter");
            select.innerHTML = `<option value="">Filter by ${header}</option>`;

            // Get unique and non-empty values for the column
            const uniqueValues = Array.from(new Set(data.slice(1)
                .map(row => row[colIndex])
                .filter(cell => cell)))
                .sort((a, b) => isNaN(a - b) ? a.localeCompare(b) : a - b);
            uniqueValues.forEach(value => {
                const option = document.createElement("option");
                option.value = value;
                option.textContent = value;
                select.appendChild(option);
            });

            // Handle filter changes
            select.addEventListener("change", () => {
                if (select.value) {
                    activeFilters[colIndex] = select.value;
                } else {
                    delete activeFilters[colIndex];
                }
                renderFilteredTable();
            });

            filtersDiv.appendChild(select);
        });
    }

    // Render the filtered table based on active filters
    function renderFilteredTable() {
        const searchTerm = searchBar.value.toLowerCase();
        filteredData = [csvData[0], ...csvData.slice(1).filter(row => {
            const rowMatchesFilter = Object.keys(activeFilters).every(colIndex => row[colIndex] === activeFilters[colIndex]);
            const rowMatchesSearch = row.some(cell => cell.toLowerCase().includes(searchTerm)); // Check search term
            return rowMatchesFilter && rowMatchesSearch;
        })];
        renderTable(filteredData);
    }

    // Sort the table by a column
    function sortColumn(colIndex) {
        const header = csvData[0];
        const sortedData = [header, ...filteredData.slice(1).sort((a, b) => {
            if (!isNaN(a[colIndex] - b[colIndex])) {
                return Number(a[colIndex]) - Number(b[colIndex]);
            }
            return a[colIndex].localeCompare(b[colIndex]);
        })];
        renderTable(sortedData);
    }

    // Event listener for file upload
    csvInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                csvData = parseCSV(reader.result);
                csvData = removeBlankRows(csvData); // Remove blank rows
                renderTable(csvData);
                renderFilters(csvData);
                saveHistory(); // Save the initial state
            };
            reader.readAsText(file);
        }
    });
    
    document.getElementById("startEmpty").addEventListener("click", () => {
        const newColumn = prompt("Enter new column name:");
        if (newColumn === null || newColumn.trim() === "") {
            // If the prompt is canceled or left empty, do nothing
            alert("Please reconsider column name.");
            return;
        }
        document.getElementById("startEmpty").style.display = 'none';
        const headers = [`${newColumn}`];   // Add default headers
        csvData = [headers];                // Initialize with headers
        saveHistory();                      // Save initial empty state
        renderFilteredTable();              // Render table with empty structure
        renderFilters(csvData);             // Render filters for the empty structure
    });    

    // Add Undo/Redo functionality
    document.getElementById("undoBtn").addEventListener("click", undo);
    document.getElementById("redoBtn").addEventListener("click", redo);

    // Add Add Column functionality
    document.getElementById("addColumn").addEventListener("click", () => {
        const newColumn = prompt("Enter new column name:");
        if (newColumn === null || newColumn.trim() === "") {
            // If the prompt is canceled or left empty, do nothing
            return;
        }
        csvData.forEach(row => row.push(newColumn));
        saveHistory(); // Save state after adding a column
        renderFilters(csvData);
        renderFilteredTable();
    });

    // Event listener for adding a new row
    document.getElementById("addRow").addEventListener("click", () => {
        const newRow = Array(csvData[0].length).fill("");
        csvData.push(newRow);
        saveHistory(); // Save state after adding a row
        renderFilteredTable();
    });

    // Event listener for downloading the CSV
    document.getElementById("downloadCSV").addEventListener("click", () => {
        csvData = removeBlankRows(csvData); // Remove blank rows before download
        const csvContent = csvData.map(row => row.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${makeTimestamp()}.csv`;
        a.click();
    });

    function makeTimestamp(){
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');       
        const hours = String(now.getHours()).padStart(2, '0');    
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        const timestamp = `${year}${month}${day}_${hours}${minutes}${seconds}`;
        return timestamp;
    }
});
