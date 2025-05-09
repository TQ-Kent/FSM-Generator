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
  let errorQueue = [];

  // --- Event Listeners ---
  statesInput.addEventListener("input", updateStateOptions);
  alphabetInput.addEventListener("input", updateAlphabetOptions);
  addRowBtn.addEventListener("click", addTransitionRow);
  generateBtn.addEventListener("click", generateFSM);
  loadExampleBtn.addEventListener("click", loadExample);
  transitionTableBody.addEventListener("click", handleDeleteRow);
  document
    .getElementById("startStateCheckboxes")
    .addEventListener("change", () => {
      const selectedStartState = document.querySelector(
        'input[name="startState"]:checked'
      )?.value;

      if (!selectedStartState) {
        displayError("Error: Start state not selected.");
      }
    });

  // --- Utility Functions ---
  function clearErrors() {
    errorMessagesDiv.textContent = "";
  }

  function displayError(message) {
    errorQueue.push(message);
    if (errorQueue.length === 1) {
      showNextError();
    }
  }

  function showNextError() {
    if (errorQueue.length === 0) return;

    const message = errorQueue[0];
    errorMessagesDiv.textContent = message;
    errorMessagesDiv.style.display = "flex";

    // Automatically hide the error bar after 3 seconds
    setTimeout(() => {
      errorQueue.shift();
      errorMessagesDiv.style.display = "none";
      showNextError();
    }, 3000);
  }

  // --- State and Alphabet Updates ---
  function updateStateOptions() {
    currentStates = statesInput.value
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s);
    currentStates = [...new Set(currentStates)];

    populateCheckboxes("startStateCheckboxes", currentStates, true);
    populateCheckboxes("finalStateCheckboxes", currentStates);

    // Ensure the default start state is selected if it exists
    const startStateCheckbox = document.querySelector(
      'input[name="startState"]:checked'
    );
    if (!startStateCheckbox && currentStates.length > 0) {
      const firstStateCheckbox = document.querySelector(
        `input[name="startState"][value="${currentStates[0]}"]`
      );
      if (firstStateCheckbox) firstStateCheckbox.checked = true;
    }
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

  function populateCheckboxes(containerId, optionsArray, singleSelect = false) {
    const container = document.getElementById(containerId);
    container.innerHTML = ""; // Clear existing checkboxes

    optionsArray.forEach((optionText) => {
      const checkbox = document.createElement("input");
      checkbox.type = singleSelect ? "radio" : "checkbox"; // Use radio for single select (start state)
      checkbox.name = singleSelect ? "startState" : "finalStates";
      checkbox.value = optionText;

      const label = document.createElement("label");
      label.textContent = optionText;
      label.style.marginRight = "10px";

      container.appendChild(checkbox);
      container.appendChild(label);
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
    const startState = document.querySelector(
      'input[name="startState"]:checked'
    )?.value;

    if (!startState) {
      displayError("Error: Start state not selected.");
      return; // Stop execution if no start state is selected
    }

    const finalStates = Array.from(
      document.querySelectorAll('input[name="finalStates"]:checked')
    ).map((checkbox) => checkbox.value);

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
          isStartState: state === startState, // Mark the start state
        },
        position: state === startState ? { x: -150, y: 0 } : undefined, // Position the start node on the left
        ...(state === startState && {
          position: { x: 100, y: 300 },
          locked: false,
        }),
      });
    });

    function calculateEdgeControlPoints(from, to, states) {
      const fromIndex = states.indexOf(from);
      const toIndex = states.indexOf(to);
      const horizontalDiff = toIndex - fromIndex;

      if (horizontalDiff === 0) {
        // Self-loop
        return {
          weights: [0.5, 0.5],
          distances: [50, -50],
        };
      } else if (horizontalDiff > 0) {
        // Forward edge
        return {
          weights: [0.25, 0.75],
          distances: [50 * horizontalDiff, 50 * horizontalDiff],
        };
      } else {
        // Backward edge
        return {
          weights: [0.75, 0.25],
          distances: [
            -50 * Math.abs(horizontalDiff),
            -50 * Math.abs(horizontalDiff),
          ],
        };
      }
    }

    transitions.forEach((t) => {
      const control = calculateEdgeControlPoints(t.from, t.to, currentStates);

      elements.push({
        data: {
          id: `${t.from}-${t.input}-${t.to}`,
          source: t.from,
          target: t.to,
          label: t.input,
        },
        style: {
          "control-point-weights": control.weights,
          "control-point-distances": control.distances,
        },
      });
    });

    // Add a dummy edge pointing to the start node
    if (startState) {
      elements.push({
        data: {
          id: `start-arrow-${startState}`,
          source: "invisible-start",
          target: startState,
        },
        classes: "start-arrow", // Add a class for styling the arrow
      });

      // Add an invisible node for the arrow's source
      elements.push({
        data: {
          id: "invisible-start",
        },
        position: { x: -200, y: 0 }, // Position the invisible node to the left
        classes: "invisible-node", // Add a class for styling the invisible node
      });
    }

    renderCytoscapeFSM(elements, startState);
  }

  // --- FSM Rendering ---
  function renderCytoscapeFSM(elements, startState) {
    try {
      if (cy) cy.destroy(); // Clean up any previous graph

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
            selector: 'node[isStartState = "true"]',
            style: {
              "border-width": 3,
              "border-color": "#FFD700", // Gold border for start state
              "background-color": "#0078D4",
              shape: "polygon", // Add a pointer-like shape
              "shape-polygon-points": "-0.5, -1, 0.5, -1, 0, 1", // Triangle pointer
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
              "text-margin-y": -10,
              "text-margin-x": -10,
              color: "#ffffff",
              "curve-style": "bezier", // Allow curved edges for better readability
            },
          },
          {
            selector: ".start-arrow",
            style: {
              "line-color": "#FFD700", // Gold color for the arrow
              "target-arrow-color": "#FFD700",
              "target-arrow-shape": "triangle",
              "curve-style": "straight", // Make the arrow straight
              width: 2,
            },
          },
          {
            selector: ".invisible-node",
            style: {
              "background-color": "#00FF00", // Green color for the node
              "border-width": 0, // No border
              width: 25, // Half the size of a normal node
              height: 25, // Half the size of a normal node
            },
          },
        ],
        layout: {
          name: "breadthfirst", // Use the breadthfirst layout
          fit: true, // Fit the graph to the container
          directed: true, // Treat the graph as directed
          padding: 50, // Add padding around the graph
          spacingFactor: 1, // Adjust spacing between nodes
          avoidOverlap: true, // Avoid overlapping nodes
          roots: startState ? `#${startState}` : undefined, // Use startState only if defined
          horizontal: true, // Arrange nodes from left to right
        },
        wheelSensitivity: 0.2,
        userZoomingEnabled: true,
        userPanningEnabled: true,
        minZoom: 0.5, // Allow zooming out further
        maxZoom: 5, // Allow zooming in further
      });

      // Adjust zoom and center the graph
      setTimeout(() => {
        cy.fit(); // Fit the graph to the container
        cy.center(); // Center the graph
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

    // Set default start state
    const startStateCheckbox = document.querySelector(
      'input[name="startState"][value="q0"]'
    );
    if (startStateCheckbox) startStateCheckbox.checked = true;

    const finalStateCheckbox = document.querySelector(
      'input[name="finalStates"][value="q2"]'
    );
    if (finalStateCheckbox) finalStateCheckbox.checked = true;

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

  // Add an event listener for the "Fit" button
  document.getElementById("fitBtn").addEventListener("click", () => {
    if (cy) {
      cy.fit(); // Adjust the zoom level to fit the FSM
      cy.zoom({
        level: cy.zoom() * 0.9,
      });
      cy.center(); // Center the graph
    }
  });

  // Add an event listener for the "Rearrange" button
  document.getElementById("rearrangeBtn").addEventListener("click", () => {
    if (cy) {
      cy.layout({
        zoom: cy.zoom() * 0.9,
        name: "breadthfirst",
        fit: true,
        directed: true,
        padding: 50,
        spacingFactor: 1,
        avoidOverlap: true,
        roots: "#invisible-start",
        horizontal: true, // Correct option for left-to-right arrangement
      }).run();
    }
  });
});
