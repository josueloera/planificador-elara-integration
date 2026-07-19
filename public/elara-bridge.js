(function () {
  const nativeFetch = window.fetch.bind(window);
  const OPENAI_CHAT_COMPLETIONS = "https://api.openai.com/v1/chat/completions";
  const OPENAI_IMAGE_GENERATIONS = "https://api.openai.com/v1/images/generations";
  const DEFAULT_ELARA_BASE_URL = "http://34.50.189.82:8000";

  function getBaseUrl() {
    const configured =
      window.__ELARA_API_BASE_URL__ ||
      localStorage.getItem("ELARA_API_BASE_URL") ||
      DEFAULT_ELARA_BASE_URL;
    return String(configured).replace(/\/+$/, "");
  }

  function setBaseUrl(value) {
    const cleaned = String(value || "").trim().replace(/\/+$/, "");
    if (!cleaned) return getBaseUrl();
    localStorage.setItem("ELARA_API_BASE_URL", cleaned);
    return cleaned;
  }

  function requestUrl(input) {
    if (typeof input === "string") return input;
    if (input && typeof input.url === "string") return input.url;
    return "";
  }

  function sameEndpoint(input, target) {
    return requestUrl(input).replace(/\/+$/, "") === target;
  }

  function jsonResponse(payload, status) {
    return new Response(JSON.stringify(payload), {
      status: status || 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  async function readJsonBody(init) {
    if (!init || init.body == null) return {};
    const body = init.body;
    if (typeof body === "string") return JSON.parse(body || "{}");
    if (body instanceof Blob) return JSON.parse(await body.text());
    if (body instanceof ArrayBuffer) return JSON.parse(new TextDecoder().decode(body));
    if (body instanceof URLSearchParams) return Object.fromEntries(body.entries());
    return JSON.parse(String(body));
  }

  async function getLicenseProof() {
    try {
      if (!window.require) return null;
      const electron = window.require("electron");
      const ipcRenderer = electron && electron.ipcRenderer;
      if (!ipcRenderer || !ipcRenderer.invoke) return null;
      try { return await ipcRenderer.invoke("get-license-proof"); }
      catch (_) { return await ipcRenderer.invoke("get-license-status"); }
    } catch (_) { return null; }
  }

  async function buildPlannerContext(kind) {
    return {
      kind,
      variant: window.__ELARA_PLANNER_VARIANT__ || "desconocida",
      app: "planificador-docente",
      url: window.location.href,
      userAgent: navigator.userAgent,
      license: await getLicenseProof()
    };
  }

  async function postToElara(path, payload) {
    const response = await nativeFetch(getBaseUrl() + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Elara-Client": "planificador-docente",
        "X-Elara-Variant": window.__ELARA_PLANNER_VARIANT__ || "desconocida"
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`ELARA ${response.status}: ${text || response.statusText}`);
    }
    return response.json();
  }

  // El planificador siempre envía a ELARA.
  // ELARA decide internamente si usa su propio modelo o recurre a OpenAI.
  window.fetch = async function elaraFetch(input, init) {
    if (sameEndpoint(input, OPENAI_CHAT_COMPLETIONS)) {
      try {
        const openaiRequest = await readJsonBody(init);
        const result = await postToElara("/api/v1/planner/assistant/openai-compatible", {
          openai_request: openaiRequest,
          planner_context: await buildPlannerContext("assistant")
        });
        return jsonResponse(result, 200);
      } catch (error) {
        console.error("[ELARA Bridge] Error al contactar ELARA:", error.message);
        return jsonResponse({ error: { message: String(error.message) } }, 503);
      }
    }

    if (sameEndpoint(input, OPENAI_IMAGE_GENERATIONS)) {
      try {
        const openaiRequest = await readJsonBody(init);
        const result = await postToElara("/api/v1/planner/images/openai-compatible", {
          openai_request: openaiRequest,
          planner_context: await buildPlannerContext("image")
        });
        return jsonResponse(result, 200);
      } catch (error) {
        console.error("[ELARA Bridge] Error imagen:", error.message);
        return jsonResponse({ error: { message: String(error.message) } }, 503);
      }
    }

    // Todo lo demás pasa sin modificar
    return nativeFetch(input, init);
  };

  window.elaraPlanner = { getBaseUrl, setBaseUrl, getLicenseProof };

  console.info(`[ELARA Bridge] Activo → ${getBaseUrl()} (fallback manejado por ELARA)`);
})();
