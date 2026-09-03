import { db } from './db.js';
import { firebaseSync } from './firebase-sync.js';

// --- STATE MANAGEMENT ---
let currentDate = new Date();
let calendarDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
let saveTimeout = null;
let calendarRefreshTimeout = null; // debounce calendar dot refresh
let activeIssues = [];
let datesStatusMap = {};
let currentBoardData = { mode: 'notepad', notes: [] };
let isDraggingNote = false;
let isPanningCanvas = false;
let boardSaveTimeout = null;
let activeBoardTool = 'pan'; // 'pan' or 'select-delete'
let quickInfos = [];
let editingQuickInfoId = null;

// --- CLASSROOM MANAGEMENT STATE ---
let currentMode = 'notepad'; // 'notepad' or 'classroom'
let activeClassId = null;
let classesListState = [];
let studentsListState = [];
let classModalFields = [];
let selectedStudentId = null;

// --- DOM REFERENCES ---
const DOM = {
  calendarMonthYear: document.getElementById('calendar-month-year'),
  calendarGrid: document.getElementById('calendar-grid-cells'),
  prevMonthBtn: document.getElementById('prev-month'),
  nextMonthBtn: document.getElementById('next-month'),
  sidebarDayLabel: document.getElementById('sidebar-day-label'),
  sidebarDateLabel: document.getElementById('sidebar-date-label'),
  
  notepadActiveDate: document.getElementById('notepad-active-date'),
  notepadTextarea: document.getElementById('notepad-textarea'),
  saveStatusDot: document.getElementById('save-status-dot'),
  saveStatusText: document.getElementById('save-status-text'),
  notepadCardContainer: document.getElementById('notepad-card-container'),
  dragOverlay: document.getElementById('drag-overlay'),
  
  fileInput: document.getElementById('file-input'),
  uploadBtn: document.getElementById('btn-upload-file'),
  exportMDBtn: document.getElementById('btn-export-md'),
  clearNoteBtn: document.getElementById('btn-clear-note'),
  
  issueInput: document.getElementById('issue-input'),
  issueDeadline: document.getElementById('issue-deadline'),
  addIssueBtn: document.getElementById('btn-add-issue'),
  issuesList: document.getElementById('issues-list-container'),
  issueCount: document.getElementById('issue-count'),
  
  attachmentsList: document.getElementById('attachments-list-container'),
  
  previewModal: document.getElementById('preview-modal'),
  modalCloseBtn: document.getElementById('modal-close-btn'),
  modalPreviewImg: document.getElementById('modal-preview-img'),
  modalPreviewTitle: document.getElementById('modal-preview-title'),
  modalDownloadBtn: document.getElementById('modal-download-btn'),
  
  exportBackupBtn: document.getElementById('btn-export-backup'),
  importBackupBtn: document.getElementById('btn-import-backup'),
  importFileInput: document.getElementById('import-file-input'),
  toastContainer: document.getElementById('toast-container'),
  
  // Rich Notepad elements
  findReplaceBar: document.getElementById('find-replace-bar'),
  searchInput: document.getElementById('search-input'),
  replaceInput: document.getElementById('replace-input'),
  btnToggleFind: document.getElementById('btn-toggle-find'),
  btnFindNext: document.getElementById('btn-find-next'),
  btnReplace: document.getElementById('btn-replace'),
  btnReplaceAll: document.getElementById('btn-replace-all'),
  btnCloseFind: document.getElementById('btn-close-find'),
  themeToggleBtn: document.getElementById('btn-theme-toggle'),
  globalSearchInput: document.getElementById('global-search-input'),
  globalSearchResults: document.getElementById('global-search-results'),
  btnModeNotepad: document.getElementById('btn-mode-notepad'),
  btnModeBoard: document.getElementById('btn-mode-board'),
  btnBoardAddNote: document.getElementById('btn-board-add-note'),
  btnBoardAddFile: document.getElementById('btn-board-add-file'),
  boardFileInput: document.getElementById('board-file-input'),
  btnBoardImportNote: document.getElementById('btn-board-import-note'),
  btnBoardConvertToNote: document.getElementById('btn-board-convert-to-note'),
  btnBoardClear: document.getElementById('btn-board-clear'),
  btnBoardAddText: document.getElementById('btn-board-add-text'),
  btnBoardClose: document.getElementById('btn-board-close'),
  toolBtnPan: document.getElementById('tool-btn-pan'),
  toolBtnSelect: document.getElementById('tool-btn-select'),
  
  // Quick Info DOM elements
  btnOpenQuickInfo: document.getElementById('btn-open-quick-info'),
  quickInfoModal: document.getElementById('quick-info-modal'),
  quickInfoCloseBtn: document.getElementById('quick-info-close-btn'),
  quickInfoTitleInput: document.getElementById('quick-info-title-input'),
  quickInfoValueInput: document.getElementById('quick-info-value-input'),
  btnAddQuickInfo: document.getElementById('btn-add-quick-info'),
  quickInfoSearchInput: document.getElementById('quick-info-search-input'),
  quickInfoSearchWrapper: document.getElementById('quick-info-search-wrapper'),
  quickInfoList: document.getElementById('quick-info-list-container'),
  quickInfoCount: document.getElementById('quick-info-count'),
  quickInfoBtnGroup: document.getElementById('quick-info-btn-group'),

  // Sidebar tab switch
  btnSidebarTabCalendar: document.getElementById('btn-sidebar-tab-calendar'),
  btnSidebarTabClasses: document.getElementById('btn-sidebar-tab-classes'),
  sidebarCalendarWidget: document.getElementById('sidebar-calendar-widget'),
  sidebarClassesWidget: document.getElementById('sidebar-classes-widget'),
  
  // Classes widget
  btnSidebarAddClass: document.getElementById('btn-sidebar-add-class'),
  classesListContainer: document.getElementById('classes-list-container'),
  
  // Classroom workspace
  classroomCardContainer: document.getElementById('classroom-card-container'),
  classroomActiveTitle: document.getElementById('classroom-active-title'),
  classroomHeaderActions: document.getElementById('classroom-header-actions'),
  classroomEmptyState: document.getElementById('classroom-empty-state'),
  classroomActiveView: document.getElementById('classroom-active-view'),
  studentGridContainer: document.getElementById('student-grid-container'),
  
  // Class Modal
  classModal: document.getElementById('class-modal'),
  classCloseBtn: document.getElementById('class-close-btn'),
  classModalTitle: document.getElementById('class-modal-title'),
  classNameInput: document.getElementById('class-name-input'),
  classFieldsListBuilder: document.getElementById('class-fields-list-builder'),
  btnAddCustomField: document.getElementById('btn-add-custom-field'),
  btnSaveClass: document.getElementById('btn-save-class'),
  
  // Student Modal
  studentModal: document.getElementById('student-modal'),
  studentCloseBtn: document.getElementById('student-close-btn'),
  studentModalTitle: document.getElementById('student-modal-title'),
  studentFieldsContainer: document.getElementById('student-fields-container'),
  btnSaveStudent: document.getElementById('btn-save-student'),
  
  // Search bar
  classroomSearchContainer: document.getElementById('classroom-search-container'),
  classroomStudentSearch: document.getElementById('classroom-student-search'),
  
  // Right bar classroom content
  notepadRightBarContent: document.getElementById('notepad-right-bar-content'),
  classroomRightBarContent: document.getElementById('classroom-right-bar-content'),
  classroomStudentDetailEmpty: document.getElementById('classroom-student-detail-empty'),
  classroomStudentDetailView: document.getElementById('classroom-student-detail-view'),
  
  // Detail panel elements
  detailStudentAvatar: document.getElementById('detail-student-avatar'),
  detailStudentName: document.getElementById('detail-student-name'),
  detailStudentBadge: document.getElementById('detail-student-badge'),
  detailStudentFieldsList: document.getElementById('detail-student-fields-list'),
  detailStudentViolationsList: document.getElementById('detail-student-violations-list'),
  detailBtnEditStudent: document.getElementById('detail-btn-edit-student'),
  detailBtnDeleteStudent: document.getElementById('detail-btn-delete-student'),
  detailBtnAddViolation: document.getElementById('detail-btn-add-violation'),
  
  // Violation Modal
  violationModal: document.getElementById('violation-modal'),
  violationCloseBtn: document.getElementById('violation-close-btn'),
  violationStudentName: document.getElementById('violation-student-name'),
  violationContentInput: document.getElementById('violation-content-input'),
  violationDateInput: document.getElementById('violation-date-input'),
  btnSaveViolation: document.getElementById('btn-save-violation'),
  
  // Quick tags
  tagVangKhongPhep: document.getElementById('tag-vang-khong-phep'),
  tagVangCoPhep: document.getElementById('tag-vang-co-phep'),
  tagDiMuon: document.getElementById('tag-di-muon'),
  tagKhongBaiTap: document.getElementById('tag-khong-bai-tap'),
  tagKhongChuanBi: document.getElementById('tag-khong-chuan-bi'),

  // Violation History Modal
  violationHistoryModal: document.getElementById('violation-history-modal'),
  violationHistoryCloseBtn: document.getElementById('violation-history-close-btn'),
  violationHistoryStudentNameSpan: document.getElementById('violation-history-student-name-span'),
  violationHistoryList: document.getElementById('violation-history-list'),

  rightBar: document.querySelector('.sidebar.right-bar')
};

// --- CONSTANTS ---
const WEEKDAYS_VN = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const MONTHS_VN = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
];

// --- UTILITY FUNCTIONS ---
function compressImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.7) {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', quality);
      };
      img.onerror = () => resolve(file);
      img.src = event.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}
function formatDateKey(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateDisplay(date) {
  const dayName = WEEKDAYS_VN[date.getDay()];
  const day = date.getDate();
  const month = MONTHS_VN[date.getMonth()];
  const year = date.getFullYear();
  return `${dayName}, ${day} ${month}, ${year}`;
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = '<i data-lucide="check" style="width: 14px; height: 14px;"></i>';
  if (type === 'error') icon = '<i data-lucide="alert-triangle" style="width: 14px; height: 14px;"></i>';
  else if (type === 'info') icon = '<i data-lucide="info" style="width: 14px; height: 14px;"></i>';
  
  toast.innerHTML = `
    <div class="toast-icon-badge">${icon}</div>
    <span>${message}</span>
  `;
  DOM.toastContainer.appendChild(toast);
  if (window.lucide) lucide.createIcons();
  setTimeout(() => toast.remove(), 3000);
}

function showConfirm(title, message, type = 'info') {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-modal-title');
    const msgEl = document.getElementById('confirm-modal-message');
    const iconContainer = document.getElementById('confirm-modal-icon-container');
    const btnCancel = document.getElementById('btn-confirm-cancel');
    const btnOk = document.getElementById('btn-confirm-ok');
    
    if (!modal || !titleEl || !msgEl || !iconContainer || !btnCancel || !btnOk) {
      resolve(confirm(message));
      return;
    }
    
    titleEl.textContent = title;
    msgEl.textContent = message;
    
    btnOk.className = 'btn';
    
    if (type === 'danger') {
      iconContainer.style.background = 'rgba(239, 68, 68, 0.1)';
      iconContainer.style.color = 'var(--danger)';
      iconContainer.innerHTML = '<i data-lucide="trash-2" style="width: 28px; height: 28px;"></i>';
      btnOk.classList.add('btn-danger');
    } else if (type === 'warning') {
      iconContainer.style.background = 'rgba(245, 158, 11, 0.1)';
      iconContainer.style.color = 'var(--warning)';
      iconContainer.innerHTML = '<i data-lucide="alert-triangle" style="width: 28px; height: 28px;"></i>';
      btnOk.classList.add('btn-warning');
    } else {
      iconContainer.style.background = 'rgba(99, 102, 241, 0.1)';
      iconContainer.style.color = 'var(--primary)';
      iconContainer.innerHTML = '<i data-lucide="help-circle" style="width: 28px; height: 28px;"></i>';
      btnOk.classList.add('btn-primary');
    }
    
    if (window.lucide) lucide.createIcons();
    
    modal.classList.add('active');
    
    const cleanup = (value) => {
      modal.classList.remove('active');
      btnOk.removeEventListener('click', onOk);
      btnCancel.removeEventListener('click', onCancel);
      resolve(value);
    };
    
    function onOk() { cleanup(true); }
    function onCancel() { cleanup(false); }
    
    btnOk.addEventListener('click', onOk);
    btnCancel.addEventListener('click', onCancel);
  });
}


function setSaveStatus(status) {
  DOM.saveStatusDot.className = 'status-dot';
  if (status === 'saved') {
    DOM.saveStatusDot.classList.add('saved');
    DOM.saveStatusText.textContent = 'Đã lưu';
  } else if (status === 'saving') {
    DOM.saveStatusDot.classList.add('saving');
    DOM.saveStatusText.textContent = 'Đang lưu...';
  } else if (status === 'error') {
    DOM.saveStatusDot.classList.add('error');
    DOM.saveStatusText.textContent = 'Lỗi lưu';
  } else {
    DOM.saveStatusText.textContent = 'Chờ lưu...';
  }
}

// --- FILE SIZE FORMATTER ---
function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// --- CLASSROOM METHODS ---
function switchMode(mode) {
  currentMode = mode;
  if (mode === 'classroom') {
    DOM.btnSidebarTabCalendar.classList.remove('active');
    DOM.btnSidebarTabCalendar.style.background = 'transparent';
    DOM.btnSidebarTabCalendar.style.color = 'var(--text-muted)';
    
    DOM.btnSidebarTabClasses.classList.add('active');
    DOM.btnSidebarTabClasses.style.background = '';
    DOM.btnSidebarTabClasses.style.color = '';
    
    DOM.sidebarCalendarWidget.style.display = 'none';
    DOM.sidebarClassesWidget.style.display = 'block';
    
    DOM.notepadCardContainer.style.display = 'none';
    DOM.classroomCardContainer.style.display = 'flex';
    DOM.rightBar.classList.remove('hidden');
    DOM.notepadRightBarContent.style.display = 'none';
    DOM.classroomRightBarContent.style.display = 'flex';
    
    selectedStudentId = null;
    renderSelectedStudentDetail();
    
    loadClasses();
  } else {
    DOM.btnSidebarTabClasses.classList.remove('active');
    DOM.btnSidebarTabClasses.style.background = 'transparent';
    DOM.btnSidebarTabClasses.style.color = 'var(--text-muted)';
    
    DOM.btnSidebarTabCalendar.classList.add('active');
    DOM.btnSidebarTabCalendar.style.background = 'rgba(255, 255, 255, 0.05)';
    DOM.btnSidebarTabCalendar.style.color = 'var(--text-main)';
    
    DOM.sidebarClassesWidget.style.display = 'none';
    DOM.sidebarCalendarWidget.style.display = 'block';
    
    DOM.classroomCardContainer.style.display = 'none';
    DOM.notepadCardContainer.style.display = 'flex';
    DOM.rightBar.classList.remove('hidden');
    DOM.classroomRightBarContent.style.display = 'none';
    DOM.notepadRightBarContent.style.display = 'flex';
    
    renderCalendar();
  }
}

async function ensureDefaultClasses() {
  const seeded = localStorage.getItem('auto_seed_ks25_v2');
  if (seeded) return;
  try {
    const existingClasses = await db.getClasses();
    const hasCNTT7 = existingClasses.some(c => c.name === 'KS25_CNTT7');
    const hasCNTT5 = existingClasses.some(c => c.name === 'KS25_CNTT5');

    if (!hasCNTT7 && typeof seedKS25CNTT7 === 'function') {
      await seedKS25CNTT7();
    }
    if (!hasCNTT5 && typeof seedKS25CNTT5 === 'function') {
      await seedKS25CNTT5();
    }
    localStorage.setItem('auto_seed_ks25_v2', 'true');
  } catch (err) {
    console.error('Error auto-seeding default classes:', err);
  }
}

async function loadClasses() {
  try {
    await ensureDefaultClasses();

    classesListState = await db.getClasses();
    renderClasses();
    
    // Restore active class view if a class is selected
    if (activeClassId) {
      const activeClassExists = classesListState.some(c => c.id === activeClassId);
      if (activeClassExists) {
        selectClass(activeClassId);
      } else {
        activeClassId = null;
        showClassroomEmptyState();
      }
    } else if (classesListState.length > 0) {
      selectClass(classesListState[0].id);
    } else {
      showClassroomEmptyState();
    }
  } catch (error) {
    console.error('Error loading classes:', error);
  }
}

function showClassroomEmptyState() {
  DOM.classroomEmptyState.style.display = 'flex';
  DOM.classroomActiveView.style.display = 'none';
  DOM.classroomActiveTitle.textContent = 'Quản lý lớp học';
  DOM.classroomHeaderActions.innerHTML = '';
  DOM.classroomSearchContainer.style.display = 'none';
}

function renderClasses() {
  DOM.classesListContainer.innerHTML = '';
  if (classesListState.length === 0) {
    DOM.classesListContainer.innerHTML = `
      <div style="font-size: 0.8rem; color: var(--text-dark); text-align: center; padding: 20px 10px;">
        Chưa có lớp học nào được tạo.
      </div>
    `;
    return;
  }
  
  classesListState.forEach(cls => {
    const item = document.createElement('div');
    item.className = `class-item ${activeClassId === cls.id ? 'active' : ''}`;
    
    const nameSpan = document.createElement('span');
    nameSpan.textContent = cls.name;
    nameSpan.style.cssText = 'white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;';
    item.appendChild(nameSpan);
    
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'class-item-actions';
    
    const editBtn = document.createElement('button');
    editBtn.className = 'class-item-btn';
    editBtn.innerHTML = '<i data-lucide="settings" style="width: 12px; height: 12px;"></i>';
    editBtn.title = 'Cấu hình lớp';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openClassModal(cls);
    });
    
    const delBtn = document.createElement('button');
    delBtn.className = 'class-item-btn';
    delBtn.innerHTML = '<i data-lucide="trash-2" style="width: 12px; height: 12px;"></i>';
    delBtn.title = 'Xóa lớp';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteClass(cls.id);
    });
    
    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(delBtn);
    item.appendChild(actionsDiv);
    
    item.addEventListener('click', () => {
      selectClass(cls.id);
    });
    
    DOM.classesListContainer.appendChild(item);
  });
  
  if (window.lucide) lucide.createIcons();
}

let editingClassId = null;

function normalizeClassFields(fields) {
  if (Array.isArray(fields)) return fields;
  const result = [];
  if (fields) {
    if (fields.mssv) result.push({ id: 'mssv', name: 'MSSV', type: 'text' });
    if (fields.email) result.push({ id: 'email', name: 'Email', type: 'text' });
    if (fields.phone) result.push({ id: 'phone', name: 'Số điện thoại', type: 'text' });
    if (fields.note) result.push({ id: 'note', name: 'Ghi chú', type: 'text' });
  }
  return result;
}

