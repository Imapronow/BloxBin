(function () {
  const form = document.getElementById("submit-form");
  const input = document.getElementById("script-input");
  const mask = document.getElementById("script-mask");
  const submitBtn = document.getElementById("submit-btn");
  const statusEl = document.getElementById("status");
  const charCountEl = document.getElementById("char-count");

  const DISCORD_LIMIT = 2000;
  const CENSOR_CHAR = "•";

  mask.dataset.placeholder = "Paste your script…";

  function censor(text) {
    return text.replace(/[^\n\r]/g, CENSOR_CHAR);
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

    const chunks = [];
    for (let i = 0; i < text.length; i += DISCORD_LIMIT) {
      chunks.push(text.slice(i, i + DISCORD_LIMIT));
    }

    for (let i = 0; i < chunks.length; i++) {
      const prefix = chunks.length > 1 ? `[${i + 1}/${chunks.length}]\n` : "";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: prefix + chunks[i] }),
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
