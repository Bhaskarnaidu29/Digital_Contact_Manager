/**
 * Digital Contact Manager - Client-side Application Logic
 * Full-Stack JavaScript (ES6+) for student project submission
 */

// Application State
const state = {
  contacts: [],
  stats: {
    total: 0,
    favorites: 0,
    byCategory: {}
  },
  currentCategory: "All",
  searchQuery: "",
  sortBy: "name_asc",
  editingContactId: null,
  deleteContactId: null,
  isDbConnected: false
};

// DOM Element Selectors
const DOM = {
  // Stats
  statTotalContacts: document.getElementById("statTotalContacts"),
  statFavorites: document.getElementById("statFavorites"),
  statAcademicWork: document.getElementById("statAcademicWork"),
  statDbStatus: document.getElementById("statDbStatus"),

  // Search & Filters
  searchInput: document.getElementById("searchInput"),
  btnClearSearch: document.getElementById("btnClearSearch"),
  sortBySelect: document.getElementById("sortBySelect"),
  categoryTabs: document.getElementById("categoryTabs"),
  resultsCountText: document.getElementById("resultsCountText"),

  // Tab counters
  countAll: document.getElementById("countAll"),
  countFav: document.getElementById("countFav"),
  countCollege: document.getElementById("countCollege"),
  countWork: document.getElementById("countWork"),
  countPersonal: document.getElementById("countPersonal"),
  countFamily: document.getElementById("countFamily"),
  countEmergency: document.getElementById("countEmergency"),

  // Containers
  contactsContainer: document.getElementById("contactsContainer"),
  toastContainer: document.getElementById("toastContainer"),

  // Header Actions
  btnOpenAddModal: document.getElementById("btnOpenAddModal"),
  btnSeed: document.getElementById("btnSeed"),
  btnExportCsv: document.getElementById("btnExportCsv"),

  // Add / Edit Modal
  contactModal: document.getElementById("contactModal"),
  contactForm: document.getElementById("contactForm"),
  modalTitle: document.getElementById("modalTitle"),
  contactId: document.getElementById("contactId"),
  contactName: document.getElementById("contactName"),
  contactPhone: document.getElementById("contactPhone"),
  contactEmail: document.getElementById("contactEmail"),
  contactCategory: document.getElementById("contactCategory"),
  contactAddress: document.getElementById("contactAddress"),
  contactNotes: document.getElementById("contactNotes"),
  contactFavorite: document.getElementById("contactFavorite"),
  btnCloseModal: document.getElementById("btnCloseModal"),
  btnCancelModal: document.getElementById("btnCancelModal"),
  saveButtonText: document.getElementById("saveButtonText"),
  nameError: document.getElementById("nameError"),
  phoneError: document.getElementById("phoneError"),
  emailError: document.getElementById("emailError"),

  // Delete Modal
  deleteModal: document.getElementById("deleteModal"),
  deleteTargetName: document.getElementById("deleteTargetName"),
  btnCancelDelete: document.getElementById("btnCancelDelete"),
  btnConfirmDelete: document.getElementById("btnConfirmDelete")
};

// Avatar Color Palette for Contact Initials
const AVATAR_COLORS = [
  "#4f46e5", "#0ea5e9", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"
];

