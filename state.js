export let state = {
    projects: [],
    capacityRequirements: [],
    years: [],
    buckets: [],
    masterBuckets: ['GEA-4 Bidders'],
    placeholder: null,
    currentDropzone: null,
    isAboitizHighlighted: false,
    currentScenarioName: null
};

export function setCurrentScenarioName(name) {
    state.currentScenarioName = name;
}

export function setProjects(data) {
    state.projects = data;
}

export function setCapacityRequirements(data) {
    state.capacityRequirements = data;
}

export function setYears(data) {
    state.years = data;
}

export function setBuckets(data) {
    state.buckets = data;
}

export function toggleAboitizHighlight() {
    state.isAboitizHighlighted = !state.isAboitizHighlighted;
}

export function setPlaceholder(element) {
    state.placeholder = element;
}

export function setCurrentDropzone(element) {
    state.currentDropzone = element;
}