function renderClassFieldsBuilder() {
  DOM.classFieldsListBuilder.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.01); padding: 8px 10px; border-radius: var(--border-radius-sm); border: 1px solid var(--border-light); opacity: 0.65;">
      <span style="font-size: 0.82rem; color: var(--text-main); flex: 1; font-weight: 500;">Họ và tên (Bắt buộc)</span>
      <span style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Chữ</span>
    </div>
  `;

  classModalFields.forEach((field, index) => {
    const row = document.createElement('div');
    row.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-top: 4px;';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'input-field';
    input.value = field.name;
    input.placeholder = 'Tên trường (ví dụ: Điểm học tập)';
    input.style.cssText = 'flex: 1; padding: 6px 10px; font-size: 0.82rem; border: 1px solid var(--border-light); border-radius: var(--border-radius-sm); outline: none; background: transparent; color: var(--text-main);';
    input.addEventListener('input', (e) => {
      field.name = e.target.value;
    });

    const select = document.createElement('select');
    select.style.cssText = 'padding: 6px 8px; font-size: 0.8rem; border-radius: var(--border-radius-sm); border: 1px solid var(--border-light); background: var(--bg-card); color: var(--text-main); outline: none; cursor: pointer;';
    select.innerHTML = `
      <option value="text" ${field.type === 'text' ? 'selected' : ''}>Chữ</option>
      <option value="number" ${field.type === 'number' ? 'selected' : ''}>Số</option>
    `;
    select.addEventListener('change', (e) => {
      field.type = e.target.value;
    });

    const delBtn = document.createElement('button');
    delBtn.className = 'action-icon-btn btn-delete-attach';
    delBtn.style.cssText = 'padding: 0; height: 32px; width: 32px; display: flex; align-items: center; justify-content: center; background: transparent; border: 1px solid var(--border-light); border-radius: var(--border-radius-sm); color: var(--danger); cursor: pointer; transition: var(--transition);';
    delBtn.innerHTML = '<i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>';
    delBtn.addEventListener('click', () => {
      classModalFields.splice(index, 1);
      renderClassFieldsBuilder();
    });

    row.appendChild(input);
    row.appendChild(select);
    row.appendChild(delBtn);
    DOM.classFieldsListBuilder.appendChild(row);
  });
  
  if (window.lucide) lucide.createIcons();
}

function openClassModal(cls = null) {
  if (cls) {
    editingClassId = cls.id;
    DOM.classModalTitle.textContent = 'Cấu hình lớp học';
    DOM.classNameInput.value = cls.name;
    classModalFields = normalizeClassFields(cls.fields);
  } else {
    editingClassId = null;
    DOM.classModalTitle.textContent = 'Tạo lớp học mới';
    DOM.classNameInput.value = '';
    classModalFields = [
      { id: 'mssv', name: 'MSSV', type: 'text' },
      { id: 'phone', name: 'Số điện thoại', type: 'text' }
    ];
  }
  renderClassFieldsBuilder();
  DOM.classModal.classList.add('active');
  DOM.classNameInput.focus();
}

async function addOrUpdateClass() {
  const name = DOM.classNameInput.value.trim();
  if (!name) {
    showToast('Vui lòng nhập tên lớp học!', 'info');
    return;
  }
  
  const fields = classModalFields
    .map(f => ({ ...f, name: f.name.trim() }))
    .filter(f => f.name.length > 0);
  
  const id = editingClassId || 'class_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  try {
    await db.saveClass(id, name, fields);
    if (firebaseSync.isConnected()) {
      firebaseSync.uploadClass(id, name, fields).catch(err => console.error("Sync error:", err));
    }
    DOM.classModal.classList.remove('active');
    showToast(editingClassId ? 'Đã cập nhật cấu hình lớp học' : 'Đã tạo lớp học mới');
    
    if (!editingClassId) {
      activeClassId = id; // select new class
    }
    
    await loadClasses();
  } catch (error) {
    console.error('Error saving class:', error);
    showToast('Lỗi lưu lớp học!', 'error');
  }
}

async function deleteClass(classId) {
  const confirmed = await showConfirm(
    'Xóa lớp học', 
    'Bạn có chắc chắn muốn xóa lớp học này? Toàn bộ danh sách học sinh và lịch sử vi phạm sẽ bị xóa vĩnh viễn.', 
    'danger'
  );
  if (!confirmed) return;
  
  try {
    // Delete all students of this class in local IndexedDB first
    const studentsInClass = await db.getStudents(classId);
    for (const student of studentsInClass) {
      await db.deleteStudent(student.id);
    }
    
    // Delete class locally
    await db.deleteClass(classId);
    
    showToast('Đã xóa lớp học');
    if (activeClassId === classId) {
      activeClassId = null;
      selectedStudentId = null;
      renderSelectedStudentDetail();
      showClassroomEmptyState();
    }
    await loadClasses();

    // Trigger cloud synchronization in the background asynchronously
    if (firebaseSync.isConnected()) {
      (async () => {
        for (const student of studentsInClass) {
          firebaseSync.deleteStudent(student.id).catch(err => console.error("Sync error deleting student:", err));
        }
        await firebaseSync.deleteClass(classId);
      })().catch(err => console.error("Cloud sync deletion failed:", err));
    }
  } catch (error) {
    console.error('Error deleting class:', error);
    showToast('Lỗi xóa lớp học!', 'error');
  }
}

async function selectClass(classId) {
  activeClassId = classId;
  
  renderClasses();
  
  const selectedClass = classesListState.find(c => c.id === classId);
  if (!selectedClass) return;
  
  DOM.classroomEmptyState.style.display = 'none';
  DOM.classroomActiveView.style.display = 'block';
  
  DOM.classroomActiveTitle.textContent = selectedClass.name;
  DOM.classroomSearchContainer.style.display = 'flex';
  DOM.classroomStudentSearch.value = '';
  
  DOM.classroomHeaderActions.innerHTML = `
    <button class="btn btn-primary" id="btn-add-student" title="Thêm sinh viên" style="height: 36px; padding: 0 12px; font-size: 0.8rem; font-weight: 600; display: flex; align-items: center; gap: 6px; white-space: nowrap; flex-shrink: 0; border-radius: var(--border-radius-md); box-shadow: 0 4px 12px var(--primary-glow);">
      <i data-lucide="plus-circle" style="width: 15px; height: 15px;"></i> <span class="btn-label-text">Thêm SV</span>
    </button>
  `;
  
  document.getElementById('btn-add-student').addEventListener('click', () => openStudentModal());
  
  selectedStudentId = null;
  renderSelectedStudentDetail();
  
  if (window.lucide) lucide.createIcons();
  
  await loadStudents();
}

async function loadStudents() {
  if (!activeClassId) return;
  try {
    studentsListState = await db.getStudents(activeClassId);
    
    // Sort students by name
    studentsListState.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    
    renderStudents();
  } catch (error) {
    console.error('Error loading students:', error);
  }
}

function renderStudents() {
  DOM.studentGridContainer.innerHTML = '';
  
  const selectedClass = classesListState.find(c => c.id === activeClassId);
  if (!selectedClass) return;
  
  // Real-time filtering by search text
  const searchVal = DOM.classroomStudentSearch.value.trim().toLowerCase();
  const filteredStudents = studentsListState.filter(s => 
    s.name.toLowerCase().includes(searchVal)
  );
  
  if (filteredStudents.length === 0) {
    DOM.studentGridContainer.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; min-height: 200px;">
        <span class="empty-state-icon"><i data-lucide="users" style="width: 48px; height: 48px; color: var(--text-dark);"></i></span>
        <span style="font-size: 0.9rem; color: var(--text-muted);">Không tìm thấy sinh viên nào phù hợp.</span>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }
  
  const fields = normalizeClassFields(selectedClass.fields);
  const noteField = fields.find(f => f.name.toLowerCase().includes('ghi chú') || f.id === 'note');
  
  filteredStudents.forEach(student => {
    const card = document.createElement('div');
    card.className = `student-card ${student.id === selectedStudentId ? 'selected-active' : ''}`;
    
    // Get initials for avatar
    const nameParts = student.name.trim().split(' ');
    const initials = nameParts.length > 1 
      ? (nameParts[0][0] + nameParts[nameParts.length - 1][0])
      : nameParts[0].substr(0, 2);
    
    // Header
    const header = document.createElement('div');
    header.className = 'student-profile-header';
    
    const avatar = document.createElement('div');
    avatar.className = 'student-avatar';
    avatar.textContent = initials;
    
    const meta = document.createElement('div');
    meta.className = 'student-info-meta';
    
    const name = document.createElement('div');
    name.className = 'student-name';
    name.textContent = student.name;
    name.title = student.name;
    
    const violationsCount = student.violations ? student.violations.length : 0;
    const badge = document.createElement('span');
    if (violationsCount === 0) {
      badge.className = 'student-violation-badge clean';
      badge.innerHTML = '<i data-lucide="check-circle" style="width: 11px; height: 11px;"></i> Tốt (0)';
    } else if (violationsCount < 3) {
      badge.className = 'student-violation-badge warn';
      badge.innerHTML = `<i data-lucide="alert-circle" style="width: 11px; height: 11px;"></i> Cảnh cáo (${violationsCount})`;
    } else {
      badge.className = 'student-violation-badge danger';
      badge.innerHTML = `<i data-lucide="alert-triangle" style="width: 11px; height: 11px;"></i> Vi phạm (${violationsCount})`;
    }
    
    meta.appendChild(name);
    meta.appendChild(badge);
    header.appendChild(avatar);
    header.appendChild(meta);
    card.appendChild(header);
    
    // Fields list (only display Note by default)
    const fieldsList = document.createElement('div');
    fieldsList.className = 'student-fields-list';
    
    const noteVal = student.note || (noteField ? (student[noteField.id] || student.customFields?.[noteField.id]) : '');
    if (noteVal) {
      fieldsList.innerHTML = `
        <div class="student-field-item">
          <i data-lucide="file-text" style="width: 13px; height: 13px;"></i>
          <span class="student-field-value" title="${noteVal}">Ghi chú: ${noteVal}</span>
        </div>
      `;
      card.appendChild(fieldsList);
    }
    
    // Click card selection
    card.addEventListener('click', (e) => {
      if (e.target.closest('.action-icon-btn') || e.target.closest('.student-action-btn')) {
        return;
      }
      selectedStudentId = student.id;
      renderSelectedStudentDetail();
      
      document.querySelectorAll('.student-card').forEach(c => c.classList.remove('selected-active'));
      card.classList.add('selected-active');
    });
    
    // Top action buttons (Edit, Delete) - absolute hover
    const topActions = document.createElement('div');
    topActions.className = 'student-card-top-actions';
    
    const editBtn = document.createElement('button');
    editBtn.className = 'action-icon-btn';
    editBtn.innerHTML = '<i data-lucide="edit-2" style="width: 12px; height: 12px;"></i>';
    editBtn.title = 'Sửa thông tin';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openStudentModal(student);
    });
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-icon-btn btn-delete-attach';
    deleteBtn.innerHTML = '<i data-lucide="trash-2" style="width: 12px; height: 12px;"></i>';
    deleteBtn.title = 'Xóa sinh viên';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteStudent(student.id);
    });
    
    topActions.appendChild(editBtn);
    topActions.appendChild(deleteBtn);
    card.appendChild(topActions);
    
    // Bottom action buttons (Log Violation, View History)
    const actions = document.createElement('div');
    actions.className = 'student-card-actions';
    
    const logBtn = document.createElement('button');
    logBtn.className = 'btn btn-violation-chip student-action-btn';
    logBtn.innerHTML = '<i data-lucide="alert-triangle" style="width: 11px; height: 11px;"></i> Vi phạm';
    logBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openViolationModal(student);
    });
    
    const historyBtn = document.createElement('button');
    historyBtn.className = 'btn student-action-btn';
    historyBtn.style.cssText = 'background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-light); color: var(--text-main);';
    historyBtn.innerHTML = '<i data-lucide="list" style="width: 13px; height: 13px;"></i> Chi tiết';
    historyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedStudentId = student.id;
      renderSelectedStudentDetail();
      document.querySelectorAll('.student-card').forEach(c => c.classList.remove('selected-active'));
      card.classList.add('selected-active');
    });
    
    actions.appendChild(logBtn);
    actions.appendChild(historyBtn);
    card.appendChild(actions);
    
    DOM.studentGridContainer.appendChild(card);
  });
  
  if (window.lucide) lucide.createIcons();
}

let editingStudentId = null;

function openStudentModal(student = null) {
  const selectedClass = classesListState.find(c => c.id === activeClassId);
  if (!selectedClass) return;
  
  DOM.studentFieldsContainer.innerHTML = '';
  
  // Full Name - Always required
  DOM.studentFieldsContainer.innerHTML += `
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <span style="font-size: 0.76rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Họ và tên *</span>
      <input type="text" id="student-name-input" class="input-field" placeholder="Nhập họ và tên..." value="${student ? student.name : ''}" style="border: 1px solid var(--border-light); border-radius: var(--border-radius-sm); padding: 10px 14px; width: 100%; color: var(--text-main); outline: none;">
    </div>
  `;
  
  const fields = normalizeClassFields(selectedClass.fields);
  
  // Render fields dynamically
  fields.forEach(field => {
    let val = '';
    if (student) {
      val = student[field.id] !== undefined ? student[field.id] : (student.customFields?.[field.id] || '');
    }
    
    DOM.studentFieldsContainer.innerHTML += `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <span style="font-size: 0.76rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">${field.name}</span>
        <input type="${field.type === 'number' ? 'number' : 'text'}" id="student-field-${field.id}" class="input-field" placeholder="Nhập ${field.name}..." value="${val}" style="border: 1px solid var(--border-light); border-radius: var(--border-radius-sm); padding: 10px 14px; width: 100%; color: var(--text-main); outline: none;" ${field.type === 'number' ? 'step="any"' : ''}>
      </div>
    `;
  });
  
  editingStudentId = student ? student.id : null;
  DOM.studentModalTitle.textContent = student ? 'Cập nhật thông tin sinh viên' : 'Thêm sinh viên mới';
  DOM.studentModal.classList.add('active');
  
  setTimeout(() => {
    const input = document.getElementById('student-name-input');
    if (input) input.focus();
  }, 100);
}

async function addOrUpdateStudent() {
  const nameInput = document.getElementById('student-name-input');
  if (!nameInput) return;
  
  const name = nameInput.value.trim();
  if (!name) {
    showToast('Vui lòng nhập tên sinh viên!', 'info');
    return;
  }
  
  const selectedClass = classesListState.find(c => c.id === activeClassId);
  if (!selectedClass) return;
  
  const fields = normalizeClassFields(selectedClass.fields);
  
  const studentData = {
    id: editingStudentId || 'stud_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    classId: activeClassId,
    name,
    violations: editingStudentId 
      ? (studentsListState.find(s => s.id === editingStudentId)?.violations || [])
      : []
  };
  
  // Capture inputs dynamically
  fields.forEach(field => {
    const input = document.getElementById(`student-field-${field.id}`);
    if (input) {
      let val = input.value.trim();
      if (field.type === 'number') {
        val = val === '' ? null : Number(val);
      }
      studentData[field.id] = val;
    }
  });
  
  try {
    await db.saveStudent(studentData);
    if (firebaseSync.isConnected()) {
      firebaseSync.uploadStudent(studentData).catch(err => console.error("Sync error:", err));
    }
    DOM.studentModal.classList.remove('active');
    showToast(editingStudentId ? 'Đã cập nhật sinh viên' : 'Đã thêm sinh viên');
    
    await loadStudents();
    
    if (studentData.id === selectedStudentId) {
      renderSelectedStudentDetail();
    }
  } catch (error) {
    console.error('Error saving student:', error);
    showToast('Lỗi lưu sinh viên!', 'error');
  }
}

async function deleteStudent(studentId) {
  const confirmed = await showConfirm(
    'Xóa sinh viên',
    'Bạn có chắc chắn muốn xóa sinh viên này khỏi lớp học? Dữ liệu vi phạm cũng sẽ bị xóa.',
    'danger'
  );
  if (!confirmed) return;
  
  try {
    await db.deleteStudent(studentId);
    if (firebaseSync.isConnected()) {
      firebaseSync.deleteStudent(studentId).catch(err => console.error("Sync error:", err));
    }
    showToast('Đã xóa sinh viên');
    if (selectedStudentId === studentId) {
      selectedStudentId = null;
      renderSelectedStudentDetail();
    }
    await loadStudents();
  } catch (error) {
    console.error('Error deleting student:', error);
    showToast('Lỗi xóa sinh viên!', 'error');
  }
}

let activeStudentForViolation = null;

function openViolationModal(student) {
  activeStudentForViolation = student;
  DOM.violationStudentName.textContent = student.name;
  DOM.violationContentInput.value = '';
  
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  DOM.violationDateInput.value = `${year}-${month}-${day}`;
  
  DOM.violationModal.classList.add('active');
  DOM.violationContentInput.focus();
}

async function saveViolation() {
  const content = DOM.violationContentInput.value.trim();
  if (!content) {
    showToast('Vui lòng nhập nội dung vi phạm!', 'info');
    return;
  }
  
  const date = DOM.violationDateInput.value;
  if (!date) {
    showToast('Vui lòng chọn ngày vi phạm!', 'info');
    return;
  }
  
  if (!activeStudentForViolation) return;
  
  const newViolation = {
    id: 'viol_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    content,
    date
  };
  
  const updatedStudent = {
    ...activeStudentForViolation,
    violations: [...(activeStudentForViolation.violations || []), newViolation]
  };
  
  try {
    await db.saveStudent(updatedStudent);
    if (firebaseSync.isConnected()) {
      firebaseSync.uploadStudent(updatedStudent).catch(err => console.error("Sync error:", err));
    }
    DOM.violationModal.classList.remove('active');
    showToast('Đã ghi nhận vi phạm');
    
    // Update local list state
    studentsListState = studentsListState.map(s => 
      s.id === updatedStudent.id ? updatedStudent : s
    );
    renderStudents();
    if (updatedStudent.id === selectedStudentId) {
      renderSelectedStudentDetail();
    }
  } catch (error) {
    console.error('Error saving violation:', error);
    showToast('Lỗi ghi nhận vi phạm!', 'error');
  }
}

let activeStudentForHistory = null;

function openViolationHistoryModal(student) {
  activeStudentForHistory = student;
  DOM.violationHistoryStudentNameSpan.textContent = student.name;
  renderViolationHistory();
  DOM.violationHistoryModal.classList.add('active');
}

function renderViolationHistory() {
  DOM.violationHistoryList.innerHTML = '';
  if (!activeStudentForHistory) return;
  
  const violations = activeStudentForHistory.violations || [];
  if (violations.length === 0) {
    DOM.violationHistoryList.innerHTML = `
      <div style="font-size: 0.85rem; color: var(--text-dark); text-align: center; padding: 20px 0;">
        Sinh viên chưa có lỗi vi phạm nào.
      </div>
    `;
    return;
  }
  
  // Sort: newer violations first
  const sortedViolations = [...violations].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  
  sortedViolations.forEach(viol => {
    const item = document.createElement('div');
    item.className = 'violation-history-item';
    
    const content = document.createElement('div');
    content.className = 'violation-history-content';
    
    const text = document.createElement('div');
    text.className = 'violation-history-text';
    text.textContent = viol.content;
    
    const dateSpan = document.createElement('span');
    dateSpan.className = 'violation-history-date';
    // Format date YYYY-MM-DD to DD/MM/YYYY
    const dateParts = viol.date.split('-');
    dateSpan.textContent = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
    
    content.appendChild(text);
    content.appendChild(dateSpan);
    item.appendChild(content);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-icon-btn btn-delete-attach';
    deleteBtn.innerHTML = '<i data-lucide="trash-2" style="width: 12px; height: 12px;"></i>';
    deleteBtn.title = 'Xóa lỗi vi phạm';
    deleteBtn.addEventListener('click', () => deleteViolation(viol.id));
    
    item.appendChild(deleteBtn);
    DOM.violationHistoryList.appendChild(item);
  });
  
  if (window.lucide) lucide.createIcons();
}

async function deleteViolation(violationId) {
  const confirmed = await showConfirm(
    'Xóa lỗi vi phạm',
    'Bạn có chắc chắn muốn xóa lỗi vi phạm này khỏi lịch sử của sinh viên?',
    'danger'
  );
  if (!confirmed) return;
  
  if (!activeStudentForHistory) return;
  
  const updatedViolations = (activeStudentForHistory.violations || []).filter(v => v.id !== violationId);
  const updatedStudent = {
    ...activeStudentForHistory,
    violations: updatedViolations
  };
  
  try {
    await db.saveStudent(updatedStudent);
    if (firebaseSync.isConnected()) {
      await firebaseSync.uploadStudent(updatedStudent);
    }
    showToast('Đã xóa lỗi vi phạm');
    activeStudentForHistory = updatedStudent;
    
    // Update local state
    studentsListState = studentsListState.map(s => 
      s.id === updatedStudent.id ? updatedStudent : s
    );
    
    renderViolationHistory();
    renderStudents();
  } catch (error) {
    console.error('Error deleting violation:', error);
    showToast('Lỗi xóa vi phạm!', 'error');
  }
}

function formatDateString(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function renderSelectedStudentDetail() {
  if (!selectedStudentId) {
    DOM.classroomStudentDetailEmpty.style.display = 'flex';
    DOM.classroomStudentDetailView.style.display = 'none';
    return;
  }
  
  const student = studentsListState.find(s => s.id === selectedStudentId);
  if (!student) {
    selectedStudentId = null;
    DOM.classroomStudentDetailEmpty.style.display = 'flex';
    DOM.classroomStudentDetailView.style.display = 'none';
    return;
  }
  
  const selectedClass = classesListState.find(c => c.id === activeClassId);
  if (!selectedClass) return;
  
  DOM.classroomStudentDetailEmpty.style.display = 'none';
  DOM.classroomStudentDetailView.style.display = 'flex';
  
  const nameParts = student.name.trim().split(' ');
  const initials = nameParts.length > 1 
    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0])
    : nameParts[0].substr(0, 2);
  DOM.detailStudentAvatar.textContent = initials;
  DOM.detailStudentName.textContent = student.name;
  
  const violationsCount = student.violations ? student.violations.length : 0;
  if (violationsCount === 0) {
    DOM.detailStudentBadge.className = 'student-violation-badge clean';
    DOM.detailStudentBadge.innerHTML = '<i data-lucide="check-circle" style="width: 11px; height: 11px;"></i> Tốt (0)';
  } else if (violationsCount < 3) {
    DOM.detailStudentBadge.className = 'student-violation-badge warn';
    DOM.detailStudentBadge.innerHTML = `<i data-lucide="alert-circle" style="width: 11px; height: 11px;"></i> Cảnh cáo (${violationsCount})`;
  } else {
    DOM.detailStudentBadge.className = 'student-violation-badge danger';
    DOM.detailStudentBadge.innerHTML = `<i data-lucide="alert-triangle" style="width: 11px; height: 11px;"></i> Vi phạm (${violationsCount})`;
  }
  
  DOM.detailStudentFieldsList.innerHTML = '';
  const fields = normalizeClassFields(selectedClass.fields);
  let hasFields = false;
  
  fields.forEach(field => {
    const val = student[field.id] !== undefined ? student[field.id] : (student.customFields?.[field.id]);
    if (val !== undefined && val !== null && val !== '') {
      hasFields = true;
      let icon = 'info';
      const label = field.name.toLowerCase();
      if (label.includes('mssv') || label.includes('mã số')) icon = 'credit-card';
      else if (label.includes('sđt') || label.includes('điện thoại') || label.includes('phone')) icon = 'phone';
      else if (label.includes('mail')) icon = 'mail';
      else if (label.includes('điểm') || label.includes('học tập') || label.includes('gpa')) icon = 'award';
      else if (label.includes('note') || label.includes('ghi chú')) icon = 'file-text';
      
      DOM.detailStudentFieldsList.innerHTML += `
        <div class="detail-field-item">
          <i data-lucide="${icon}" style="width: 14px; height: 14px;"></i>
          <span style="font-weight: 600;">${field.name}:</span>
          <span style="color: var(--text-muted); word-break: break-all; margin-left: auto;">${val}</span>
        </div>
      `;
    }
  });
  
  if (!hasFields) {
    DOM.detailStudentFieldsList.innerHTML = `
      <div style="font-size: 0.8rem; color: var(--text-dark); text-align: center; padding: 10px 0;">
        Không có thông tin bổ sung.
      </div>
    `;
  }
  
  DOM.detailStudentViolationsList.innerHTML = '';
  if (!student.violations || student.violations.length === 0) {
    DOM.detailStudentViolationsList.innerHTML = `
      <div style="font-size: 0.8rem; color: var(--text-dark); text-align: center; padding: 20px 10px; opacity: 0.7;">
        Chưa có vi phạm nào.
      </div>
    `;
  } else {
    const sorted = [...student.violations].sort((a, b) => new Date(b.date) - new Date(a.date));
    sorted.forEach((v, index) => {
      const item = document.createElement('div');
      item.className = 'violation-history-item';
      item.style.cssText = 'padding: 8px 12px; margin-top: 4px;';
      
      const contentDiv = document.createElement('div');
      contentDiv.className = 'violation-history-content';
      
      const textSpan = document.createElement('span');
      textSpan.className = 'violation-history-text';
      textSpan.textContent = v.content;
      
      const dateSpan = document.createElement('span');
      dateSpan.className = 'violation-history-date';
      dateSpan.textContent = formatDateString(v.date);
      
      contentDiv.appendChild(textSpan);
      contentDiv.appendChild(dateSpan);
      
      const delBtn = document.createElement('button');
      delBtn.className = 'action-icon-btn btn-delete-attach';
      delBtn.style.padding = '4px';
      delBtn.innerHTML = '<i data-lucide="trash-2" style="width: 13px; height: 13px;"></i>';
      delBtn.title = 'Xóa vi phạm';
      delBtn.addEventListener('click', async () => {
        const confirmed = await showConfirm('Xóa vi phạm', 'Bạn có chắc muốn xóa lỗi vi phạm này?');
        if (confirmed) {
          await deleteViolationInSidebar(student, v.id);
        }
      });
      
      item.appendChild(contentDiv);
      item.appendChild(delBtn);
      DOM.detailStudentViolationsList.appendChild(item);
    });
  }
  
  DOM.detailBtnEditStudent.onclick = () => openStudentModal(student);
  DOM.detailBtnDeleteStudent.onclick = () => deleteStudent(student.id);
  DOM.detailBtnAddViolation.onclick = () => openViolationModal(student);
  
  if (window.lucide) lucide.createIcons();
  
  // Auto open right sidebar on mobile when a student is selected
  const rightSidebar = document.querySelector('.right-bar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  if (window.innerWidth <= 980 && rightSidebar) {
    rightSidebar.classList.add('active');
    if (sidebarOverlay) sidebarOverlay.classList.add('active');
  }
}

async function deleteViolationInSidebar(student, violationId) {
  const updatedViolations = student.violations.filter(v => v.id !== violationId);
  const updatedStudent = {
    ...student,
    violations: updatedViolations
  };
  
  try {
    await db.saveStudent(updatedStudent);
    if (firebaseSync.isConnected()) {
      firebaseSync.uploadStudent(updatedStudent).catch(err => console.error("Sync error:", err));
    }
    showToast('Đã xóa lỗi vi phạm');
    
    studentsListState = studentsListState.map(s => 
      s.id === updatedStudent.id ? updatedStudent : s
    );
    
    renderStudents();
    renderSelectedStudentDetail();
  } catch (error) {
    console.error('Error deleting violation in sidebar:', error);
    showToast('Lỗi xóa vi phạm!', 'error');
  }
}

// --- PREPOPULATE CLASS DATA ---
async function prepopulateClassData() {
  const classesToCreate = [
    {
      id: 'class_cntt6_ks25',
      name: 'CNTT6-KS25',
      students: [
        "Trương Anh Duy", "Nguyễn Tuấn Khang 2", "Nguyễn Trọng Nhân 6", "Lê Đức Anh 6",
        "Đào Trần Công Anh", "Cao Hoàng Bách", "Võ Nhật Huy", "Nguyễn Đăng Khoa",
        "Trần Tuấn Minh", "Hoàng Minh Nghĩa", "Phan Gia Hiển", "Từ Nhân Đức",
        "Đàm Viết Ưng", "Đỗ Quang Vĩ", "Vũ Hữu Tài", "Nguyễn Văn Quân 2",
        "Nguyễn Ngọc Gia Bảo 2", "Triệu Tấn Tú", "Nguyễn Thành Phúc Nguyên",
        "Lương Hoàng Phúc", "Phan Nguyễn Gia Bảo", "Nguyễn Ngọc Khang",
        "Nguyễn Tấn Duy", "Trần Thị Kim Ngân", "Nguyễn Khương", "Nguyễn Ngọc Tuyết Nhung",
        "Huỳnh Minh Phát", "Nguyễn Thiên Phú", "Văn Phúc Sang", "Hồ Thanh Tài",
        "Trương Thái Thịnh", "Vũ Đình Anh Tuấn", "Huỳnh Anh Tuấn", "Hồ Anh Hào",
        "Huỳnh Thị Ánh Hồng", "Trương Ngô Quốc Nhật", "Nguyễn Trọng Nguyên 2",
        "Hoàng Long 2", "Nguyễn Văn Minh Tín", "Trần Nguyễn Quốc Việt"
      ]
    },
    {
      id: 'class_cntt7_ks25',
      name: 'CNTT7-KS25',
      students: [
        "Phạm Thanh Đài", "Đỗ Minh Đặng", "Nguyễn Kim Thành Đạt", "Hồ Quang Duy",
        "Hồ Hữu Hoài Nam", "Trần Hiếu Nghĩa", "Trần Hoàng Nguyên", "Phạm Ngọc Quỳnh Như",
        "Trịnh Thị Hồng Quyên", "Đỗ Xuân Tân", "Ngô Thiên Thạch", "Nguyễn Vân Trường",
        "Lã Duy Khang", "Nguyễn Duy Đạt", "Nguyễn Minh Thức", "Đỗ Minh Tiến",
        "Huỳnh Công Danh", "Nguyễn Quốc Thắng", "Trần Đức Ngọc", "Dương Gia Hưng",
        "Nguyễn Văn Hoàn", "Phạm Việt Thành 2", "Hứa Xuân Thiên", "Nguyễn Thiên Bảo",
        "Nguyễn Khắc Duy 2", "Lê Thanh Hải", "Bùi Minh Hiếu", "Lê Hải Nguyên",
        "Nguyễn Thành Tài", "Đặng Đức Tín", "Trương Định Hải", "Tăng Duy Khánh",
        "Bùi Minh Đức 2", "Đinh Quang Hào", "Trần Văn Khiêm", "Đặng Thành Đạt 2",
        "Nguyễn Thị Thu Hiền 2", "Trần Quang Long 2", "Huỳnh Quốc Huy", "Tăng Mạnh Khang"
      ]
    }
  ];

  try {
    const classes = await db.getClasses();
    
    for (const classConfig of classesToCreate) {
      const classExists = classes.some(c => c.name === classConfig.name || c.id === classConfig.id);
      
      if (!classExists) {
        // 1. Save Class
        const defaultFields = [
          { id: 'mssv', name: 'MSSV', type: 'text' },
          { id: 'phone', name: 'Số điện thoại', type: 'text' }
        ];
        await db.saveClass(classConfig.id, classConfig.name, defaultFields);
        if (firebaseSync.isConnected()) {
          await firebaseSync.uploadClass(classConfig.id, classConfig.name, defaultFields);
        }
        
        // 2. Save Students
        for (let i = 0; i < classConfig.students.length; i++) {
          const studentName = classConfig.students[i];
          const studentId = `stud_${classConfig.id.replace('class_', '')}_${i + 1}`;
          const studentData = {
            id: studentId,
            classId: classConfig.id,
            name: studentName,
            mssv: '',
            phone: '',
            violations: []
          };
          await db.saveStudent(studentData);
          if (firebaseSync.isConnected()) {
            await firebaseSync.uploadStudent(studentData);
          }
        }
        console.log(`Successfully pre-populated class ${classConfig.name} and its students.`);
      }
    }
    
    if (currentMode === 'classroom') {
      await loadClasses();
    }
  } catch (err) {
    console.error('Failed to pre-populate classroom data:', err);
  }
}

// --- INIT APP ---
async function init() {
  initSidebarCollapsed();
  initTheme();
  initFontSize();
  initFirebaseSync();
  await refreshDatesWithData();
  await prepopulateClassData();
  setupEventListeners();
  loadDateData(currentDate);
  loadQuickInfos();
  if (window.lucide) lucide.createIcons();
}

function initSidebarCollapsed() {
  const leftSidebar = document.getElementById('left-sidebar');
  const toggleSidebarBtn = document.getElementById('btn-toggle-sidebar');
  const appContainer = document.querySelector('.app-container');
  
  if (!leftSidebar || !toggleSidebarBtn || !appContainer) return;
  
  const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
  if (isCollapsed) {
    leftSidebar.classList.add('collapsed');
    appContainer.classList.add('sidebar-collapsed');
    toggleSidebarBtn.innerHTML = '<i data-lucide="chevron-right"></i>';
    toggleSidebarBtn.title = 'Mở rộng Sidebar';
  } else {
    leftSidebar.classList.remove('collapsed');
    appContainer.classList.remove('sidebar-collapsed');
    toggleSidebarBtn.innerHTML = '<i data-lucide="chevron-left"></i>';
    toggleSidebarBtn.title = 'Thu nhỏ Sidebar';
  }
}

function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
    DOM.themeToggleBtn.innerHTML = '<i data-lucide="sun"></i>';
  } else {
    document.body.classList.remove('light-mode');
    DOM.themeToggleBtn.innerHTML = '<i data-lucide="moon"></i>';
  }
}

function initFontSize() {
  const savedFontSize = localStorage.getItem('notepad-font-size') || '16px';
  if (DOM.notepadTextarea) {
    DOM.notepadTextarea.style.fontSize = savedFontSize;
  }
  const fontSizeSelect = document.getElementById('font-size-select');
  if (fontSizeSelect) {
    fontSizeSelect.value = savedFontSize;
  }
}

// --- FIREBASE SYNC MANAGEMENT ---
const DOM_SYNC = {
  settingsBtn: document.getElementById('btn-settings'),
  settingsModal: document.getElementById('settings-modal'),
  settingsCloseBtn: document.getElementById('settings-close-btn'),
  firebaseConfigInput: document.getElementById('firebase-config-input'),
  syncEmail: document.getElementById('sidebar-sync-email'),
  syncPassword: document.getElementById('sidebar-sync-password'),
  btnSyncLogin: document.getElementById('btn-sidebar-login'),
  btnSyncRegister: document.getElementById('btn-sidebar-register'),
  btnSyncLogout: document.getElementById('btn-sidebar-logout'),
  btnSyncUploadAll: document.getElementById('btn-sidebar-upload-all'),
  btnSaveSettings: document.getElementById('btn-save-settings'),
  syncStatusDot: document.getElementById('sidebar-sync-dot'),
  syncStatusText: document.getElementById('sidebar-sync-user-email'),
  syncAuthPanel: document.getElementById('sidebar-auth-panel'),
  syncActionsPanel: document.getElementById('sidebar-actions-panel')
};

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyC_tYDgndgfGI9wKw15rGQmGQeHweMqRQM",
  authDomain: "dailylog-app-6547f.firebaseapp.com",
  databaseURL: "https://dailylog-app-6547f-default-rtdb.firebaseio.com",
  projectId: "dailylog-app-6547f",
  storageBucket: "dailylog-app-6547f.firebasestorage.app",
  messagingSenderId: "380715025163",
  appId: "1:380715025163:web:6bbd07ba1bf3ebd4b0980e",
  measurementId: "G-9W0N0W1853"
};

async function initFirebaseSync() {
  let config = null;
  const configStr = localStorage.getItem('firebaseConfig');
  if (configStr) {
    try {
      config = JSON.parse(configStr);
    } catch (e) {
      console.error("Firebase config parse error on init:", e);
    }
  }

  // Fallback to embedded default configuration
  if (!config) {
    config = DEFAULT_FIREBASE_CONFIG;
  }

  if (config) {
    DOM_SYNC.firebaseConfigInput.value = JSON.stringify(config, null, 2);
    try {
      await firebaseSync.initialize(config, handleSyncStateChange);
    } catch (e) {
      console.error("Failed to initialize Firebase with config:", e);
    }
  }
}

async function syncAllData() {
  if (!firebaseSync.isConnected()) return;
  
  showToast('Đang đồng bộ toàn bộ dữ liệu với Cloud...', 'info');
  try {
    const cloudData = await firebaseSync.downloadAllCloudData();
    if (!cloudData) return;
    
    const localData = await db.getAllData();
    const nowStr = new Date().toISOString();
    let localChanged = false;
    
    // Convert arrays to Map for fast access
    const localNotesMap = new Map(localData.notes.map(n => [n.date, n]));
    const localIssuesMap = new Map(localData.issues.map(i => [i.date, i]));
    const localBoardsMap = new Map(localData.stickyBoards.map(b => [b.date, b]));
    
    const cloudNotesMap = new Map(cloudData.notes.map(n => [n.date, n]));
    const cloudIssuesMap = new Map(cloudData.issues.map(i => [i.date, i]));
    const cloudBoardsMap = new Map(cloudData.stickyBoards.map(b => [b.date, b]));
    
    // Get union of all unique dates
    const allDates = new Set([
      ...localNotesMap.keys(),
      ...localIssuesMap.keys(),
      ...localBoardsMap.keys(),
      ...cloudNotesMap.keys(),
      ...cloudIssuesMap.keys(),
      ...cloudBoardsMap.keys()
    ]);
    
    for (const date of allDates) {
      // 1. Sync Note
      const localNote = localNotesMap.get(date);
      const cloudNote = cloudNotesMap.get(date);
      
      const hasLocalNote = localNote && localNote.content && localNote.content.trim() !== '';
      const hasCloudNote = cloudNote && cloudNote.content && cloudNote.content.trim() !== '';
      
      if (hasLocalNote || hasCloudNote) {
        const localTime = hasLocalNote ? (localNote.updatedAt || nowStr) : new Date(0).toISOString();
        const cloudTime = hasCloudNote ? (cloudNote.updatedAt || new Date(0).toISOString()) : new Date(0).toISOString();
        
        if (hasCloudNote && (!hasLocalNote || cloudTime > localTime)) {
          await db.saveNote(date, cloudNote.content, cloudNote.updatedAt);
          localChanged = true;
        } else if (hasLocalNote && (!hasCloudNote || localTime > cloudTime)) {
          await firebaseSync.uploadNote(date, localNote.content, localTime);
        }
      }
      
      // 2. Sync Issues
      const localIssue = localIssuesMap.get(date);
      const cloudIssue = cloudIssuesMap.get(date);
      
      const hasLocalIssue = localIssue && localIssue.issues && localIssue.issues.length > 0;
      const hasCloudIssue = cloudIssue && cloudIssue.issues && cloudIssue.issues.length > 0;
      
      if (hasLocalIssue || hasCloudIssue) {
        const localTime = hasLocalIssue ? (localIssue.updatedAt || nowStr) : new Date(0).toISOString();
        const cloudTime = hasCloudIssue ? (cloudIssue.updatedAt || new Date(0).toISOString()) : new Date(0).toISOString();
        
        if (hasCloudIssue && (!hasLocalIssue || cloudTime > localTime)) {
          await db.saveIssues(date, cloudIssue.issues, cloudIssue.updatedAt);
          localChanged = true;
        } else if (hasLocalIssue && (!hasCloudIssue || localTime > cloudTime)) {
          await firebaseSync.uploadIssues(date, localIssue.issues, localTime);
        }
      }
      
      // 3. Sync Sticky Board
      const localBoard = localBoardsMap.get(date);
      const cloudBoard = cloudBoardsMap.get(date);
      
      const hasLocalBoard = localBoard && localBoard.notes && localBoard.notes.length > 0;
      const hasCloudBoard = cloudBoard && cloudBoard.notes && cloudBoard.notes.length > 0;
      
      if (hasLocalBoard || hasCloudBoard) {
        const localTime = hasLocalBoard ? (localBoard.updatedAt || nowStr) : new Date(0).toISOString();
        const cloudTime = hasCloudBoard ? (cloudBoard.updatedAt || new Date(0).toISOString()) : new Date(0).toISOString();
        
        if (hasCloudBoard && (!hasLocalBoard || cloudTime > localTime)) {
          await db.saveStickyBoard(date, cloudBoard, cloudBoard.updatedAt);
          localChanged = true;
        } else if (hasLocalBoard && (!hasCloudBoard || localTime > cloudTime)) {
          await firebaseSync.uploadStickyBoard(date, localBoard, localTime);
        }
      }
    }

    // 4. Sync Quick Info
    const localQuickInfos = localData.quickInfos || [];
    const cloudQuickInfos = cloudData.quickInfos || [];
    
    const localQuickMap = new Map(localQuickInfos.map(q => [q.id, q]));
    const cloudQuickMap = new Map(cloudQuickInfos.map(q => [q.id, q]));
    
    const allQuickIds = new Set([...localQuickMap.keys(), ...cloudQuickMap.keys()]);
    let quickInfoChanged = false;

    for (const qId of allQuickIds) {
      const localQ = localQuickMap.get(qId);
      const cloudQ = cloudQuickMap.get(qId);
      
      const hasLocalQ = !!localQ;
      const hasCloudQ = !!cloudQ;
      
      if (hasLocalQ || hasCloudQ) {
        const localTime = hasLocalQ ? (localQ.updatedAt || nowStr) : new Date(0).toISOString();
        const cloudTime = hasCloudQ ? (cloudQ.updatedAt || new Date(0).toISOString()) : new Date(0).toISOString();
        
        if (hasCloudQ && (!hasLocalQ || cloudTime > localTime)) {
          // Cloud is newer -> save locally
          await db.saveQuickInfo(qId, cloudQ.title, cloudQ.value, cloudQ.updatedAt);
          quickInfoChanged = true;
        } else if (hasLocalQ && (!hasCloudQ || localTime > cloudTime)) {
          // Local is newer -> upload to cloud
          await firebaseSync.uploadQuickInfo(qId, localQ.title, localQ.value, localQ.updatedAt || localTime);
        }
      }
    }

    if (quickInfoChanged) {
      await loadQuickInfos();
    }

    // 5. Sync Classes
    const localClasses = localData.classes || [];
    const cloudClasses = cloudData.classes || [];
    
    const localClassMap = new Map(localClasses.map(c => [c.id, c]));
    const cloudClassMap = new Map(cloudClasses.map(c => [c.id, c]));
    
    const allClassIds = new Set([...localClassMap.keys(), ...cloudClassMap.keys()]);
    let classListChanged = false;

    for (const cId of allClassIds) {
      const localC = localClassMap.get(cId);
      const cloudC = cloudClassMap.get(cId);
      
      const hasLocalC = !!localC;
      const hasCloudC = !!cloudC;
      
      if (hasLocalC || hasCloudC) {
        const localTime = hasLocalC ? (localC.updatedAt || nowStr) : new Date(0).toISOString();
        const cloudTime = hasCloudC ? (cloudC.updatedAt || new Date(0).toISOString()) : new Date(0).toISOString();
        
        if (hasCloudC && (!hasLocalC || cloudTime > localTime)) {
          await db.saveClass(cId, cloudC.name, cloudC.fields, cloudC.updatedAt);
          classListChanged = true;
        } else if (hasLocalC && (!hasCloudC || localTime > cloudTime)) {
          await firebaseSync.uploadClass(cId, localC.name, localC.fields, localC.updatedAt || localTime);
        }
      }
    }

    // 6. Sync Students
    const localStudents = localData.students || [];
    const cloudStudents = cloudData.students || [];
    
    const localStudentMap = new Map(localStudents.map(s => [s.id, s]));
    const cloudStudentMap = new Map(cloudStudents.map(s => [s.id, s]));
    
    const allStudentIds = new Set([...localStudentMap.keys(), ...cloudStudentMap.keys()]);
    let studentListChanged = false;

    for (const sId of allStudentIds) {
      const localS = localStudentMap.get(sId);
      const cloudS = cloudStudentMap.get(sId);
      
      const hasLocalS = !!localS;
      const hasCloudS = !!cloudS;
      
      if (hasLocalS || hasCloudS) {
        const localTime = hasLocalS ? (localS.updatedAt || nowStr) : new Date(0).toISOString();
        const cloudTime = hasCloudS ? (cloudS.updatedAt || new Date(0).toISOString()) : new Date(0).toISOString();
        
        if (hasCloudS && (!hasLocalS || cloudTime > localTime)) {
          await db.saveStudent(cloudS, cloudS.updatedAt);
          studentListChanged = true;
        } else if (hasLocalS && (!hasCloudS || localTime > cloudTime)) {
          await firebaseSync.uploadStudent(localS, localS.updatedAt || localTime);
        }
      }
    }

    if (classListChanged) {
      await loadClasses();
    } else if (studentListChanged) {
      await loadStudents();
    }
    
    if (localChanged) {
      await refreshDatesWithData();
      await loadDateData(currentDate);
    }
    showToast('Đồng bộ hoàn tất!', 'success');
  } catch (err) {
    console.error('Error during full sync:', err);
    showToast('Lỗi khi đồng bộ dữ liệu!', 'error');
  }
}

function handleSyncStateChange(user) {
  if (user) {
    // Connected to cloud
    if (DOM_SYNC.syncStatusDot) {
      DOM_SYNC.syncStatusDot.style.background = 'var(--success)';
      DOM_SYNC.syncStatusDot.style.boxShadow = '0 0 10px var(--success-glow)';
    }
    if (DOM_SYNC.syncStatusText) {
      DOM_SYNC.syncStatusText.textContent = user.email;
      DOM_SYNC.syncStatusText.title = user.email;
    }
    
    DOM_SYNC.syncAuthPanel.style.display = 'none';
    DOM_SYNC.syncActionsPanel.style.display = 'flex';
    
    // Auto load current date to merge changes
    loadDateData(currentDate);
    // Background full sync
    syncAllData();
  } else {
    // Disconnected
    if (DOM_SYNC.syncStatusDot) {
      DOM_SYNC.syncStatusDot.style.background = 'var(--danger)';
      DOM_SYNC.syncStatusDot.style.boxShadow = 'none';
    }
    if (DOM_SYNC.syncStatusText) {
      DOM_SYNC.syncStatusText.textContent = 'Chưa đăng nhập';
      DOM_SYNC.syncStatusText.title = 'Chưa đăng nhập';
    }
    
    DOM_SYNC.syncAuthPanel.style.display = 'flex';
    DOM_SYNC.syncActionsPanel.style.display = 'none';
  }
}

// --- FETCH HIGHLIGHT DATES (debounced) ---
async function refreshDatesWithData() {
  try {
    datesStatusMap = await db.getDatesStatus();
    renderCalendar();
  } catch (error) {
    console.error('Error fetching calendar dots:', error);
  }
}

// Debounced version — avoids scanning full DB on every keystroke/issue toggle
function refreshDatesWithDataDebounced(delayMs = 800) {
  if (calendarRefreshTimeout) clearTimeout(calendarRefreshTimeout);
  calendarRefreshTimeout = setTimeout(refreshDatesWithData, delayMs);
}

// --- CALENDAR RENDER ---
function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  
  DOM.calendarMonthYear.textContent = `${MONTHS_VN[month]} ${year}`;
  DOM.calendarGrid.innerHTML = '';
  
  // Day offsets
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();
  
  // Fill leading empty/previous month days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell empty';
    DOM.calendarGrid.appendChild(cell);
  }
  
  // Fill actual month days
  const today = new Date();
  const selectedKey = formatDateKey(currentDate);
  const todayKey = formatDateKey(today);
  
  for (let day = 1; day <= totalDays; day++) {
    const thisDate = new Date(year, month, day);
    const dateKey = formatDateKey(thisDate);
    
    const cell = document.createElement('div');
    cell.className = 'calendar-cell';
    cell.textContent = day;
    
    if (dateKey === selectedKey) cell.classList.add('active');
    if (dateKey === todayKey) cell.classList.add('today');
    
    const dayStatus = datesStatusMap[dateKey];
    if (dayStatus) {
      if (dayStatus.hasUnresolved) {
        cell.classList.add('has-unresolved');
      } else if (dayStatus.hasData) {
        cell.classList.add('has-data');
      }
    }
    
    cell.addEventListener('click', () => {
      selectDate(thisDate);
    });
    
    DOM.calendarGrid.appendChild(cell);
  }
}

// --- LOAD DATA BY DATE ---
async function loadDateData(date) {
  const dateKey = formatDateKey(date);

  // 1. Update UI labels immediately (sync, no await needed)
  DOM.notepadActiveDate.textContent = formatDateDisplay(date);
  DOM.sidebarDateLabel.textContent = date.toLocaleDateString('vi-VN');
  const todayKey = formatDateKey(new Date());
  DOM.sidebarDayLabel.textContent = dateKey === todayKey ? 'Hôm nay' : WEEKDAYS_VN[date.getDay()];

  // 2. Load local data IMMEDIATELY in parallel — user sees content right away
  try {
    const [content, issues, attachments, boardData] = await Promise.all([
      db.getNote(dateKey),
      db.getIssues(dateKey),
      db.getAttachments(dateKey),
      db.getStickyBoard(dateKey)
    ]);

    DOM.notepadTextarea.innerHTML = content || '';
    setSaveStatus('saved');
    updateTextStats();

    activeIssues = issues;
    renderIssues();
    renderAttachments(attachments);

    // Initialize current board data
    currentBoardData = boardData || { mode: 'notepad', notes: [] };
    setViewMode(currentBoardData.mode || 'notepad');
  } catch (error) {
    console.error('Error loading date data:', error);
    showToast('Lỗi khi tải dữ liệu ngày này!', 'error');
  }

  renderCalendar();

  // 3. Background cloud sync — does NOT block UI display above
  if (firebaseSync.isConnected()) {
    syncFromCloudBackground(dateKey);
  }
}

// Runs after local data is already displayed — syncs cloud diff silently
async function syncFromCloudBackground(dateKey) {
  try {
    const cloudData = await firebaseSync.fetchDateData(dateKey);
    if (!cloudData) return;

    let changed = false;
    const nowStr = new Date().toISOString();

    // 1. Sync Note
    if (cloudData.note !== null) {
      const localNoteRaw = await db.getNoteRaw(dateKey);
      const localNoteContent = localNoteRaw ? localNoteRaw.content : '';
      const hasLocalNote = localNoteContent && localNoteContent.trim() !== '';
      const localNoteTime = hasLocalNote ? (localNoteRaw.updatedAt || nowStr) : new Date(0).toISOString();

      const cloudNote = cloudData.note; // { content, updatedAt }
      const hasCloudNote = cloudNote && cloudNote.content && cloudNote.content.trim() !== '';
      const cloudNoteTime = hasCloudNote ? cloudNote.updatedAt : new Date(0).toISOString();

      if (cloudNoteTime > localNoteTime) {
        // Cloud is newer -> Download to local
        await db.saveNote(dateKey, cloudNote.content, cloudNote.updatedAt);
        if (formatDateKey(currentDate) === dateKey) {
          DOM.notepadTextarea.innerHTML = cloudNote.content;
          updateTextStats();
        }
        changed = true;
      } else if (localNoteTime > cloudNoteTime) {
        // Local is newer -> Upload to cloud
        if (firebaseSync.isConnected()) {
          firebaseSync.uploadNote(dateKey, localNoteContent, localNoteTime).catch(err =>
            console.warn('Cloud note upload failed in background:', err)
          );
        }
      }
    } else {
      // Cloud has no note, if local has note, upload it to cloud
      const localNoteRaw = await db.getNoteRaw(dateKey);
      if (localNoteRaw && localNoteRaw.content && localNoteRaw.content.trim() !== '') {
        const localNoteTime = localNoteRaw.updatedAt || nowStr;
        if (firebaseSync.isConnected()) {
          firebaseSync.uploadNote(dateKey, localNoteRaw.content, localNoteTime).catch(err =>
            console.warn('Cloud note upload failed in background:', err)
          );
        }
      }
    }

    // 2. Sync Issues
    if (cloudData.issues !== null) {
      const localIssuesRaw = await db.getIssuesRaw(dateKey);
      const localIssuesList = localIssuesRaw ? localIssuesRaw.issues : [];
      const hasLocalIssues = localIssuesList && localIssuesList.length > 0;
      const localIssuesTime = hasLocalIssues ? (localIssuesRaw.updatedAt || nowStr) : new Date(0).toISOString();

      const cloudIssues = cloudData.issues; // { issues, updatedAt }
      const hasCloudIssues = cloudIssues && cloudIssues.issues && cloudIssues.issues.length > 0;
      const cloudIssuesTime = hasCloudIssues ? cloudIssues.updatedAt : new Date(0).toISOString();

      if (cloudIssuesTime > localIssuesTime) {
        // Cloud is newer -> Download to local
        await db.saveIssues(dateKey, cloudIssues.issues, cloudIssues.updatedAt);
        if (formatDateKey(currentDate) === dateKey) {
          activeIssues = cloudIssues.issues;
          renderIssues();
        }
        changed = true;
      } else if (localIssuesTime > cloudIssuesTime) {
        // Local is newer -> Upload to cloud
        if (firebaseSync.isConnected()) {
          firebaseSync.uploadIssues(dateKey, localIssuesList, localIssuesTime).catch(err =>
            console.warn('Cloud issues upload failed in background:', err)
          );
        }
      }
    } else {
      // Cloud has no issues, if local has issues, upload it to cloud
      const localIssuesRaw = await db.getIssuesRaw(dateKey);
      if (localIssuesRaw && localIssuesRaw.issues && localIssuesRaw.issues.length > 0) {
        const localIssuesTime = localIssuesRaw.updatedAt || nowStr;
        if (firebaseSync.isConnected()) {
          firebaseSync.uploadIssues(dateKey, localIssuesRaw.issues, localIssuesTime).catch(err =>
            console.warn('Cloud issues upload failed in background:', err)
          );
        }
      }
    }

    // 3. Sync Attachments
    if (cloudData.attachments && cloudData.attachments.length > 0) {
      const localAttachments = await db.getAttachments(dateKey);
      let attachmentChanged = false;
      for (const cloudAttach of cloudData.attachments) {
        const existsLocally = localAttachments.some(
          la => la.name === cloudAttach.name || la.storagePath === cloudAttach.id
        );
        if (!existsLocally) {
          try {
            const res = await fetch(cloudAttach.downloadURL);
            const blob = await res.blob();
            await db.saveAttachment(dateKey, blob, cloudAttach.name, cloudAttach.type, cloudAttach.id, cloudAttach.downloadURL);
            attachmentChanged = true;
            changed = true;
          } catch (err) {
            console.error('Failed to sync cloud file to local:', cloudAttach.name, err);
          }
        }
      }
      // Refresh attachment panel if new files arrived
      if (attachmentChanged && formatDateKey(currentDate) === dateKey) {
        const updatedAttachments = await db.getAttachments(dateKey);
        renderAttachments(updatedAttachments);
      }
    }

    // 4. Sync Sticky Board
    if (cloudData.stickyBoard !== undefined && cloudData.stickyBoard !== null) {
      const localBoard = await db.getStickyBoard(dateKey);
      const localNotesList = localBoard ? (localBoard.notes || []) : [];
      const hasLocalBoard = localNotesList.length > 0;
      const localBoardTime = hasLocalBoard ? (localBoard.updatedAt || nowStr) : new Date(0).toISOString();

      const cloudBoard = cloudData.stickyBoard; // { mode, notes, updatedAt }
      const hasCloudBoard = cloudBoard && cloudBoard.notes && cloudBoard.notes.length > 0;
      const cloudBoardTime = hasCloudBoard ? cloudBoard.updatedAt : new Date(0).toISOString();

      if (cloudBoardTime > localBoardTime) {
        // Cloud is newer -> Download to local
        await db.saveStickyBoard(dateKey, cloudBoard, cloudBoard.updatedAt);
        if (formatDateKey(currentDate) === dateKey) {
          currentBoardData = cloudBoard;
          setViewMode(currentBoardData.mode || 'notepad');
          renderStickyBoard();
        }
        changed = true;
      } else if (localBoardTime > cloudBoardTime) {
        // Local is newer -> Upload to cloud
        if (firebaseSync.isConnected()) {
          firebaseSync.uploadStickyBoard(dateKey, localBoard, localBoardTime).catch(err =>
            console.warn('Cloud board upload failed in background:', err)
          );
        }
      }
    } else {
      // Cloud has no sticky board, if local has sticky board, upload it to cloud
      const localBoard = await db.getStickyBoard(dateKey);
      if (localBoard && localBoard.notes && localBoard.notes.length > 0) {
        const localBoardTime = localBoard.updatedAt || nowStr;
        if (firebaseSync.isConnected()) {
          firebaseSync.uploadStickyBoard(dateKey, localBoard, localBoardTime).catch(err =>
            console.warn('Cloud board upload failed in background:', err)
          );
        }
      }
    }

    if (changed) refreshDatesWithDataDebounced(300);
  } catch (e) {
    console.warn('Cloud background sync warning:', e);
  }
}

function selectDate(date) {
  // If there's a pending auto-save, save it immediately
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveNoteImmediately();
  }
  currentDate = date;
  // If month changed, sync calendar date view
  if (calendarDate.getMonth() !== date.getMonth() || calendarDate.getFullYear() !== date.getFullYear()) {
    calendarDate = new Date(date.getFullYear(), date.getMonth(), 1);
  }
  loadDateData(currentDate);

  // Close mobile sidebar on select
  if (window.innerWidth <= 980) {
    const leftSidebar = document.getElementById('left-sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    if (leftSidebar) leftSidebar.classList.remove('active');
    if (sidebarOverlay) sidebarOverlay.classList.remove('active');
  }
}

// --- AUTO-SAVE LOGIC ---
function saveNoteDebounced() {
  setSaveStatus('typing');
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveNoteImmediately, 800);
}

async function saveNoteImmediately() {
  saveTimeout = null;
  setSaveStatus('saving');
  const dateKey = formatDateKey(currentDate);
  const html = DOM.notepadTextarea.innerHTML;
  const plainText = DOM.notepadTextarea.innerText.trim();
  const hasContent = plainText !== '' || DOM.notepadTextarea.querySelector('img') !== null;

  try {
    const noteContent = !hasContent ? '' : html;
    const updatedAt = new Date().toISOString();
    await db.saveNote(dateKey, noteContent, updatedAt);
    setSaveStatus('saved');

    // Fire-and-forget: upload to cloud without blocking UI
    if (firebaseSync.isConnected()) {
      firebaseSync.uploadNote(dateKey, noteContent, updatedAt).catch(err =>
        console.warn('Cloud note upload failed:', err)
      );
    }

    // Debounce calendar dot refresh — no need to do it on every keystroke
    refreshDatesWithDataDebounced(1500);
  } catch (error) {
    console.error('Error auto-saving:', error);
    setSaveStatus('error');
  }
}

// --- RICH EDITOR NOTEPAD UTILITIES ---
function updateTextStats() {
  // Counters removed from UI
}

function formatText(command, value = null) {
  document.execCommand(command, false, value);
  DOM.notepadTextarea.focus();
  updateTextStats();
  saveNoteDebounced();
}

function changeTextCase(mode) {
  const selection = window.getSelection();
  const selectedText = selection.toString();
  
  if (!selectedText) {
    showToast('Vui lòng bôi đen đoạn văn bản cần chuyển đổi', 'info');
    return;
  }
  
  const replacement = mode === 'upper' ? selectedText.toUpperCase() : selectedText.toLowerCase();
  document.execCommand('insertText', false, replacement);
  
  updateTextStats();
  saveNoteDebounced();
  showToast('Đã chuyển đổi chữ');
}

// Find and Replace inside contenteditable
let lastSearchQuery = '';
let searchMatches = [];
let currentMatchIndex = -1;

function findNext() {
  const query = DOM.searchInput.value;
  const text = DOM.notepadTextarea.innerText;
  
  if (!query) {
    showToast('Vui lòng nhập từ khóa tìm kiếm', 'info');
    return;
  }
  
  if (query !== lastSearchQuery || searchMatches.length === 0) {
    lastSearchQuery = query;
    searchMatches = [];
    currentMatchIndex = -1;
    
    let index = text.toLowerCase().indexOf(query.toLowerCase());
    while (index !== -1) {
      searchMatches.push({ start: index, end: index + query.length });
      index = text.toLowerCase().indexOf(query.toLowerCase(), index + 1);
    }
  }
  
  if (searchMatches.length === 0) {
    showToast('Không tìm thấy từ khóa!', 'info');
    return;
  }
  
  currentMatchIndex = (currentMatchIndex + 1) % searchMatches.length;
  const match = searchMatches[currentMatchIndex];
  setSelectionRangeEditable(DOM.notepadTextarea, match.start, match.end);
}

function replaceCurrent() {
  const query = DOM.searchInput.value;
  const replaceStr = DOM.replaceInput.value;
  const selection = window.getSelection();
  const selectedText = selection.toString();
  
  if (!query || !selectedText || selectedText.toLowerCase() !== query.toLowerCase()) {
    findNext();
    return;
  }
  
  document.execCommand('insertText', false, replaceStr);
  
  // Clear search cache
  searchMatches = [];
  lastSearchQuery = '';
  
  updateTextStats();
  saveNoteDebounced();
  showToast('Đã thay thế');
}

function replaceAll() {
  const query = DOM.searchInput.value;
  const replaceStr = DOM.replaceInput.value;
  const text = DOM.notepadTextarea.innerText;
  
  if (!query) {
    showToast('Vui lòng nhập từ khóa tìm kiếm', 'info');
    return;
  }
  
  // Find all matches in plain text
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escapedQuery, 'gi');
  
  if (!regex.test(text)) {
    showToast('Không tìm thấy từ khóa để thay thế', 'info');
    return;
  }
  
  // Clean replacement within text nodes directly to avoid corrupting HTML tags/attributes
  const textNodes = getTextNodesIn(DOM.notepadTextarea);
  let count = 0;
  
  for (let node of textNodes) {
    const nodeText = node.textContent;
    if (regex.test(nodeText)) {
      const matchCount = (nodeText.match(regex) || []).length;
      node.textContent = nodeText.replace(regex, replaceStr);
      count += matchCount;
    }
  }
  
  searchMatches = [];
  lastSearchQuery = '';
  
  updateTextStats();
  saveNoteDebounced();
  showToast(`Đã thay thế ${count} từ`);
}

// Helpers for Selection inside contenteditable
function setSelectionRangeEditable(el, start, end) {
  let range = document.createRange();
  range.selectNodeContents(el);
  let textNodes = getTextNodesIn(el);
  
  let charCount = 0;
  let startNode = null, startOffset = 0;
  let endNode = null, endOffset = 0;
  
  for (let node of textNodes) {
    let nodeLength = node.textContent.length;
    if (!startNode && charCount + nodeLength >= start) {
      startNode = node;
      startOffset = start - charCount;
    }
    if (charCount + nodeLength >= end) {
      endNode = node;
      endOffset = end - charCount;
      break;
    }
    charCount += nodeLength;
  }
  
  if (startNode && endNode) {
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    let sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    
    // Scroll selection into view
    const rangeBounds = range.getBoundingClientRect();
    const editorBounds = el.getBoundingClientRect();
    if (rangeBounds.top < editorBounds.top || rangeBounds.bottom > editorBounds.bottom) {
      el.scrollTop += (rangeBounds.top - editorBounds.top) - (editorBounds.height / 2);
    }
  }
}

function getTextNodesIn(node) {
  let textNodes = [];
  if (node.nodeType === Node.TEXT_NODE) {
    textNodes.push(node);
  } else {
    let children = node.childNodes;
    for (let child of children) {
      textNodes.push(...getTextNodesIn(child));
    }
  }
  return textNodes;
}

// --- GLOBAL QUICK SEARCH SYSTEM ---
let globalSearchTimeout = null;

function handleGlobalSearchInput() {
  if (globalSearchTimeout) clearTimeout(globalSearchTimeout);
  globalSearchTimeout = setTimeout(performGlobalSearch, 250);
}

async function performGlobalSearch() {
  const query = DOM.globalSearchInput.value.trim();
  if (!query) {
    DOM.globalSearchResults.innerHTML = '';
    DOM.globalSearchResults.classList.remove('active');
    return;
  }

  try {
    const results = await db.searchAll(query);
    renderGlobalSearchResults(results, query);
  } catch (error) {
    console.error('Error during global search:', error);
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderGlobalSearchResults(results, query) {
  DOM.globalSearchResults.innerHTML = '';
  DOM.globalSearchResults.classList.add('active');

  if (results.length === 0) {
    DOM.globalSearchResults.innerHTML = `
      <div class="search-results-empty">
        Không tìm thấy kết quả nào.
      </div>
    `;
    return;
  }

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escapedQuery, 'gi');

  results.forEach(result => {
    const item = document.createElement('div');
    item.className = 'search-result-item';

    // Format date display
    const dateParts = result.date.split('-');
    const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

    // Badges
    let badgesHTML = '';
    if (result.noteSnippet) {
      badgesHTML += `<span class="search-result-badge">Ghi chú</span>`;
    }
    if (result.issueSnippet) {
      badgesHTML += `<span class="search-result-badge badge-issue">Lỗi</span>`;
    }

    // Snippet highlight helper
    const highlight = (text) => {
      if (!text) return '';
      const escaped = escapeHtml(text);
      return escaped.replace(regex, match => `<span class="search-result-match-highlight">${match}</span>`);
    };

    let snippetsHTML = '<div class="search-result-snippets">';
    if (result.noteSnippet) {
      snippetsHTML += `<div class="search-result-snippet">${highlight(result.noteSnippet)}</div>`;
    }
    if (result.issueSnippet) {
      const cleanIssue = result.issueSnippet.replace(/^Checklist:\s*/, '');
      snippetsHTML += `<div class="search-result-snippet">⚠️ ${highlight(cleanIssue)}</div>`;
    }
    snippetsHTML += '</div>';

    item.innerHTML = `
      <div class="search-result-header">
        <span class="search-result-date">${formattedDate}</span>
        <div class="search-result-badges">${badgesHTML}</div>
      </div>
      ${snippetsHTML}
    `;

    item.addEventListener('click', () => {
      // Navigate to date timezone-safely
      const dateParts = result.date.split('-');
      const targetDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
      selectDate(targetDate);
      
      // Auto open and highlight term in notepad
      DOM.searchInput.value = query;
      searchMatches = [];
      lastSearchQuery = '';
      DOM.findReplaceBar.classList.add('active');
      
      // Wait for async load to render HTML
      setTimeout(() => {
        findNext();
        DOM.globalSearchResults.classList.remove('active');
        DOM.globalSearchInput.value = '';
      }, 150);
    });

    DOM.globalSearchResults.appendChild(item);
  });
}

// --- ISSUES MANAGEMENT ---
function renderIssues() {
  DOM.issuesList.innerHTML = '';
  DOM.issueCount.textContent = `${activeIssues.length} mục`;
  
  if (activeIssues.length === 0) {
    DOM.issuesList.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon"><i data-lucide="clipboard-list" style="width: 40px; height: 40px; stroke-width: 1.25; color: var(--text-dark);"></i></span>
        <span>Chưa có công việc nào được ghi nhận.</span>
      </div>
    `;
    return;
  }
  
  activeIssues.forEach((issue) => {
    // Check if the issue is overdue (if deadline has passed relative to current real time)
    let isOverdue = false;
    if (!issue.resolved && issue.deadline) {
      const [hours, minutes] = issue.deadline.split(':').map(Number);
      const now = new Date();
      const deadlineDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), hours, minutes, 0, 0);
      if (now > deadlineDate) {
        isOverdue = true;
      }
    }

    const li = document.createElement('li');
    li.className = `issue-item ${issue.resolved ? 'resolved' : ''} ${isOverdue ? 'overdue' : ''}`;
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'issue-checkbox';
    checkbox.checked = issue.resolved;
    checkbox.addEventListener('change', () => toggleIssue(issue.id));
    
    const contentWrapper = document.createElement('div');
    contentWrapper.style.cssText = 'flex: 1; display: flex; flex-direction: column; gap: 4px;';
    
    const span = document.createElement('span');
    span.className = 'issue-text';
    span.textContent = issue.text;
    contentWrapper.appendChild(span);
    
    // Calculate remaining time for tooltip
    let remainingText = '';
    if (issue.deadline) {
      if (issue.resolved) {
        remainingText = 'Công việc đã hoàn thành';
      } else {
        const [hours, minutes] = issue.deadline.split(':').map(Number);
        const now = new Date();
        const deadlineDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), hours, minutes, 0, 0);
        const diffMs = deadlineDate - now;
        
        if (diffMs > 0) {
          const diffMins = Math.floor(diffMs / 60000);
          const hrs = Math.floor(diffMins / 60);
          const mins = diffMins % 60;
          if (hrs >= 24) {
            const days = Math.floor(hrs / 24);
            const remainingHrs = hrs % 24;
            remainingText = `Thời gian còn lại: ${days} ngày ${remainingHrs > 0 ? remainingHrs + ' giờ ' : ''}${mins} phút`;
          } else {
            remainingText = `Thời gian còn lại: ${hrs > 0 ? hrs + ' giờ ' : ''}${mins} phút`;
          }
        } else {
          const diffMins = Math.floor(Math.abs(diffMs) / 60000);
          const hrs = Math.floor(diffMins / 60);
          const mins = diffMins % 60;
          if (hrs >= 24) {
            const days = Math.floor(hrs / 24);
            const remainingHrs = hrs % 24;
            remainingText = `Đã trễ: ${days} ngày ${remainingHrs > 0 ? remainingHrs + ' giờ ' : ''}${mins} phút`;
          } else {
            remainingText = `Đã trễ: ${hrs > 0 ? hrs + ' giờ ' : ''}${mins} phút`;
          }
        }
      }
      contentWrapper.title = remainingText;
    }
    
    if (issue.deadline) {
      const deadlineBadge = document.createElement('span');
      deadlineBadge.className = 'issue-deadline-badge';
      deadlineBadge.style.cssText = 'display: inline-flex; align-items: center; gap: 4px; font-size: 0.72rem; padding: 2px 6px; border-radius: 4px; width: fit-content; font-weight: 500;';
      deadlineBadge.title = remainingText;
      
      if (issue.resolved) {
        deadlineBadge.style.background = 'rgba(255, 255, 255, 0.05)';
        deadlineBadge.style.color = 'var(--text-dark)';
        deadlineBadge.innerHTML = `<i data-lucide="clock" style="width: 12px; height: 12px;"></i> ${issue.deadline}`;
      } else if (isOverdue) {
        deadlineBadge.style.background = 'rgba(239, 68, 68, 0.12)';
        deadlineBadge.style.color = 'var(--danger)';
        deadlineBadge.innerHTML = `<i data-lucide="clock" style="width: 12px; height: 12px; color: var(--danger);"></i> Trễ: ${issue.deadline}`;
      } else {
        deadlineBadge.style.background = 'rgba(99, 102, 241, 0.1)';
        deadlineBadge.style.color = 'var(--primary)';
        deadlineBadge.innerHTML = `<i data-lucide="clock" style="width: 12px; height: 12px; color: var(--primary);"></i> Hạn: ${issue.deadline}`;
      }
      contentWrapper.appendChild(deadlineBadge);
    }
    
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-delete';
    delBtn.innerHTML = '<i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>';
    delBtn.title = 'Xóa';
    delBtn.addEventListener('click', () => deleteIssue(issue.id));
    
    li.appendChild(checkbox);
    li.appendChild(contentWrapper);
    li.appendChild(delBtn);
    
    DOM.issuesList.appendChild(li);
  });
  
  if (window.lucide) lucide.createIcons();
}

