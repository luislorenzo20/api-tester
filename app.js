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

// =======================
// Compartilhar via URL
// =======================
const SHARE_KEY = "cfg"; // querystring ?cfg=...

function base64urlEncode(str) {
  // UTF-8 safe -> base64 -> url safe
  const utf8 = new TextEncoder().encode(str);
  let bin = "";
  utf8.forEach(b => bin += String.fromCharCode(b));
  const b64 = btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  return b64;
}

function base64urlDecode(b64url) {
  let b64 = b64url.replaceAll("-", "+").replaceAll("_", "/");
  // pad
  while (b64.length % 4) b64 += "=";

  const bin = atob(b64);
  const bytes = new Uint8Array([...bin].map(ch => ch.charCodeAt(0)));
  return new TextDecoder().decode(bytes);
}

function getShareState({ includeToken = false } = {}) {
  const st = getFormState(); // sua função já existente (do localStorage)
  if (!includeToken) st.token = ""; // não vazar token no link
  return st;
}

function makeShareLink() {
  const includeToken = false; // <- mude para true só se quiser compartilhar token (não recomendado)
  const state = getShareState({ includeToken });

  const payload = JSON.stringify({
    v: 1,
    state
  });

  const encoded = base64urlEncode(payload);

  const u = new URL(window.location.href);
  u.searchParams.set(SHARE_KEY, encoded);

  $("sharelink").value = u.toString();
  $("pill").textContent = "Link gerado";
}

function loadFromShareLink() {
  const u = new URL(window.location.href);
  const encoded = u.searchParams.get(SHARE_KEY);
  if (!encoded) return false;

  try {
    const decoded = base64urlDecode(encoded);
    const obj = JSON.parse(decoded);
    if (obj?.state) {
      setFormState(obj.state);  // sua função já existente
      $("pill").textContent = "Config carregada pelo link";
      return true;
    }
  } catch (e) {
    console.error("Erro ao carregar cfg do link:", e);
  }
  return false;
}

$("genshare")?.addEventListener("click", makeShareLink);

$("copyshare")?.addEventListener("click", async () => {
  const v = $("sharelink").value.trim();
  if (!v) return alert("Gere o link primeiro.");
  await navigator.clipboard.writeText(v);
  $("pill").textContent = "Link copiado";
});

// Auto-carregar se vier por link
loadFromShareLink();
