// Estado UI
let ENDPOINTS = [];
let FOLDERS = [];
let selectedIndex = -1;
let selectedFolder = null;
let collapsedFolders = {}; // Guardar estado de carpetas colapsadas
let isReadOnlyMode = true; // Modo de solo lectura (INICIA EN TRUE)
const listEl = document.getElementById('list');
const q = document.getElementById('q');
const countEl = document.getElementById('count');

function init() {
  ENDPOINTS = [];
  FOLDERS = [];
  
  // Crear toggle de modo lectura
  createReadOnlyToggle();
  
  // Intentar cargar rutas.json automáticamente
  loadRoutesJson();
}

async function loadRoutesJson() {
  try {
    // Primero intentar cargar desde script incrustado
    const embeddedData = document.getElementById('embedded-routes-data');
    if (embeddedData) {
      const data = JSON.parse(embeddedData.textContent);
      loadDataFromJson(data);
      renderList();
      return;
    }

    // Si no hay datos incrustados, intentar fetch (requiere servidor)
    const response = await fetch('rutas.json');
    if (response.ok) {
      const data = await response.json();
      loadDataFromJson(data);
    }
  } catch (error) {
    // Error silencioso
  }
  
  // SIEMPRE renderizar después de intentar cargar
  renderList();
}

function loadDataFromJson(data) {
  // Importar carpetas
  if (data.folders && Array.isArray(data.folders)) {
    FOLDERS = data.folders;
    // Inicializar todas las carpetas como colapsadas
    FOLDERS.forEach(folder => {
      collapsedFolders[folder.id] = true;
    });
  }
  
  // Importar endpoints
  if (data.endpoints && Array.isArray(data.endpoints)) {
    ENDPOINTS = data.endpoints;
  }
}

function createReadOnlyToggle() {
  const header = document.querySelector('.header');
  if (!header) {
    return;
  }
  
  const toggleContainer = document.createElement('div');
  toggleContainer.style.display = 'flex';
  toggleContainer.style.alignItems = 'center';
  toggleContainer.style.gap = '10px';
  toggleContainer.style.marginLeft = 'auto';

  const label = document.createElement('span');
  label.textContent = 'Modo:';
  label.style.fontSize = '14px';
  label.style.fontWeight = '500';
  label.id = 'readOnlyLabel';

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'btn small';
  toggleBtn.textContent = 'Lectura'; // Inicia en modo lectura
  toggleBtn.id = 'readOnlyToggle';
  toggleBtn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)'; // Rojo por defecto
  toggleBtn.style.minWidth = '120px';
  toggleBtn.style.cursor = 'pointer';
  
  toggleBtn.onclick = () => {
    isReadOnlyMode = !isReadOnlyMode;
    updateReadOnlyUI();
    updateButtonsVisibility();
    renderList();
    
    // Si hay un endpoint seleccionado, refrescarlo
    if (selectedIndex >= 0) {
      showForm(ENDPOINTS[selectedIndex]);
    }
  };

  toggleContainer.appendChild(label);
  toggleContainer.appendChild(toggleBtn);
  header.appendChild(toggleContainer);
  
  // Actualizar UI inicial
  updateReadOnlyUI();
  updateButtonsVisibility();
}

function updateButtonsVisibility() {
  const newBtn = document.getElementById('newBtn');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const newFolderBtn = document.getElementById('newFolderBtn');
  
  if (isReadOnlyMode) {
    if (newBtn) newBtn.style.display = 'none';
    if (exportBtn) exportBtn.style.display = 'none';
    if (importBtn) importBtn.style.display = 'none';
    if (newFolderBtn) newFolderBtn.style.display = 'none';
  } else {
    if (newBtn) newBtn.style.display = '';
    if (exportBtn) exportBtn.style.display = '';
    if (importBtn) importBtn.style.display = '';
    if (newFolderBtn) newFolderBtn.style.display = '';
  }
}