async function addIssue() {
  const text = DOM.issueInput.value.trim();
  if (!text) return;

  const deadline = DOM.issueDeadline.value || null;
  const dateKey = formatDateKey(currentDate);
  const newIssue = { id: Date.now(), text, resolved: false, deadline };
  activeIssues.push(newIssue);
  DOM.issueInput.value = '';
  DOM.issueDeadline.value = '';
  renderIssues(); // Optimistic update — instant UI

  try {
    const updatedAt = new Date().toISOString();
    await db.saveIssues(dateKey, activeIssues, updatedAt);
    if (firebaseSync.isConnected()) {
      firebaseSync.uploadIssues(dateKey, activeIssues, updatedAt).catch(err =>
        console.warn('Cloud issues upload failed:', err)
      );
    }
    showToast('Đã thêm công việc');
    refreshDatesWithDataDebounced(500);
  } catch (error) {
    console.error('Error saving issue:', error);
    showToast('Lỗi lưu công việc!', 'error');
  }
}

async function toggleIssue(id) {
  const dateKey = formatDateKey(currentDate);
  activeIssues = activeIssues.map(issue =>
    issue.id === id ? { ...issue, resolved: !issue.resolved } : issue
  );
  renderIssues(); // Optimistic update — instant UI

  try {
    const updatedAt = new Date().toISOString();
    await db.saveIssues(dateKey, activeIssues, updatedAt);
    if (firebaseSync.isConnected()) {
      firebaseSync.uploadIssues(dateKey, activeIssues, updatedAt).catch(err =>
        console.warn('Cloud issues upload failed:', err)
      );
    }
    showToast('Đã cập nhật trạng thái');
    refreshDatesWithDataDebounced(500);
  } catch (error) {
    console.error('Error updating issue status:', error);
    showToast('Lỗi cập nhật!', 'error');
  }
}

