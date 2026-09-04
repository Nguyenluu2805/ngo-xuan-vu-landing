const DB_NAME = 'DailyNotepadDB';
const DB_VERSION = 4;

let dbInstance = null;

function initDB() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('Database error:', event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // notes: key is date (YYYY-MM-DD)
      if (!db.objectStoreNames.contains('notes')) {
        db.createObjectStore('notes', { keyPath: 'date' });
      }

      // issues: key is date (YYYY-MM-DD)
      if (!db.objectStoreNames.contains('issues')) {
        db.createObjectStore('issues', { keyPath: 'date' });
      }

      // attachments: autoIncrement id, with an index on date
      if (!db.objectStoreNames.contains('attachments')) {
        const attachStore = db.createObjectStore('attachments', { keyPath: 'id', autoIncrement: true });
        attachStore.createIndex('date', 'date', { unique: false });
      }

      // sticky_boards: key is date (YYYY-MM-DD)
      if (!db.objectStoreNames.contains('sticky_boards')) {
        db.createObjectStore('sticky_boards', { keyPath: 'date' });
      }

      // quick_infos: key is id (string/UUID or number)
      if (!db.objectStoreNames.contains('quick_infos')) {
        db.createObjectStore('quick_infos', { keyPath: 'id' });
      }

      // classes: key is id (string)
      if (!db.objectStoreNames.contains('classes')) {
        db.createObjectStore('classes', { keyPath: 'id' });
      }

      // students: key is id (string), with an index on classId
      if (!db.objectStoreNames.contains('students')) {
        const studentStore = db.createObjectStore('students', { keyPath: 'id' });
        studentStore.createIndex('classId', 'classId', { unique: false });
      }
    };
  });
}

// Helper for transactions
async function getStore(storeName, mode = 'readonly') {
  const db = await initDB();
  const transaction = db.transaction(storeName, mode);
  return transaction.objectStore(storeName);
}

