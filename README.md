# GEA-4 IPM Dashboard: Detailed Documentation

## 1. Overview

The GEA-4 IPM (Intelligence and Positioning Map) is a comprehensive, single-page web application for the strategic analysis and simulation of energy project auctions. Its primary purpose is to visualize a competitive landscape, model auction outcomes, and assess market dynamics by organizing projects on an interactive Kanban-style board.

The dashboard allows users to apply complex capacity allocation logic against predefined yearly targets, manually adjust project attributes to simulate different scenarios (e.g., changes in capacity, auction participation), and save these configurations for later review and comparison.

The application is built with vanilla JavaScript organized into a modular architecture, using Bootstrap 5 for a responsive UI and the Interact.js library for advanced drag-and-drop functionality.

## 2. Key Features

### Interactive UI & Core Functionality
* **Kanban-Style Board**: A grid that visually organizes projects into rows based on their **Likelihood** (`GEA-4 Bidders`, `High`, `Moderate`, `Low`) and into columns by their target **Year**.
* **Drag-and-Drop System**:
    * **Project Movement**: Users can drag and drop project cards between different years and likelihood groups to model changes in timing or status.
    * **Manual Reordering**: Within the high-priority "GEA-4 Bidders" group, users can drag and drop cards vertically to set a specific, manual order, overriding the default automated sorting.
* **Advanced Filtering**:
    * **Grid**: A single-select dropdown to view projects for a specific grid (e.g., Luzon).
    * **Subtype**: A single-select dropdown to view projects of a specific type (e.g., Ground mounted, Hybrid, IRESS). The application's sorting rules and display metrics change based on this selection.
    * **Parent Company**: A multi-select dropdown with a search bar to isolate projects from one or more companies.
* **Responsive Design**: The entire layout, including the year columns, automatically adjusts to fit different screen sizes, from large desktops to tablets and mobile phones, preventing horizontal scrolling.

### Allocation & Sorting Engine
* **Two-Stage Allocation Logic**: The core engine (`processAndColorProjects` function) that determines project acceptance is a two-stage process performed for each Year/Grid/Subtype group:
    1.  **Stage 1 (Bidders First)**: Projects in the "GEA-4 Bidders" group are processed first against the total lot requirement.
    2.  **Stage 2 (Other Likelihoods)**: High, Moderate, and Low likelihood projects are then processed sequentially against the *remaining* capacity left over after the bidders are allocated.
* **Dynamic Card Coloring**: Based on the allocation outcome, cards are color-coded:
    * **GEA-4 Bidders**: **Blue** (fully accepted), **Yellow** (marginal), **Light Grey** (spillover).
    * **Other Likelihoods**: **Green** (fully accepted), **Yellow** (marginal), **White** (spillover).
* **Conditional Display Metrics**: The data point displayed on each card adapts to the selected Subtype to show the most relevant metric:
    * **Ranking** is the default metric shown for `Hybrid`, `Floating`, and `Onshore` projects.
    * **Tariff** is the default metric shown for `Ground mounted` and `IRESS` projects.
* **Standardized Sorting Hierarchy**: The visual order of projects is strictly determined by the following hierarchy:
    1.  **Likelihood Group**: Projects are first grouped by their likelihood.
    2.  **Manual Order (Bidders Only)**: If a user has manually reordered bidders, that order is preserved.
    3.  **Tariff (Default)**: Otherwise, all projects within each likelihood group are sorted by **Tariff** (lowest to highest).

### Scenario & Data Management
* **Advanced Scenario Management**: A complete modal-driven system for saving and loading board states.
    * **Save with Custom Name**: Users are prompted to enter a custom name when saving a scenario.
    * **Overwrite or Save as New**: If a scenario is already loaded, users can choose to overwrite it or save their changes as a new copy.
    * **Modal-Based Deletion**: A confirmation modal prevents accidental deletion of scenarios.
* **In-App Data Modification**:
    * **Modify Capacity**: The 3-dot menu on each card allows users to open a modal and change a project's capacity. All dashboard calculations update instantly.
    * **Promote to Bidder**: The 3-dot menu allows any project to be moved to the "GEA-4 Bidders" group.
* **Data Export**: A one-click "Export CSV" button downloads the current view of the data, including all manual modifications (likelihood, year, capacity) and the final allocation status of each project.

## 3. Data Sources

The dashboard is powered by two external data sources fetched from Google Apps Script web app URLs.

* **Projects Data (`PROJECTS_URL`)**: Provides the main dataset of all energy projects.
    * **Key Fields**: `Project Name`, `Parent Company`, `Capacity (MW)`, `Subtype`, `Grid`, `Tariff`, `Comp. Ranking`, `Likelihood`, `GEA Lot Year`.
* **Requirements Data (`REQUIREMENTS_URL`)**: Provides the capacity targets.
    * **Key Fields**: `Year`, `Grid`, `Subtype`, `Capacity`.

## 4. File Architecture

The application is organized into a modular structure for maintainability and clarity.

* `index.html`: The single HTML file that defines the entire page structure, including the header, filter controls, dashboard grid, and all modal dialogs (Save, Delete, Modify Capacity, etc.).

* `style.css`: Contains all custom CSS rules for styling, including the color palettes for project cards, sticky header behavior, responsive layout adjustments, and attribution footer.

* `config.js`: A simple configuration file that exports the constant string URLs for the two data sources (`PROJECTS_URL`, `REQUIREMENTS_URL`).

* `state.js`: Acts as the "single source of truth" for the application's data. It holds the global state, including the `projects` and `capacityRequirements` arrays, and tracks UI states like the `currentScenarioName`.

* `api.js`: Handles all external communication. Its functions are responsible for fetching and parsing the JSON data from the Google Apps Script URLs.

* `scenarioManager.js`: Encapsulates all logic related to browser `localStorage`. It handles the CRUD (Create, Read, Update, Delete) operations for scenarios.

* `utils.js`: Contains standalone utility functions. Its primary responsibility is the `exportCSV` function, which converts the current project state into a downloadable CSV file.

* `ui.js`: The primary "view controller" of the application. Its responsibilities include:
    * Rendering the entire dashboard, including headers, likelihood groups, and project cards (`renderDashboard`).
    * Populating and managing the filter dropdowns.
    * Handling all drag-and-drop interactions via Interact.js (`initializeDragAndDrop`).
    * Containing the core allocation and sorting engine (`processAndColorProjects`).
    * Managing the display logic and card menus.

* `main.js`: The application's entry point. It orchestrates the entire application flow:
    * Initializes the app by fetching all necessary data.
    * Sets up all top-level event listeners for buttons and modals.
    * Connects the various modules, ensuring they work together correctly.

## 5. Setup

To run the application locally:
1.  Place all project files (`index.html`, `style.css`, and all `.js` files) in the same directory.
2.  Place the `MS Logo.png` image file in the same directory.
3.  Open `index.html` in a modern web browser.
4.  An active internet connection is required to fetch data from the live Google Apps Script URLs.