function updateReadOnlyUI() {
  const toggleBtn = document.getElementById('readOnlyToggle');
  const label = document.getElementById('readOnlyLabel');
  
  if (!toggleBtn || !label) return;
  
  if (isReadOnlyMode) {
    toggleBtn.textContent = 'Lectura';
    toggleBtn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
    label.style.color = '#ef4444';
  } else {
    toggleBtn.textContent = 'Edición';
    toggleBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    label.style.color = 'var(--text)';
  }
}

function renderList() {
  listEl.innerHTML = '';
  const searchTerm = q.value.toLowerCase();

  // Filtrar endpoints
  let filtered = ENDPOINTS.filter(e =>
    e.title.toLowerCase().includes(searchTerm) ||
    e.path.toLowerCase().includes(searchTerm)
  );

  // Agrupar por carpeta
  const endpointsByFolder = {};
  FOLDERS.forEach(folder => {
    endpointsByFolder[folder.id] = filtered.filter(ep => 
      (ep.folder || '') === folder.id
    );
  });

  // Renderizar carpetas y sus endpoints
  FOLDERS.forEach(folder => {
    const folderEndpoints = endpointsByFolder[folder.id];
    
    // Contenedor de carpeta
    const folderDiv = document.createElement('div');
    folderDiv.className = 'folder-container';
    folderDiv.style.marginBottom = '12px';

    // Header de carpeta
    const folderHeader = document.createElement('div');
    folderHeader.className = 'folder-header';

    const folderIcon = document.createElement('span');
    folderIcon.className = 'folder-icon';
    folderIcon.style.fontSize = '12px';
    folderIcon.style.color = 'var(--accent)';

    const folderName = document.createElement('strong');
    folderName.textContent = `${folder.name} (${folderEndpoints.length})`;
    folderName.style.flex = '1';
    folderName.style.fontSize = '14px';
    folderName.style.fontWeight = '600';

    // Lista de endpoints
    const endpointsList = document.createElement('div');
    endpointsList.className = 'folder-endpoints';
    // Aplicar clase según estado colapsado (por defecto colapsado si no está definido)
    const isCollapsed = collapsedFolders[folder.id] !== false; // true por defecto
    endpointsList.classList.add(isCollapsed ? 'collapsed' : 'expanded');

    // EVENTO CLICK para colapsar/expandir
    folderHeader.onclick = (e) => {
      // Evitar que el click en el botón de eliminar active esto
      if (e.target.tagName === 'BUTTON') return;
      
      // Alternar estado colapsado
      collapsedFolders[folder.id] = !collapsedFolders[folder.id];
      
      // Actualizar icono
      folderIcon.textContent = collapsedFolders[folder.id] ? '▶' : '▼';
      
      // Actualizar clases
      endpointsList.classList.toggle('collapsed');
      endpointsList.classList.toggle('expanded');
    };

    // Actualizar icono inicial según el estado
    folderIcon.textContent = isCollapsed ? '▶' : '▼';

    // Botón eliminar carpeta
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn small';
    deleteBtn.textContent = 'Eliminar';
    deleteBtn.style.background = '#f87171';
    deleteBtn.style.color = '#fff';
    deleteBtn.style.padding = '6px 10px';
    deleteBtn.style.fontSize = '12px';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      if (confirm(`¿Eliminar carpeta "${folder.name}"? Los endpoints dentro también se eliminarán.`)) {
        // Eliminar endpoints de esta carpeta
        ENDPOINTS = ENDPOINTS.filter(ep => ep.folder !== folder.id);
        // Eliminar carpeta
        FOLDERS = FOLDERS.filter(f => f.id !== folder.id);
        renderList();
        
        // Si el endpoint seleccionado fue eliminado, limpiar vista
        if (selectedIndex >= 0 && !ENDPOINTS[selectedIndex]) {
          selectedIndex = -1;
          document.getElementById('formArea').style.display = 'none';
          document.getElementById('previewArea').style.display = 'none';
          document.getElementById('responseArea').style.display = 'none';
          document.getElementById('emptyMessage').style.display = '';
        }
      }
    };
    
    // Ocultar botón en modo lectura
    if (isReadOnlyMode) {
      deleteBtn.style.display = 'none';
    }
    
    folderHeader.appendChild(deleteBtn);
    folderHeader.appendChild(folderIcon);
    folderHeader.appendChild(folderName);

    folderEndpoints.forEach(ep => {
      const realIndex = ENDPOINTS.indexOf(ep);
      const div = document.createElement('div');
      div.className = 'endpoint-item';
      const method = (ep.method || '').toUpperCase();

      const methodSpan = document.createElement('span');
      methodSpan.className = `method ${method}`;
      methodSpan.textContent = method;

      const titleSpan = document.createElement('span');
      titleSpan.textContent = ep.title || '';
      titleSpan.style.flex = '1';

      const delBtn = document.createElement('button');
      delBtn.className = 'btn small';
      delBtn.style.background = '#f87171';
      delBtn.style.color = '#fff';
      delBtn.style.padding = '6px 10px';
      delBtn.textContent = 'Eliminar';
      delBtn.style.fontSize = '12px';
      delBtn.onclick = (e) => {
        e.stopPropagation();
        if (confirm('¿Seguro que quieres eliminar este endpoint?')) {
          ENDPOINTS.splice(realIndex, 1);
          renderList();
          if (selectedIndex === realIndex) {
            selectedIndex = -1;
            document.getElementById('formArea').style.display = 'none';
            document.getElementById('previewArea').style.display = 'none';
            document.getElementById('responseArea').style.display = 'none';
            document.getElementById('emptyMessage').style.display = '';
          }
        }
      };

      div.appendChild(methodSpan);
      div.appendChild(titleSpan);
      
      // Solo mostrar botón eliminar en modo edición
      if (!isReadOnlyMode) {
        div.appendChild(delBtn);
      }
      
      div.onclick = () => selectEndpoint(realIndex);
      endpointsList.appendChild(div);
    });

    folderDiv.appendChild(folderHeader);
    folderDiv.appendChild(endpointsList);
    listEl.appendChild(folderDiv);
  });

  countEl.textContent = ENDPOINTS.length;
}

