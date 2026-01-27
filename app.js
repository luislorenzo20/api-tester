const $ = (id) => document.getElementById(id);

$("send").onclick = async () => {
  try {
    $("pill").textContent = "Enviando...";

    const method = $("method").value;
    const scheme = $("scheme").value;
    const token = $("token").value.trim();
    const url = $("url").value.trim();

    if (!url) throw "Informe a URL";

    const headers = token ? { "Authorization": `${scheme} ${token}` } : {};
    headers["Accept"] = "application/json";

    const extraHeaders = $("headers").value.trim();
    if (extraHeaders) Object.assign(headers, JSON.parse(extraHeaders));

    const params = $("params").value.trim();
    let finalUrl = url;
    if (params) {
      const q = new URLSearchParams(JSON.parse(params)).toString();
      finalUrl += "?" + q;
    }

    const bodyTxt = $("body").value.trim();
    const body = bodyTxt ? JSON.parse(bodyTxt) : null;
    if (body) headers["Content-Type"] = "application/json";

    const start = performance.now();
    const resp = await fetch(finalUrl, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    });

    const time = Math.round(performance.now() - start);
    $("meta").textContent = `status ${resp.status} • ${time} ms`;

    const txt = await resp.text();
    try {
      $("out").textContent = JSON.stringify(JSON.parse(txt), null, 2);
    } catch {
      $("out").textContent = txt;
    }

    $("statusline").textContent = `Status: ${resp.status}`;
    $("pill").textContent = "OK";
  } catch (e) {
    $("pill").textContent = "Erro";
    $("out").textContent = String(e);
  }
};

$("clear").onclick = () => {
  ["url","token","params","headers","body"].forEach(id => $(id).value = "");
  $("out").textContent = "{}";
  $("statusline").textContent = "Status: —";
  $("meta").textContent = "status / tempo";
  $("pill").textContent = "Pronto";
};

$("copycurl").onclick = async () => {
  const scheme = $("scheme").value;
  const token = $("token").value.trim();
  const method = $("method").value;
  const url = $("url").value.trim();

  const h = [];
  if (token) h.push(`-H "Authorization: ${scheme} ${token}"`);
  const curl = `curl -X ${method} "${url}" ${h.join(" ")}`;
  await navigator.clipboard.writeText(curl);
  $("pill").textContent = "cURL copiado";
};

// =======================
// Persistência (localStorage)
// =======================
const STORAGE_KEY = "api_tester_saved_config_v1";

function getFormState() {
  return {
    scheme: $("scheme").value,
    token: $("token").value,        // ⚠️ opcional salvar token (veja nota abaixo)
    method: $("method").value,
    url: $("url").value,
    params: $("params").value,
    headers: $("headers").value,
    body: $("body").value
  };
}

function setFormState(state) {
  if (!state) return;
  if (state.scheme !== undefined) $("scheme").value = state.scheme;
  if (state.token !== undefined) $("token").value = state.token;
  if (state.method !== undefined) $("method").value = state.method;
  if (state.url !== undefined) $("url").value = state.url;
  if (state.params !== undefined) $("params").value = state.params;
  if (state.headers !== undefined) $("headers").value = state.headers;
  if (state.body !== undefined) $("body").value = state.body;
}

function saveConfig() {
  const state = getFormState();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    savedAt: new Date().toISOString(),
    state
  }));
  $("pill").textContent = "Config salva";
}

function loadConfig() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    alert("Nenhuma configuração salva ainda.");
    return;
  }
  const obj = JSON.parse(raw);
  setFormState(obj.state);
  $("pill").textContent = "Config carregada";
}

function clearSavedConfig() {
  localStorage.removeItem(STORAGE_KEY);
  $("pill").textContent = "Salvos apagados";
}

// Auto-carregar ao abrir a página (opcional)
(function autoLoad() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw);
    setFormState(obj.state);
    $("pill").textContent = "Config restaurada";
  } catch (e) {
    // ignora
  }
})();

// Liga botões
$("savecfg")?.addEventListener("click", saveConfig);
$("loadcfg")?.addEventListener("click", loadConfig);
$("clearcfg")?.addEventListener("click", clearSavedConfig);