export const db = {
  async getNote(date) {
    const store = await getStore('notes', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.get(date);
      request.onsuccess = () => resolve(request.result ? request.result.content : '');
      request.onerror = () => reject(request.error);
    });
  },

  async getNoteRaw(date) {
    const store = await getStore('notes', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.get(date);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  },

  async saveNote(date, content, updatedAt = null) {
    const store = await getStore('notes', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put({ 
        date, 
        content, 
        updatedAt: updatedAt || new Date().toISOString() 
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async getStickyBoard(date) {
    const store = await getStore('sticky_boards', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.get(date);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  },

  async saveStickyBoard(date, boardData, updatedAt = null) {
    const store = await getStore('sticky_boards', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put({ 
        date, 
        ...boardData, 
        updatedAt: updatedAt || boardData.updatedAt || new Date().toISOString() 
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async getIssues(date) {
    const store = await getStore('issues', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.get(date);
      request.onsuccess = () => resolve(request.result ? request.result.issues : []);
      request.onerror = () => reject(request.error);
    });
  },

  async getIssuesRaw(date) {
    const store = await getStore('issues', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.get(date);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  },

  async saveIssues(date, issues, updatedAt = null) {
    const store = await getStore('issues', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put({ 
        date, 
        issues, 
        updatedAt: updatedAt || new Date().toISOString() 
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async getAttachments(date) {
    const db = await initDB();
    const transaction = db.transaction('attachments', 'readonly');
    const store = transaction.objectStore('attachments');
    const index = store.index('date');

    return new Promise((resolve, reject) => {
      const request = index.getAll(IDBKeyRange.only(date));
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  async getAttachment(id) {
    const store = await getStore('attachments', 'readonly');
    return new Promise((resolve, reject) => {
      // Try parsing numeric ID or use string directly
      const numericId = Number(id);
      const queryId = !isNaN(numericId) && typeof id !== 'string' ? numericId : id;
      const request = store.get(queryId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  },

  async saveAttachment(date, file, name, type, storagePath = null, downloadURL = null, customId = null) {
    const store = await getStore('attachments', 'readwrite');
    return new Promise((resolve, reject) => {
      const id = customId || storagePath || ('attach_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9));
      const entry = {
        id,
        date,
        file, // Blob or File object
        name,
        type,
        size: file.size,
        storagePath: storagePath || id,
        downloadURL,
        createdAt: new Date().toISOString()
      };
      const request = store.put(entry);
      request.onsuccess = () => {
        resolve(entry);
      };
      request.onerror = () => reject(request.error);
    });
  },

  async deleteAttachment(id) {
    const store = await getStore('attachments', 'readwrite');
    return new Promise((resolve, reject) => {
      const numericId = Number(id);
      const queryId = !isNaN(numericId) && typeof id !== 'string' ? numericId : id;
      const request = store.delete(queryId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async getDatesStatus() {
    const db = await initDB();
    const statusMap = {}; // date -> { hasData, hasUnresolved }

    // Check notes
    const tx1 = db.transaction('notes', 'readonly');
    const notesStore = tx1.objectStore('notes');
    await new Promise((resolve) => {
      notesStore.getAll().onsuccess = (e) => {
        (e.target.result || []).forEach(item => {
          if (item.content && item.content.trim() !== '') {
            statusMap[item.date] = { hasData: true, hasUnresolved: false };
          }
        });
        resolve();
      };
    });

    // Check issues
    const tx2 = db.transaction('issues', 'readonly');
    const issuesStore = tx2.objectStore('issues');
    await new Promise((resolve) => {
      issuesStore.getAll().onsuccess = (e) => {
        (e.target.result || []).forEach(item => {
          if (item.issues && item.issues.length > 0) {
            const hasUnresolved = item.issues.some(i => !i.resolved);
            if (!statusMap[item.date]) statusMap[item.date] = { hasData: false, hasUnresolved: false };
            statusMap[item.date].hasData = true;
            if (hasUnresolved) {
              statusMap[item.date].hasUnresolved = true;
            }
          }
        });
        resolve();
      };
    });

    // Check attachments
    const tx3 = db.transaction('attachments', 'readonly');
    const attachStore = tx3.objectStore('attachments');
    await new Promise((resolve) => {
      attachStore.getAll().onsuccess = (e) => {
        (e.target.result || []).forEach(item => {
          if (!statusMap[item.date]) statusMap[item.date] = { hasData: false, hasUnresolved: false };
          statusMap[item.date].hasData = true;
        });
        resolve();
      };
    });

    // Check sticky boards
    const tx4 = db.transaction('sticky_boards', 'readonly');
    const boardStore = tx4.objectStore('sticky_boards');
    await new Promise((resolve) => {
      boardStore.getAll().onsuccess = (e) => {
        (e.target.result || []).forEach(item => {
          if (item.notes && item.notes.length > 0) {
            if (!statusMap[item.date]) statusMap[item.date] = { hasData: false, hasUnresolved: false };
            statusMap[item.date].hasData = true;
          }
        });
        resolve();
      };
    });

    return statusMap;
  },

  async getQuickInfos() {
    const store = await getStore('quick_infos', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  async saveQuickInfo(id, title, value, updatedAt = null) {
    const store = await getStore('quick_infos', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put({ 
        id, 
        title, 
        value, 
        updatedAt: updatedAt || new Date().toISOString() 
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async deleteQuickInfo(id) {
    const store = await getStore('quick_infos', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // --- CLASSROOM METHODS ---
  async getClasses() {
    const store = await getStore('classes', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  async saveClass(id, name, fields, updatedAt = null) {
    const store = await getStore('classes', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put({
        id,
        name,
        fields,
        updatedAt: updatedAt || new Date().toISOString()
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async deleteClass(id) {
    const store = await getStore('classes', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async getStudents(classId) {
    const db = await initDB();
    const transaction = db.transaction('students', 'readonly');
    const store = transaction.objectStore('students');
    return new Promise((resolve, reject) => {
      try {
        if (store.indexNames && store.indexNames.contains('classId')) {
          const index = store.index('classId');
          const request = index.getAll(IDBKeyRange.only(classId));
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        } else {
          const request = store.getAll();
          request.onsuccess = () => {
            const all = request.result || [];
            resolve(all.filter(s => s.classId === classId));
          };
          request.onerror = () => reject(request.error);
        }
      } catch (e) {
        const request = store.getAll();
        request.onsuccess = () => {
          const all = request.result || [];
          resolve(all.filter(s => s.classId === classId));
        };
        request.onerror = () => reject(request.error);
      }
    });
  },

  async saveStudent(student, updatedAt = null) {
    const store = await getStore('students', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put({
        ...student,
        updatedAt: updatedAt || new Date().toISOString()
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async deleteStudent(id) {
    const store = await getStore('students', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async getAllData() {
    const db = await initDB();
    const result = { notes: [], issues: [], attachments: [], stickyBoards: [], quickInfos: [], classes: [], students: [] };

    const notesStore = await getStore('notes', 'readonly');
    result.notes = await new Promise(resolve => {
      notesStore.getAll().onsuccess = (e) => resolve(e.target.result || []);
    });

    const issuesStore = await getStore('issues', 'readonly');
    result.issues = await new Promise(resolve => {
      issuesStore.getAll().onsuccess = (e) => resolve(e.target.result || []);
    });

    const attachStore = await getStore('attachments', 'readonly');
    const attachList = await new Promise(resolve => {
      attachStore.getAll().onsuccess = (e) => resolve(e.target.result || []);
    });

    const boardStore = await getStore('sticky_boards', 'readonly');
    result.stickyBoards = await new Promise(resolve => {
      boardStore.getAll().onsuccess = (e) => resolve(e.target.result || []);
    });

    if (db.objectStoreNames.contains('quick_infos')) {
      const quickStore = await getStore('quick_infos', 'readonly');
      result.quickInfos = await new Promise(resolve => {
        quickStore.getAll().onsuccess = (e) => resolve(e.target.result || []);
      });
    }

    if (db.objectStoreNames.contains('classes')) {
      const classStore = await getStore('classes', 'readonly');
      result.classes = await new Promise(resolve => {
        classStore.getAll().onsuccess = (e) => resolve(e.target.result || []);
      });
    }

    if (db.objectStoreNames.contains('students')) {
      const studentStore = await getStore('students', 'readonly');
      result.students = await new Promise(resolve => {
        studentStore.getAll().onsuccess = (e) => resolve(e.target.result || []);
      });
    }

    const processedAttachments = [];
    for (const item of attachList) {
      try {
        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(item.file);
        });
        processedAttachments.push({
          date: item.date,
          name: item.name,
          type: item.type,
          size: item.size,
          createdAt: item.createdAt,
          base64: base64Data
        });
      } catch (err) {
        console.error('Failed to convert file for backup:', item.name, err);
      }
    }
    result.attachments = processedAttachments;

    return result;
  },

  async importAllData(data) {
    const db = await initDB();

    // Clear all stores first
    const storesToClear = ['notes', 'issues', 'attachments', 'sticky_boards'];
    if (db.objectStoreNames.contains('quick_infos')) {
      storesToClear.push('quick_infos');
    }
    if (db.objectStoreNames.contains('classes')) {
      storesToClear.push('classes');
    }
    if (db.objectStoreNames.contains('students')) {
      storesToClear.push('students');
    }
    const tx = db.transaction(storesToClear, 'readwrite');
    tx.objectStore('notes').clear();
    tx.objectStore('issues').clear();
    tx.objectStore('attachments').clear();
    tx.objectStore('sticky_boards').clear();
    if (db.objectStoreNames.contains('quick_infos')) {
      tx.objectStore('quick_infos').clear();
    }
    if (db.objectStoreNames.contains('classes')) {
      tx.objectStore('classes').clear();
    }
    if (db.objectStoreNames.contains('students')) {
      tx.objectStore('students').clear();
    }

    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // Import notes
    if (data.notes && data.notes.length) {
      const notesStore = await getStore('notes', 'readwrite');
      for (const item of data.notes) {
        await new Promise(resolve => {
          notesStore.put(item).onsuccess = () => resolve();
        });
      }
    }

    // Import issues
    if (data.issues && data.issues.length) {
      const issuesStore = await getStore('issues', 'readwrite');
      for (const item of data.issues) {
        await new Promise(resolve => {
          issuesStore.put(item).onsuccess = () => resolve();
        });
      }
    }

    // Import attachments
    if (data.attachments && data.attachments.length) {
      const attachStore = await getStore('attachments', 'readwrite');
      for (const item of data.attachments) {
        try {
          let fileBlob;
          if (item.base64) {
            const res = await fetch(item.base64);
            fileBlob = await res.blob();
          } else if (item.file) {
            fileBlob = item.file;
          } else {
            continue;
          }

          await new Promise(resolve => {
            attachStore.add({
              date: item.date,
              file: fileBlob,
              name: item.name,
              type: item.type,
              size: item.size,
              createdAt: item.createdAt || new Date().toISOString()
            }).onsuccess = () => resolve();
          });
        } catch (err) {
          console.error('Error importing file:', item.name, err);
        }
      }
    }

    // Import sticky boards
    if (data.stickyBoards && data.stickyBoards.length) {
      const boardStore = await getStore('sticky_boards', 'readwrite');
      for (const item of data.stickyBoards) {
        await new Promise(resolve => {
          boardStore.put(item).onsuccess = () => resolve();
        });
      }
    }

    // Import quick infos
    if (data.quickInfos && data.quickInfos.length && db.objectStoreNames.contains('quick_infos')) {
      const quickStore = await getStore('quick_infos', 'readwrite');
      for (const item of data.quickInfos) {
        await new Promise(resolve => {
          quickStore.put(item).onsuccess = () => resolve();
        });
      }
    }

    // Import classes
    if (data.classes && data.classes.length && db.objectStoreNames.contains('classes')) {
      const classStore = await getStore('classes', 'readwrite');
      for (const item of data.classes) {
        await new Promise(resolve => {
          classStore.put(item).onsuccess = () => resolve();
        });
      }
    }

    // Import students
    if (data.students && data.students.length && db.objectStoreNames.contains('students')) {
      const studentStore = await getStore('students', 'readwrite');
      for (const item of data.students) {
        await new Promise(resolve => {
          studentStore.put(item).onsuccess = () => resolve();
        });
      }
    }
  },

  async searchAll(query) {
    if (!query || query.trim() === '') return [];
    const q = query.toLowerCase().trim();
    
    // Search notes
    const notesStore = await getStore('notes', 'readonly');
    const noteResults = await new Promise((resolve, reject) => {
      const results = [];
      const req = notesStore.openCursor();
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          const date = cursor.value.date;
          const content = cursor.value.content || '';
          // Strip HTML tags and entities
          const plainText = content
            .replace(/<\/?[^>]+(>|$)/g, " ")
            .replace(/&nbsp;/g, " ")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&amp;/g, "&");
          
          if (plainText.toLowerCase().includes(q)) {
            const idx = plainText.toLowerCase().indexOf(q);
            const start = Math.max(0, idx - 40);
            const end = Math.min(plainText.length, idx + q.length + 40);
            let snippet = plainText.substring(start, end).replace(/\s+/g, ' ');
            if (start > 0) snippet = '...' + snippet;
            if (end < plainText.length) snippet = snippet + '...';
            results.push({ date, snippet });
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      req.onerror = () => reject(req.error);
    });

    // Search issues
    const issuesStore = await getStore('issues', 'readonly');
    const issueResults = await new Promise((resolve, reject) => {
      const results = [];
      const req = issuesStore.openCursor();
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          const date = cursor.value.date;
          const issues = cursor.value.issues || [];
          const matchingIssues = issues.filter(issue => issue.text && issue.text.toLowerCase().includes(q));
          if (matchingIssues.length > 0) {
            results.push({
              date,
              snippet: `Checklist: ${matchingIssues.map(i => i.text).join('; ')}`
            });
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      req.onerror = () => reject(req.error);
    });

    // Merge results by date
    const mergedMap = {};
    noteResults.forEach(r => {
      mergedMap[r.date] = { date: r.date, noteSnippet: r.snippet, issueSnippet: '' };
    });
    issueResults.forEach(r => {
      if (mergedMap[r.date]) {
        mergedMap[r.date].issueSnippet = r.snippet;
      } else {
        mergedMap[r.date] = { date: r.date, noteSnippet: '', issueSnippet: r.snippet };
      }
    });

    const mergedList = Object.values(mergedMap);
    // Sort by date descending
    mergedList.sort((a, b) => b.date.localeCompare(a.date));
    return mergedList;
  }
};