function selectEndpoint(i) {
  selectedIndex = i;
  const ep = ENDPOINTS[i];
  showForm(ep);
}

q.addEventListener('input', renderList);

// Botón nueva carpeta
const newFolderBtn = document.createElement('button');
newFolderBtn.className = 'btn small';
newFolderBtn.id = 'newFolderBtn';
newFolderBtn.textContent = '+ Nueva carpeta';
newFolderBtn.style.background = 'linear-gradient(135deg, var(--accent), var(--accent-2))';
newFolderBtn.style.color = '#0f172a';
newFolderBtn.style.fontWeight = '700';
newFolderBtn.style.width = '100%';
newFolderBtn.style.marginTop = '8px';
newFolderBtn.onclick = () => {
  if (isReadOnlyMode) {
    alert('No puedes crear carpetas en modo lectura');
    return;
  }
  const folderName = prompt('Nombre de la carpeta:');
  if (folderName && folderName.trim()) {
    const folderId = folderName.toLowerCase().replace(/\s+/g, '_');
    if (!FOLDERS.find(f => f.id === folderId)) {
      FOLDERS.push({ name: folderName.trim(), id: folderId });
      // Inicializar nueva carpeta como colapsada
      collapsedFolders[folderId] = true;
      renderList();
    } else {
      alert('Ya existe una carpeta con ese nombre');
    }
  }
};

// Insertar botón de nueva carpeta
const searchDiv = document.querySelector('.search');
searchDiv.parentNode.insertBefore(newFolderBtn, searchDiv.nextSibling);

// --- Crear nuevo ---
document.getElementById('newBtn').onclick = () => {
  if (isReadOnlyMode) {
    alert('No puedes crear endpoints en modo lectura');
    return;
  }
  
  // Si no hay carpetas, crear una por defecto
  if (FOLDERS.length === 0) {
    alert('Primero crea una carpeta para organizar tus endpoints');
    return;
  }
  
  const newEp = {
    method: 'GET',
    path: '/nuevo',
    title: 'Nuevo endpoint',
    description: '',
    queryParams: [],
    body: [],
    statusCodes: [],
    responseSample: {},
    folder: FOLDERS[0].id // Asignar a la primera carpeta disponible
  };
  ENDPOINTS.push(newEp);
  renderList();
  selectEndpoint(ENDPOINTS.length - 1);
};

