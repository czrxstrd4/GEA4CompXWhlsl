import { state, setPlaceholder, setCurrentDropzone } from './state.js';

// --- Core Rendering & Processing ---

export function renderDashboard() {
    const activeGridOption = document.querySelector('#gridFilter .multiselect-option.active');
    const gridFilter = activeGridOption ? activeGridOption.dataset.value : "";
    
    const activeSubtypeOption = document.querySelector('#subtypeFilter .multiselect-option.active');
    const selectedSubtype = activeSubtypeOption ? activeSubtypeOption.dataset.value : "";
    
    const masterProjectSet = state.projects.filter(p => 
        (!gridFilter || p.grid === gridFilter) && 
        (!selectedSubtype || p.subtype === selectedSubtype)
    );
    
    processAndColorProjects(masterProjectSet);

    const selectedCompanies = [...document.querySelectorAll('#companyFilter input:checked')].map(i => i.value);
    const filteredProjects = masterProjectSet.filter(p => 
        selectedCompanies.length === 0 || selectedCompanies.includes(p.parentCompany)
    );

    const container = document.getElementById("dashboardGrid");
    container.innerHTML = "";
    
    state.buckets.forEach(bucket => {
        const projectsForThisBucket = filteredProjects.filter(p => p.likelihood === bucket);

        let headerText = '';
        if (bucket === 'High') {
            headerText = 'Potential GEA-4 Bidders';
        } else if (bucket === 'Low') {
            headerText = 'Potential GEA-4 Non-bidders';
        }

        const bucketGroupEl = document.createElement('div');
        bucketGroupEl.className = 'mb-4 bucket-group';
        
        const likelihoodHeader = document.createElement('h3');
        likelihoodHeader.className = 'fw-bold sticky-likelihood-header d-flex justify-content-between align-items-center';
        likelihoodHeader.innerHTML = `<span>${headerText}</span>`;
        bucketGroupEl.appendChild(likelihoodHeader);

        const yearHeaderRow = document.createElement('div');
        yearHeaderRow.className = 'row g-3 sticky-year-header-row';
        state.years.forEach(year => {
            const headerCol = document.createElement('div');
            headerCol.className = 'col-lg-3 col-md-6 col-12 year-header-col';
            
            // Note: Header totals show combined totals for the entire column (High + Low)
            const allItemsInHeader = filteredProjects.filter(p => p.targetYear === year); 
            const columnTotal = allItemsInHeader.reduce((sum, p) => sum + p.capacity, 0);

            const requirementTotal = state.capacityRequirements.filter(r => {
                const yearMatch = String(r.Year) === year;
                const gridMatch = (gridFilter === '') || (r.Grid === gridFilter);
                const subtypeMatch = !selectedSubtype || selectedSubtype === r.Subtype;
                return yearMatch && gridMatch && subtypeMatch;
            }).reduce((sum, r) => sum + r.Capacity, 0);
            
            const remainingCapacity = requirementTotal - columnTotal;
            const remainingColor = remainingCapacity < 0 ? 'text-danger' : 'text-success';

            headerCol.innerHTML = `
                <div class="text-center">
                    <h5 class="mb-2">${year}</h5>
                    <div class="small">
                        <span class="text-muted">Req: <strong>${Math.round(requirementTotal)} MW</strong></span> |
                        <span class="text-primary">Total: <strong>${Math.round(columnTotal)} MW</strong></span> |
                        <span class="${remainingColor}">Rem: <strong>${Math.round(remainingCapacity)} MW</strong></span>
                    </div>
                </div>
            `;
            yearHeaderRow.appendChild(headerCol);
        });

        // Only show year headers for the first bucket group
        if (bucket === state.buckets[0]) {
            bucketGroupEl.appendChild(yearHeaderRow);
        }

        const yearContentRow = document.createElement('div');
        yearContentRow.className = 'row g-3 mt-0';
        state.years.forEach(year => {
            const contentCol = document.createElement("div");
            contentCol.className = "col-lg-3 col-md-6 col-12 year-column";
            contentCol.dataset.year = year;
            contentCol.dataset.likelihood = bucket;

            const items = projectsForThisBucket.filter(p => p.targetYear === year).sort((a, b) => a.order - b.order);

            items.forEach(p => {
                const displayValue = p.compRanking;

                let statusClass = '';
                if (p.bidderStatus === 'accepted') statusClass = 'status-bidder';
                else if (p.bidderStatus === 'marginal') statusClass = 'status-marginal';
                else statusClass = 'status-bidder-spillover';
                
                const div = document.createElement("div");
                div.className = `card project-card mb-2 ${p.isMoved ? 'is-moved' : ''} ${statusClass}`;
                div.dataset.id = p.id;
                div.innerHTML = `
                  <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <div style="min-width: 0;" class="me-auto">
                            <strong class="d-block text-truncate" title="${p.name}">${p.name}</strong>
                            <small class="text-muted text-truncate d-block" title="${p.parentCompany}">${p.parentCompany}</small>
                        </div>
                        <div class="text-end flex-shrink-0 ms-2">
                            <div class="fw-bold">${Math.ceil(p.capacity)} MW${p.subtype === 'Hybrid' && p.bessCap ? ` (${p.bessCap})` : ''}</div>
                            <div class="text-muted small">${displayValue}</div>
                        </div>
                        <div class="dropdown flex-shrink-0 ms-2">
                            <button class="btn btn-sm btn-light" type="button" data-bs-toggle="dropdown" aria-expanded="false"><i class="bi bi-three-dots-vertical"></i></button>
                            <ul class="dropdown-menu dropdown-menu-end"></ul>
                        </div>
                    </div>
                  </div>`;
                contentCol.appendChild(div);
            });
            yearContentRow.appendChild(contentCol);
        });
        bucketGroupEl.appendChild(yearContentRow);
        
        container.appendChild(bucketGroupEl);
    });

    renderLegend();
    renderSummaryTotals(filteredProjects);
    applyHighlightStyles();
}