async function deleteIssue(id) {
  const dateKey = formatDateKey(currentDate);
  activeIssues = activeIssues.filter(issue => issue.id !== id);
  renderIssues(); // Optimistic update — instant UI

  try {
    const updatedAt = new Date().toISOString();
    await db.saveIssues(dateKey, activeIssues, updatedAt);
    if (firebaseSync.isConnected()) {
      firebaseSync.uploadIssues(dateKey, activeIssues, updatedAt).catch(err =>
        console.warn('Cloud issues upload failed:', err)
      );
    }
    showToast('Đã xóa công việc');
    refreshDatesWithDataDebounced(500);
  } catch (error) {
    console.error('Error deleting issue:', error);
    showToast('Lỗi xóa công việc!', 'error');
  }
}

// --- QUICK INFO MANAGEMENT ---
async function loadQuickInfos() {
  try {
    quickInfos = await db.getQuickInfos();
    renderQuickInfos();
  } catch (error) {
    console.error('Error loading quick infos:', error);
  }
}

function renderQuickInfos() {
  DOM.quickInfoList.innerHTML = '';
  DOM.quickInfoCount.textContent = `${quickInfos.length} mục`;

  // Toggle filter search box based on count
  if (quickInfos.length >= 3) {
    DOM.quickInfoSearchWrapper.style.display = 'flex';
  } else {
    DOM.quickInfoSearchWrapper.style.display = 'none';
    DOM.quickInfoSearchInput.value = ''; // clear when hidden
  }

  const query = DOM.quickInfoSearchInput.value.trim().toLowerCase();
  const filteredInfos = quickInfos.filter(item => 
    item.title.toLowerCase().includes(query) || 
    item.value.toLowerCase().includes(query)
  );

  if (filteredInfos.length === 0) {
    DOM.quickInfoList.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon"><i data-lucide="info" style="width: 40px; height: 40px; stroke-width: 1.25; color: var(--text-dark);"></i></span>
        <span>Chưa có thông tin nào được lưu.</span>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  // Sort: newer first
  const sortedInfos = [...filteredInfos].sort((a, b) => {
    const timeA = a.updatedAt || '';
    const timeB = b.updatedAt || '';
    return timeB.localeCompare(timeA);
  });

  sortedInfos.forEach((item) => {
    const li = document.createElement('li');
    li.className = `quick-info-item ${editingQuickInfoId === item.id ? 'editing' : ''}`;
    li.dataset.id = item.id;
    li.title = 'Bấm để sao chép nhanh';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'quick-info-content';

    const titleDiv = document.createElement('div');
    titleDiv.className = 'quick-info-title';
    titleDiv.textContent = item.title;

    const valueDiv = document.createElement('div');
    valueDiv.className = 'quick-info-value';
    valueDiv.textContent = item.value;

    contentDiv.appendChild(titleDiv);
    contentDiv.appendChild(valueDiv);

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'quick-info-actions';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'quick-info-action-btn copy';
    copyBtn.innerHTML = '<i data-lucide="copy" style="width: 13px; height: 13px;"></i>';
    copyBtn.title = 'Sao chép';
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      copyQuickInfoValue(item.value, item.title);
    });

    const editBtn = document.createElement('button');
    editBtn.className = 'quick-info-action-btn edit';
    editBtn.innerHTML = '<i data-lucide="edit-2" style="width: 13px; height: 13px;"></i>';
    editBtn.title = 'Sửa';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      editQuickInfo(item);
    });

    const delBtn = document.createElement('button');
    delBtn.className = 'quick-info-action-btn delete';
    delBtn.innerHTML = '<i data-lucide="trash-2" style="width: 13px; height: 13px;"></i>';
    delBtn.title = 'Xóa';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteQuickInfo(item.id);
    });

    actionsDiv.appendChild(copyBtn);
    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(delBtn);

    li.appendChild(contentDiv);
    li.appendChild(actionsDiv);

    // Click on item to copy value
    li.addEventListener('click', (e) => {
      if (e.target.closest('.quick-info-actions')) return;
      copyQuickInfoValue(item.value, item.title);
    });

    DOM.quickInfoList.appendChild(li);
  });

  if (window.lucide) lucide.createIcons();
}