function getAvatarColor(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function getInitials(name = "") {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ==========================================================================
// Toast Notification Utility
// ==========================================================================
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  const iconSvg = {
    success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    error: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
    info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
  }[type] || "";

  toast.innerHTML = `${iconSvg} <span>${message}</span>`;
  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(40px)";
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

// ==========================================================================
// API Calls
// ==========================================================================

// Check Backend and MongoDB Health
async function checkServerHealth() {
  try {
    const res = await fetch("/api/health");
    const data = await res.json();
    if (data.database === "Connected") {
      DOM.statDbStatus.textContent = "MongoDB Connected";
      DOM.statDbStatus.className = "stat-value status-indicator";
      state.isDbConnected = true;
    } else {
      DOM.statDbStatus.textContent = "DB Disconnected";
      DOM.statDbStatus.className = "stat-value status-indicator offline";
      state.isDbConnected = false;
    }
  } catch (err) {
    DOM.statDbStatus.textContent = "Server Offline";
    DOM.statDbStatus.className = "stat-value status-indicator offline";
    state.isDbConnected = false;
  }
}

// Fetch Contacts with active query parameters
async function fetchContacts() {
  try {
    DOM.resultsCountText.textContent = "Loading contacts...";

    const params = new URLSearchParams();
    if (state.searchQuery.trim()) {
      params.append("search", state.searchQuery.trim());
    }
    if (state.currentCategory === "Favorites") {
      params.append("favorite", "true");
    } else if (state.currentCategory !== "All") {
      params.append("category", state.currentCategory);
    }
    if (state.sortBy) {
      params.append("sortBy", state.sortBy);
    }

    const res = await fetch(`/api/contacts?${params.toString()}`);
    const result = await res.json();

    if (!result.success) {
      throw new Error(result.message || "Failed to retrieve contacts");
    }

    state.contacts = result.data || [];
    if (result.stats) {
      state.stats = result.stats;
    }

    renderContacts();
    updateStatsUI(result.count, result.total);
    await checkServerHealth();
  } catch (error) {
    console.error("Fetch Contacts Error:", error);
    DOM.contactsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h3 class="empty-title">Could not load contacts</h3>
        <p class="empty-desc">${error.message}. Please ensure MongoDB is running and your server is active.</p>
        <button class="btn btn-primary" onclick="fetchContacts()">Try Again</button>
      </div>
    `;
    DOM.resultsCountText.textContent = "Connection failed";
  }
}

// ==========================================================================
// UI Rendering
// ==========================================================================

function updateStatsUI(filteredCount = 0, totalCount = 0) {
  const stats = state.stats;
  DOM.statTotalContacts.textContent = stats.total || 0;
  DOM.statFavorites.textContent = stats.favorites || 0;

  const academicCount = (stats.byCategory?.College || 0) + (stats.byCategory?.Work || 0);
  DOM.statAcademicWork.textContent = academicCount;

  // Category Tab Counts
  DOM.countAll.textContent = stats.total || 0;
  DOM.countFav.textContent = stats.favorites || 0;
  DOM.countCollege.textContent = stats.byCategory?.College || 0;
  DOM.countWork.textContent = stats.byCategory?.Work || 0;
  DOM.countPersonal.textContent = stats.byCategory?.Personal || 0;
  DOM.countFamily.textContent = stats.byCategory?.Family || 0;
  DOM.countEmergency.textContent = stats.byCategory?.Emergency || 0;

  // Search Results Header
  if (state.searchQuery.trim()) {
    DOM.resultsCountText.textContent = `Showing ${filteredCount} match${filteredCount === 1 ? "" : "es"} for "${state.searchQuery}" (out of ${totalCount} total)`;
  } else if (state.currentCategory !== "All") {
    DOM.resultsCountText.textContent = `Showing ${filteredCount} ${state.currentCategory} contact${filteredCount === 1 ? "" : "s"}`;
  } else {
    DOM.resultsCountText.textContent = `Showing all ${filteredCount} contact${filteredCount === 1 ? "" : "s"}`;
  }
}

function renderContacts() {
  const container = DOM.contactsContainer;
  container.innerHTML = "";

  if (state.contacts.length === 0) {
    if (state.searchQuery.trim() || state.currentCategory !== "All") {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <h3 class="empty-title">No matching contacts</h3>
          <p class="empty-desc">No contacts found matching your current search or category filter.</p>
          <button class="btn btn-secondary" onclick="resetFilters()">Clear Filters</button>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <line x1="19" y1="8" x2="19" y2="14"></line>
              <line x1="22" y1="11" x2="16" y2="11"></line>
            </svg>
          </div>
          <h3 class="empty-title">No contacts in your digital directory</h3>
          <p class="empty-desc">Get started by creating your first contact or load sample student demo data.</p>
          <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
            <button class="btn btn-primary" onclick="openAddModal()">+ Add First Contact</button>
            <button class="btn btn-secondary" onclick="seedDemoData()">Load Demo Contacts</button>
          </div>
        </div>
      `;
    }
    return;
  }

  state.contacts.forEach((contact) => {
    const card = document.createElement("article");
    card.className = `contact-card ${contact.isFavorite ? "is-favorite" : ""}`;
    card.id = `contact-${contact._id}`;

    const avatarBg = getAvatarColor(contact.name);
    const initials = getInitials(contact.name);
    const categoryClass = `badge-${contact.category?.toLowerCase() || "other"}`;

    // Clean phone number for WhatsApp wa.me link (digits only)
    const phoneDigits = (contact.phone || "").replace(/\D/g, "");
    const waUrl = phoneDigits ? `https://wa.me/${phoneDigits}` : "#";

    card.innerHTML = `
      <div class="card-header">
        <div class="card-profile">
          <div class="avatar" style="background-color: ${avatarBg}">${initials}</div>
          <div class="card-title-group">
            <h3 class="contact-name">${escapeHtml(contact.name)}</h3>
            <span class="badge ${categoryClass}">${escapeHtml(contact.category || "Personal")}</span>
          </div>
        </div>

        <button class="btn-star ${contact.isFavorite ? "active" : ""}" 
                title="${contact.isFavorite ? "Remove favorite" : "Mark as favorite"}"
                onclick="handleToggleFavorite('${contact._id}')"
                aria-label="Favorite">
          ★
        </button>
      </div>

      <div class="card-details">
        <div class="detail-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
          <a href="tel:${escapeHtml(contact.phone)}" class="detail-link" title="Click to call">${escapeHtml(contact.phone)}</a>
          ${phoneDigits ? `
            <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="whatsapp-btn" title="Message on WhatsApp">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.969.585 1.961.905 2.796.905 3.181 0 5.767-2.587 5.768-5.766.001-3.181-2.586-5.768-5.768-5.768zm0 10.355c-.752 0-1.637-.253-2.355-.68l-.168-.1-1.748.458.467-1.705-.11-.175c-.47-.746-.745-1.579-.744-2.486.001-2.529 2.059-4.587 4.589-4.587 2.529 0 4.587 2.058 4.588 4.588-.001 2.529-2.059 4.587-4.589 4.587z"/>
              </svg>
            </a>
          ` : ""}
        </div>

        ${contact.email ? `
          <div class="detail-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
            <a href="mailto:${escapeHtml(contact.email)}" class="detail-link" title="Click to email">${escapeHtml(contact.email)}</a>
          </div>
        ` : ""}

        ${contact.address ? `
          <div class="detail-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span>${escapeHtml(contact.address)}</span>
          </div>
        ` : ""}

        ${contact.notes ? `
          <div class="notes-box">
            "${escapeHtml(contact.notes)}"
          </div>
        ` : ""}
      </div>

      <div class="card-actions">
        <button class="btn-icon-action" onclick="openEditModal('${contact._id}')" title="Edit Contact">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          Edit
        </button>

        <button class="btn-icon-action btn-icon-danger" onclick="openDeleteModal('${contact._id}', '${escapeJsString(contact.name)}')" title="Delete Contact">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          Delete
        </button>
      </div>
    `;

    container.appendChild(card);
  });
}

// Utility: Prevent XSS
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeJsString(str = "") {
  return String(str).replace(/'/g, "\\'");
}

// ==========================================================================
// Modal Operations (Add / Edit)
// ==========================================================================

function openAddModal() {
  clearFormErrors();
  DOM.contactForm.reset();
  DOM.contactId.value = "";
  DOM.modalTitle.textContent = "Add New Contact";
  DOM.saveButtonText.textContent = "Save Contact";
  DOM.contactModal.classList.add("open");
  DOM.contactName.focus();
}

function openEditModal(id) {
  const contact = state.contacts.find((c) => c._id === id);
  if (!contact) return;

  clearFormErrors();
  DOM.contactId.value = contact._id;
  DOM.contactName.value = contact.name || "";
  DOM.contactPhone.value = contact.phone || "";
  DOM.contactEmail.value = contact.email || "";
  DOM.contactCategory.value = contact.category || "Personal";
  DOM.contactAddress.value = contact.address || "";
  DOM.contactNotes.value = contact.notes || "";
  DOM.contactFavorite.checked = Boolean(contact.isFavorite);

  DOM.modalTitle.textContent = "Edit Contact";
  DOM.saveButtonText.textContent = "Update Contact";
  DOM.contactModal.classList.add("open");
  DOM.contactName.focus();
}

function closeModal() {
  DOM.contactModal.classList.remove("open");
}

function clearFormErrors() {
  DOM.nameError.textContent = "";
  DOM.phoneError.textContent = "";
  DOM.emailError.textContent = "";
}

// Form Validation
function validateForm() {
  clearFormErrors();
  let isValid = true;

  const nameVal = DOM.contactName.value.trim();
  if (!nameVal) {
    DOM.nameError.textContent = "Name is required.";
    isValid = false;
  } else if (nameVal.length < 2) {
    DOM.nameError.textContent = "Name must have at least 2 characters.";
    isValid = false;
  }

  const phoneVal = DOM.contactPhone.value.trim();
  if (!phoneVal) {
    DOM.phoneError.textContent = "Phone number is required.";
    isValid = false;
  } else if (!/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]{6,16}$/.test(phoneVal)) {
    DOM.phoneError.textContent = "Please enter a valid phone number (e.g. +91 98765 43210).";
    isValid = false;
  }

  const emailVal = DOM.contactEmail.value.trim();
  if (emailVal && !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(emailVal)) {
    DOM.emailError.textContent = "Please enter a valid email format.";
    isValid = false;
  }

  return isValid;
}

// Save or Update Contact Form Submission
DOM.contactForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!validateForm()) return;

  const contactId = DOM.contactId.value;
  const isEditing = Boolean(contactId);

  const payload = {
    name: DOM.contactName.value.trim(),
    phone: DOM.contactPhone.value.trim(),
    email: DOM.contactEmail.value.trim(),
    category: DOM.contactCategory.value,
    address: DOM.contactAddress.value.trim(),
    notes: DOM.contactNotes.value.trim(),
    isFavorite: DOM.contactFavorite.checked
  };

  DOM.saveButtonText.textContent = isEditing ? "Updating..." : "Saving...";

  try {
    const url = isEditing ? `/api/contacts/${contactId}` : "/api/contacts";
    const method = isEditing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Failed to save contact");
    }

    closeModal();
    showToast(isEditing ? "Contact updated successfully!" : "New contact added!", "success");
    await fetchContacts();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    DOM.saveButtonText.textContent = isEditing ? "Update Contact" : "Save Contact";
  }
});

