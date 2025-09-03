import { state, setProjects, setCapacityRequirements, setYears, setBuckets, toggleAboitizHighlight, cycleDisplayState, setCurrentScenarioName } from './state.js';
import { fetchProjects, fetchCapacityRequirements } from './api.js';
import { populateScenarioList, loadScenario, saveScenario, deleteScenario } from './scenarioManager.js';
import { renderDashboard, populateFilters, updateDisplayOptions, handleHighlightToggle, initializeInteractions, updateProjectCapacity } from './ui.js';

async function initializeApp() {
    const loadingEl = document.getElementById("dashboardGrid");
    loadingEl.innerHTML = `<div class="text-center"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div></div>`;
    try {
        const [projectsData, requirementsData] = await Promise.all([
            fetchProjects(), 
            fetchCapacityRequirements()
        ]);

        setProjects(projectsData);
        setCapacityRequirements(requirementsData);

        const yearSet = new Set(projectsData.map(p => p.targetYear));
        const bucketSet = new Set(projectsData.map(p => p.likelihood));
        
        setYears([...yearSet].sort());
        
        const activeBuckets = state.masterBuckets.filter(b => bucketSet.has(b));
        setBuckets(activeBuckets);

        populateFilters();
        const initialSubtypes = [...document.querySelectorAll('#subtypeFilter .multiselect-option.active')].map(opt => opt.dataset.value);
        updateDisplayOptions(initialSubtypes);
        renderDashboard();
        populateScenarioList();
        initializeInteractions();

    } catch (error) {
        console.error("Failed to initialize app:", error);
        loadingEl.innerHTML = `<div class="alert alert-danger">Failed to load required data. Please check the console and refresh.</div>`;
    }
}

function setupEventListeners() {
    document.getElementById('highlightAboitizBtn').addEventListener('click', () => {
        toggleAboitizHighlight();
        handleHighlightToggle();
    });

    document.getElementById('displayToggleBtn').addEventListener('click', () => {
        cycleDisplayState();
        renderDashboard();
    });

    // --- ENHANCED SCENARIO EVENT LISTENERS ---

    const saveScenarioModalEl = document.getElementById('saveScenarioModal');
    const saveScenarioModal = bootstrap.Modal.getOrCreateInstance(saveScenarioModalEl);
    const scenarioNameInput = document.getElementById('scenarioNameInput');
    const confirmSaveBtn = document.getElementById('confirmSaveScenarioBtn');
    const overwriteBtn = document.getElementById('overwriteScenarioBtn');
    const saveAsNewBtn = document.getElementById('saveAsNewBtn');

    document.getElementById('saveScenarioBtn').addEventListener('click', () => {
        if (state.currentScenarioName) {
            document.getElementById('saveScenarioModalLabel').textContent = 'Update Scenario';
            scenarioNameInput.value = state.currentScenarioName;
            overwriteBtn.style.display = 'inline-block';
            saveAsNewBtn.style.display = 'inline-block';
            confirmSaveBtn.style.display = 'none';
        } else {
            document.getElementById('saveScenarioModalLabel').textContent = 'Save New Scenario';
            scenarioNameInput.value = '';
            overwriteBtn.style.display = 'none';
            saveAsNewBtn.style.display = 'none';
            confirmSaveBtn.style.display = 'inline-block';
        }
        saveScenarioModal.show();
    });

    confirmSaveBtn.addEventListener('click', () => {
        if (saveScenario(scenarioNameInput.value, false)) {
            saveScenarioModal.hide();
        }
    });

    overwriteBtn.addEventListener('click', () => {
        if (saveScenario(state.currentScenarioName, true)) {
            saveScenarioModal.hide();
        }
    });

    saveAsNewBtn.addEventListener('click', () => {
        if (saveScenario(scenarioNameInput.value, false)) {
            saveScenarioModal.hide();
        }
    });

    const deleteConfirmModalEl = document.getElementById('deleteConfirmModal');
    const deleteConfirmModal = bootstrap.Modal.getOrCreateInstance(deleteConfirmModalEl);
    
    document.getElementById('scenarioListDropdown').addEventListener('click', (e) => {
        const target = e.target;
        const scenarioLink = target.closest('a');
        if (!scenarioLink) return;

        const scenarioName = scenarioLink.dataset.scenarioName;
        
        if (target.classList.contains('scenario-delete-btn')) {
            e.stopPropagation();
            document.getElementById('deleteScenarioName').textContent = scenarioName;
            deleteConfirmModalEl.dataset.scenarioNameToDelete = scenarioName;
            deleteConfirmModal.show();
        } else if (scenarioName) {
            loadScenario(scenarioName);
            renderDashboard();
        }
    });

    document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
        const scenarioName = deleteConfirmModalEl.dataset.scenarioNameToDelete;
        if (scenarioName) {
            deleteScenario(scenarioName);
            deleteConfirmModal.hide();
        }
    });

    const capacityModalEl = document.getElementById('capacityModal');
    const capacityModal = bootstrap.Modal.getOrCreateInstance(capacityModalEl);
    
    document.getElementById('confirmCapacityChangeBtn').addEventListener('click', () => {
        const projectId = parseInt(capacityModalEl.dataset.projectId, 10);
        const capacityInput = document.getElementById('capacityInput');
        const newCapacity = parseFloat(capacityInput.value);

        if (!isNaN(newCapacity) && newCapacity >= 0) {
            updateProjectCapacity(projectId, newCapacity);
            capacityModal.hide();
        } else {
            alert('Please enter a valid, non-negative number for the capacity.');
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    initializeApp();
    setupEventListeners();
});