async function copyQuickInfoValue(value, title) {
  try {
    await navigator.clipboard.writeText(value);
    showToast(`Đã sao chép: ${title}`);
  } catch (error) {
    console.error('Error copying text:', error);
    showToast('Lỗi khi sao chép vào clipboard!', 'error');
  }
}

async function addOrUpdateQuickInfo() {
  const title = DOM.quickInfoTitleInput.value.trim();
  const value = DOM.quickInfoValueInput.value.trim();

  if (!title || !value) {
    showToast('Vui lòng nhập cả tiêu đề và nội dung', 'info');
    return;
  }

  const updatedAt = new Date().toISOString();

  if (editingQuickInfoId) {
    // Update Mode
    try {
      await db.saveQuickInfo(editingQuickInfoId, title, value, updatedAt);
      if (firebaseSync.isConnected()) {
        firebaseSync.uploadQuickInfo(editingQuickInfoId, title, value, updatedAt).catch(err =>
          console.warn('Cloud quick info upload failed:', err)
        );
      }
      showToast('Đã cập nhật thông tin');
      cancelEditQuickInfo();
      await loadQuickInfos();
    } catch (error) {
      console.error('Error updating quick info:', error);
      showToast('Lỗi khi cập nhật!', 'error');
    }
  } else {
    // Add Mode
    const id = 'qi_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    try {
      await db.saveQuickInfo(id, title, value, updatedAt);
      if (firebaseSync.isConnected()) {
        firebaseSync.uploadQuickInfo(id, title, value, updatedAt).catch(err =>
          console.warn('Cloud quick info upload failed:', err)
        );
      }
      showToast('Đã lưu thông tin');
      DOM.quickInfoTitleInput.value = '';
      DOM.quickInfoValueInput.value = '';
      await loadQuickInfos();
    } catch (error) {
      console.error('Error saving quick info:', error);
      showToast('Lỗi khi lưu thông tin!', 'error');
    }
  }
}

function editQuickInfo(item) {
  editingQuickInfoId = item.id;
  DOM.quickInfoTitleInput.value = item.title;
  DOM.quickInfoValueInput.value = item.value;
  DOM.quickInfoTitleInput.focus();

  // Change Add button to Save icon
  DOM.btnAddQuickInfo.innerHTML = '<i data-lucide="check" style="width: 14px; height: 14px;"></i>';
  DOM.btnAddQuickInfo.title = 'Lưu thay đổi';

  // Add Cancel button if not already exists
  let cancelBtn = document.getElementById('btn-cancel-quick-info');
  if (!cancelBtn) {
    cancelBtn = document.createElement('button');
    cancelBtn.id = 'btn-cancel-quick-info';
    cancelBtn.className = 'btn';
    cancelBtn.style.cssText = 'width: 32px; height: 32px; min-width: 32px; border-radius: 6px; display: flex; align-items: center; justify-content: center; padding: 0; background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.2); color: var(--danger); cursor: pointer;';
    cancelBtn.title = 'Hủy sửa';
    cancelBtn.innerHTML = '<i data-lucide="x" style="width: 14px; height: 14px;"></i>';
    cancelBtn.addEventListener('click', cancelEditQuickInfo);
    DOM.quickInfoBtnGroup.appendChild(cancelBtn);
  }

  if (window.lucide) lucide.createIcons();
  renderQuickInfos();
}

function cancelEditQuickInfo() {
  editingQuickInfoId = null;
  DOM.quickInfoTitleInput.value = '';
  DOM.quickInfoValueInput.value = '';

  DOM.btnAddQuickInfo.innerHTML = '<i data-lucide="plus" style="width: 14px; height: 14px;"></i>';
  DOM.btnAddQuickInfo.title = 'Thêm thông tin';

  const cancelBtn = document.getElementById('btn-cancel-quick-info');
  if (cancelBtn) {
    cancelBtn.remove();
  }

  if (window.lucide) lucide.createIcons();
  renderQuickInfos();
}

async function deleteQuickInfo(id) {
  const confirmed = await showConfirm(
    'Xác nhận xóa', 
    'Bạn có chắc chắn muốn xóa mục thông tin hay dùng này?', 
    'danger'
  );
  if (!confirmed) return;

  try {
    await db.deleteQuickInfo(id);
    if (firebaseSync.isConnected()) {
      firebaseSync.deleteQuickInfo(id).catch(err =>
        console.warn('Cloud quick info delete failed:', err)
      );
    }
    showToast('Đã xóa thông tin');
    
    if (editingQuickInfoId === id) {
      cancelEditQuickInfo();
    }
    
    await loadQuickInfos();
  } catch (error) {
    console.error('Error deleting quick info:', error);
    showToast('Lỗi khi xóa thông tin!', 'error');
  }
}

// --- ATTACHMENT AND FILE MANAGEMENT ---
function renderAttachments(attachments) {
  DOM.attachmentsList.innerHTML = '';
  
  if (attachments.length === 0) {
    DOM.attachmentsList.innerHTML = `
      <div class="empty-state" style="grid-column: span 2;">
        <span class="empty-state-icon"><i data-lucide="paperclip" style="width: 40px; height: 40px; stroke-width: 1.25; color: var(--text-dark);"></i></span>
        <span>Chưa có file nào đính kèm cho ngày này.</span>
      </div>
    `;
    return;
  }
  
  attachments.forEach((attach) => {
    const card = document.createElement('div');
    card.className = 'attachment-card';
    
    // Preview container
    const preview = document.createElement('div');
    preview.className = 'attachment-preview';
    
    const isImage = attach.type.startsWith('image/');
    
    if (isImage) {
      const img = document.createElement('img');
      // Create object URL from stored Blob
      const objectURL = URL.createObjectURL(attach.file);
      img.src = objectURL;
      img.alt = attach.name;
      preview.appendChild(img);
      
      // Auto revoke url after load to avoid memory leaks
      img.onload = () => URL.revokeObjectURL(objectURL);
      
      // Click preview to open lightbox
      preview.addEventListener('click', () => {
        openLightbox(attach);
      });
      preview.style.cursor = 'pointer';
    } else {
      const icon = document.createElement('span');
      icon.className = 'attachment-icon-placeholder';
      // Icon mapping by extension
      const ext = attach.name.split('.').pop().toLowerCase();
      let iconName = 'file';
      if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) iconName = 'archive';
      else if (['pdf'].includes(ext)) iconName = 'file-text';
      else if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) iconName = 'file-signature';
      else if (['xls', 'xlsx', 'csv'].includes(ext)) iconName = 'bar-chart-2';
      
      icon.innerHTML = `<i data-lucide="${iconName}" style="width: 32px; height: 32px; stroke-width: 1.5; color: var(--text-muted);"></i>`;
      preview.appendChild(icon);
    }
    
    // Action overlay buttons
    const actions = document.createElement('div');
    actions.className = 'attachment-actions';
    
    const dlBtn = document.createElement('button');
    dlBtn.className = 'action-icon-btn';
    dlBtn.innerHTML = '<i data-lucide="download" style="width: 14px; height: 14px;"></i>';
    dlBtn.title = 'Tải xuống';
    dlBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      downloadFile(attach);
    });
    
    const delBtn = document.createElement('button');
    delBtn.className = 'action-icon-btn btn-delete-attach';
    delBtn.innerHTML = '<i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>';
    delBtn.title = 'Xóa';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteAttachment(attach.id);
    });
    
    actions.appendChild(dlBtn);
    actions.appendChild(delBtn);
    
    // Card info
    const info = document.createElement('div');
    info.className = 'attachment-info';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'attachment-name';
    nameSpan.textContent = attach.name;
    nameSpan.title = attach.name;
    
    const sizeSpan = document.createElement('span');
    sizeSpan.className = 'attachment-size';
    sizeSpan.textContent = formatBytes(attach.size);
    
    info.appendChild(nameSpan);
    info.appendChild(sizeSpan);
    
    card.appendChild(preview);
    card.appendChild(actions);
    card.appendChild(info);
    
    DOM.attachmentsList.appendChild(card);
  });
  
  if (window.lucide) lucide.createIcons();
}

async function handleFileUpload(files) {
  if (!files || files.length === 0) return;
  const dateKey = formatDateKey(currentDate);
  
  showToast(`Đang tải lên ${files.length} file...`);
  
  for (let file of files) {
    try {
      let fileToSave = file;
      if (file.type.startsWith('image/')) {
        fileToSave = await compressImage(file);
      }
      
      let storagePath = null;
      let downloadURL = null;
      
      if (firebaseSync.isConnected()) {
        const cloudMeta = await firebaseSync.uploadAttachment(dateKey, fileToSave, fileToSave.name, fileToSave.type);
        if (cloudMeta) {
          storagePath = cloudMeta.id;
          downloadURL = cloudMeta.downloadURL;
        }
      }
      
      await db.saveAttachment(dateKey, fileToSave, fileToSave.name, fileToSave.type, storagePath, downloadURL);
    } catch (error) {
      console.error('Error storing file:', error);
      showToast(`Lỗi đính kèm file: ${file.name}`, 'error');
    }
  }
  
  // Reload
  const attachments = await db.getAttachments(dateKey);
  renderAttachments(attachments);
  showToast('Đã đính kèm file thành công!');
  await refreshDatesWithData();
}

async function deleteAttachment(id) {
  const confirmed = await showConfirm('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa file đính kèm này?', 'danger');
  if (!confirmed) return;
  const dateKey = formatDateKey(currentDate);
  try {
    const attachments = await db.getAttachments(dateKey);
    const attachToDelete = attachments.find(a => a.id === id);
    if (attachToDelete && firebaseSync.isConnected()) {
      const cloudDocId = attachToDelete.storagePath || String(id);
      await firebaseSync.deleteAttachment(cloudDocId);
    }

    await db.deleteAttachment(id);
    showToast('Đã xóa file đính kèm');
    const newAttachments = await db.getAttachments(dateKey);
    renderAttachments(newAttachments);
    await refreshDatesWithData();
  } catch (error) {
    console.error('Error deleting attachment:', error);
    showToast('Lỗi khi xóa file đính kèm!', 'error');
  }
}