function processAndColorProjects(projectsToProcess) {
    projectsToProcess.forEach(p => {
        p.bidderStatus = 'spillover';
    });

    const groupedByCriteria = projectsToProcess.reduce((acc, p) => {
        const key = `${p.targetYear}-${p.grid}-${p.subtype}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(p);
        return acc;
    }, {});

    let globalOrderCounter = 0;

    for (const key in groupedByCriteria) {
        const group = groupedByCriteria[key];
        const [year, grid, subtype] = key.split('-');
        
        const requirement = state.capacityRequirements.find(r =>
            String(r.Year) === year && r.Grid === grid && r.Subtype === subtype
        );

        if (!requirement) continue;

        let runningTotal = 0;
        const maxCapacity = requirement.Capacity;

        // Create ordered lists, processing High before Low
        const highLikelihood = group.filter(p => p.likelihood === 'High').sort((a,b) => a.tariff - b.tariff);
        const lowLikelihood = group.filter(p => p.likelihood === 'Low').sort((a,b) => a.tariff - b.tariff);
        
        const finalGroupOrder = [...highLikelihood, ...lowLikelihood];
        
        // Process allocation against the single capacity requirement
        for (const project of finalGroupOrder) {
            const remainingCapacity = maxCapacity - runningTotal;

            if (runningTotal >= maxCapacity) {
                project.bidderStatus = 'spillover';
            } else if (project.capacity <= remainingCapacity) {
                project.bidderStatus = 'accepted';
                runningTotal += project.capacity;
            } else {
                project.bidderStatus = 'marginal';
                runningTotal = maxCapacity;
            }
        }

        finalGroupOrder.forEach(p => {
            const globalProject = state.projects.find(gp => gp.id === p.id);
            if(globalProject) globalProject.order = globalOrderCounter++;
        });
    }
}

function renderSummaryTotals(filteredProjects) {
    const container = document.getElementById('summary-totals-grid');
    container.innerHTML = `<h3 class="fw-bold mt-4 sticky-likelihood-header">Summary Totals</h3>`;

    const summaryRow = document.createElement('div');
    summaryRow.className = 'row g-3';

    const activeGridOption = document.querySelector('#gridFilter .multiselect-option.active');
    const gridFilter = activeGridOption ? activeGridOption.dataset.value : "";
    const activeSubtypeOption = document.querySelector('#subtypeFilter .multiselect-option.active');
    const selectedSubtype = activeSubtypeOption ? activeSubtypeOption.dataset.value : "";

    state.years.forEach(year => {
        const col = document.createElement('div');
        col.className = 'col-lg-3 col-md-6 col-12';

        const summaryBox = document.createElement('div');
        summaryBox.className = 'summary-totals-table h-100';

        const requirementTotal = state.capacityRequirements.filter(r => {
            const yearMatch = String(r.Year) === year;
            const gridMatch = (gridFilter === '') || (r.Grid === gridFilter);
            const subtypeMatch = !selectedSubtype || selectedSubtype === r.Subtype;
            return yearMatch && gridMatch && subtypeMatch;
        }).reduce((sum, r) => sum + r.Capacity, 0);

        const projectsInYear = filteredProjects.filter(p => p.targetYear === year);
        const numProjects = projectsInYear.length;
        const yearGrandTotal = projectsInYear.reduce((sum, p) => sum + p.capacity, 0);
        const remainingCapacity = requirementTotal - yearGrandTotal;
        const remainingColor = remainingCapacity < 0 ? 'text-danger' : 'text-success';
        
        let boxHtml = `
            <div class="row small">
                <div class="col">No. of Projects</div>
                <div class="col text-end"><strong>${numProjects}</strong></div>
            </div>
            <div class="row small">
                <div class="col">Total Requirement</div>
                <div class="col text-end"><strong>${Math.round(requirementTotal)} MW</strong></div>
            </div>
             <div class="row small mb-2">
                <div class="col">Remaining Capacity</div>
                <div class="col text-end"><strong class="${remainingColor}">${Math.round(remainingCapacity)} MW</strong></div>
            </div>
        `;
        
        let totalsHtml = '';
        state.masterBuckets.forEach(bucket => {
            const bucketTotal = projectsInYear
                .filter(p => p.likelihood === bucket)
                .reduce((sum, p) => sum + p.capacity, 0);

            let label = '';
            if (bucket === 'High') label = 'Potential Bidders';
            if (bucket === 'Low') label = 'Potential Non-bidders';

            totalsHtml += `
                <div class="row small">
                    <div class="col">${label}</div>
                    <div class="col text-end"><strong>${Math.round(bucketTotal)} MW</strong></div>
                </div>
            `;
        });

        boxHtml += `<div class="border-top pt-2">${totalsHtml}</div>`;
        boxHtml += `
            <div class="row small fw-bold border-top mt-2 pt-2">
                <div class="col">Grand Total</div>
                <div class="col text-end text-primary"><strong>${Math.round(yearGrandTotal)} MW</strong></div>
            </div>
        `;

        summaryBox.innerHTML = boxHtml;
        col.appendChild(summaryBox);
        summaryRow.appendChild(col);
    });

    container.appendChild(summaryRow);
}

function renderLegend() {
    const container = document.getElementById('legend-grid');
    container.innerHTML = `
        <div class="d-flex flex-wrap align-items-center justify-content-center gap-4 mt-4 py-2 small text-muted border-top border-bottom">
            <strong class="me-2">Legend:</strong>
            <div class="d-flex align-items-center">
                <span class="legend-color-box" style="background-color: #e0f7ff;"></span>
                <span>Accepted</span>
            </div>
            <div class="d-flex align-items-center">
                <span class="legend-color-box" style="background-color: #fff8e0;"></span>
                <span>Marginal</span>
            </div>
            <div class="d-flex align-items-center">
                <span class="legend-color-box" style="background-color: #f1f3f5;"></span>
                <span>Spillover</span>
            </div>
            <div class="d-flex align-items-center">
                <span class="legend-color-box is-moved-legend"></span>
                <span>Manually Modified</span>
            </div>
        </div>
    `;
}

export function populateFilters() {
    // This function remains the same
    const gridSet = new Set(state.projects.map(p => p.grid).filter(Boolean));
    const subtypeSet = new Set(state.projects.map(p => p.subtype).filter(Boolean));
    const companySet = new Set(state.projects.map(p => p.parentCompany).filter(Boolean));

    const gridContainer = document.getElementById("gridFilter");
    gridContainer.innerHTML = `<button class="multiselect-btn"><span class="multiselect-btn-text">All Grids</span><i class="bi bi-chevron-down"></i></button><div class="multiselect-menu"></div>`;
    const gridMenu = gridContainer.querySelector('.multiselect-menu');
    const allGridsOption = document.createElement('div');
    allGridsOption.className = 'multiselect-option active';
    allGridsOption.dataset.value = "";
    allGridsOption.textContent = "All Grids";
    gridMenu.appendChild(allGridsOption);
    [...gridSet].sort().forEach(g => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'multiselect-option';
        optionDiv.dataset.value = g;
        optionDiv.textContent = g;
        gridMenu.appendChild(optionDiv);
    });

    const subtypeContainer = document.getElementById("subtypeFilter");
    subtypeContainer.innerHTML = `<button class="multiselect-btn"><span class="multiselect-btn-text">All Subtypes</span><i class="bi bi-chevron-down"></i></button><div class="multiselect-menu"></div>`;
    const subtypeMenu = subtypeContainer.querySelector('.multiselect-menu');
    const allSubtypesOption = document.createElement('div');
    allSubtypesOption.className = 'multiselect-option';
    allSubtypesOption.dataset.value = "";
    allSubtypesOption.textContent = "All Subtypes";
    subtypeMenu.appendChild(allSubtypesOption);
    [...subtypeSet].sort().forEach(s => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'multiselect-option';
        optionDiv.dataset.value = s;
        optionDiv.textContent = s;
        subtypeMenu.appendChild(optionDiv);
    });
    
    const companyContainer = document.getElementById("companyFilter");
    companyContainer.innerHTML = `<button class="multiselect-btn"><span class="multiselect-btn-text">All Companies</span><i class="bi bi-chevron-down"></i></button><div class="multiselect-menu"></div>`;
    const companyMenu = companyContainer.querySelector('.multiselect-menu');
    companyMenu.innerHTML = `<div class="d-flex align-items-center p-2 border-bottom"><input type="text" class="multiselect-search-input" placeholder="Search..."><button type="button" class="btn btn-sm btn-light ms-2" id="clearCompanyFilterBtn" title="Clear selection"><i class="bi bi-x-lg"></i></button></div>`;
    [...companySet].sort().forEach(c => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'multiselect-option';
        optionDiv.innerHTML = `<input type="checkbox" id="company-${c.replace(/\s+/g, '-')}" value="${c}"><label for="company-${c.replace(/\s+/g, '-')}">${c}</label>`;
        companyMenu.appendChild(optionDiv);
    });
    const clearBtn = companyMenu.querySelector('#clearCompanyFilterBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            companyMenu.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
            updateCompanyButtonText();
            renderDashboard();
        });
    }

    const activeGrid = gridMenu.querySelector('.multiselect-option.active');
    if (activeGrid) activeGrid.classList.remove('active');
    const luzonOption = gridMenu.querySelector('[data-value="Luzon"]');
    if (luzonOption) luzonOption.classList.add('active');
    updateGridButtonText();

    const groundMountedOption = subtypeMenu.querySelector('[data-value="Ground mounted"]');
    if (groundMountedOption) groundMountedOption.classList.add('active');
    updateSubtypeButtonText();

    setupDropdown(gridContainer, updateGridButtonText, true);
    setupDropdown(subtypeContainer, updateSubtypeButtonText, true);
    setupDropdown(companyContainer, updateCompanyButtonText, false);
}

function setupDropdown(container, updateFn, isSingleSelect) {
    const btn = container.querySelector('.multiselect-btn');
    const menu = container.querySelector('.multiselect-menu');
    const searchInput = menu.querySelector('.multiselect-search-input');

    if (searchInput) {
        searchInput.addEventListener('click', e => e.stopPropagation());
        searchInput.addEventListener('keyup', () => {
            const filter = searchInput.value.toUpperCase();
            menu.querySelectorAll('.multiselect-option').forEach(opt => {
                const txtValue = opt.textContent || opt.innerText;
                opt.style.display = txtValue.toUpperCase().indexOf(filter) > -1 ? "" : "none";
            });
        });
    }

    btn.addEventListener('click', (e) => { 
        e.stopPropagation(); 
        menu.classList.toggle('show'); 
        if(searchInput) {
            searchInput.focus();
            searchInput.value = '';
            menu.querySelectorAll('.multiselect-option').forEach(opt => opt.style.display = "");
        }
    });
    
    menu.addEventListener('click', (e) => {
        const targetOption = e.target.closest('.multiselect-option');
        if (!targetOption) return;

        if (isSingleSelect) {
            menu.querySelectorAll('.multiselect-option').forEach(opt => opt.classList.remove('active'));
            targetOption.classList.add('active');
            updateFn();
            renderDashboard(); 
            menu.classList.remove('show');
        } else {
            updateFn();
            renderDashboard();
        }
    });
}

function updateGridButtonText() {
    const btnText = document.querySelector('#gridFilter .multiselect-btn-text');
    const activeOption = document.querySelector('#gridFilter .multiselect-option.active');
    btnText.textContent = activeOption ? activeOption.textContent : 'All Grids';
}

function updateSubtypeButtonText() {
    const btnText = document.querySelector('#subtypeFilter .multiselect-btn-text');
    const activeOption = document.querySelector('#subtypeFilter .multiselect-option.active');
    btnText.textContent = activeOption ? activeOption.textContent : 'All Subtypes';
}

function updateCompanyButtonText() {
    const btnText = document.querySelector('#companyFilter .multiselect-btn-text');
    const selected = [...document.querySelectorAll('#companyFilter input:checked')].map(i => i.value);
    if (selected.length === 0) btnText.textContent = 'All Companies';
    else if (selected.length === 1) btnText.textContent = selected[0];
    else btnText.textContent = `${selected.length} Companies`;
}

export function initializeInteractions() {
    initializeDragAndDrop();
    initializeCardDropdowns();

    window.addEventListener('click', (e) => {
        document.querySelectorAll('.multiselect-menu.show').forEach(menu => {
            if (!menu.parentElement.contains(e.target)) menu.classList.remove('show');
        });
    });
}

function applyHighlightStyles() {
    const allCards = document.querySelectorAll('.project-card');
    allCards.forEach(card => {
        const projectId = parseInt(card.dataset.id, 10);
        const project = state.projects.find(p => p.id === projectId);
        if (project && project.parentCompany === 'AboitizPower' && state.isAboitizHighlighted) {
            card.classList.add('highlight-aboitiz');
        } else {
            card.classList.remove('highlight-aboitiz');
        }
    });
}

export function handleHighlightToggle() {
    const btn = document.getElementById('highlightAboitizBtn');
    btn.classList.toggle('active');
    btn.classList.toggle('btn-dark');
    btn.classList.toggle('btn-outline-dark');
    applyHighlightStyles();
}

function moveProjectLikelihood(projectId, newLikelihood) {
    const projectToMove = state.projects.find(p => p.id === projectId);
    if (!projectToMove || projectToMove.likelihood === newLikelihood) return;
    projectToMove.likelihood = newLikelihood;
    projectToMove.isMoved = true;
    renderDashboard();
}

function openModifyCapacityModal(projectId) {
    const project = state.projects.find(p => p.id === projectId);
    if (!project) return;
    const modalEl = document.getElementById('capacityModal');
    const capacityModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    document.getElementById('capacityModalProjectName').textContent = project.name;
    document.getElementById('capacityInput').value = project.capacity;
    modalEl.dataset.projectId = projectId;
    capacityModal.show();
}

export function updateProjectCapacity(projectId, newCapacity) {
    const project = state.projects.find(p => p.id === projectId);
    if (project) {
        project.capacity = newCapacity;
        project.isMoved = true;
        renderDashboard();
    }
}

function initializeDragAndDrop() {
    let dragStartColumn = null;
    interact('.year-column').dropzone({
        accept: '.project-card',
        ondropactivate: (event) => {
            event.target.classList.add('drop-active');
            if (!state.placeholder) {
                setPlaceholder(document.createElement('div'));
                state.placeholder.className = 'card-placeholder';
            }
        },
        ondragenter: (event) => {
            const dropzoneElement = event.target;
            dropzoneElement.classList.add('drop-target');
            setCurrentDropzone(dropzoneElement);
            dropzoneElement.appendChild(state.placeholder);
        },
        ondragleave: (event) => {
            event.target.classList.remove('drop-target');
            if (state.placeholder && state.placeholder.parentNode) state.placeholder.remove();
            setCurrentDropzone(null);
        },
        ondrop: (event) => {
            const dropZone = event.target;
            const draggedCard = event.relatedTarget;
            const projectId = parseInt(draggedCard.dataset.id, 10);
            const project = state.projects.find(p => p.id === projectId);
            if (!project) return;

            const newYear = dropZone.dataset.year;
            const newLikelihood = dropZone.dataset.likelihood;

            project.targetYear = newYear;
            project.likelihood = newLikelihood;
            project.isMoved = true;
            
            if (dropZone === dragStartColumn) {
                state.placeholder.insertAdjacentElement('afterend', draggedCard);
                state.placeholder.remove();
                const cardsInColumn = Array.from(dropZone.querySelectorAll('.project-card'));
                const baseOrder = new Date().getTime(); 
                cardsInColumn.forEach((card, index) => {
                    const pId = parseInt(card.dataset.id, 10);
                    const projToUpdate = state.projects.find(p => p.id === pId);
                    if (projToUpdate) projToUpdate.order = baseOrder + index;
                });
            }
            renderDashboard();
        },
        ondropdeactivate: (event) => {
            event.target.classList.remove('drop-active', 'drop-target');
            if (state.placeholder && state.placeholder.parentNode) state.placeholder.remove();
            setPlaceholder(null);
            setCurrentDropzone(null);
            dragStartColumn = null;
        }
    });
    interact('.project-card').draggable({
        inertia: false,
        ignoreFrom: '.btn, .dropdown-menu',
        autoScroll: true,
        listeners: {
            start(event) {
                event.target.classList.add('is-dragging');
                document.body.classList.add('dragging-active');
                dragStartColumn = event.target.closest('.year-column');
            },
            move(event) {
                if (state.currentDropzone) {
                    const cards = [...state.currentDropzone.querySelectorAll('.project-card:not(.is-dragging)')];
                    let insertBefore = null;
                    for (const card of cards) {
                        const rect = card.getBoundingClientRect();
                        if (event.clientY < rect.top + rect.height / 2) {
                            insertBefore = card;
                            break;
                        }
                    }
                    state.currentDropzone.insertBefore(state.placeholder, insertBefore);
                }
            },
            end(event) {
                event.target.classList.remove('is-dragging');
                document.body.classList.remove('dragging-active');
            }
        }
    });
}

function initializeCardDropdowns() {
    const grid = document.getElementById('dashboardGrid');
    grid.addEventListener('show.bs.dropdown', event => {
        const card = event.relatedTarget.closest('.project-card');
        if (card) card.classList.add('menu-is-open');
        
        const toggleButton = event.relatedTarget;
        const projectId = parseInt(card.dataset.id, 10);
        const project = state.projects.find(p => p.id === projectId);
        const menu = toggleButton.nextElementSibling;
        if (!project || !menu) return;
        
        menu.innerHTML = '';

        const capacityLi = document.createElement('li');
        capacityLi.innerHTML = `<a class="dropdown-item" href="#" data-action="modify-capacity">Modify Capacity</a>`;
        menu.appendChild(capacityLi);

        const divider = document.createElement('li');
        divider.innerHTML = `<hr class="dropdown-divider">`;
        menu.appendChild(divider);

        if (project.likelihood === 'High') {
            const moveLi = document.createElement('li');
            moveLi.innerHTML = `<a class="dropdown-item" href="#" data-action="move-likelihood" data-new-likelihood="Low">Move to Non-bidders</a>`;
            menu.appendChild(moveLi);
        } else if (project.likelihood === 'Low') {
            const moveLi = document.createElement('li');
            moveLi.innerHTML = `<a class="dropdown-item" href="#" data-action="move-likelihood" data-new-likelihood="High">Move to Bidders</a>`;
            menu.appendChild(moveLi);
        }
    });
    
    grid.addEventListener('hide.bs.dropdown', event => {
        const card = event.relatedTarget.closest('.project-card');
        if (card) card.classList.remove('menu-is-open');
    });
    
    grid.addEventListener('click', event => {
        const target = event.target;
        if (!target.classList.contains('dropdown-item')) return;
        event.preventDefault();
        const card = target.closest('.project-card');
        const projectId = parseInt(card.dataset.id, 10);
        const action = target.dataset.action;
        
        switch(action) {
            case 'modify-capacity':
                openModifyCapacityModal(projectId);
                break;
            case 'move-likelihood':
                moveProjectLikelihood(projectId, target.dataset.newLikelihood);
                break;
        }
    });
}