// --- Exportar JSON ---
document.getElementById('exportBtn').onclick = () => {
  const data = JSON.stringify({ folders: FOLDERS, endpoints: ENDPOINTS }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = prompt('Nombre del archivo', 'api-docs.json') || 'api-docs.json';
  a.click();
  URL.revokeObjectURL(url);
};

// --- Importar JSON ---
document.getElementById('importBtn').onclick = () => {
  if (isReadOnlyMode) {
    alert('No puedes importar datos en modo lectura');
    return;
  }
  
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = e => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const imported = JSON.parse(evt.target.result);
        
        // Soporte para formato antiguo (solo array) y nuevo (con carpetas)
        if (Array.isArray(imported)) {
          // Formato array: puede ser endpoints directos o con folders
          const newEndpoints = imported;
          
          // Verificar si los endpoints tienen carpetas y crearlas si no existen
          const foldersNeeded = new Set();
          newEndpoints.forEach(ep => {
            if (ep.folder) {
              foldersNeeded.add(ep.folder);
            }
          });
          
          // Crear carpetas que no existan
          foldersNeeded.forEach(folderId => {
            if (!FOLDERS.find(f => f.id === folderId)) {
              // Capitalizar el nombre de la carpeta
              const folderName = folderId.charAt(0).toUpperCase() + folderId.slice(1);
              FOLDERS.push({ name: folderName, id: folderId });
              // Inicializar como colapsada
              collapsedFolders[folderId] = true;
            }
          });
          
          // Agregar o reemplazar endpoints
          ENDPOINTS = ENDPOINTS.concat(newEndpoints);
          
        } else if (imported.folders && imported.endpoints) {
          // Formato nuevo con estructura completa
          
          // Importar carpetas (sin duplicar)
          if (Array.isArray(imported.folders)) {
            imported.folders.forEach(folder => {
              if (!FOLDERS.find(f => f.id === folder.id)) {
                FOLDERS.push(folder);
                // Inicializar como colapsada
                collapsedFolders[folder.id] = true;
              }
            });
          }
          
          // Importar endpoints
          if (Array.isArray(imported.endpoints)) {
            ENDPOINTS = ENDPOINTS.concat(imported.endpoints);
          }
        } else {
          alert('Formato JSON no reconocido');
          return;
        }
        
        renderList();
        selectedIndex = -1;
        document.getElementById('formArea').style.display = 'none';
        document.getElementById('previewArea').style.display = 'none';
        document.getElementById('responseArea').style.display = 'none';
        document.getElementById('emptyMessage').style.display = '';
        
        alert('Importación exitosa!');
      } catch (err) {
        console.error('Error al importar:', err);
        alert('JSON inválido: ' + err.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
};

// --- Form / Preview ---
function showForm(ep) {
  const formArea = document.getElementById('formArea');
  const previewArea = document.getElementById('previewArea');
  const responseArea = document.getElementById('responseArea');
  const responseSampleBox = document.getElementById('responseSampleBox');
  document.getElementById('emptyMessage').style.display = 'none';
  formArea.style.display = 'block';
  previewArea.style.display = 'block';
  responseArea.style.display = 'flex';

  formArea.innerHTML = '';
  const fields = [
    { label: 'Título', key: 'title' },
    { label: 'Path', key: 'path' },
    { label: 'Method', key: 'method', type: 'select', options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'WS', 'WS_RECEIVE', 'WS_SEND'] },
    { label: 'Carpeta', key: 'folder', type: 'select', options: FOLDERS.map(f => ({ value: f.id, label: f.name })) },
    { label: 'Descripción', key: 'description', type: 'textarea' }
  ];

  fields.forEach(f => {
    const row = document.createElement('div');
    row.className = 'form-row';
    row.style.marginBottom = '10px';
    if (f.type === 'textarea') {
      const ta = document.createElement('textarea');
      ta.value = ep[f.key];
      ta.placeholder = f.label;
      ta.readOnly = isReadOnlyMode;
      ta.oninput = () => {
        if (isReadOnlyMode) return;
        ep[f.key] = ta.value;
        updatePreview(ep);
        if (f.key === 'title') renderList();
      };
      row.appendChild(ta);
    } else if (f.type === 'select') {
      const sel = document.createElement('select');
      sel.style.minWidth = '110px';
      sel.disabled = isReadOnlyMode;
      
      if (f.key === 'folder') {
        // Selector de carpeta especial
        f.options.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt.value;
          option.text = opt.label;
          if (opt.value === ep[f.key]) option.selected = true;
          sel.appendChild(option);
        });
      } else {
        // Selector normal (método)
        f.options.forEach(o => {
          const op = document.createElement('option');
          op.value = o;
          op.text = o;
          if (o === ep[f.key]) op.selected = true;
          sel.appendChild(op);
        });
      }
      
      sel.onchange = () => {
        if (isReadOnlyMode) return;
        ep[f.key] = sel.value;
        updatePreview(ep);
        renderList();
      };
      row.appendChild(sel);
    } else {
      const inp = document.createElement('input');
      inp.value = ep[f.key];
      inp.placeholder = f.label;
      inp.readOnly = isReadOnlyMode;
      inp.oninput = () => {
        if (isReadOnlyMode) return;
        ep[f.key] = inp.value;
        updatePreview(ep);
        if (f.key === 'title') renderList();
      };
      row.appendChild(inp);
    }
    formArea.appendChild(row);
  });

  // --- Query Params ---
  formArea.appendChild(createArrayEditor(ep.queryParams, 'Query Params'));

  // --- Body ---
  formArea.appendChild(createArrayEditor(ep.body, 'Body Params'));

  // --- Status Codes ---
  formArea.appendChild(createStatusCodesEditor(ep.statusCodes || [], 'Status Codes'));

  // --- Response Sample JSON Editable ---
  formArea.appendChild(createResponseSampleEditor(ep));
  responseSampleBox.textContent = ep.responseSample && Object.keys(ep.responseSample).length > 0 ? JSON.stringify(ep.responseSample, null, 2) : '';
  updatePreview(ep);
}