// Toggle Favorite Status
async function handleToggleFavorite(id) {
  try {
    const res = await fetch(`/api/contacts/${id}/favorite`, {
      method: "PATCH"
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Could not toggle favorite");
    }

    showToast(data.message, "info");
    await fetchContacts();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ==========================================================================
// Delete Modal Operations
// ==========================================================================

function openDeleteModal(id, name) {
  state.deleteContactId = id;
  DOM.deleteTargetName.textContent = `"${name}"`;
  DOM.deleteModal.classList.add("open");
}

function closeDeleteModal() {
  state.deleteContactId = null;
  DOM.deleteModal.classList.remove("open");
}

DOM.btnConfirmDelete.addEventListener("click", async () => {
  if (!state.deleteContactId) return;

  DOM.btnConfirmDelete.textContent = "Deleting...";

  try {
    const res = await fetch(`/api/contacts/${state.deleteContactId}`, {
      method: "DELETE"
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Failed to delete contact");
    }

    closeDeleteModal();
    showToast("Contact deleted successfully", "success");
    await fetchContacts();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    DOM.btnConfirmDelete.textContent = "Delete Contact";
  }
});

// ==========================================================================
// Seed Demo Data
// ==========================================================================
async function seedDemoData() {
  if (state.contacts.length > 0) {
    const proceed = confirm("Load sample student demo contacts? Existing contacts will be retained.");
    if (!proceed) return;
  }

  try {
    const res = await fetch("/api/contacts/seed?force=false", { method: "POST" });
    const data = await res.json();

    if (data.success) {
      showToast(data.message, "success");
      await fetchContacts();
    } else {
      showToast(data.message, "info");
    }
  } catch (error) {
    showToast("Failed to load demo contacts: " + error.message, "error");
  }
}

// ==========================================================================
// Export to CSV Feature (Student Project Showcase)
// ==========================================================================
function exportToCsv() {
  if (!state.contacts || state.contacts.length === 0) {
    showToast("No contacts available to export", "info");
    return;
  }

  const headers = ["Name", "Phone", "Email", "Category", "Address", "Favorite", "Notes"];
  const rows = state.contacts.map((c) => [
    `"${(c.name || "").replace(/"/g, '""')}"`,
    `"${(c.phone || "").replace(/"/g, '""')}"`,
    `"${(c.email || "").replace(/"/g, '""')}"`,
    `"${(c.category || "").replace(/"/g, '""')}"`,
    `"${(c.address || "").replace(/"/g, '""')}"`,
    c.isFavorite ? "Yes" : "No",
    `"${(c.notes || "").replace(/"/g, '""')}"`
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `digital_contacts_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast("Contacts exported to CSV successfully!", "success");
}

// Reset Search & Category Filters
function resetFilters() {
  state.searchQuery = "";
  state.currentCategory = "All";
  DOM.searchInput.value = "";
  DOM.btnClearSearch.style.display = "none";

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.category === "All");
  });

  fetchContacts();
}

// ==========================================================================
// Event Listeners & Initialization
// ==========================================================================

// Search Input Debouncing
let searchDebounceTimer = null;
DOM.searchInput.addEventListener("input", (e) => {
  const query = e.target.value;
  DOM.btnClearSearch.style.display = query ? "block" : "none";

  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    state.searchQuery = query;
    fetchContacts();
  }, 250);
});

DOM.btnClearSearch.addEventListener("click", () => {
  DOM.searchInput.value = "";
  DOM.btnClearSearch.style.display = "none";
  state.searchQuery = "";
  fetchContacts();
});

// Category Tabs
DOM.categoryTabs.addEventListener("click", (e) => {
  const button = e.target.closest(".tab-btn");
  if (!button) return;

  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
  button.classList.add("active");

  state.currentCategory = button.dataset.category;
  fetchContacts();
});

// Sort Selector
DOM.sortBySelect.addEventListener("change", (e) => {
  state.sortBy = e.target.value;
  fetchContacts();
});

// Header Buttons
DOM.btnOpenAddModal.addEventListener("click", openAddModal);
DOM.btnSeed.addEventListener("click", seedDemoData);
DOM.btnExportCsv.addEventListener("click", exportToCsv);

// Modal Close Triggers
DOM.btnCloseModal.addEventListener("click", closeModal);
DOM.btnCancelModal.addEventListener("click", closeModal);
DOM.contactModal.addEventListener("click", (e) => {
  if (e.target === DOM.contactModal) closeModal();
});

DOM.btnCancelDelete.addEventListener("click", closeDeleteModal);
DOM.deleteModal.addEventListener("click", (e) => {
  if (e.target === DOM.deleteModal) closeDeleteModal();
});

// Escape key to close any open modal
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal();
    closeDeleteModal();
  }
});

// Expose functions globally for inline HTML event handlers
window.openAddModal = openAddModal;
window.openEditModal = openEditModal;
window.openDeleteModal = openDeleteModal;
window.handleToggleFavorite = handleToggleFavorite;
window.seedDemoData = seedDemoData;
window.resetFilters = resetFilters;
window.fetchContacts = fetchContacts;

// Initial Load
document.addEventListener("DOMContentLoaded", () => {
  checkServerHealth();
  fetchContacts();
});
