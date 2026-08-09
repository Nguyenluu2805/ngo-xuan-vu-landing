let app = null;
let auth = null;
let firestore = null;
let currentUser = null;
let onStateChangeCallback = null;

export const firebaseSync = {
  get currentUser() {
    return currentUser;
  },

  isConnected() {
    return app !== null && currentUser !== null;
  },

  async initialize(config, onStateChange) {
    if (!config || !config.apiKey || !config.projectId) {
      this.disconnect();
      return false;
    }

    onStateChangeCallback = onStateChange;

    try {
      // Dynamic imports of Firebase JS SDK (excluding Storage)
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
      const { getAuth, onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');
      const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');

      app = initializeApp(config);
      auth = getAuth(app);
      firestore = getFirestore(app);

      // Listen to auth changes
      onAuthStateChanged(auth, (user) => {
        currentUser = user;
        if (onStateChangeCallback) {
          onStateChangeCallback(user);
        }
      });

      return true;
    } catch (err) {
      console.error('Failed to initialize Firebase Sync:', err);
      this.disconnect();
      throw err;
    }
  },

  disconnect() {
    app = null;
    auth = null;
    firestore = null;
    currentUser = null;
    if (onStateChangeCallback) {
      onStateChangeCallback(null);
    }
  },

  async register(email, password) {
    if (!auth) throw new Error("Firebase is not initialized");
    const { createUserWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');
    return createUserWithEmailAndPassword(auth, email, password);
  },

  async login(email, password) {
    if (!auth) throw new Error("Firebase is not initialized");
    const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');
    return signInWithEmailAndPassword(auth, email, password);
  },

  async logout() {
    if (!auth) return;
    const { signOut } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');
    await signOut(auth);
  },

  // --- SYNC WRITING METHODS ---
  async uploadNote(date, content, updatedAt = null) {
    if (!this.isConnected()) return;
    const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    const uid = currentUser.uid;
    await setDoc(doc(firestore, 'users', uid, 'notes', date), {
      content,
      updatedAt: updatedAt || new Date().toISOString()
    });
  },

  async uploadIssues(date, issues, updatedAt = null) {
    if (!this.isConnected()) return;
    const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    const uid = currentUser.uid;
    await setDoc(doc(firestore, 'users', uid, 'issues', date), {
      issues,
      updatedAt: updatedAt || new Date().toISOString()
    });
  },

  async uploadStickyBoard(date, boardData, updatedAt = null) {
    if (!this.isConnected()) return;
    const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    const uid = currentUser.uid;
    
    // Strip Base64 data URLs from notes list to keep board document size small
    const cleanNotes = (boardData.notes || []).map(note => {
      if (note.type === 'image' && note.fileUrl && note.fileUrl.startsWith('data:')) {
        return { ...note, fileUrl: '' };
      }
      return note;
    });

    await setDoc(doc(firestore, 'users', uid, 'sticky_boards', date), {
      ...boardData,
      notes: cleanNotes,
      updatedAt: updatedAt || boardData.updatedAt || new Date().toISOString()
    });
  },

  async uploadAttachment(date, file, name, type, customId = null) {
    if (!this.isConnected()) return null;
    const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    
    // 1. Convert file (Blob/File) to Base64 dataURL
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

    const uid = currentUser.uid;
    const attachId = customId || String(Date.now());

    // 2. Save metadata + Base64 dataURL directly to Firestore
    const metadata = {
      id: attachId,
      date,
      name,
      type,
      size: file.size,
      downloadURL: base64Data, // Stored directly as Base64 data URL
      createdAt: new Date().toISOString()
    };

    await setDoc(doc(firestore, 'users', uid, 'attachments', attachId), metadata);
    return metadata;
  },

  async deleteAttachment(attachId) {
    if (!this.isConnected()) return;
    const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    const uid = currentUser.uid;

    // Delete document containing the Base64 file data from firestore
    await deleteDoc(doc(firestore, 'users', uid, 'attachments', attachId));
  },

  async uploadQuickInfo(id, title, value, updatedAt = null) {
    if (!this.isConnected()) return;
    const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    const uid = currentUser.uid;
    await setDoc(doc(firestore, 'users', uid, 'quick_infos', id), {
      title,
      value,
      updatedAt: updatedAt || new Date().toISOString()
    });
  },

  async deleteQuickInfo(id) {
    if (!this.isConnected()) return;
    const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    const uid = currentUser.uid;
    await deleteDoc(doc(firestore, 'users', uid, 'quick_infos', id));
  },

  async uploadClass(id, name, fields, updatedAt = null) {
    if (!this.isConnected()) return;
    const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    const uid = currentUser.uid;
    await setDoc(doc(firestore, 'users', uid, 'classes', id), {
      name,
      fields,
      updatedAt: updatedAt || new Date().toISOString()
    });
  },

  async deleteClass(id) {
    if (!this.isConnected()) return;
    const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    const uid = currentUser.uid;
    await deleteDoc(doc(firestore, 'users', uid, 'classes', id));
  },

  async uploadStudent(student, updatedAt = null) {
    if (!this.isConnected()) return;
    const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    const uid = currentUser.uid;
    await setDoc(doc(firestore, 'users', uid, 'students', student.id), {
      ...student,
      updatedAt: updatedAt || new Date().toISOString()
    });
  },

  async deleteStudent(id) {
    if (!this.isConnected()) return;
    const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    const uid = currentUser.uid;
    await deleteDoc(doc(firestore, 'users', uid, 'students', id));
  },

  // --- SYNC READING METHODS ---
  async fetchDateData(date) {
    if (!this.isConnected()) return null;
    const { doc, getDoc, collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    
    const uid = currentUser.uid;
    const result = { note: null, issues: null, attachments: [] };

    // 1. Fetch note
    try {
      const noteSnap = await getDoc(doc(firestore, 'users', uid, 'notes', date));
      if (noteSnap.exists()) {
        const data = noteSnap.data();
        result.note = {
          content: data.content,
          updatedAt: data.updatedAt || new Date(0).toISOString()
        };
      }
    } catch (e) {
      console.warn("Fetch note from cloud warning:", e);
    }

    // 2. Fetch issues
    try {
      const issuesSnap = await getDoc(doc(firestore, 'users', uid, 'issues', date));
      if (issuesSnap.exists()) {
        const data = issuesSnap.data();
        result.issues = {
          issues: data.issues,
          updatedAt: data.updatedAt || new Date(0).toISOString()
        };
      }
    } catch (e) {
      console.warn("Fetch issues from cloud warning:", e);
    }

    // 3. Fetch attachments (will contain downloadURL as Base64 strings)
    try {
      const attachmentsRef = collection(firestore, 'users', uid, 'attachments');
      const q = query(attachmentsRef, where('date', '==', date));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((docSnap) => {
        result.attachments.push(docSnap.data());
      });
    } catch (e) {
      console.warn("Fetch attachments from cloud warning:", e);
    }

    // 4. Fetch sticky board
    try {
      const boardSnap = await getDoc(doc(firestore, 'users', uid, 'sticky_boards', date));
      if (boardSnap.exists()) {
        const data = boardSnap.data();
        result.stickyBoard = {
          ...data,
          updatedAt: data.updatedAt || new Date(0).toISOString()
        };
      }
    } catch (e) {
      console.warn("Fetch sticky board from cloud warning:", e);
    }

    return result;
  },

  async downloadAllCloudData() {
    if (!this.isConnected()) return null;
    const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    const uid = currentUser.uid;
    
    const result = { notes: [], issues: [], stickyBoards: [], quickInfos: [], classes: [], students: [] };
    
    // 1. Fetch all notes
    try {
      const notesRef = collection(firestore, 'users', uid, 'notes');
      const snap = await getDocs(notesRef);
      snap.forEach(docSnap => {
        result.notes.push({ date: docSnap.id, ...docSnap.data() });
      });
    } catch (e) {
      console.error("Fetch all notes from cloud error:", e);
    }
    
    // 2. Fetch all issues
    try {
      const issuesRef = collection(firestore, 'users', uid, 'issues');
      const snap = await getDocs(issuesRef);
      snap.forEach(docSnap => {
        result.issues.push({ date: docSnap.id, ...docSnap.data() });
      });
    } catch (e) {
      console.error("Fetch all issues from cloud error:", e);
    }
    
    // 3. Fetch all sticky boards
    try {
      const boardsRef = collection(firestore, 'users', uid, 'sticky_boards');
      const snap = await getDocs(boardsRef);
      snap.forEach(docSnap => {
        result.stickyBoards.push({ date: docSnap.id, ...docSnap.data() });
      });
    } catch (e) {
      console.error("Fetch all sticky boards from cloud error:", e);
    }

    // 4. Fetch all quick infos
    try {
      const quickInfosRef = collection(firestore, 'users', uid, 'quick_infos');
      const snap = await getDocs(quickInfosRef);
      snap.forEach(docSnap => {
        result.quickInfos.push({ id: docSnap.id, ...docSnap.data() });
      });
    } catch (e) {
      console.error("Fetch all quick infos from cloud error:", e);
    }

    // 5. Fetch all classes
    try {
      const classesRef = collection(firestore, 'users', uid, 'classes');
      const snap = await getDocs(classesRef);
      snap.forEach(docSnap => {
        result.classes.push({ id: docSnap.id, ...docSnap.data() });
      });
    } catch (e) {
      console.error("Fetch all classes from cloud error:", e);
    }

    // 6. Fetch all students
    try {
      const studentsRef = collection(firestore, 'users', uid, 'students');
      const snap = await getDocs(studentsRef);
      snap.forEach(docSnap => {
        result.students.push({ id: docSnap.id, ...docSnap.data() });
      });
    } catch (e) {
      console.error("Fetch all students from cloud error:", e);
    }
    
    return result;
  },

  // Helper to force upload everything from IndexedDB to Firebase
  async uploadAllLocalData(localData) {
    if (!this.isConnected()) return;
    const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    const uid = currentUser.uid;

    // 1. Upload all notes
    if (localData.notes) {
      for (const note of localData.notes) {
        if (note.content && note.content.trim() !== '') {
          await setDoc(doc(firestore, 'users', uid, 'notes', note.date), {
            content: note.content,
            updatedAt: note.updatedAt || new Date().toISOString()
          });
        }
      }
    }

    // 2. Upload all issues
    if (localData.issues) {
      for (const issue of localData.issues) {
        if (issue.issues && issue.issues.length > 0) {
          await setDoc(doc(firestore, 'users', uid, 'issues', issue.date), {
            issues: issue.issues,
            updatedAt: issue.updatedAt || new Date().toISOString()
          });
        }
      }
    }

    // 3. Upload all sticky boards
    if (localData.stickyBoards) {
      for (const board of localData.stickyBoards) {
        await setDoc(doc(firestore, 'users', uid, 'sticky_boards', board.date), {
          ...board,
          updatedAt: board.updatedAt || new Date().toISOString()
        });
      }
    }

    // 4. Upload all quick infos
    if (localData.quickInfos) {
      for (const info of localData.quickInfos) {
        await setDoc(doc(firestore, 'users', uid, 'quick_infos', info.id), {
          title: info.title,
          value: info.value,
          updatedAt: info.updatedAt || new Date().toISOString()
        });
      }
    }

    // 5. Upload all classes
    if (localData.classes) {
      for (const cls of localData.classes) {
        await setDoc(doc(firestore, 'users', uid, 'classes', cls.id), {
          name: cls.name,
          fields: cls.fields,
          updatedAt: cls.updatedAt || new Date().toISOString()
        });
      }
    }

    // 6. Upload all students
    if (localData.students) {
      for (const stud of localData.students) {
        await setDoc(doc(firestore, 'users', uid, 'students', stud.id), {
          ...stud,
          updatedAt: stud.updatedAt || new Date().toISOString()
        });
      }
    }
  }
};