function createResponseSampleEditor(ep) {
  const container = document.createElement('div');
  container.className = 'controls section';
  container.style.marginTop = '18px';
  const title = document.createElement('strong');
  title.textContent = 'Response JSON (editable)';
  container.appendChild(title);

  const textarea = document.createElement('textarea');
  textarea.style.fontFamily = 'monospace';
  textarea.style.minHeight = '120px';
  textarea.placeholder = '{\n  "data": [ ... ]\n}';
  textarea.value = ep.responseSample && Object.keys(ep.responseSample).length > 0 ? JSON.stringify(ep.responseSample, null, 2) : '';
  textarea.readOnly = isReadOnlyMode;
  container.appendChild(textarea);

  const errorMsg = document.createElement('div');
  errorMsg.style.color = '#fb7185';
  errorMsg.style.fontSize = '13px';
  errorMsg.style.marginTop = '4px';
  container.appendChild(errorMsg);

  const btnRow = document.createElement('div');
  btnRow.style.display = 'flex';
  btnRow.style.gap = '8px';
  btnRow.style.marginTop = '6px';

  let locked = isReadOnlyMode;
  const lockBtn = document.createElement('button');
  lockBtn.className = 'btn small';
  lockBtn.textContent = locked ? 'Desbloquear' : 'Bloquear';
  
  // Ocultar botones en modo lectura
  if (!isReadOnlyMode) {
    btnRow.appendChild(lockBtn);
  }

  const beautifyBtn = document.createElement('button');
  beautifyBtn.className = 'btn small';
  beautifyBtn.textContent = 'Beautify';
  
  if (!isReadOnlyMode) {
    btnRow.appendChild(beautifyBtn);
  }
  
  container.appendChild(btnRow);

  function setLocked(state) {
    if (isReadOnlyMode) return;
    locked = state;
    textarea.readOnly = locked;
    lockBtn.textContent = locked ? 'Desbloquear' : 'Bloquear';
    textarea.style.background = locked ? '#1a2333' : '';
    textarea.style.opacity = locked ? '0.7' : '1';
  }

  lockBtn.onclick = function () {
    setLocked(!locked);
  };

  function validateAndUpdate() {
    const val = textarea.value.trim();
    if (!val) {
      ep.responseSample = {};
      errorMsg.textContent = '';
      document.getElementById('responseSampleBox').textContent = '';
      return;
    }
    try {
      const parsed = JSON.parse(val);
      ep.responseSample = parsed;
      errorMsg.textContent = '';
      document.getElementById('responseSampleBox').textContent = JSON.stringify(parsed, null, 2);
    } catch (e) {
      errorMsg.textContent = 'JSON inválido: ' + e.message;
      document.getElementById('responseSampleBox').textContent = '';
    }
  }

  textarea.addEventListener('input', validateAndUpdate);
  beautifyBtn.onclick = function () {
    if (isReadOnlyMode) return;
    try {
      const parsed = JSON.parse(textarea.value);
      textarea.value = JSON.stringify(parsed, null, 2);
      validateAndUpdate();
    } catch (e) {
      errorMsg.textContent = 'No se puede beautificar: JSON inválido';
    }
  };

  setLocked(isReadOnlyMode);
  validateAndUpdate();
  return container;
}

