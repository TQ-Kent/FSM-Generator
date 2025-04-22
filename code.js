document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const statesInput = document.getElementById("states");
  const alphabetInput = document.getElementById("alphabet");
  const startStateSelect = document.getElementById("startState");
  const finalStatesSelect = document.getElementById("finalStates");
  const transitionTableBody = document.querySelector("#transitionTable tbody");
  const addRowBtn = document.getElementById("addRowBtn");
  const generateBtn = document.getElementById("generateBtn");
  const loadExampleBtn = document.getElementById("loadExampleBtn");
  const fsmDiagramContainer = document.getElementById("fsmDiagram");
  const errorMessagesDiv = document.getElementById("errorMessages");
  const fsmDefinitionOutputDiv = document.getElementById("fsmDefinitionOutput");

  let cy;
  let currentStates = [];
  let currentAlphabet = [];
  const curveStrength = 100; // <--- ADJUST THIS to increase/decrease curvature

  // --- Event Listeners ---
  statesInput.addEventListener("input", updateStateOptions);
  alphabetInput.addEventListener("input", updateAlphabetOptions);
  addRowBtn.addEventListener("click", addTransitionRow);
  generateBtn.addEventListener("click", generateFSM);
  loadExampleBtn.addEventListener("click", loadExample);
  transitionTableBody.addEventListener("click", handleDeleteRow);

  // --- Utility Functions ---
  function clearErrors() {
    errorMessagesDiv.textContent = "";
  }

  function displayError(message) {
    errorMessagesDiv.textContent += message + "\n";
  }

  // --- State and Alphabet Updates ---
  function updateStateOptions() {
    currentStates = statesInput.value
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s);
    currentStates = [...new Set(currentStates)];

    populateSelect(startStateSelect, currentStates, true);
    populateSelect(finalStatesSelect, currentStates);

    document.querySelectorAll(".fromState, .toState").forEach((select) => {
      const currentValue = select.value;
      populateSelect(select, currentStates);
      if (currentStates.includes(currentValue)) {
        select.value = currentValue;
      }
    });
  }

  function updateAlphabetOptions() {
    currentAlphabet = alphabetInput.value
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s);
    currentAlphabet = [...new Set(currentAlphabet)];

    document.querySelectorAll(".inputSymbol").forEach((select) => {
      const currentValue = select.value;
      populateSelect(select, currentAlphabet);
      if (currentAlphabet.includes(currentValue)) {
        select.value = currentValue;
      }
    });
  }

  function populateSelect(selectElement, optionsArray, addPlaceholder = false) {
    selectElement.innerHTML = "";
    if (addPlaceholder) {
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "-- Select --";
      placeholder.disabled = true;
      placeholder.selected = true;
      selectElement.appendChild(placeholder);
    }
    optionsArray.forEach((optionText) => {
      const option = document.createElement("option");
      option.value = optionText;
      option.textContent = optionText;
      selectElement.appendChild(option);
    });
  }

  // --- Transition Table ---
  function addTransitionRow() {
    const row = transitionTableBody.insertRow();
    row.innerHTML = `
        <td><select class="fromState"></select></td>
        <td><select class="inputSymbol"></select></td>
        <td><select class="toState"></select></td>
        <td><button class="deleteRowBtn">Delete</button></td>
      `;
    populateSelect(row.querySelector(".fromState"), currentStates);
    populateSelect(row.querySelector(".inputSymbol"), currentAlphabet);
    populateSelect(row.querySelector(".toState"), currentStates);
  }

  function handleDeleteRow(event) {
    if (event.target.classList.contains("deleteRowBtn")) {
      const row = event.target.closest("tr");
      row.remove();
    }
  }

  // --- FSM Generation ---
  function generateFSM() {
    clearErrors();
    fsmDefinitionOutputDiv.textContent = "";

    const states = currentStates;
    const alphabet = currentAlphabet;
    const startState = startStateSelect.value;
    const finalStates = Array.from(finalStatesSelect.selectedOptions).map(
      (opt) => opt.value
    );
    const transitions = [];

    transitionTableBody.querySelectorAll("tr").forEach((row, index) => {
      const from = row.querySelector(".fromState").value;
      const input = row.querySelector(".inputSymbol").value;
      const to = row.querySelector(".toState").value;
      if (from && input && to) {
        transitions.push({ from, input, to });
      } else if (from || input || to) {
        displayError(
          `Warning: Transition row ${index + 1} is incomplete and was ignored.`
        );
      }
    });

    let isValid = true;
    if (states.length === 0) {
      displayError("Error: No states defined.");
      isValid = false;
    }
    if (!startState) {
      displayError("Error: Start state not selected.");
      isValid = false;
    } else if (!states.includes(startState)) {
      displayError(
        `Error: Start state "${startState}" is not in the states list.`
      );
      isValid = false;
    }
    finalStates.forEach((fs) => {
      if (!states.includes(fs)) {
        displayError(`Error: Final state "${fs}" is not in the states list.`);
        isValid = false;
      }
    });
    transitions.forEach((t, index) => {
      if (!states.includes(t.from) || !states.includes(t.to)) {
        displayError(`Error in transition ${index + 1}: Invalid state.`);
        isValid = false;
      }
      if (!alphabet.includes(t.input)) {
        displayError(`Error in transition ${index + 1}: Invalid input symbol.`);
        isValid = false;
      }
    });

    if (!isValid) {
      fsmDiagramContainer.innerHTML =
        '<p style="color: red; text-align: center; margin-top: 20px;">Cannot generate FSM due to errors.</p>';
      return;
    }

    clearErrors();

    const elements = [];
    states.forEach((state) => {
      elements.push({
        data: {
          id: state,
          label: state,
        },
      });
    });

    transitions.forEach((t, i) => {
      elements.push({
        data: {
          id: `${t.from}-${t.input}-${t.to}`,
          source: t.from,
          target: t.to,
          label: t.input,
          controlPointStepSize: i === 0 ? curveStrength : 0, // Only curve first edge
        },
      });
    });

    renderCytoscapeFSM(elements);
  }

  // --- FSM Rendering ---
  function renderCytoscapeFSM(elements) {
    try {
      if (cy) cy.destroy();

      cy = cytoscape({
        container: fsmDiagramContainer,
        elements: elements,
        style: [
          {
            selector: "node",
            style: {
              "background-color": "#0078D4",
              label: "data(label)",
              width: 50,
              height: 50,
              "font-size": "12px",
              "text-valign": "center",
              "text-halign": "center",
              color: "#ffffff",
            },
          },
          {
            selector: "edge",
            style: {
              width: 2,
              "line-color": "#ccc",
              "target-arrow-color": "#ccc",
              "target-arrow-shape": "triangle",
              label: "data(label)",
              "text-rotation": "autorotate",
              "font-size": "10px",
              "text-margin-y": -3,
              color: "#ffffff",
              "curve-style": "bezier",
              "control-point-step-size": "data(controlPointStepSize)",
            },
          },
        ],
        layout: {
          name: "circle",
          padding: 10,
        },
        userZoomingEnabled: true,
        userPanningEnabled: true,
        minZoom: 0.5,
        maxZoom: 2,
      });

      // Fix canvas sizing after rendering
      setTimeout(() => {
        cy.resize();
        cy.fit();
      }, 50);
    } catch (error) {
      displayError("Error rendering FSM: " + error.message);
    }
  }

  // --- Example Loading ---
  function loadExample() {
    statesInput.value = "q0, q1, q2";
    alphabetInput.value = "a, b";
    updateStateOptions();
    updateAlphabetOptions();

    transitionTableBody.innerHTML = "";
    addTransitionRow();
    const firstRow = transitionTableBody.querySelector("tr");
    firstRow.querySelector(".fromState").value = "q0";
    firstRow.querySelector(".inputSymbol").value = "a";
    firstRow.querySelector(".toState").value = "q1";

    addTransitionRow();
    const secondRow = transitionTableBody.querySelector("tr:last-child");
    secondRow.querySelector(".fromState").value = "q1";
    secondRow.querySelector(".inputSymbol").value = "b";
    secondRow.querySelector(".toState").value = "q2";
  }

  loadExample();
});