function downloadFile(attach) {
  const url = URL.createObjectURL(attach.file);
  const a = document.createElement('a');
  a.href = url;
  a.download = attach.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- LIGHTBOX PREVIEW MODAL ---
let activeModalURL = null;
function openLightbox(attachOrSrc, optionalTitle = '') {
  DOM.modalPreviewImg.classList.remove('zoomed');
  
  if (activeModalURL) {
    URL.revokeObjectURL(activeModalURL);
    activeModalURL = null;
  }
  
  if (typeof attachOrSrc === 'string') {
    // Inline image from editor (data URL / base64 or other URL)
    DOM.modalPreviewImg.src = attachOrSrc;
    DOM.modalPreviewTitle.textContent = optionalTitle || 'Hình ảnh từ ghi chép';
    DOM.previewModal.classList.add('active');
    
    // Bind download button for inline image
    DOM.modalDownloadBtn.onclick = () => {
      const a = document.createElement('a');
      a.href = attachOrSrc;
      a.download = 'pasted_image.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
  } else {
    // Normal attachment object
    activeModalURL = URL.createObjectURL(attachOrSrc.file);
    DOM.modalPreviewImg.src = activeModalURL;
    DOM.modalPreviewTitle.textContent = `${attachOrSrc.name} (${formatBytes(attachOrSrc.size)})`;
    DOM.previewModal.classList.add('active');
    
    // Bind download button inside modal
    DOM.modalDownloadBtn.onclick = () => downloadFile(attachOrSrc);
  }
}

function closeLightbox() {
  DOM.previewModal.classList.remove('active');
  DOM.modalPreviewImg.src = '';
  DOM.modalPreviewImg.classList.remove('zoomed');
  if (activeModalURL) {
    URL.revokeObjectURL(activeModalURL);
    activeModalURL = null;
  }
}

function htmlToMarkdown(html) {
  if (!html) return '';
  let tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Process Headings
  tempDiv.querySelectorAll('h1').forEach(el => el.outerHTML = `\n# ${el.innerText}\n`);
  tempDiv.querySelectorAll('h2').forEach(el => el.outerHTML = `\n## ${el.innerText}\n`);
  
  // Process Paragraphs and Divs
  tempDiv.querySelectorAll('p, div').forEach(el => {
    if (el.tagName === 'DIV' && el.innerHTML === '<br>') {
      el.outerHTML = '\n';
    } else {
      el.outerHTML = `\n${el.innerHTML}\n`;
    }
  });
  
  // Process formatting
  tempDiv.querySelectorAll('b, strong').forEach(el => el.outerHTML = `**${el.innerText}**`);
  tempDiv.querySelectorAll('i, em').forEach(el => el.outerHTML = `*${el.innerText}*`);
  tempDiv.querySelectorAll('u').forEach(el => el.outerHTML = `<u>${el.innerText}</u>`);
  tempDiv.querySelectorAll('s, strike, del').forEach(el => el.outerHTML = `~~${el.innerText}~~`);
  
  // Lists
  tempDiv.querySelectorAll('ul').forEach(el => {
    el.querySelectorAll('li').forEach(li => li.outerHTML = `- ${li.innerText}\n`);
    el.outerHTML = `\n${el.innerHTML}\n`;
  });
  tempDiv.querySelectorAll('ol').forEach(el => {
    let count = 1;
    el.querySelectorAll('li').forEach(li => li.outerHTML = `${count++}. ${li.innerText}\n`);
    el.outerHTML = `\n${el.innerHTML}\n`;
  });
  
  // Code block
  tempDiv.querySelectorAll('pre').forEach(el => el.outerHTML = `\n\`\`\`\n${el.innerText}\n\`\`\`\n`);
  
  // Inline images (skip base64 data URLs in markdown, put descriptive name)
  tempDiv.querySelectorAll('img').forEach(el => {
    el.outerHTML = `\n![Hình ảnh đính kèm](${el.src.startsWith('data:') ? 'Pasted Image' : el.src})\n`;
  });
  
  let md = tempDiv.innerText;
  return md.replace(/\n{3,}/g, '\n\n').trim();
}

// --- EXPORT TO MARKDOWN ---
async function exportToMarkdown() {
  const dateKey = formatDateKey(currentDate);
  const html = DOM.notepadTextarea.innerHTML;
  const markdownText = htmlToMarkdown(html);
  const attachments = await db.getAttachments(dateKey);
  
  let mdContent = `# Nhật ký công việc - Ngày ${dateKey}\n\n`;
  
  mdContent += `## 📝 Nội dung ghi chép\n\n`;
  if (markdownText) {
    mdContent += `${markdownText}\n\n`;
  } else {
    mdContent += `*(Không có ghi chép)*\n\n`;
  }
  
  mdContent += `## ⚠️ Vấn đề trong ngày\n\n`;
  if (activeIssues.length > 0) {
    activeIssues.forEach(issue => {
      mdContent += `- [${issue.resolved ? 'x' : ' '}] ${issue.text}\n`;
    });
    mdContent += '\n';
  } else {
    mdContent += `*(Không có vấn đề nào)*\n\n`;
  }
  
  mdContent += `## 📎 Danh sách file đính kèm\n\n`;
  if (attachments.length > 0) {
    attachments.forEach(attach => {
      mdContent += `- ${attach.name} (${formatBytes(attach.size)})\n`;
    });
  } else {
    mdContent += `*(Không có file đính kèm)*\n`;
  }
  
  const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `dailylog_${dateKey.replace(/-/g, '')}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Đã xuất Markdown!');
}

// --- CLEAR NOTE DAY ---
async function clearActiveNote() {
  const dateKey = formatDateKey(currentDate);
  const dateDisplay = formatDateDisplay(currentDate);

  const confirmed = await showConfirm(
    `Xóa dữ liệu ngày ${dateKey}`,
    `Bạn có chắc muốn XÓA TOÀN BỘ ghi chép, các vấn đề và file đính kèm của ngày "${dateDisplay}"? Thao tác này không thể hoàn tác!`,
    'danger'
  );
  if (!confirmed) return;

  try {
    const updatedAt = new Date().toISOString();
    // Delete note and issues in parallel
    await Promise.all([
      db.saveNote(dateKey, '', updatedAt),
      db.saveIssues(dateKey, [], updatedAt)
    ]);

    // Sync deletion to cloud
    if (firebaseSync.isConnected()) {
      firebaseSync.uploadNote(dateKey, '', updatedAt).catch(err =>
        console.warn('Cloud note clear failed:', err)
      );
      firebaseSync.uploadIssues(dateKey, [], updatedAt).catch(err =>
        console.warn('Cloud issues clear failed:', err)
      );
    }

    // Delete all attachments for this date
    const attachments = await db.getAttachments(dateKey);
    await Promise.all(attachments.map(async (attach) => {
      await db.deleteAttachment(attach.id);
      if (firebaseSync.isConnected()) {
        await firebaseSync.deleteAttachment(attach.id).catch(err =>
          console.warn('Cloud attachment delete failed:', err)
        );
      }
    }));

    showToast(`Đã xóa dữ liệu ngày ${dateKey}`);
    await loadDateData(currentDate);
    refreshDatesWithDataDebounced(300);
  } catch (error) {
    console.error('Error clearing data:', error);
    showToast('Lỗi khi xóa dữ liệu!', 'error');
  }
}

// --- BACKUP & RESTORE ALL DATABASE DATA ---
async function exportFullBackup() {
  showToast('Đang tạo file sao lưu...');
  try {
    const allData = await db.getAllData();
    const jsonStr = JSON.stringify(allData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const todayStr = formatDateKey(new Date()).replace(/-/g, '');
    const a = document.createElement('a');
    a.href = url;
    a.download = `dailylog_backup_${todayStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Xuất file backup thành công!');
  } catch (error) {
    console.error('Backup error:', error);
    showToast('Lỗi khi tạo file backup!', 'error');
  }
}

function triggerImportBackup() {
  DOM.importFileInput.click();
}

async function handleImportBackup(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const confirmed = await showConfirm(
    'Khôi phục dữ liệu',
    'Nhập dữ liệu backup sẽ GHI ĐÈ toàn bộ dữ liệu hiện tại trong ứng dụng của bạn. Bạn có muốn tiếp tục?',
    'warning'
  );
  if (!confirmed) {
    event.target.value = '';
    return;
  }
  
  showToast('Đang khôi phục dữ liệu...');
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      await db.importAllData(data);
      showToast('Khôi phục dữ liệu thành công!');
      // Reload current date view and update dots
      await refreshDatesWithData();
      await loadDateData(currentDate);
      await loadQuickInfos();
    } catch (err) {
      console.error('Import error:', err);
      showToast('Lỗi! File backup không hợp lệ.', 'error');
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

// --- STICKY BOARD HELPER FUNCTIONS ---
function setViewMode(mode) {
  const container = document.getElementById('notepad-card-container');
  const appContainer = document.querySelector('.app-container');
  
  if (mode === 'sticky') {
    container.classList.remove('view-mode-notepad');
    container.classList.add('view-mode-board');
    if (appContainer) appContainer.classList.add('board-fullscreen-mode');
    DOM.btnModeNotepad.classList.remove('active');
    DOM.btnModeBoard.classList.add('active');
    renderStickyBoard();
  } else {
    container.classList.remove('view-mode-board');
    container.classList.add('view-mode-notepad');
    if (appContainer) appContainer.classList.remove('board-fullscreen-mode');
    DOM.btnModeBoard.classList.remove('active');
    DOM.btnModeNotepad.classList.add('active');
  }
  
  currentBoardData.mode = mode;
  if (window.lucide) lucide.createIcons();
}

async function saveBoardMode(mode) {
  if (currentBoardData.mode === mode) return;
  
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    await saveNoteImmediately();
  }
  if (boardSaveTimeout) {
    clearTimeout(boardSaveTimeout);
    await saveBoardImmediately();
  }
  
  currentBoardData.mode = mode;
  setViewMode(mode);
  
  const dateKey = formatDateKey(currentDate);
  const updatedAt = new Date().toISOString();
  currentBoardData.updatedAt = updatedAt;
  await db.saveStickyBoard(dateKey, currentBoardData, updatedAt);
  
  if (firebaseSync.isConnected()) {
    firebaseSync.uploadStickyBoard(dateKey, currentBoardData, updatedAt).catch(err =>
      console.warn('Cloud board sync failed:', err)
    );
  }
}

function renderStickyBoard() {
  const canvas = document.getElementById('sticky-board-canvas');
  const emptyState = document.getElementById('board-empty-state');
  
  canvas.innerHTML = '';
  
  const notes = currentBoardData.notes || [];
  
  if (notes.length === 0) {
    emptyState.style.display = 'block';
  } else {
    emptyState.style.display = 'none';
  }
  
  notes.forEach(note => {
    const noteEl = createNoteElement(note);
    canvas.appendChild(noteEl);
  });
  
  if (window.lucide) lucide.createIcons();
}

function createNoteElement(note) {
  const noteEl = document.createElement('div');
  noteEl.className = `sticky-note color-${note.color || 'yellow'}`;
  if (note.type === 'text-block') {
    noteEl.classList.add('type-text-block');
  } else if (note.type === 'image') {
    noteEl.classList.add('type-image');
  } else if (note.type === 'file') {
    noteEl.classList.add('type-file');
  }
  noteEl.dataset.id = note.id;
  noteEl.style.left = `${note.x}px`;
  noteEl.style.top = `${note.y}px`;
  noteEl.style.width = note.width ? `${note.width}px` : '240px';
  noteEl.style.height = note.height ? `${note.height}px` : '180px';
  noteEl.style.zIndex = note.zIndex || 10;
  
  const header = document.createElement('div');
  header.className = 'sticky-note-header';
  
  const handle = document.createElement('div');
  handle.className = 'sticky-note-drag-handle';
  handle.innerHTML = '<i data-lucide="grip-horizontal"></i>';
  header.appendChild(handle);
  
  const colorsGroup = document.createElement('div');
  colorsGroup.className = 'sticky-note-colors';
  const colorPresets = ['yellow', 'pink', 'blue', 'green', 'purple'];
  colorPresets.forEach(col => {
    const dot = document.createElement('span');
    dot.className = `color-dot ${col} ${note.color === col ? 'active' : ''}`;
    dot.dataset.color = col;
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      setNoteColor(note.id, col, noteEl);
    });
    colorsGroup.appendChild(dot);
  });
  header.appendChild(colorsGroup);
  
  // Layer Up button
  const layerUpBtn = document.createElement('button');
  layerUpBtn.className = 'sticky-note-action-btn';
  layerUpBtn.title = 'Đưa lên trên cùng';
  layerUpBtn.innerHTML = '<i data-lucide="chevron-up"></i>';
  layerUpBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    bringNoteToFront(noteEl, note);
  });
  header.appendChild(layerUpBtn);
  
  // Layer Down button
  const layerDownBtn = document.createElement('button');
  layerDownBtn.className = 'sticky-note-action-btn';
  layerDownBtn.title = 'Đưa xuống dưới cùng';
  layerDownBtn.innerHTML = '<i data-lucide="chevron-down"></i>';
  layerDownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    sendNoteToBack(noteEl, note);
  });
  header.appendChild(layerDownBtn);
  
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'sticky-note-delete';
  deleteBtn.title = 'Xóa ghi chú';
  deleteBtn.innerHTML = '<i data-lucide="x"></i>';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    deleteNote(note.id);
  });
  header.appendChild(deleteBtn);
  
  noteEl.appendChild(header);
  
  if (note.type === 'image') {
    const imgContainer = document.createElement('div');
    imgContainer.className = 'sticky-note-image-container';
    const img = document.createElement('img');
    img.className = 'sticky-note-image';
    
    if (note.fileUrl && !note.fileUrl.startsWith('data:') && !note.fileUrl.startsWith('blob:')) {
      img.src = note.fileUrl;
    } else if (note.fileId) {
      db.getAttachment(note.fileId).then(attach => {
        if (attach && attach.file) {
          const freshUrl = URL.createObjectURL(attach.file);
          img.src = freshUrl;
          
          imgContainer.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            openLightbox(freshUrl, note.fileName);
          });
        }
      }).catch(err => console.error("Error loading image for note:", err));
    } else {
      img.src = note.fileUrl || '';
    }
    
    imgContainer.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      if (img.src) {
        openLightbox(img.src, note.fileName);
      }
    });
    
    imgContainer.appendChild(img);
    noteEl.appendChild(imgContainer);
  } else if (note.type === 'file') {
    const fileContainer = document.createElement('div');
    fileContainer.className = 'sticky-note-file-container';
    
    const icon = document.createElement('div');
    icon.className = 'sticky-note-file-icon';
    icon.innerHTML = getFileIcon(note.fileName);
    fileContainer.appendChild(icon);
    
    const name = document.createElement('div');
    name.className = 'sticky-note-file-name';
    name.textContent = note.fileName || 'Tài liệu';
    name.title = note.fileName || 'Tài liệu';
    fileContainer.appendChild(name);
    
    const size = document.createElement('div');
    size.className = 'sticky-note-file-size';
    size.textContent = formatBytes(note.fileSize || 0);
    fileContainer.appendChild(size);
    
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'sticky-note-file-btn';
    downloadBtn.innerHTML = '<i data-lucide="download" style="width:12px;height:12px;"></i> Tải về';
    downloadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      downloadAttachedFile(note.fileId, note.fileName);
    });
    fileContainer.appendChild(downloadBtn);
    
    noteEl.appendChild(fileContainer);
  } else {
    const body = document.createElement('div');
    body.className = 'sticky-note-body';
    body.contentEditable = 'true';
    body.innerHTML = note.content || '';
    
    body.addEventListener('input', () => {
      note.content = body.innerHTML;
      saveBoardDebounced();
    });
    
    noteEl.appendChild(body);
  }
  
  setupNoteDragListeners(noteEl, handle, note);
  setupNoteResizeListener(noteEl, note);
  
  return noteEl;
}

function getFileIcon(fileName) {
  const ext = fileName ? fileName.split('.').pop().toLowerCase() : '';
  if (['zip', 'rar', '7z'].includes(ext)) return '📦';
  if (['pdf'].includes(ext)) return '📕';
  if (['doc', 'docx'].includes(ext)) return '📘';
  if (['xls', 'xlsx'].includes(ext)) return '📗';
  if (['ppt', 'pptx'].includes(ext)) return '📙';
  if (['txt', 'md'].includes(ext)) return '📝';
  if (['mp3', 'wav', 'ogg'].includes(ext)) return '🎵';
  if (['mp4', 'mkv', 'avi'].includes(ext)) return '🎥';
  return '📄';
}

async function downloadAttachedFile(fileId, fileName) {
  try {
    const attachments = await db.getAttachments(formatDateKey(currentDate));
    const attachment = attachments.find(a => a.id === fileId);
    if (!attachment) {
      showToast('Không tìm thấy file đính kèm!', 'error');
      return;
    }
    
    const url = URL.createObjectURL(attachment.file);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || attachment.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to download file:', err);
    showToast('Lỗi khi tải file xuống!', 'error');
  }
}

function bringNoteToFront(noteEl, note) {
  let maxZ = 10;
  currentBoardData.notes.forEach(n => {
    if (n.zIndex && n.zIndex > maxZ) {
      maxZ = n.zIndex;
    }
  });
  const newZ = maxZ + 1;
  noteEl.style.zIndex = newZ;
  note.zIndex = newZ;
  saveBoardDebounced();
}

function sendNoteToBack(noteEl, note) {
  let minZ = 10;
  currentBoardData.notes.forEach(n => {
    if (n.zIndex && n.zIndex < minZ) {
      minZ = n.zIndex;
    }
  });
  const newZ = Math.max(1, minZ - 1);
  noteEl.style.zIndex = newZ;
  note.zIndex = newZ;
  saveBoardDebounced();
}

function setupNoteDragListeners(noteEl, handle, note) {
  let startX = 0, startY = 0;
  let initialLeft = 0, initialTop = 0;
  
  const onMouseDown = (e) => {
    bringNoteToFront(noteEl, note);
    startX = e.clientX;
    startY = e.clientY;
    initialLeft = parseInt(noteEl.style.left, 10) || 0;
    initialTop = parseInt(noteEl.style.top, 10) || 0;
    
    noteEl.classList.add('dragging');
    isDraggingNote = true;
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    e.preventDefault();
  };
  
  const onMouseMove = (e) => {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    let newLeft = initialLeft + dx;
    let newTop = initialTop + dy;
    
    newLeft = Math.max(0, Math.min(3200 - noteEl.offsetWidth, newLeft));
    newTop = Math.max(0, Math.min(3200 - noteEl.offsetHeight, newTop));
    
    noteEl.style.left = `${newLeft}px`;
    noteEl.style.top = `${newTop}px`;
    
    note.x = newLeft;
    note.y = newTop;
  };
  
  const onMouseUp = () => {
    noteEl.classList.remove('dragging');
    isDraggingNote = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    saveBoardDebounced();
  };
  
  handle.addEventListener('mousedown', onMouseDown);
  
  const onTouchStart = (e) => {
    bringNoteToFront(noteEl, note);
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    initialLeft = parseInt(noteEl.style.left, 10) || 0;
    initialTop = parseInt(noteEl.style.top, 10) || 0;
    
    noteEl.classList.add('dragging');
    isDraggingNote = true;
    
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
  };
  
  const onTouchMove = (e) => {
    const touch = e.touches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    
    let newLeft = initialLeft + dx;
    let newTop = initialTop + dy;
    
    newLeft = Math.max(0, Math.min(3200 - noteEl.offsetWidth, newLeft));
    newTop = Math.max(0, Math.min(3200 - noteEl.offsetHeight, newTop));
    
    noteEl.style.left = `${newLeft}px`;
    noteEl.style.top = `${newTop}px`;
    
    note.x = newLeft;
    note.y = newTop;
    
    e.preventDefault();
  };
  
  const onTouchEnd = () => {
    noteEl.classList.remove('dragging');
    isDraggingNote = false;
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
    saveBoardDebounced();
  };
  
  handle.addEventListener('touchstart', onTouchStart);
}

function setupNoteResizeListener(noteEl, note) {
  let resizeTimeout;
  const observer = new ResizeObserver(entries => {
    for (let entry of entries) {
      const newWidth = noteEl.offsetWidth;
      const newHeight = noteEl.offsetHeight;
      
      // Prevent resetting width/height when note is hidden or not fully rendered (0 width/height)
      if (newWidth === 0 || newHeight === 0) continue;
      
      if (note.width === newWidth && note.height === newHeight) continue;
      
      note.width = newWidth;
      note.height = newHeight;
      
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        saveBoardDebounced();
      }, 500);
    }
  });
  observer.observe(noteEl);
}

function setNoteColor(noteId, color, noteEl) {
  const note = currentBoardData.notes.find(n => n.id === noteId);
  if (!note) return;
  
  const colors = ['yellow', 'pink', 'blue', 'green', 'purple'];
  colors.forEach(c => noteEl.classList.remove(`color-${c}`));
  
  noteEl.classList.add(`color-${color}`);
  note.color = color;
  
  const dots = noteEl.querySelectorAll('.color-dot');
  dots.forEach(dot => {
    if (dot.dataset.color === color) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });
  
  saveBoardDebounced();
}

async function deleteNote(noteId) {
  const confirmed = await showConfirm('Xác nhận', 'Bạn có chắc chắn muốn xóa ghi chú dính này?', 'danger');
  if (!confirmed) return;
  
  const index = currentBoardData.notes.findIndex(n => n.id === noteId);
  if (index !== -1) {
    currentBoardData.notes.splice(index, 1);
    renderStickyBoard();
    saveBoardImmediately();
  }
}

function setupCanvasPanning() {
  const container = document.getElementById('sticky-board-canvas-container');
  const canvas = document.getElementById('sticky-board-canvas');
  
  let startX = 0, startY = 0;
  let scrollLeft = 0, scrollTop = 0;
  
  const onMouseDown = (e) => {
    if (activeBoardTool !== 'pan') return;
    if (e.target !== canvas) return;
    
    isPanningCanvas = true;
    container.classList.add('dragging-canvas');
    
    startX = e.clientX;
    startY = e.clientY;
    scrollLeft = container.scrollLeft;
    scrollTop = container.scrollTop;
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    e.preventDefault();
  };
  
  const onMouseMove = (e) => {
    if (!isPanningCanvas) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    container.scrollLeft = scrollLeft - dx;
    container.scrollTop = scrollTop - dy;
  };
  
  const onMouseUp = () => {
    isPanningCanvas = false;
    container.classList.remove('dragging-canvas');
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };
  
  canvas.addEventListener('mousedown', onMouseDown);
  
  const onTouchStart = (e) => {
    if (activeBoardTool !== 'pan') return;
    if (e.target !== canvas) return;
    if (e.touches.length !== 1) return;
    
    isPanningCanvas = true;
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    scrollLeft = container.scrollLeft;
    scrollTop = container.scrollTop;
    
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
  };
  
  const onTouchMove = (e) => {
    if (!isPanningCanvas) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    
    container.scrollLeft = scrollLeft - dx;
    container.scrollTop = scrollTop - dy;
    e.preventDefault();
  };
  
  const onTouchEnd = () => {
    isPanningCanvas = false;
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
  };
  
  canvas.addEventListener('touchstart', onTouchStart);
}

function setupCanvasMarqueeSelection() {
  const container = document.getElementById('sticky-board-canvas-container');
  const canvas = document.getElementById('sticky-board-canvas');
  
  let startX = 0, startY = 0;
  let marquee = null;
  
  const onMouseDown = (e) => {
    if (activeBoardTool !== 'select-delete') return;
    if (e.target !== canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;
    
    marquee = document.createElement('div');
    marquee.className = 'selection-marquee';
    marquee.style.left = `${startX}px`;
    marquee.style.top = `${startY}px`;
    marquee.style.width = '0px';
    marquee.style.height = '0px';
    canvas.appendChild(marquee);
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    e.preventDefault();
  };
  
  const onMouseMove = (e) => {
    if (!marquee) return;
    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    const x = Math.min(currentX, startX);
    const y = Math.min(currentY, startY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    
    marquee.style.left = `${x}px`;
    marquee.style.top = `${y}px`;
    marquee.style.width = `${width}px`;
    marquee.style.height = `${height}px`;
    
    const notes = currentBoardData.notes || [];
    notes.forEach(note => {
      const noteEl = document.querySelector(`.sticky-note[data-id="${note.id}"]`);
      if (noteEl) {
        const noteWidth = noteEl.offsetWidth;
        const noteHeight = noteEl.offsetHeight;
        
        const intersects = note.x < x + width &&
                             note.x + noteWidth > x &&
                             note.y < y + height &&
                             note.y + noteHeight > y;
                             
        if (intersects) {
          noteEl.classList.add('selected-for-delete');
        } else {
          noteEl.classList.remove('selected-for-delete');
        }
      }
    });
  };
  
  const onMouseUp = async () => {
    if (!marquee) return;
    marquee.remove();
    marquee = null;
    
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    
    const selectedNotesElements = canvas.querySelectorAll('.sticky-note.selected-for-delete');
    if (selectedNotesElements.length === 0) return;
    
    const count = selectedNotesElements.length;
    const confirmed = await showConfirm(
      'Xác nhận xóa vùng chọn',
      `Bạn có chắc chắn muốn xóa ${count} khối ghi chú đã chọn trong vùng này không?`,
      'danger'
    );
    
    if (confirmed) {
      const idsToDelete = Array.from(selectedNotesElements).map(el => el.dataset.id);
      currentBoardData.notes = currentBoardData.notes.filter(note => !idsToDelete.includes(note.id));
      renderStickyBoard();
      saveBoardImmediately();
      showToast(`Đã xóa ${count} ghi chú đã chọn!`);
    } else {
      selectedNotesElements.forEach(el => el.classList.remove('selected-for-delete'));
    }
  };
  
  canvas.addEventListener('mousedown', onMouseDown);
  
  const onTouchStart = (e) => {
    if (activeBoardTool !== 'select-delete') return;
    if (e.target !== canvas) return;
    if (e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    startX = touch.clientX - rect.left;
    startY = touch.clientY - rect.top;
    
    marquee = document.createElement('div');
    marquee.className = 'selection-marquee';
    marquee.style.left = `${startX}px`;
    marquee.style.top = `${startY}px`;
    marquee.style.width = '0px';
    marquee.style.height = '0px';
    canvas.appendChild(marquee);
    
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
  };
  
  const onTouchMove = (e) => {
    if (!marquee) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const currentX = touch.clientX - rect.left;
    const currentY = touch.clientY - rect.top;
    
    const x = Math.min(currentX, startX);
    const y = Math.min(currentY, startY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    
    marquee.style.left = `${x}px`;
    marquee.style.top = `${y}px`;
    marquee.style.width = `${width}px`;
    marquee.style.height = `${height}px`;
    
    const notes = currentBoardData.notes || [];
    notes.forEach(note => {
      const noteEl = document.querySelector(`.sticky-note[data-id="${note.id}"]`);
      if (noteEl) {
        const noteWidth = noteEl.offsetWidth;
        const noteHeight = noteEl.offsetHeight;
        
        const intersects = note.x < x + width &&
                             note.x + noteWidth > x &&
                             note.y < y + height &&
                             note.y + noteHeight > y;
                             
        if (intersects) {
          noteEl.classList.add('selected-for-delete');
        } else {
          noteEl.classList.remove('selected-for-delete');
        }
      }
    });
    e.preventDefault();
  };
  
  const onTouchEnd = async () => {
    if (!marquee) return;
    marquee.remove();
    marquee = null;
    
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
    
    const selectedNotesElements = canvas.querySelectorAll('.sticky-note.selected-for-delete');
    if (selectedNotesElements.length === 0) return;
    
    const count = selectedNotesElements.length;
    const confirmed = await showConfirm(
      'Xác nhận xóa vùng chọn',
      `Bạn có chắc chắn muốn xóa ${count} khối ghi chú đã chọn trong vùng này không?`,
      'danger'
    );
    
    if (confirmed) {
      const idsToDelete = Array.from(selectedNotesElements).map(el => el.dataset.id);
      currentBoardData.notes = currentBoardData.notes.filter(note => !idsToDelete.includes(note.id));
      renderStickyBoard();
      saveBoardImmediately();
      showToast(`Đã xóa ${count} ghi chú đã chọn!`);
    } else {
      selectedNotesElements.forEach(el => el.classList.remove('selected-for-delete'));
    }
  };
  
  canvas.addEventListener('touchstart', onTouchStart);
}

function setupCanvasDoubleClicks() {
  const canvas = document.getElementById('sticky-board-canvas');
  canvas.addEventListener('dblclick', (e) => {
    if (e.target !== canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    addStickyNoteAtPosition(x, y, '', 'text-block');
  });
}

function addStickyNoteAtPosition(x, y, content = '', type = 'text', additionalFields = {}) {
  const id = 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  const newNote = {
    id,
    x: Math.round(x),
    y: Math.round(y),
    width: 240,
    height: 180,
    content,
    color: getRandomColorPreset(),
    zIndex: getNextZIndex(),
    type,
    ...additionalFields
  };
  
  currentBoardData.notes.push(newNote);
  renderStickyBoard();
  saveBoardImmediately();
  
  setTimeout(() => {
    const noteEl = document.querySelector(`.sticky-note[data-id="${id}"]`);
    if (noteEl) {
      const body = noteEl.querySelector('.sticky-note-body');
      if (body) body.focus();
    }
  }, 100);
}

function getRandomColorPreset() {
  const presets = ['yellow', 'pink', 'blue', 'green', 'purple'];
  return presets[Math.floor(Math.random() * presets.length)];
}

function getNextZIndex() {
  let maxZ = 10;
  currentBoardData.notes.forEach(n => {
    if (n.zIndex && n.zIndex > maxZ) {
      maxZ = n.zIndex;
    }
  });
  return maxZ + 1;
}

function saveBoardDebounced() {
  setSaveStatus('typing');
  if (boardSaveTimeout) clearTimeout(boardSaveTimeout);
  boardSaveTimeout = setTimeout(saveBoardImmediately, 800);
}

async function saveBoardImmediately() {
  boardSaveTimeout = null;
  setSaveStatus('saving');
  const dateKey = formatDateKey(currentDate);
  
  try {
    const updatedAt = new Date().toISOString();
    currentBoardData.updatedAt = updatedAt;
    await db.saveStickyBoard(dateKey, currentBoardData, updatedAt);
    setSaveStatus('saved');
    
    if (firebaseSync.isConnected()) {
      firebaseSync.uploadStickyBoard(dateKey, currentBoardData, updatedAt).catch(err =>
        console.warn('Cloud board upload failed:', err)
      );
    }
    
    refreshDatesWithDataDebounced(1500);
  } catch (error) {
    console.error('Error auto-saving board:', error);
    setSaveStatus('error');
  }
}

function setupBoardDragAndDrop() {
  const container = document.getElementById('sticky-board-canvas-container');
  const canvas = document.getElementById('sticky-board-canvas');
  
  container.addEventListener('dragover', (e) => {
    if (currentBoardData.mode !== 'sticky') return;
    e.preventDefault();
  });
  
  container.addEventListener('drop', async (e) => {
    if (currentBoardData.mode !== 'sticky') return;
    e.preventDefault();
    
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    
    const rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const px = x + i * 20;
      const py = y + i * 20;
      await attachFileToBoardAtPosition(file, px, py);
    }
  });
}

function setupBoardPasteListener() {
  document.addEventListener('paste', async (e) => {
    if (currentBoardData.mode !== 'sticky') return;
    
    const items = (e.clipboardData || window.clipboardData).items;
    let file = null;
    
    for (let item of items) {
      if (item.kind === 'file') {
        file = item.getAsFile();
        break;
      }
    }
    
    if (file) {
      e.preventDefault();
      const container = document.getElementById('sticky-board-canvas-container');
      const rect = document.getElementById('sticky-board-canvas').getBoundingClientRect();
      
      const viewportCenterX = container.scrollLeft + container.clientWidth / 2 - 120;
      const viewportCenterY = container.scrollTop + container.clientHeight / 2 - 90;
      
      await attachFileToBoardAtPosition(file, viewportCenterX, viewportCenterY);
    }
  });
}

function getImageDimensions(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth || 240, height: img.naturalHeight || 180 });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 240, height: 180 });
    };
    img.src = url;
  });
}

