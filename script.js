// Estado UI
let ENDPOINTS = [];
let FOLDERS = [];
let selectedIndex = -1;
let selectedFolder = null;
let collapsedFolders = {};
const listEl = document.getElementById('list');
const q = document.getElementById('q');
const countEl = document.getElementById('count');

function init() {
  ENDPOINTS = [];
  FOLDERS = [];
  
  // Cargar rutas.json automáticamente
  loadRoutesJson();
}

async function loadRoutesJson() {
  try {
    const embeddedData = document.getElementById('embedded-routes-data');
    if (embeddedData) {
      const data = JSON.parse(embeddedData.textContent);
      loadDataFromJson(data);
      renderList();
      return;
    }

    const response = await fetch('rutas.json');
    if (response.ok) {
      const data = await response.json();
      loadDataFromJson(data);
    }
  } catch (error) {
    // Error silencioso
  }
  
  renderList();
}

function loadDataFromJson(data) {
  if (data.folders && Array.isArray(data.folders)) {
    FOLDERS = data.folders;
    FOLDERS.forEach(folder => {
      collapsedFolders[folder.id] = true;
    });
  }
  
  if (data.endpoints && Array.isArray(data.endpoints)) {
    ENDPOINTS = data.endpoints;
  }
}

function renderList() {
  listEl.innerHTML = '';
  const searchTerm = q.value.toLowerCase();

  let filtered = ENDPOINTS.filter(e =>
    e.title.toLowerCase().includes(searchTerm) ||
    e.path.toLowerCase().includes(searchTerm)
  );

  const endpointsByFolder = {};
  FOLDERS.forEach(folder => {
    endpointsByFolder[folder.id] = filtered.filter(ep => 
      (ep.folder || '') === folder.id
    );
  });

  FOLDERS.forEach(folder => {
    const folderEndpoints = endpointsByFolder[folder.id];
    
    const folderDiv = document.createElement('div');
    folderDiv.className = 'folder-container';
    folderDiv.style.marginBottom = '12px';

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

    const endpointsList = document.createElement('div');
    endpointsList.className = 'folder-endpoints';
    const isCollapsed = collapsedFolders[folder.id] !== false;
    endpointsList.classList.add(isCollapsed ? 'collapsed' : 'expanded');

    folderHeader.onclick = () => {
      collapsedFolders[folder.id] = !collapsedFolders[folder.id];
      folderIcon.textContent = collapsedFolders[folder.id] ? '▶' : '▼';
      endpointsList.classList.toggle('collapsed');
      endpointsList.classList.toggle('expanded');
    };

    folderIcon.textContent = isCollapsed ? '▶' : '▼';
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

      div.appendChild(methodSpan);
      div.appendChild(titleSpan);
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
      ta.value = ep[f.key] || '';
      ta.placeholder = f.label;
      ta.readOnly = true;
      ta.className = 'auto-resize';
      
      // Auto-resize
      ta.style.minHeight = '40px';
      ta.style.resize = 'vertical';
      setTimeout(() => autoResizeTextarea(ta), 0);
      
      row.appendChild(ta);
    } else if (f.type === 'select') {
      const sel = document.createElement('select');
      sel.style.minWidth = '110px';
      sel.disabled = true;
      
      if (f.key === 'folder') {
        f.options.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt.value;
          option.text = opt.label;
          if (opt.value === ep[f.key]) option.selected = true;
          sel.appendChild(option);
        });
      } else {
        f.options.forEach(o => {
          const op = document.createElement('option');
          op.value = o;
          op.text = o;
          if (o === ep[f.key]) op.selected = true;
          sel.appendChild(op);
        });
      }
      
      row.appendChild(sel);
    } else {
      const inp = document.createElement('input');
      inp.value = ep[f.key] || '';
      inp.placeholder = f.label;
      inp.readOnly = true;
      row.appendChild(inp);
    }
    formArea.appendChild(row);
  });

  formArea.appendChild(createArrayEditor(ep.queryParams, 'Query Params'));
  formArea.appendChild(createArrayEditor(ep.body, 'Body Params'));
  formArea.appendChild(createStatusCodesEditor(ep.statusCodes || [], 'Status Codes'));
  formArea.appendChild(createResponseSampleEditor(ep));
  responseSampleBox.textContent = ep.responseSample && Object.keys(ep.responseSample).length > 0 ? JSON.stringify(ep.responseSample, null, 2) : '';
  updatePreview(ep);
}

function autoResizeTextarea(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = (textarea.scrollHeight) + 'px';
}

function createResponseSampleEditor(ep) {
  const container = document.createElement('div');
  container.className = 'controls section';
  container.style.marginTop = '18px';
  const title = document.createElement('strong');
  title.textContent = 'Response JSON';
  container.appendChild(title);

  const textarea = document.createElement('textarea');
  textarea.style.fontFamily = 'monospace';
  textarea.style.minHeight = '120px';
  textarea.style.resize = 'vertical';
  textarea.className = 'auto-resize';
  textarea.placeholder = '{}';
  textarea.value = ep.responseSample && Object.keys(ep.responseSample).length > 0 ? JSON.stringify(ep.responseSample, null, 2) : '';
  textarea.readOnly = true;
  container.appendChild(textarea);

  setTimeout(() => autoResizeTextarea(textarea), 0);

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

  if (arr.length === 0) {
    list.innerHTML = '<div class="list-empty">Vacío</div>';
    return container;
  }

  arr.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'form-row';
    div.style.marginBottom = '8px';

    const code = document.createElement('input');
    code.placeholder = 'código';
    code.value = item.code || '';
    code.style.maxWidth = '120px';
    code.readOnly = true;
    div.appendChild(code);

    const desc = document.createElement('input');
    desc.placeholder = 'descripción';
    desc.value = item.description || '';
    desc.readOnly = true;
    div.appendChild(desc);

    list.appendChild(div);
  });

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

  if (arr.length === 0) {
    list.innerHTML = '<div class="list-empty">Vacío</div>';
    return container;
  }

  arr.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'form-row';
    div.style.marginBottom = '8px';

    const field = document.createElement('input');
    field.placeholder = 'campo';
    field.value = item.field || '';
    field.readOnly = true;
    div.appendChild(field);

    const type = document.createElement('input');
    type.placeholder = 'type';
    type.value = item.type || '';
    type.readOnly = true;
    div.appendChild(type);

    const req = document.createElement('select');
    req.disabled = true;
    ['true', 'false'].forEach(v => {
      const o = document.createElement('option');
      o.value = v;
      o.text = v;
      if (v == String(item.required)) o.selected = true;
      req.appendChild(o);
    });
    div.appendChild(req);

    const desc = document.createElement('textarea');
    desc.placeholder = 'description';
    desc.value = item.description || '';
    desc.readOnly = true;
    desc.className = 'auto-resize';
    desc.style.minHeight = '38px';
    desc.style.resize = 'vertical';
    setTimeout(() => autoResizeTextarea(desc), 0);
    div.appendChild(desc);

    list.appendChild(div);
  });

  return container;
}

function updatePreview(ep) {
  const previewArea = document.getElementById('previewArea');
  const responseSampleBox = document.getElementById('responseSampleBox');
  previewArea.innerHTML = '';

  const desc = document.createElement('div');
  desc.className = 'meta';
  desc.textContent = ep.description || '';
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}