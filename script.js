
const taskList = document.getElementById("taskList");
const taskDialog = document.getElementById("taskDialog");
const taskForm = document.getElementById("taskForm");
const taskTitle = document.getElementById("taskTitle");
const taskDescription = document.getElementById("taskDescription");
const taskPriority = document.getElementById("taskPriority");
const taskStatus = document.getElementById("taskStatus");
const searchInput = document.getElementById("searchInput");
const filterStatus = document.getElementById("filterStatus");
const sortTasks = document.getElementById("sortTasks");
const toast = document.getElementById("toast");

let tasks = loadTasks();
let editingId = null;
let toastTimer;

function loadTasks() {
    try {
        const saved = JSON.parse(localStorage.getItem("taskflow_tasks"));
        return Array.isArray(saved)
            ? saved.filter(task =>
                task &&
                typeof task.id === "string" &&
                typeof task.title === "string" &&
                ["Pending", "In Progress", "Completed"].includes(task.status) &&
                ["Low", "Medium", "High"].includes(task.priority)
            )
            : [];
    } catch (error) {
        console.error("Could not load saved tasks:", error);
        return [];
    }
}


function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function saveTasks() {
    try {
        localStorage.setItem("taskflow_tasks", JSON.stringify(tasks));
        return true;
    } catch (error) {
        console.error("Could not save tasks:", error);
        showToast("Unable to save. Check your browser storage.");
        return false;
    }
}
function showToast(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("show");

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}


function updateStats() {
    document.getElementById("totalTasks").textContent = tasks.length;

    document.getElementById("pendingTasks").textContent =
        tasks.filter(task => task.status === "Pending").length;

    document.getElementById("progressTasks").textContent =
        tasks.filter(task => task.status === "In Progress").length;

    document.getElementById("completedTasks").textContent =
        tasks.filter(task => task.status === "Completed").length;
}
function renderTasks() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const statusFilter = filterStatus.value;

    let visibleTasks = tasks.filter(task => {
        const matchesSearch =
            task.title.toLowerCase().includes(searchTerm) ||
            (task.description || "").toLowerCase().includes(searchTerm);

        const matchesStatus =
            statusFilter === "All" || task.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    if (sortTasks.value === "newest") {
        visibleTasks.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sortTasks.value === "oldest") {
        visibleTasks.sort((a, b) => a.createdAt - b.createdAt);
    } else if (sortTasks.value === "priority") {
        const priorityOrder = { High: 3, Medium: 2, Low: 1 };
        visibleTasks.sort(
            (a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]
        );
    }

    if (visibleTasks.length === 0) {
        taskList.innerHTML = `
            <div class="empty-state">
                <h3>No tasks found</h3>
                <p>Add a new task or change your search and filters.</p>
            </div>
        `;
    } else {
        taskList.innerHTML = visibleTasks.map(task => {
            const statusClass = task.status.replace(/\s+/g, "-");

            return `
                <article class="task-card">
                    <div class="task-info">
                        <h3>${escapeHTML(task.title)}</h3>
                        <p>${escapeHTML(task.description || "No description provided.")}</p>

                        <div class="task-meta">
                            <span class="tag priority-${task.priority}">
                                ${task.priority} Priority
                            </span>
                            <span class="tag status-${statusClass}">
                                ${task.status}
                            </span>
                        </div>
                    </div>

                    <div class="task-actions">
                        <button class="action-btn"
                            data-action="edit" data-id="${task.id}">
                            Edit
                        </button>

                        <button class="action-btn"
                            data-action="status" data-id="${task.id}">
                            Next Status
                        </button>

                        <button class="action-btn delete-btn"
                            data-action="delete" data-id="${task.id}">
                            Delete
                        </button>
                    </div>
                </article>
            `;
        }).join("");
    }

    document.getElementById("taskCount").textContent =
        `Showing ${visibleTasks.length} of ${tasks.length} tasks`;

    updateStats();
}


function openNewTaskForm() {
    editingId = null;
    taskForm.reset();
    document.getElementById("dialogTitle").textContent = "Create New Task";
    taskDialog.showModal();
    taskTitle.focus();
}


taskForm.addEventListener("submit", event => {
    event.preventDefault();

    const title = taskTitle.value.trim();
    const description = taskDescription.value.trim();

    if (!title) {
        showToast("Please enter a task title.");
        taskTitle.focus();
        return;
    }

    const now = Date.now();

    if (editingId) {
        const index = tasks.findIndex(task => task.id === editingId);

        if (index === -1) {
            showToast("Task not found.");
            taskDialog.close();
            return;
        }

        const updatedTasks = [...tasks];
        updatedTasks[index] = {
            ...updatedTasks[index],
            title,
            description,
            priority: taskPriority.value,
            status: taskStatus.value
        };

        const previousTasks = tasks;
        tasks = updatedTasks;

        if (!saveTasks()) {
            tasks = previousTasks;
            return;
        }

        showToast("Task updated successfully!");
    } else {
        const newTask = {
            id: createTaskId(),
            title,
            description,
            priority: taskPriority.value,
            status: taskStatus.value,
            createdAt: now
        };

        tasks = [...tasks, newTask];

        if (!saveTasks()) {
            tasks = tasks.filter(task => task.id !== newTask.id);
            return;
        }

        showToast("Task added successfully!");
    }

    taskDialog.close();
    renderTasks();
});


function createTaskId() {
    if (typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function editTask(id) {
    const task = tasks.find(item => item.id === id);

    if (!task) {
        showToast("Task not found.");
        return;
    }

    editingId = id;
    taskTitle.value = task.title;
    taskDescription.value = task.description || "";
    taskPriority.value = task.priority;
    taskStatus.value = task.status;

    document.getElementById("dialogTitle").textContent = "Edit Task";
    taskDialog.showModal();
    taskTitle.focus();
}


function changeTaskStatus(id) {
    const task = tasks.find(item => item.id === id);

    if (!task) return;

    const statuses = ["Pending", "In Progress", "Completed"];
    const nextStatus =
        statuses[(statuses.indexOf(task.status) + 1) % statuses.length];

    const previousTasks = tasks;
    tasks = tasks.map(item =>
        item.id === id ? { ...item, status: nextStatus } : item
    );

    if (!saveTasks()) {
        tasks = previousTasks;
        return;
    }

    renderTasks();
    showToast(`Status changed to ${nextStatus}.`);
}


function deleteTask(id) {
    const task = tasks.find(item => item.id === id);

    if (!task) return;

    if (!confirm(`Delete "${task.title}"?`)) return;

    const previousTasks = tasks;
    tasks = tasks.filter(item => item.id !== id);

    if (!saveTasks()) {
        tasks = previousTasks;
        return;
    }

    renderTasks();
    showToast("Task deleted successfully.");
}

taskList.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const { action, id } = button.dataset;

    if (action === "edit") editTask(id);
    if (action === "status") changeTaskStatus(id);
    if (action === "delete") deleteTask(id);
});

document.getElementById("addTaskBtn")
    .addEventListener("click", openNewTaskForm);

document.getElementById("cancelBtn").addEventListener("click", () => {
    taskDialog.close();
});

searchInput.addEventListener("input", renderTasks);
filterStatus.addEventListener("change", renderTasks);
sortTasks.addEventListener("change", renderTasks);

renderTasks();