async function attachFileToBoardAtPosition(file, x, y) {
  const dateKey = formatDateKey(currentDate);
  setSaveStatus('saving');
  
  try {
    let finalFile = file;
    if (file.type.startsWith('image/')) {
      finalFile = await compressImage(file);
    }
    
    const uniqueAttachId = 'attach_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    let storagePath = uniqueAttachId;
    let downloadURL = null;
    
    if (firebaseSync.isConnected()) {
      showToast(`Đang tải '${file.name}' lên đám mây...`, 'info');
      const cloudAttach = await firebaseSync.uploadAttachment(dateKey, finalFile, file.name, file.type, uniqueAttachId);
      if (cloudAttach) {
        storagePath = cloudAttach.id;
        downloadURL = cloudAttach.downloadURL;
      }
    }
    
    const savedAttach = await db.saveAttachment(dateKey, finalFile, file.name, file.type, storagePath, downloadURL, uniqueAttachId);
    
    if (file.type.startsWith('image/')) {
      const dimensions = await getImageDimensions(finalFile);
      const aspect = dimensions.width / dimensions.height;
      
      let targetWidth = 320;
      let targetHeight = Math.round(targetWidth / aspect);
      
      if (targetHeight > 320) {
        targetHeight = 320;
        targetWidth = Math.round(targetHeight * aspect);
      }
      
      const localUrl = URL.createObjectURL(finalFile);
      addStickyNoteAtPosition(x, y, '', 'image', {
        fileId: savedAttach.id,
        fileName: file.name,
        fileUrl: downloadURL || localUrl,
        width: targetWidth,
        height: targetHeight
      });
    } else {
      addStickyNoteAtPosition(x, y, '', 'file', {
        fileId: savedAttach.id,
        fileName: file.name,
        fileSize: file.size
      });
    }
    
    showToast(`Đã đính kèm tệp tin '${file.name}' lên bảng!`);
    
    const updatedAttachments = await db.getAttachments(dateKey);
    renderAttachments(updatedAttachments);
  } catch (err) {
    console.error('Failed to attach file to board:', err);
    showToast('Lỗi khi đính kèm file!', 'error');
  }
}

function convertNoteToBoard() {
  const html = DOM.notepadTextarea.innerHTML.trim();
  if (!html || html === '<br>' || DOM.notepadTextarea.innerText.trim() === '') {
    showToast('Không có nội dung ghi chép để chuyển đổi!', 'info');
    return;
  }
  
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  const textBlocks = [];
  const blocks = tempDiv.querySelectorAll('h1, h2, p, blockquote, pre, li');
  if (blocks.length > 0) {
    blocks.forEach(el => {
      const txt = el.innerHTML.trim();
      if (txt) {
        let cleanHtml = el.outerHTML;
        if (el.tagName === 'LI') cleanHtml = `• ${el.innerHTML}`;
        textBlocks.push(cleanHtml);
      }
    });
  } else {
    const lines = DOM.notepadTextarea.innerText.split('\n').map(l => l.trim()).filter(l => l !== '');
    lines.forEach(line => textBlocks.push(`<p>${line}</p>`));
  }
  
  if (textBlocks.length === 0) {
    showToast('Không tìm thấy nội dung để chuyển đổi!', 'info');
    return;
  }
  
  currentBoardData.notes = [];
  
  const startX = 100;
  const startY = 100;
  const gapX = 260;
  const gapY = 200;
  const cols = 3;
  
  textBlocks.forEach((content, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = startX + col * gapX;
    const y = startY + row * gapY;
    const id = 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    currentBoardData.notes.push({
      id,
      x,
      y,
      width: 240,
      height: 180,
      content,
      color: getRandomColorPreset(),
      zIndex: 10 + idx,
      type: 'text'
    });
  });
  
  saveBoardMode('sticky');
  renderStickyBoard();
  saveBoardImmediately();
  showToast(`Đã chuyển đổi thành ${textBlocks.length} ghi chú dính!`);
}

function convertBoardToNote() {
  const notes = currentBoardData.notes || [];
  if (notes.length === 0) {
    showToast('Bảng dính đang trống, không thể chuyển đổi!', 'info');
    return;
  }
  
  const sortedNotes = [...notes].sort((a, b) => {
    if (Math.abs(a.y - b.y) < 50) {
      return a.x - b.x;
    }
    return a.y - b.y;
  });
  
  let html = '';
  sortedNotes.forEach(note => {
    if (note.type === 'text') {
      const content = (note.content || '').trim();
      if (content) {
        if (content.startsWith('<') && content.endsWith('>')) {
          html += content + '\n';
        } else {
          html += `<p>${content}</p>\n`;
        }
      }
    } else if (note.type === 'image') {
      html += `<p><img src="${note.fileUrl}" alt="${note.fileName || 'Image'}" style="max-width:100%; border-radius:8px;"></p>\n`;
    } else if (note.type === 'file') {
      html += `<p>📎 <b>Đính kèm: ${note.fileName}</b></p>\n`;
    }
  });
  
  DOM.notepadTextarea.innerHTML = html;
  saveNoteImmediately();
  saveBoardMode('notepad');
  showToast('Đã gộp tất cả ghi chú dính vào Ghi chép!');
}

// --- EVENT LISTENERS REGISTRATION ---
function setupEventListeners() {
  // Global search input listener
  DOM.globalSearchInput.addEventListener('input', handleGlobalSearchInput);
  
  // Dismiss global search dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!DOM.globalSearchInput.contains(e.target) && !DOM.globalSearchResults.contains(e.target)) {
      DOM.globalSearchResults.classList.remove('active');
    }
  });

  // Calendar month navigation
  DOM.prevMonthBtn.addEventListener('click', () => {
    calendarDate.setMonth(calendarDate.getMonth() - 1);
    renderCalendar();
  });
  
  DOM.nextMonthBtn.addEventListener('click', () => {
    calendarDate.setMonth(calendarDate.getMonth() + 1);
    renderCalendar();
  });
  
  // Notepad changes (auto-save and stats update)
  DOM.notepadTextarea.addEventListener('input', () => {
    saveNoteDebounced();
    updateTextStats();
  });
  
  // Rich Notepad Formatting Button Listeners
  const formatButtons = [
    { id: 'format-bold', command: 'bold' },
    { id: 'format-italic', command: 'italic' },
    { id: 'format-underline', command: 'underline' },
    { id: 'format-strike', command: 'strikeThrough' },
    { id: 'format-h1', command: 'formatBlock', value: '<h1>' },
    { id: 'format-h2', command: 'formatBlock', value: '<h2>' },
    { id: 'format-ul', command: 'insertUnorderedList' },
    { id: 'format-ol', command: 'insertOrderedList' },
    { id: 'format-code', command: 'formatBlock', value: '<pre>' }
  ];

  formatButtons.forEach(btn => {
    const el = document.getElementById(btn.id);
    if (el) {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Prevents focus loss from notepad
        formatText(btn.command, btn.value);
      });
    }
  });
  
  document.getElementById('editor-action-upper').addEventListener('mousedown', (e) => {
    e.preventDefault();
    changeTextCase('upper');
  });
  document.getElementById('editor-action-lower').addEventListener('mousedown', (e) => {
    e.preventDefault();
    changeTextCase('lower');
  });
  
  document.getElementById('editor-action-copy').addEventListener('mousedown', async (e) => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(DOM.notepadTextarea.innerText);
      showToast('Đã sao chép toàn bộ văn bản ghi chép!');
    } catch (err) {
      showToast('Không thể sao chép văn bản!', 'error');
    }
  });

  // Find and Replace panel toggling
  DOM.btnToggleFind.addEventListener('click', () => {
    DOM.findReplaceBar.classList.toggle('active');
    if (DOM.findReplaceBar.classList.contains('active')) {
      DOM.searchInput.focus();
    } else {
      DOM.notepadTextarea.focus();
    }
  });

  DOM.btnFindNext.addEventListener('click', findNext);
  DOM.btnReplace.addEventListener('click', replaceCurrent);
  DOM.btnReplaceAll.addEventListener('click', replaceAll);
  
  DOM.btnCloseFind.addEventListener('click', () => {
    DOM.findReplaceBar.classList.remove('active');
  });

  // Search input typing resets search cache
  DOM.searchInput.addEventListener('input', () => {
    searchMatches = [];
    lastSearchQuery = '';
  });

  // Keyboard Shortcuts inside Notepad Textarea
  DOM.notepadTextarea.addEventListener('keydown', (e) => {
    // Ctrl+B for Bold
    if (e.ctrlKey && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      formatText('bold');
    }
    // Ctrl+I for Italic
    else if (e.ctrlKey && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      formatText('italic');
    }
    // Ctrl+U for Underline
    else if (e.ctrlKey && e.key.toLowerCase() === 'u') {
      e.preventDefault();
      formatText('underline');
    }
    // Ctrl+F for Find
    else if (e.ctrlKey && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      DOM.btnToggleFind.click();
    }
    // Tab key indent (inserts 2 spaces instead of tab focus out)
    else if (e.key === 'Tab') {
      e.preventDefault();
      formatText('insertText', '  ');
    }
  });
  
  // Issue addition
  DOM.addIssueBtn.addEventListener('click', addIssue);
  DOM.issueInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addIssue();
  });
  DOM.issueDeadline.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addIssue();
  });
  
  // Window-level Clipboard Paste listener (Images & Files support)
  window.addEventListener('paste', async (event) => {
    const clipboardData = event.clipboardData || event.originalEvent?.clipboardData;
    if (!clipboardData) return;

    const items = Array.from(clipboardData.items);

    // Synchronous check: does clipboard contain any files?
    const hasFiles = items.some(item => item.kind === 'file');

    // MUST call preventDefault() synchronously before any await.
    // Async handlers return a Promise immediately — the browser fires the default
    // paste action right after the first await, so any later preventDefault() is too late.
    if (hasFiles) {
      event.preventDefault();
    } else {
      return; // No files → let normal text paste proceed uninterrupted
    }

    const filesToUpload = [];

    for (const item of items) {
      if (item.kind !== 'file') continue;
      const file = item.getAsFile();
      if (!file) continue;

      if (file.type.startsWith('image/')) {
        const ext = file.type.split('/')[1] || 'png';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const renamedFile = new File([file], `paste_${timestamp}.${ext}`, { type: file.type });

        const compressedFile = await compressImage(renamedFile);
        filesToUpload.push(compressedFile);

        // Insert image inline into the contenteditable notepad
        const reader = new FileReader();
        reader.onload = (e) => {
          formatText('insertImage', e.target.result);
        };
        reader.readAsDataURL(compressedFile);
      } else {
        filesToUpload.push(file);
      }
    }

    if (filesToUpload.length > 0) {
      await handleFileUpload(filesToUpload);
    }
  });
  
  // Global Window-level Drag and drop events
  const dragEvents = ['dragenter', 'dragover', 'dragleave', 'drop'];
  dragEvents.forEach(eventName => {
    window.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    }, false);
  });
  
  let dragCounter = 0;
  
  window.addEventListener('dragenter', (e) => {
    dragCounter++;
    DOM.dragOverlay.classList.add('active');
  }, false);
  
  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    DOM.dragOverlay.classList.add('active');
  }, false);
  
  window.addEventListener('dragleave', (e) => {
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      DOM.dragOverlay.classList.remove('active');
    }
  }, false);
  
  window.addEventListener('drop', async (e) => {
    dragCounter = 0;
    DOM.dragOverlay.classList.remove('active');
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files && files.length > 0) {
      await handleFileUpload(files);
    }
  }, false);
  
  // Button click triggers file dialog
  DOM.uploadBtn.addEventListener('click', () => DOM.fileInput.click());
  DOM.fileInput.addEventListener('change', async (e) => {
    await handleFileUpload(e.target.files);
    e.target.value = ''; // Reset file input
  });
  
  // Toolbar Buttons
  DOM.exportMDBtn.addEventListener('click', exportToMarkdown);
  DOM.clearNoteBtn.addEventListener('click', clearActiveNote);
  
  // Open inline images in lightbox when clicked
  DOM.notepadTextarea.addEventListener('click', (e) => {
    if (e.target && e.target.tagName === 'IMG') {
      openLightbox(e.target.src, 'Hình ảnh nhúng');
    }
  });

  // Click to zoom image in lightbox
  DOM.modalPreviewImg.addEventListener('click', (e) => {
    e.stopPropagation();
    DOM.modalPreviewImg.classList.toggle('zoomed');
  });

  // Lightbox close handlers
  DOM.modalCloseBtn.addEventListener('click', closeLightbox);
  DOM.previewModal.addEventListener('click', (e) => {
    if (e.target === DOM.previewModal || e.target.id === 'modal-preview-body') {
      closeLightbox();
    }
  });
  
  // Keyboard ESC key closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (DOM.previewModal.classList.contains('active')) {
        closeLightbox();
      }
      if (DOM_SYNC.settingsModal.classList.contains('active')) {
        DOM_SYNC.settingsModal.classList.remove('active');
      }
      if (DOM.quickInfoModal.classList.contains('active')) {
        DOM.quickInfoModal.classList.remove('active');
      }
    }
  });
  
  // Backup / Restore Buttons
  DOM.exportBackupBtn.addEventListener('click', exportFullBackup);
  DOM.importBackupBtn.addEventListener('click', triggerImportBackup);
  DOM.importFileInput.addEventListener('change', handleImportBackup);
  
  // Theme Switching Button
  DOM.themeToggleBtn.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    DOM.themeToggleBtn.textContent = isLight ? '☀️' : '🌙';
    showToast(isLight ? 'Đã chuyển sang giao diện Sáng' : 'Đã chuyển sang giao diện Tối', 'info');
  });

  // Font Size Select
  const fontSizeSelect = document.getElementById('font-size-select');
  if (fontSizeSelect) {
    fontSizeSelect.addEventListener('change', (e) => {
      const size = e.target.value;
      if (DOM.notepadTextarea) {
        DOM.notepadTextarea.style.fontSize = size;
      }
      localStorage.setItem('notepad-font-size', size);
      showToast(`Đã đổi cỡ chữ sang ${size}`, 'info');
    });
  }

  // Settings Modal Toggle
  DOM_SYNC.settingsBtn.addEventListener('click', () => {
    DOM_SYNC.settingsModal.classList.add('active');
  });
  DOM_SYNC.settingsCloseBtn.addEventListener('click', () => {
    DOM_SYNC.settingsModal.classList.remove('active');
  });
  DOM_SYNC.settingsModal.addEventListener('click', (e) => {
    if (e.target === DOM_SYNC.settingsModal) {
      DOM_SYNC.settingsModal.classList.remove('active');
    }
  });

  // Save Settings Config
  DOM_SYNC.btnSaveSettings.addEventListener('click', async () => {
    const configText = DOM_SYNC.firebaseConfigInput.value.trim();
    if (!configText) {
      localStorage.removeItem('firebaseConfig');
      firebaseSync.disconnect();
      showToast('Đã xóa cấu hình Firebase', 'info');
      return;
    }

    try {
      const config = JSON.parse(configText);
      localStorage.setItem('firebaseConfig', JSON.stringify(config, null, 2));
      
      showToast('Đang kết nối Firebase...');
      await firebaseSync.initialize(config, handleSyncStateChange);
      showToast('Lưu cấu hình thành công! Hãy đăng nhập để đồng bộ.');
    } catch (err) {
      console.error(err);
      showToast('Lỗi! Cấu hình JSON không hợp lệ.', 'error');
    }
  });

  // Auth: Login
  DOM_SYNC.btnSyncLogin.addEventListener('click', async () => {
    const email = DOM_SYNC.syncEmail.value.trim();
    const password = DOM_SYNC.syncPassword.value.trim();
    if (!email || !password) {
      showToast('Vui lòng điền đủ email và mật khẩu', 'info');
      return;
    }
    
    showToast('Đang đăng nhập Cloud...');
    try {
      await firebaseSync.login(email, password);
      showToast('Đăng nhập Cloud thành công!');
      DOM_SYNC.syncEmail.value = '';
      DOM_SYNC.syncPassword.value = '';
    } catch (err) {
      console.error(err);
      showToast(`Lỗi đăng nhập: ${err.message}`, 'error');
    }
  });

  // Auth: Register
  DOM_SYNC.btnSyncRegister.addEventListener('click', async () => {
    const email = DOM_SYNC.syncEmail.value.trim();
    const password = DOM_SYNC.syncPassword.value.trim();
    if (!email || !password) {
      showToast('Vui lòng điền đủ email và mật khẩu', 'info');
      return;
    }
    if (password.length < 6) {
      showToast('Mật khẩu phải từ 6 ký tự', 'info');
      return;
    }

    showToast('Đang đăng ký...');
    try {
      await firebaseSync.register(email, password);
      showToast('Đăng ký tài khoản Cloud thành công!');
      DOM_SYNC.syncEmail.value = '';
      DOM_SYNC.syncPassword.value = '';
    } catch (err) {
      console.error(err);
      showToast(`Lỗi đăng ký: ${err.message}`, 'error');
    }
  });

  // Auth: Logout
  DOM_SYNC.btnSyncLogout.addEventListener('click', async () => {
    const confirmed = await showConfirm('Đăng xuất Cloud', 'Bạn có muốn ngắt kết nối Cloud?', 'warning');
    if (!confirmed) return;
    try {
      await firebaseSync.logout();
      showToast('Đã đăng xuất Cloud');
    } catch (err) {
      console.error(err);
      showToast('Lỗi đăng xuất!', 'error');
    }
  });

  // Sync: Full Bi-directional sync
  DOM_SYNC.btnSyncUploadAll.addEventListener('click', async () => {
    const confirmed = await showConfirm(
      'Đồng bộ dữ liệu với Cloud',
      'Hành động này sẽ đồng bộ hai chiều toàn bộ ghi chép, checklist và bảng dính giữa thiết bị này và Cloud dựa trên thời gian cập nhật mới nhất. Bạn có chắc chắn muốn thực hiện?',
      'info'
    );
    if (!confirmed) return;
    
    await syncAllData();
  });

  // Sidebar Collapse / Expand Toggle
  const leftSidebar = document.getElementById('left-sidebar');
  const toggleSidebarBtn = document.getElementById('btn-toggle-sidebar');
  const appContainer = document.querySelector('.app-container');
  
  if (toggleSidebarBtn && leftSidebar && appContainer) {
    toggleSidebarBtn.addEventListener('click', () => {
      const willCollapse = !leftSidebar.classList.contains('collapsed');
      if (willCollapse) {
        leftSidebar.classList.add('collapsed');
        appContainer.classList.add('sidebar-collapsed');
        toggleSidebarBtn.innerHTML = '<i data-lucide="chevron-right"></i>';
        toggleSidebarBtn.title = 'Mở rộng Sidebar';
      } else {
        leftSidebar.classList.remove('collapsed');
        appContainer.classList.remove('sidebar-collapsed');
        toggleSidebarBtn.innerHTML = '<i data-lucide="chevron-left"></i>';
        toggleSidebarBtn.title = 'Thu nhỏ Sidebar';
      }
      if (window.lucide) lucide.createIcons();
      localStorage.setItem('sidebar-collapsed', willCollapse);
    });

    const expandSidebar = () => {
      if (leftSidebar.classList.contains('collapsed')) {
        leftSidebar.classList.remove('collapsed');
        appContainer.classList.remove('sidebar-collapsed');
        toggleSidebarBtn.innerHTML = '<i data-lucide="chevron-left"></i>';
        toggleSidebarBtn.title = 'Thu nhỏ Sidebar';
        if (window.lucide) lucide.createIcons();
        localStorage.setItem('sidebar-collapsed', 'false');
      }
    };

    // Expanding sidebar when clicking collapsed rail elements
    const searchIcon = document.getElementById('sidebar-search-icon');
    if (searchIcon) {
      searchIcon.addEventListener('click', () => {
        expandSidebar();
        DOM.globalSearchInput.focus();
      });
    }

    const syncHeader = document.getElementById('sync-widget-header');
    if (syncHeader) {
      syncHeader.addEventListener('click', expandSidebar);
    }

    const calendarHeader = document.getElementById('calendar-widget-header');
    if (calendarHeader) {
      calendarHeader.addEventListener('click', expandSidebar);
    }
  }

  // Mobile Toggles
  const btnToggleLeftMobile = document.getElementById('btn-toggle-left-sidebar-mobile');
  const btnToggleRightMobile = document.getElementById('btn-toggle-right-sidebar-mobile');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const rightSidebar = document.querySelector('.right-bar');

  if (btnToggleLeftMobile && leftSidebar && sidebarOverlay) {
    btnToggleLeftMobile.addEventListener('click', () => {
      leftSidebar.classList.add('active');
      sidebarOverlay.classList.add('active');
    });
  }

  const btnToggleLeftMobileClassroom = document.getElementById('btn-toggle-left-sidebar-mobile-classroom');
  if (btnToggleLeftMobileClassroom && leftSidebar && sidebarOverlay) {
    btnToggleLeftMobileClassroom.addEventListener('click', () => {
      leftSidebar.classList.add('active');
      sidebarOverlay.classList.add('active');
    });
  }

  if (btnToggleRightMobile && rightSidebar && sidebarOverlay) {
    btnToggleRightMobile.addEventListener('click', () => {
      rightSidebar.classList.add('active');
      sidebarOverlay.classList.add('active');
    });
  }

  const btnToggleRightMobileClassroom = document.getElementById('btn-toggle-right-sidebar-mobile-classroom');
  if (btnToggleRightMobileClassroom && rightSidebar && sidebarOverlay) {
    btnToggleRightMobileClassroom.addEventListener('click', () => {
      rightSidebar.classList.add('active');
      sidebarOverlay.classList.add('active');
    });
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => {
      if (leftSidebar) leftSidebar.classList.remove('active');
      if (rightSidebar) rightSidebar.classList.remove('active');
      sidebarOverlay.classList.remove('active');
    });
  }

  // Sticky Board Action Listeners
  DOM.btnModeNotepad.addEventListener('click', () => saveBoardMode('notepad'));
  DOM.btnModeBoard.addEventListener('click', () => saveBoardMode('sticky'));
  
  DOM.btnBoardAddNote.addEventListener('click', () => {
    const container = document.getElementById('sticky-board-canvas-container');
    const x = container.scrollLeft + container.clientWidth / 2 - 120;
    const y = container.scrollTop + container.clientHeight / 2 - 90;
    addStickyNoteAtPosition(x, y);
  });
  
  DOM.btnBoardAddFile.addEventListener('click', () => {
    DOM.boardFileInput.click();
  });
  
  DOM.boardFileInput.addEventListener('change', async (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const container = document.getElementById('sticky-board-canvas-container');
      const x = container.scrollLeft + container.clientWidth / 2 - 120;
      const y = container.scrollTop + container.clientHeight / 2 - 90;
      
      for (let i = 0; i < files.length; i++) {
        await attachFileToBoardAtPosition(files[i], x + i * 20, y + i * 20);
      }
      e.target.value = '';
    }
  });
  
  DOM.btnBoardImportNote.addEventListener('click', convertNoteToBoard);
  DOM.btnBoardConvertToNote.addEventListener('click', convertBoardToNote);
  
  DOM.btnBoardAddText.addEventListener('click', () => {
    const container = document.getElementById('sticky-board-canvas-container');
    const x = container.scrollLeft + container.clientWidth / 2 - 120;
    const y = container.scrollTop + container.clientHeight / 2 - 90;
    addStickyNoteAtPosition(x, y, '', 'text-block');
  });

  DOM.btnBoardClose.addEventListener('click', () => {
    saveBoardMode('notepad');
  });

  DOM.toolBtnPan.addEventListener('click', () => {
    activeBoardTool = 'pan';
    DOM.toolBtnPan.classList.add('active');
    DOM.toolBtnSelect.classList.remove('active');
    showToast('Đã chuyển sang công cụ Di chuyển bảng', 'info');
  });
  
  DOM.toolBtnSelect.addEventListener('click', () => {
    activeBoardTool = 'select-delete';
    DOM.toolBtnSelect.classList.add('active');
    DOM.toolBtnPan.classList.remove('active');
    showToast('Đã chọn công cụ Chọn vùng xóa. Kéo chuột trên nền bảng để chọn.', 'info');
  });

  setupCanvasMarqueeSelection();

  DOM.btnBoardClear.addEventListener('click', async () => {
    const confirmed = await showConfirm('Xóa bảng', 'Bạn có chắc chắn muốn xóa tất cả ghi chú trên bảng dính?', 'danger');
    if (confirmed) {
      currentBoardData.notes = [];
      renderStickyBoard();
      saveBoardImmediately();
      showToast('Đã xóa sạch bảng dính');
    }
  });

  setupCanvasPanning();
  setupCanvasDoubleClicks();
  setupBoardDragAndDrop();
  setupBoardPasteListener();

  // Quick Info Listeners
  DOM.btnOpenQuickInfo.addEventListener('click', () => {
    DOM.quickInfoModal.classList.add('active');
    loadQuickInfos();
  });
  DOM.quickInfoCloseBtn.addEventListener('click', () => {
    DOM.quickInfoModal.classList.remove('active');
  });
  DOM.quickInfoModal.addEventListener('click', (e) => {
    if (e.target === DOM.quickInfoModal) {
      DOM.quickInfoModal.classList.remove('active');
    }
  });
  DOM.btnAddQuickInfo.addEventListener('click', addOrUpdateQuickInfo);
  DOM.quickInfoTitleInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') DOM.quickInfoValueInput.focus();
  });
  DOM.quickInfoValueInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addOrUpdateQuickInfo();
  });
  DOM.quickInfoSearchInput.addEventListener('input', () => {
    renderQuickInfos();
  });

  // --- CLASSROOM EVENT LISTENERS ---
  DOM.btnSidebarTabCalendar.addEventListener('click', () => switchMode('notepad'));
  DOM.btnSidebarTabClasses.addEventListener('click', () => switchMode('classroom'));
  
  // Classes
  DOM.btnSidebarAddClass.addEventListener('click', () => openClassModal());
  DOM.classCloseBtn.addEventListener('click', () => DOM.classModal.classList.remove('active'));
  DOM.classModal.addEventListener('click', (e) => {
    if (e.target === DOM.classModal) DOM.classModal.classList.remove('active');
  });
  DOM.btnSaveClass.addEventListener('click', addOrUpdateClass);
  DOM.btnAddCustomField.addEventListener('click', () => {
    const newFieldId = 'f_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    classModalFields.push({
      id: newFieldId,
      name: '',
      type: 'text'
    });
    renderClassFieldsBuilder();
    
    setTimeout(() => {
      const inputs = DOM.classFieldsListBuilder.querySelectorAll('input[type="text"]');
      if (inputs.length > 0) {
        inputs[inputs.length - 1].focus();
      }
    }, 50);
  });
  DOM.classNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addOrUpdateClass();
  });
  
  // Students
  DOM.studentCloseBtn.addEventListener('click', () => DOM.studentModal.classList.remove('active'));
  DOM.studentModal.addEventListener('click', (e) => {
    if (e.target === DOM.studentModal) DOM.studentModal.classList.remove('active');
  });
  DOM.btnSaveStudent.addEventListener('click', addOrUpdateStudent);
  DOM.classroomStudentSearch.addEventListener('input', () => {
    renderStudents();
  });
  
  // Violation
  DOM.violationCloseBtn.addEventListener('click', () => DOM.violationModal.classList.remove('active'));
  DOM.violationModal.addEventListener('click', (e) => {
    if (e.target === DOM.violationModal) DOM.violationModal.classList.remove('active');
  });
  DOM.btnSaveViolation.addEventListener('click', saveViolation);
  DOM.violationContentInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveViolation();
  });

  // Violation quick tags
  DOM.tagVangKhongPhep.addEventListener('click', () => DOM.violationContentInput.value = 'Vắng học không phép');
  DOM.tagVangCoPhep.addEventListener('click', () => DOM.violationContentInput.value = 'Vắng học có phép');
  DOM.tagDiMuon.addEventListener('click', () => DOM.violationContentInput.value = 'Đi muộn');
  DOM.tagKhongBaiTap.addEventListener('click', () => DOM.violationContentInput.value = 'Không làm bài tập');
  DOM.tagKhongChuanBi.addEventListener('click', () => DOM.violationContentInput.value = 'Không chuẩn bị bài');
  
  // Violation History
  DOM.violationHistoryCloseBtn.addEventListener('click', () => DOM.violationHistoryModal.classList.remove('active'));
  DOM.violationHistoryModal.addEventListener('click', (e) => {
    if (e.target === DOM.violationHistoryModal) DOM.violationHistoryModal.classList.remove('active');
  });
}

