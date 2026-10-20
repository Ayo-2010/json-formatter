var inputEl = document.getElementById('input');
var outputEl = document.getElementById('output');
var treeEl = document.getElementById('tree');
var indentEl = document.getElementById('indent');
var statusEl = document.getElementById('status');
var viewEl = document.getElementById('viewToggle');
var sizesEl = document.getElementById('sizes');
var formatBtn = document.getElementById('formatBtn');
var minifyBtn = document.getElementById('minifyBtn');
var sampleBtn = document.getElementById('sampleBtn');
var copyBtn = document.getElementById('copyBtn');
var clearBtn = document.getElementById('clearBtn');

var encoder = new TextEncoder();
var lastPlain = '';
var lastValue = undefined;
var hasValue = false;

var SAMPLE_JSON = '{"team":"Platform","members":[{"name":"Ada","role":"engineer","active":true,"commits":412},{"name":"Grace","role":"engineer","active":false,"commits":98},{"name":"Linus","role":"reviewer","active":true,"commits":57}],"releases":{"stable":"2.4.1","beta":"2.5.0-rc2","channels":["stable","beta","nightly"],"deprecated":null},"budget":{"currency":"USD","amount":48250.75,"approved":true}}';

function byteLength(text) {
  return encoder.encode(text).length;
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlight(json) {
  var pattern = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
  return escapeHtml(json).replace(pattern, function (match, str, colon, keyword, num) {
    if (str !== undefined) {
      if (colon) {
        return '<span class="tok-key">' + str + '</span>' + colon;
      }
      return '<span class="tok-str">' + str + '</span>';
    }
    if (keyword !== undefined) {
      if (keyword === 'null') {
        return '<span class="tok-null">null</span>';
      }
      return '<span class="tok-bool">' + keyword + '</span>';
    }
    return '<span class="tok-num">' + num + '</span>';
  });
}

function countNodes(value) {
  if (value === null || typeof value !== 'object') {
    return 1;
  }
  var total = 1;
  if (Array.isArray(value)) {
    for (var i = 0; i < value.length; i++) {
      total += countNodes(value[i]);
    }
    return total;
  }
  var keys = Object.keys(value);
  for (var j = 0; j < keys.length; j++) {
    total += countNodes(value[keys[j]]);
  }
  return total;
}

function leafEl(value) {
  var span = document.createElement('span');
  if (typeof value === 'string') {
    span.className = 'tv tv-str';
    span.textContent = JSON.stringify(value);
  } else if (typeof value === 'number') {
    span.className = 'tv tv-num';
    span.textContent = String(value);
  } else if (typeof value === 'boolean') {
    span.className = 'tv tv-bool';
    span.textContent = String(value);
  } else if (value === null) {
    span.className = 'tv tv-null';
    span.textContent = 'null';
  } else {
    span.className = 'tv';
    span.textContent = String(value);
  }
  return span;
}

function nodeEl(key, value) {
  var wrap = document.createElement('div');
  var line = document.createElement('div');
  line.className = 'tline';

  var isObject = value !== null && typeof value === 'object';

  if (isObject) {
    var open = Array.isArray(value) ? '[' : '{';
    var close = Array.isArray(value) ? ']' : '}';
    var count = Array.isArray(value) ? value.length : Object.keys(value).length;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tgl';
    btn.textContent = '\u25be';
    btn.setAttribute('aria-expanded', 'true');

    var kids = document.createElement('div');
    kids.className = 'tkids';

    btn.addEventListener('click', function () {
      var expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      btn.textContent = expanded ? '\u25b8' : '\u25be';
      kids.hidden = expanded;
    });

    line.appendChild(btn);
    if (key !== null) {
      var k = document.createElement('span');
      k.className = 'tkey';
      k.textContent = JSON.stringify(key);
      line.appendChild(k);
      var c = document.createElement('span');
      c.className = 'tcolon';
      c.textContent = ':';
      line.appendChild(c);
    }
    var braceOpen = document.createElement('span');
    braceOpen.className = 'tbrace';
    braceOpen.textContent = open;
    line.appendChild(braceOpen);

    var meta = document.createElement('span');
    meta.className = 'tmeta';
    meta.textContent = count + (count === 1 ? ' item' : ' items');
    line.appendChild(meta);

    wrap.appendChild(line);

    if (Array.isArray(value)) {
      for (var i = 0; i < value.length; i++) {
        kids.appendChild(nodeEl(String(i), value[i]));
      }
    } else {
      var keys = Object.keys(value);
      for (var j = 0; j < keys.length; j++) {
        kids.appendChild(nodeEl(keys[j], value[keys[j]]));
      }
    }

    wrap.appendChild(kids);

    var closeLine = document.createElement('div');
    closeLine.className = 'tclose';
    closeLine.textContent = close;
    wrap.appendChild(closeLine);
    return wrap;
  }

  var pad = document.createElement('span');
  pad.className = 'tpad';
  line.appendChild(pad);

  if (key !== null) {
    var keyEl = document.createElement('span');
    keyEl.className = 'tkey';
    keyEl.textContent = JSON.stringify(key);
    line.appendChild(keyEl);
    var colonEl = document.createElement('span');
    colonEl.className = 'tcolon';
    colonEl.textContent = ':';
    line.appendChild(colonEl);
  }

  line.appendChild(leafEl(value));
  wrap.appendChild(line);
  return wrap;
}

function setStatus(message, state) {
  statusEl.textContent = message;
  statusEl.setAttribute('data-state', state);
}

function renderSizes(inputText, outputText) {
  var inSize = byteLength(inputText);
  var outSize = byteLength(outputText);
  sizesEl.textContent = inSize + ' B in / ' + outSize + ' B out';
}

function clearOutput() {
  lastPlain = '';
  hasValue = false;
  outputEl.textContent = '';
  treeEl.textContent = '';
  renderSizes(inputEl.value, '');
}

function renderTree(value) {
  treeEl.textContent = '';
  var root = document.createElement('div');
  root.className = 'tree-root';
  root.appendChild(nodeEl(null, value));
  treeEl.appendChild(root);
}

function applyView() {
  var view = viewEl.value;
  if (view === 'tree') {
    outputEl.hidden = true;
    treeEl.hidden = false;
  } else {
    outputEl.hidden = false;
    treeEl.hidden = true;
  }
}

function errorBlock(message) {
  var box = document.createElement('div');
  box.className = 'tline';
  var span = document.createElement('span');
  span.className = 'tv-null';
  span.textContent = message;
  box.appendChild(span);
  return box;
}

function run(minifyOnly) {
  var raw = inputEl.value;
  if (raw.trim() === '') {
    clearOutput();
    setStatus('waiting for input', 'idle');
    return;
  }

  var value;
  try {
    value = JSON.parse(raw);
  } catch (err) {
    var message = err && err.message ? err.message : 'Invalid JSON';
    var found = /position\s+(\d+)/i.exec(message);
    var label = message;
    if (found) {
      var pos = Number(found[1]);
      var before = raw.slice(0, pos);
      var line = before.split('\n').length;
      var column = pos - before.lastIndexOf('\n');
      label = 'line ' + line + ', column ' + column + ' (position ' + pos + '): ' + message;
    }
    lastPlain = '';
    hasValue = false;
    outputEl.textContent = label;
    treeEl.textContent = '';
    treeEl.appendChild(errorBlock(label));
    renderSizes(raw, '');
    setStatus('invalid json \u00b7 ' + label, 'error');
    return;
  }

  var mode = minifyOnly ? 'min' : indentEl.value;
  var text;
  if (mode === 'min') {
    text = JSON.stringify(value);
  } else {
    text = JSON.stringify(value, null, Number(mode));
  }

  lastPlain = text;
  lastValue = value;
  hasValue = true;
  outputEl.innerHTML = highlight(text);
  renderTree(value);
  applyView();
  renderSizes(raw, text);
  setStatus('valid json \u00b7 ' + countNodes(value) + ' nodes', 'ok');
}

formatBtn.addEventListener('click', function () {
  run(false);
});

minifyBtn.addEventListener('click', function () {
  run(true);
});

sampleBtn.addEventListener('click', function () {
  inputEl.value = SAMPLE_JSON;
  run(false);
});

copyBtn.addEventListener('click', function () {
  if (!hasValue) {
    setStatus('nothing to copy', 'error');
    return;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(lastPlain).then(function () {
      setStatus('output copied', 'ok');
    }).catch(function () {
      setStatus('clipboard blocked by the browser', 'error');
    });
  } else {
    setStatus('clipboard unavailable', 'error');
  }
});

clearBtn.addEventListener('click', function () {
  inputEl.value = '';
  clearOutput();
  setStatus('waiting for input', 'idle');
  inputEl.focus();
});

indentEl.addEventListener('change', function () {
  try {
    window.localStorage.setItem('json.indent', indentEl.value);
  } catch (err) {
    return;
  }
  run(false);
});

viewEl.addEventListener('change', function () {
  try {
    window.localStorage.setItem('json.view', viewEl.value);
  } catch (err) {
    return;
  }
  applyView();
});

inputEl.addEventListener('input', function () {
  renderSizes(inputEl.value, lastPlain);
});

document.addEventListener('keydown', function (event) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    run(false);
  }
});

(function init() {
  try {
    var savedIndent = window.localStorage.getItem('json.indent');
    var savedView = window.localStorage.getItem('json.view');
    if (savedIndent === '2' || savedIndent === '4' || savedIndent === 'min') {
      indentEl.value = savedIndent;
    }
    if (savedView === 'tree' || savedView === 'text') {
      viewEl.value = savedView;
    }
  } catch (err) {
    indentEl.value = '2';
  }
  applyView();
  clearOutput();
})();