function createStatusCodesEditor(arr, label) {
  const container = document.createElement('div');
  container.className = 'controls section';
  const title = document.createElement('strong');
  title.textContent = label;
  container.appendChild(title);

  const list = document.createElement('div');
  container.appendChild(list);

  function render() {
    list.innerHTML = '';
    if (arr.length === 0) {
      list.innerHTML = '<div class="list-empty">Vacío</div>';
      updatePreview(ENDPOINTS[selectedIndex]);
      return;
    }

    arr.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = 'form-row';

      const code = document.createElement('input');
      code.placeholder = 'código (ej: 200)';
      code.value = item.code || '';
      code.style.maxWidth = '120px';
      code.readOnly = isReadOnlyMode;
      code.oninput = () => {
        if (isReadOnlyMode) return;
        item.code = code.value;
        updatePreview(ENDPOINTS[selectedIndex]);
      };
      div.appendChild(code);

      const desc = document.createElement('input');
      desc.placeholder = 'descripción del código de estado';
      desc.value = item.description || '';
      desc.readOnly = isReadOnlyMode;
      desc.oninput = () => {
        if (isReadOnlyMode) return;
        item.description = desc.value;
        updatePreview(ENDPOINTS[selectedIndex]);
      };

      const del = document.createElement('button');
      del.className = 'btn small';
      del.textContent = 'Eliminar';
      del.onclick = () => {
        if (isReadOnlyMode) return;
        arr.splice(i, 1);
        render();
        updatePreview(ENDPOINTS[selectedIndex]);
      };

      div.append(desc, del);
      
      // Ocultar botón eliminar en modo lectura
      if (isReadOnlyMode) {
        del.style.display = 'none';
      }
      
      list.appendChild(div);
    });
    updatePreview(ENDPOINTS[selectedIndex]);
  }

  const addBtn = document.createElement('button');
  addBtn.className = 'btn small';
  addBtn.textContent = 'Agregar status code';
  addBtn.onclick = () => {
    if (isReadOnlyMode) return;
    arr.push({ code: '200', description: '' });
    render();
  };
  
  // Ocultar botón agregar en modo lectura
  if (!isReadOnlyMode) {
    container.appendChild(addBtn);
  }
  
  render();
  return container;
}