// Start application
document.addEventListener('DOMContentLoaded', init);

// ─── SEED HELPER ──────────────────────────────────────────────────────────────
// Gọi hàm này một lần từ DevTools console sau khi đăng nhập:  seedKS25CNTT7()
async function seedKS25CNTT7() {
  const classId = 'class_ks25_cntt7';
  const className = 'KS25_CNTT7';
  const fields = [
    { id: 'email', name: 'Email', type: 'text' },
    { id: 'mssv',  name: 'MSSV',  type: 'text' }
  ];

  const students = [
    { stt: 1,  name: 'Phạm Thanh Đài',          email: 'phamthanhdai12345@gmail.com' },
    { stt: 2,  name: 'Đỗ Minh Đặng',             email: 'dangdo090507@gmail.com' },
    { stt: 3,  name: 'Nguyễn Kim Thành Đạt',     email: 'datkim2222@gmail.com' },
    { stt: 4,  name: 'Hồ Quang Duy',             email: 'quangduybin2007@gmail.com' },
    { stt: 5,  name: 'Hồ Hữu Hoài Nam',          email: 'hoainamho146@gmail.com' },
    { stt: 6,  name: 'Trần Hiếu Nghĩa',          email: 'mcl541ngogiatu@gmail.com' },
    { stt: 7,  name: 'Trần Hoàng Nguyên',        email: 'trannguyenhoang2007@gmail.com' },
    { stt: 8,  name: 'Phạm Ngọc Quỳnh Như',      email: 'mina03239@gmail.com' },
    { stt: 9,  name: 'Trịnh Thị Hồng Quyên',     email: 'hongquyen2007.bh@gmail.com' },
    { stt: 10, name: 'Đỗ Xuân Tân',              email: 'doxuantan1999a0@gmail.com' },
    { stt: 11, name: 'Ngô Thiên Thạch',          email: 'ngo67775@gmail.com' },
    { stt: 12, name: 'Nguyễn Vân Trường',        email: 'nguyenvantruong130627@gmail.com' },
    { stt: 13, name: 'Lã Duy Khang',             email: 'laduykhang776353@gmail.com' },
    { stt: 14, name: 'Nguyễn Duy Đạt',           email: 'datllkk456@gmail.com' },
    { stt: 15, name: 'Nguyễn Minh Thức',         email: 'nmthuc2007@gmail.com' },
    { stt: 16, name: 'Đỗ Minh Tiến',             email: 'cudm2001@gmail.com' },
    { stt: 17, name: 'Huỳnh Công Danh',          email: 'danhc7620@gmail.com' },
    { stt: 18, name: 'Nguyễn Quốc Thắng',        email: 'tn0914534@gmail.com' },
    { stt: 19, name: 'Trần Đức Ngọc',            email: 'tranducngoc171717@gmail.com' },
    { stt: 20, name: 'Dương Gia Hưng',           email: 'duonghung5637@gmail.com' },
    { stt: 21, name: 'Nguyễn Văn Hoàn',          email: 'nguyenhoan18042007@gmail.com' },
    { stt: 22, name: 'Phạm Việt Thành 2',        email: 'pham.vietthanh11062007@gmail.com' },
    { stt: 23, name: 'Hứa Xuân Thiên',           email: 'huathien23102006@gmail.com' },
    { stt: 24, name: 'Nguyễn Thiên Bảo',         email: 'ntb8378@gmail.com' },
    { stt: 25, name: 'Nguyễn Khắc Duy 2',        email: 'duynguyenkhac0373@gmail.com' },
    { stt: 26, name: 'Lê Thanh Hải',             email: 'lethanhhaidzvcl@gmail.com' },
    { stt: 27, name: 'Bùi Minh Hiếu',            email: 'hacowibu@gmail.com' },
    { stt: 28, name: 'Lê Hải Nguyên',            email: 'lehainguyen876@gmail.com' },
    { stt: 29, name: 'Nguyễn Thành Tài',         email: 'nguyenthanhtai311007@gmail.com' },
    { stt: 30, name: 'Đặng Đức Tín',             email: 'dtyn13579@gmail.com' },
    { stt: 31, name: 'Tăng Duy Khánh',           email: 'khanhtang450@gmail.com' },
    { stt: 32, name: 'Bùi Minh Đức 2',           email: 'mduc04717@gmail.com' },
    { stt: 33, name: 'Đinh Quang Hào',           email: 'fshi0206@gmail.com' },
    { stt: 34, name: 'Trần Văn Khiêm',           email: 'tranvankhien0307@gmail.com' },
    { stt: 35, name: 'Đặng Thành Đạt 2',         email: 'dangthanhdat1508@gmail.com' },
    { stt: 36, name: 'Nguyễn Thị Thu Hiền 2',    email: 'nguyentth0909@gmail.com' },
    { stt: 37, name: 'Trần Quang Long 2',        email: 'ruymej@gmail.com' },
    { stt: 38, name: 'Huỳnh Quốc Huy',           email: 'huynoob2406@gmail.com' },
    { stt: 39, name: 'Tăng Mạnh Khang',          email: 'ankhangbc.2021@gmail.com' },
  ];

  console.log('🚀 Bắt đầu seed lớp KS25_CNTT7...');

  // 1. Lưu lớp học vào IndexedDB
  await db.saveClass(classId, className, fields);
  console.log('✅ Đã lưu lớp học vào IndexedDB');

  // 2. Sync lên Firebase nếu đã kết nối
  if (firebaseSync.isConnected()) {
    await firebaseSync.uploadClass(classId, className, fields);
    console.log('☁️  Đã sync lớp học lên Firebase');
  }

  // 3. Thêm từng sinh viên
  for (const s of students) {
    const now = Date.now();
    const studentData = {
      id: `stud_ks25cntt7_${s.stt}_${Math.random().toString(36).substr(2, 6)}`,
      classId,
      name: s.name,
      email: s.email,
      mssv: '',
      violations: [],
      createdAt: new Date().toISOString()
    };
    await db.saveStudent(studentData);
    if (firebaseSync.isConnected()) {
      await firebaseSync.uploadStudent(studentData);
    }
    console.log(`  ✔ ${s.stt}. ${s.name}`);
  }

  console.log('🎉 Seed xong! 39 sinh viên đã được thêm vào lớp KS25_CNTT7.');
  console.log('👉 Tải lại trang hoặc chuyển sang chế độ Classroom để xem.');
};

// Gọi hàm này để seed lớp KS25_CNTT5:  seedKS25CNTT5()
async function seedKS25CNTT5() {
  const classId = 'class_ks25_cntt5';
  const className = 'KS25_CNTT5';
  const fields = [
    { id: 'email', name: 'Email', type: 'text' },
    { id: 'mssv',  name: 'MSSV',  type: 'text' }
  ];

  const students = [
    { stt: 1,  name: 'Đoàn Thị Minh Anh',         email: 'anhdoan20071908@gmail.com' },
    { stt: 2,  name: 'Đồng Văn Tiến Hưng',        email: 'dongvantienhung456@gmail.com' },
    { stt: 3,  name: 'Nguyễn Đức Huy 4',          email: 'Huydaobang098@gmail.com' },
    { stt: 4,  name: 'Nguyễn Trọng Khang',        email: 'trongkhangnguyen153@gmail.com' },
    { stt: 5,  name: 'Lê Phước Lộc',              email: 'lephuocloc00z12@gmail.com' },
    { stt: 6,  name: 'Vũ Hoàng Nhiệm',            email: 'Vunhiemok@gmail.com' },
    { stt: 7,  name: 'Lê Quang Phúc',             email: 'tonysama355@gmail.com' },
    { stt: 8,  name: 'Hoàng Minh Quân',           email: 'quanhoagn@gmail.com' },
    { stt: 9,  name: 'Nguyễn Hoàng Quân 3',       email: 'quanlunxds@gmail.com' },
    { stt: 10, name: 'Phùng Thanh Tùng 2',        email: 'thanhtungphung43@gmail.com' },
    { stt: 11, name: 'Ngô Quốc Anh 2',            email: 'quocanh.04.007@gmail.com' },
    { stt: 12, name: 'Nguyễn Phương Vy',          email: 'phuonvy1501@gmail.com' },
    { stt: 13, name: 'Nguyễn Khánh Hưng',         email: 'nkh22042007@gmail.com' },
    { stt: 14, name: 'Phạm Quốc Anh',             email: 'phamquocanha5k02@gmail.com' },
    { stt: 15, name: 'Huỳnh Hồ Nhĩ Đan',          email: 'huynhhonhidan@gmail.com' },
    { stt: 16, name: 'Nguyễn Minh Tuấn',          email: 'nguyenminhtuan26127@gmail.com' },
    { stt: 17, name: 'Tạ Ngọc Phúc',              email: 'phucdihoc133@gmail.com' },
    { stt: 18, name: 'Nguyễn Minh Trung',         email: 'ft.trung0902@gmail.com' },
    { stt: 19, name: 'Nguyễn Tấn Du',             email: 'du01012004@gmail.com' },
    { stt: 20, name: 'Trịnh Trần Công Huy',       email: 'konoihuy@gmail.com' },
    { stt: 21, name: 'Trần Văn Mỹ',               email: 'huynhthihienpy77@gmail.com' },
    { stt: 22, name: 'Huỳnh Nhơn Nguyên Nghiệp',  email: 'huynhnghiep20072020@gmail.com' },
    { stt: 23, name: 'Vũ Cao Nguyên',             email: 'nguyencaovu2007@gmail.com' },
    { stt: 24, name: 'Nguyễn Ngô Quốc Thịnh',     email: 'nguyenngothinh669@gmail.com' },
    { stt: 25, name: 'Nguyễn Văn Thông',          email: 'nguyenthong12122015@gmail.com' },
    { stt: 26, name: 'Lê Tấn Toàn',               email: 'lttoan327ldh@gmail.com' },
    { stt: 27, name: 'Lâm Nhựt Hải Đăng',         email: 'kyuu449977@gmail.com' },
    { stt: 28, name: 'Nguyễn Phát Đạt',           email: 'phatdatggg@gmail.com' },
    { stt: 29, name: 'Võ Thanh Điền',             email: 'thanhdien071207@gmail.com' },
    { stt: 30, name: 'Nguyễn Võ Gia Hân',         email: 'nguyenvogiahan73@gmail.com' },
    { stt: 31, name: 'Lương Hoàng Huy',           email: 'lhuy28260@gmail.com' },
    { stt: 32, name: 'Phan Hoàng Sơn',            email: 'sonhoang000888@gmail.com' },
    { stt: 33, name: 'Nguyễn Hoàng Thành',        email: 'nguyenhoangggh@gmail.com' },
    { stt: 34, name: 'Phạm Đình Thương',          email: 'dinhthuong979@gmail.com' },
    { stt: 35, name: 'Hoàng Mai Phương',          email: 'hoangmaiphuongtin@gmail.com' },
    { stt: 36, name: 'Lê Trung Hiếu 4',           email: 'warmdevofficial@gmail.com' },
    { stt: 37, name: 'Lê Tuấn Anh 4',             email: 'tuananhbigboi@gmail.com' },
    { stt: 38, name: 'Hoàng Dương Nam',           email: 'hoangduongnampb.2k6@gmail.com' },
    { stt: 39, name: 'Nguyễn Đức Huy 2',          email: 'huyrvt21102007@gmail.com' },
  ];

  console.log('🚀 Bắt đầu seed lớp KS25_CNTT5...');

  // 1. Lưu lớp học vào IndexedDB
  await db.saveClass(classId, className, fields);
  console.log('✅ Đã lưu lớp học vào IndexedDB');

  // 2. Sync lên Firebase nếu đã kết nối
  if (firebaseSync.isConnected()) {
    await firebaseSync.uploadClass(classId, className, fields);
    console.log('☁️  Đã sync lớp học lên Firebase');
  }

  // 3. Thêm từng sinh viên
  for (const s of students) {
    const studentData = {
      id: `stud_ks25cntt5_${s.stt}_${Math.random().toString(36).substr(2, 6)}`,
      classId,
      name: s.name,
      email: s.email,
      mssv: '',
      violations: [],
      createdAt: new Date().toISOString()
    };
    await db.saveStudent(studentData);
    if (firebaseSync.isConnected()) {
      await firebaseSync.uploadStudent(studentData);
    }
    console.log(`  ✔ ${s.stt}. ${s.name}`);
  }

  console.log('🎉 Seed xong! 39 sinh viên đã được thêm vào lớp KS25_CNTT5.');
  console.log('👉 Tải lại trang hoặc chuyển sang chế độ Classroom để xem.');
};

window.seedKS25CNTT7 = seedKS25CNTT7;
window.seedKS25CNTT5 = seedKS25CNTT5;

// Seed cả hai lớp cùng lúc
window.seedAllClasses = async function() {
  console.log('⏳ Bắt đầu seed toàn bộ...');
  await seedKS25CNTT7();
  await seedKS25CNTT5();
  console.log('✨ Đã hoàn thành seed cả 2 lớp!');
};
