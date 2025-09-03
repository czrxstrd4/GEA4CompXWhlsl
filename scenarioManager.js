import { state, setCurrentScenarioName } from './state.js';

function getScenarios() {
    return JSON.parse(localStorage.getItem('dashboardScenarios') || '{}');
}

function writeScenarios(scenarios) {
    localStorage.setItem('dashboardScenarios', JSON.stringify(scenarios));
}

export function populateScenarioList() {
    const scenarios = getScenarios();
    const scenarioListDropdown = document.getElementById('scenarioListDropdown');
    const loadScenarioDropdownBtn = document.getElementById('loadScenarioDropdownBtn');
    scenarioListDropdown.innerHTML = '';

    if (state.currentScenarioName && !scenarios[state.currentScenarioName]) {
        setCurrentScenarioName(null);
        loadScenarioDropdownBtn.textContent = 'Load';
    }

    if (Object.keys(scenarios).length === 0) {
        scenarioListDropdown.innerHTML = '<li><a class="dropdown-item disabled" href="#">No scenarios saved</a></li>';
        if (!state.currentScenarioName) {
            loadScenarioDropdownBtn.textContent = 'Load';
        }
        return;
    }

    for (const name in scenarios) {
        const li = document.createElement('li');
        li.innerHTML = `
            <li>
                <a class="dropdown-item d-flex justify-content-between align-items-center" href="#" data-scenario-name="${name}">
                    ${name}
                    <i class="bi bi-trash-fill text-danger scenario-delete-btn" title="Delete scenario"></i>
                </a>
            </li>`;
        scenarioListDropdown.appendChild(li);
    }
}

export function loadScenario(name) {
    const scenarios = getScenarios();
    const scenarioState = scenarios[name];
    if (!scenarioState) {
        alert(`Error: Scenario "${name}" not found.`);
        return;
    }

    scenarioState.forEach(savedProject => {
        const projectToUpdate = state.projects.find(p => p.id === savedProject.id);
        if (projectToUpdate) {
            projectToUpdate.likelihood = savedProject.likelihood;
            projectToUpdate.targetYear = savedProject.targetYear;
            projectToUpdate.order = savedProject.order;
            projectToUpdate.isMoved = savedProject.isMoved;
            if (savedProject.capacity !== undefined) {
                projectToUpdate.capacity = savedProject.capacity;
            }
        }
    });

    setCurrentScenarioName(name);
    document.getElementById('loadScenarioDropdownBtn').textContent = name;
}

export function saveScenario(name, overwrite = false) {
    if (!name || name.trim() === '') {
        alert('Please enter a valid scenario name.');
        return false;
    }

    const scenarios = getScenarios();
    if (scenarios[name] && !overwrite) {
        alert(`A scenario named "${name}" already exists. Please choose a different name or overwrite the existing one.`);
        return false;
    }

    const currentState = state.projects.map(p => ({
        id: p.id,
        likelihood: p.likelihood,
        targetYear: p.targetYear,
        order: p.order,
        isMoved: p.isMoved,
        capacity: p.capacity
    }));

    scenarios[name] = currentState;
    writeScenarios(scenarios);
    populateScenarioList();
    setCurrentScenarioName(name);
    document.getElementById('loadScenarioDropdownBtn').textContent = name;
    return true;
}

export function deleteScenario(name) {
    let scenarios = getScenarios();
    delete scenarios[name];
    writeScenarios(scenarios);
    populateScenarioList();
}