function createArrayEditor(arr, label) {
  const container = document.createElement('div');
  container.className = 'controls section';
  const title = document.createElement('strong');
  title.textContent = label;
  container.appendChild(title);

  const list = document.createElement('div');
  container.appendChild(list);

  function render() {
    list.innerHTML = '';
    if (arr.length === 0) {
      list.innerHTML = '<div class="list-empty">Vacío</div>';
      updatePreview(ENDPOINTS[selectedIndex]);
      return;
    }
    arr.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = 'form-row';

      const field = document.createElement('input');
      field.placeholder = 'nombre del campo';
      field.value = item.field || '';
      field.readOnly = isReadOnlyMode;
      field.oninput = () => {
        if (isReadOnlyMode) return;
        item.field = field.value;
        updatePreview(ENDPOINTS[selectedIndex]);
      };
      div.appendChild(field);

      const type = document.createElement('input');
      type.placeholder = 'type';
      type.value = item.type;
      type.readOnly = isReadOnlyMode;
      type.oninput = () => {
        if (isReadOnlyMode) return;
        item.type = type.value;
        updatePreview(ENDPOINTS[selectedIndex]);
      };

      const req = document.createElement('select');
      req.disabled = isReadOnlyMode;
      ['true', 'false'].forEach(v => {
        const o = document.createElement('option');
        o.value = v;
        o.text = v;
        if (v == String(item.required)) o.selected = true;
        req.appendChild(o);
      });
      req.onchange = () => {
        if (isReadOnlyMode) return;
        item.required = req.value === 'true';
        updatePreview(ENDPOINTS[selectedIndex]);
      };

      const desc = document.createElement('input');
      desc.placeholder = 'description';
      desc.value = item.description || '';
      desc.readOnly = isReadOnlyMode;
      desc.oninput = () => {
        if (isReadOnlyMode) return;
        item.description = desc.value;
        updatePreview(ENDPOINTS[selectedIndex]);
      };

      const del = document.createElement('button');
      del.className = 'btn small';
      del.textContent = 'Eliminar';
      del.onclick = () => {
        if (isReadOnlyMode) return;
        arr.splice(i, 1);
        render();
        updatePreview(ENDPOINTS[selectedIndex]);
      };
      
      div.append(type, req, desc, del);
      
      // Ocultar botón eliminar en modo lectura
      if (isReadOnlyMode) {
        del.style.display = 'none';
      }
      
      list.appendChild(div);
    });
    updatePreview(ENDPOINTS[selectedIndex]);
  }

  const addBtn = document.createElement('button');
  addBtn.className = 'btn small';
  addBtn.textContent = label === 'Body Params' ? 'Agregar body param' : 'Agregar query param';
  addBtn.onclick = () => {
    if (isReadOnlyMode) return;
    arr.push({ field: '', type: 'string', required: false, description: '' });
    render();
  };
  
  // Ocultar botón agregar en modo lectura
  if (!isReadOnlyMode) {
    container.appendChild(addBtn);
  }
  
  render();
  return container;
}

function updatePreview(ep) {
  const previewArea = document.getElementById('previewArea');
  const responseSampleBox = document.getElementById('responseSampleBox');
  previewArea.innerHTML = '';

  const desc = document.createElement('div');
  desc.className = 'meta';
  desc.textContent = ep.description;
  previewArea.appendChild(desc);

  if (ep.queryParams.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'section';
    sec.innerHTML = '<strong>Query Params</strong>';
    const pre = document.createElement('pre');
    pre.textContent = JSON.stringify(ep.queryParams, null, 2);
    sec.appendChild(pre);
    previewArea.appendChild(sec);
  }

  if (ep.body.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'section';
    sec.innerHTML = '<strong>Body Params</strong>';
    const pre = document.createElement('pre');
    pre.textContent = JSON.stringify(ep.body, null, 2);
    sec.appendChild(pre);
    previewArea.appendChild(sec);
  }

  if (ep.statusCodes && ep.statusCodes.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'section';
    sec.innerHTML = '<strong>Status Codes</strong>';
    const pre = document.createElement('pre');
    pre.textContent = JSON.stringify(ep.statusCodes, null, 2);
    sec.appendChild(pre);
    previewArea.appendChild(sec);
  }

  if (responseSampleBox) {
    responseSampleBox.textContent = ep.responseSample ? JSON.stringify(ep.responseSample, null, 2) : '';
  }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}