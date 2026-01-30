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

    const paramsObj = readParamsTable();
    let finalUrl = url;

    if (paramsObj && Object.keys(paramsObj).length) {
      const sp = new URLSearchParams();
      Object.entries(paramsObj).forEach(([k, v]) => {
        if (v === null || v === undefined) return;
        sp.set(k, String(v));
      });

      // se a URL já tiver ?, preserva e adiciona
      const sep = finalUrl.includes("?") ? "&" : "?";
      finalUrl = finalUrl + sep + sp.toString();
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

      let parsed = null;
      try {
        parsed = JSON.parse(txt);
        $("out").textContent = JSON.stringify(parsed, null, 2);
        fillSummary(parsed);              // ✅ preenche a aba Resumo
      } catch {
        $("out").textContent = txt;
        clearSummary(); 
        setResponseTab("json");                  // ✅ se não for JSON, limpa resumo
      }

      // opcional: se a resposta for OK e JSON, ir automaticamente para "Resumo"
      if (resp.ok && parsed) {
        setResponseTab("resumo");         // comente esta linha se preferir ficar no JSON
      } else {
        setResponseTab("json");
      }

    $("statusline").textContent = `Status: ${resp.status}`;
    $("pill").textContent = "OK";
  } catch (e) {
    $("pill").textContent = "Erro";
    $("out").textContent = String(e);
  }
};


function addParamRow(key = "", value = "") {
  const tb = $("paramsBody");
  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td><input class="kvinput" data-k="key"  placeholder="ex: naturalPersonCode" value="${escapeHtmlAttr(key)}"></td>
    <td><input class="kvinput" data-k="val"  placeholder="ex: 110" value="${escapeHtmlAttr(value)}"></td>
    <td>
      <div class="kvactions">
        <button type="button" data-act="del">Remover</button>
      </div>
    </td>
  `;

  tr.querySelector('[data-act="del"]').addEventListener("click", () => tr.remove());
  tb.appendChild(tr);
}

function escapeHtmlAttr(s) {
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll('"',"&quot;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");
}

function readParamsTable() {
  const tb = $("paramsBody");
  const params = {};
  [...tb.querySelectorAll("tr")].forEach(tr => {
    const k = tr.querySelector('input[data-k="key"]')?.value?.trim();
    const v = tr.querySelector('input[data-k="val"]')?.value ?? "";
    if (!k) return;
    params[k] = v; // tudo como string mesmo
  });
  return params;
}

// Buttons (params)
$("addParam")?.addEventListener("click", () => addParamRow());
$("clearParams")?.addEventListener("click", () => { $("paramsBody").innerHTML = ""; });


function safeGet(obj, path, fallback="—") {
  try {
    return path.split(".").reduce((acc, key) => acc?.[key], obj) ?? fallback;
  } catch {
    return fallback;
  }
}

function fillSummary(data) {
  $("sumCodigo").textContent = safeGet(data, "naturalPersonCode");
  $("sumProntuario").textContent = safeGet(data, "medicalRecord");
  $("sumNome").textContent   = safeGet(data, "personName");
  const birthDate = safeGet(data, "birthDate", "");
    $("sumNasc").textContent = formatDateBR(birthDate);
  $("sumCidade").textContent = safeGet(data, "establishment.legal.city");
  $("sumEstado").textContent = safeGet(data, "establishment.legal.state");
  $("sumEndereco").textContent = safeGet(data, "establishment.legal.address");
}

function clearSummary() {
  ["sumCodigo", "sumProntuario", "sumNome","sumNasc","sumCidade","sumEstado","sumEndereco"]
    .forEach(id => { const el = $(id); if (el) el.textContent = "—"; });
}


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

function formatDateBR(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return "—";

  // espera YYYY-MM-DD
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;

  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

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
    params: readParamsTable(),
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
  if (state.params !== undefined) {
      $("paramsBody").innerHTML = "";
      const p = state.params || {};
      Object.entries(p).forEach(([k,v]) => addParamRow(k, v));
    }

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


// Mostrar / ocultar token
const tokenInput = document.getElementById("token");
const toggleBtn = document.getElementById("toggleToken");
const iconEye = document.getElementById("iconEye");
const iconEyeOff = document.getElementById("iconEyeOff");

toggleBtn?.addEventListener("click", () => {
  const hidden = tokenInput.type === "password";
  tokenInput.type = hidden ? "text" : "password";

  iconEye.classList.toggle("hidden", hidden);
  iconEyeOff.classList.toggle("hidden", !hidden);
});

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

function setResponseTab(which) {
  const isJson = which === "json";
  $("tabJson")?.classList.toggle("active", isJson);
  $("tabResumo")?.classList.toggle("active", !isJson);
  $("panelJson")?.classList.toggle("hidden", !isJson);
  $("panelResumo")?.classList.toggle("hidden", isJson);
}

$("tabJson")?.addEventListener("click", () => setResponseTab("json"));
$("tabResumo")?.addEventListener("click", () => setResponseTab("resumo"));