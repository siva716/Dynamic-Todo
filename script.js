"use strict";

const STORAGE_KEY = "taskflow_tasks_v1";

const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const priorityInput = document.getElementById("priorityInput");
const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const clearCompletedButton = document.getElementById("clearCompleted");
const filterButtons = document.querySelectorAll(".filter-btn");

const totalCount = document.getElementById("totalCount");
const pendingCount = document.getElementById("pendingCount");
const completedCount = document.getElementById("completedCount");
const listCount = document.getElementById("listCount");
const progressText = document.getElementById("progressText");
const progressBar = document.getElementById("progressBar");
const footerText = document.getElementById("footerText");

let tasks = loadTasks();
let activeFilter = "all";
let searchTerm = "";

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((task) =>
      task &&
      typeof task.id === "string" &&
      typeof task.title === "string" &&
      typeof task.completed === "boolean" &&
      ["low", "medium", "high"].includes(task.priority)
    );
  } catch (error) {
    console.error("Could not load saved tasks:", error);
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch (error) {
    console.error("Could not save tasks:", error);
    alert("Tasks could not be saved in this browser. Check your browser storage settings.");
    return false;
  }
}

function createTask(title, priority) {
  return {
    id: Date.now() + "-" + Math.random().toString(36).slice(2, 9),
    title,
    priority,
    completed: false,
    createdAt: new Date().toISOString()
  };
}

function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Added recently";

  return `Added ${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  })}`;
}

function createTaskElement(task) {
  const item = document.createElement("li");
  item.className = "task-item" + (task.completed ? " completed" : "");

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-check";
  checkbox.checked = task.completed;
  checkbox.setAttribute("aria-label", `Mark "${task.title}" as completed`);
  checkbox.addEventListener("change", () => toggleTask(task.id));

  const content = document.createElement("div");
  content.className = "task-content";

  const title = document.createElement("p");
  title.className = "task-title";
  title.textContent = task.title;

  const meta = document.createElement("div");
  meta.className = "task-meta";

  const priority = document.createElement("span");
  priority.className = `priority ${task.priority}`;
  priority.textContent = `${task.priority} priority`;

  const date = document.createElement("span");
  date.className = "task-date";
  date.textContent = formatDate(task.createdAt);

  meta.append(priority, date);
  content.append(title, meta);

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "delete-button";
  deleteButton.textContent = "✕";
  deleteButton.setAttribute("aria-label", `Delete "${task.title}"`);
  deleteButton.addEventListener("click", () => deleteTask(task.id));

  item.append(checkbox, content, deleteButton);
  return item;
}

function getVisibleTasks() {
  return tasks.filter((task) => {
    const matchesFilter =
      activeFilter === "all" ||
      (activeFilter === "pending" && !task.completed) ||
      (activeFilter === "completed" && task.completed);

    const matchesSearch = task.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });
}

function renderTasks() {
  const visibleTasks = getVisibleTasks();
  const completed = tasks.filter((task) => task.completed).length;
  const pending = tasks.length - completed;
  const percentage = tasks.length
    ? Math.round((completed / tasks.length) * 100)
    : 0;

  totalCount.textContent = tasks.length;
  pendingCount.textContent = pending;
  completedCount.textContent = completed;
  listCount.textContent = visibleTasks.length;
  progressText.textContent = percentage + "%";
  progressBar.style.width = percentage + "%";

  taskList.replaceChildren();

  visibleTasks.forEach((task) => {
    taskList.appendChild(createTaskElement(task));
  });

  emptyState.hidden = visibleTasks.length > 0;
  clearCompletedButton.disabled = completed === 0;

  if (tasks.length === 0) {
    footerText.textContent = "You're all caught up.";
  } else if (pending === 0) {
    footerText.textContent = "Amazing! All tasks are complete.";
  } else {
    footerText.textContent = pending + " task" + (pending === 1 ? "" : "s") + " left to go.";
  }

  if (tasks.length > 0 && visibleTasks.length === 0) {
    const message = document.createElement("p");
    message.className = "no-results";
    message.textContent = "No tasks match your search or filter.";
    message.style.cssText = "padding:24px 0;text-align:center;color:#929bb1";
    taskList.appendChild(message);
  }
}

function addTask(title, priority) {
  tasks.unshift(createTask(title, priority));
  saveTasks();
  renderTasks();
}

function toggleTask(id) {
  tasks = tasks.map((task) =>
    task.id === id
      ? { ...task, completed: !task.completed }
      : task
  );
  saveTasks();
  renderTasks();
}

function deleteTask(id) {
  tasks = tasks.filter((task) => task.id !== id);
  saveTasks();
  renderTasks();
}

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = taskInput.value.trim();
  if (!title) {
    taskInput.focus();
    return;
  }

  addTask(title, priorityInput.value);
  taskForm.reset();
  priorityInput.value = "medium";
  taskInput.focus();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;

    filterButtons.forEach((item) => {
      const isActive = item === button;
      item.classList.toggle("active", isActive);
      item.setAttribute("aria-pressed", String(isActive));
    });

    renderTasks();
  });

  button.setAttribute(
    "aria-pressed",
    String(button.dataset.filter === activeFilter)
  );
});

searchInput.addEventListener("input", () => {
  searchTerm = searchInput.value.trim();
  renderTasks();
});

clearCompletedButton.addEventListener("click", () => {
  const completedCount = tasks.filter((task) => task.completed).length;
  if (completedCount === 0) return;

  const message =
    "Delete " +
    completedCount +
    " completed task" +
    (completedCount === 1 ? "" : "s") +
    "?";

  const confirmed = window.confirm(message);
  if (!confirmed) return;

  tasks = tasks.filter((task) => !task.completed);
  saveTasks();
  renderTasks();
});

renderTasks();

