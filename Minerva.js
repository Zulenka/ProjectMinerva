// ==UserScript==
// @name         Minerva
// @namespace    http://tampermonkey.net/
// @version      v0.4.36
// @description  Track Torn player activity with a floating multi-target tracker, alerts, and diagnostics.
// @author       Beatrix [1956521]
// @license      Proprietary - All Rights Reserved
// @supportURL   https://github.com/Zulenka/ProjectMinerva/issues/new/choose
// @match        https://www.torn.com/*
// @connect      api.torn.com
// @connect      api.github.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// ==/UserScript==

(function() {
    'use strict';

    // Copyright (c) 2026 Beatrix. All rights reserved.
    // No permission is granted to copy, modify, redistribute, or republish this script.

    // --- Configuration & State ---
    const MINERVA_VERSION = "v0.4.36";
    const MINERVA_ACTIVE_INSTANCE_SLOT = "__minerva_active_instance_token__";
    const MINERVA_INTERNAL_TEARDOWN_SLOT = "__minerva_internal_teardown__";
    const API_KEY_STORAGE_KEY = "torn-api-key";
    const API_KEY_VAULT_STORAGE_KEY = "torn-api-key-vault";
    const API_KEY_CACHE_STORAGE_KEY = "torn-api-key-cache";
    const API_KEY_CACHE_EXPIRY_STORAGE_KEY = "torn-api-key-cache-expiry";
    const TRACKED_TARGETS_STORAGE_KEY = "minerva-tracked-targets";
    const MAX_TRACKED_TARGETS_STORAGE_KEY = "minerva-max-tracked-targets";
    const WIDGET_POS_STORAGE_KEY = "minerva-corner-widget-pos";
    const WIDGET_HIDDEN_STORAGE_KEY = "minerva-corner-widget-hidden";
    const WIDGET_COMPACT_STORAGE_KEY = "minerva-corner-widget-compact";
    const WIDGET_LOCKED_STORAGE_KEY = "minerva-corner-widget-locked";
    const API_KEY_PROMPT_POS_STORAGE_KEY = "minerva-api-key-prompt-pos";
    const TOAST_HOST_POS_STORAGE_KEY = "minerva-toast-host-pos";
    const VERSION_CHECK_LAST_AT_STORAGE_KEY = "minerva-version-check-last-at";
    const VERSION_CHECK_DISMISSED_VERSION_STORAGE_KEY = "minerva-version-check-dismissed-version";
    const CYAN_COLOR = "#00f2ff";
    const PINK_COLOR = "#ff0055";
    const MAX_UI_LOG_LINES = 250;
    const MAX_LOG_MESSAGE_CHARS = 1200;
    const API_KEY_UNLOCK_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
    const MANUAL_PING_WINDOW_MS = 5000;
    const MANUAL_PING_MAX_CLICKS_PER_WINDOW = 4;
    const MANUAL_PING_COOLDOWN_MS = 60000;
    const VERSION_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
    const GITHUB_LATEST_RELEASE_API_URL = "https://api.github.com/repos/Zulenka/ProjectMinerva/releases/latest";
    const GITHUB_RELEASES_PAGE_URL = "https://github.com/Zulenka/ProjectMinerva/releases";
    const GREASYFORK_SCRIPT_PAGE_URL = "https://greasyfork.org/en/scripts/567217-";
    
    let apiKey = null;
    let targetId = new URLSearchParams(window.location.search).get("XID");
    
    let isTracking = true;
    let thresholdSeconds = parseInt(GM_getValue("minerva-threshold", 300)); 
    let maxTrackedTargets = parseInt(GM_getValue(MAX_TRACKED_TARGETS_STORAGE_KEY, 8));
    let countdownTimer = 60;
    let currentStatus = "UNKNOWN";
    let hasWarnedNoTargets = false;
    let isUiOpen = false;
    let isLogOpen = false;
    let isSettingsPopupOpen = false;
    let lastActionRelativeText = "--";
    let lastBackgroundNotificationAt = 0;
    let widgetDragState = null;
    let apiKeyPromptDragState = null;
    let toastDragState = null;
    let requestSeq = 0;
    let pollCycleSeq = 0;
    let injectionFailureLogged = false;
    let engineIntervalId = null;
    let lastInjectionAttemptAt = 0;
    let profileInjectionObserver = null;
    let manualPingClickTimestamps = [];
    let manualPingCooldownUntil = 0;
    let versionCheckInFlight = false;
    let latestAvailableVersion = "";
    let latestAvailableReleaseUrl = "";
    let trackedTargetsValueChangeListenerId = null;
    let lastKnownLocationSearch = window.location.search || "";
    let trackedListRenderScheduled = false;
    let trackedListRenderInProgress = false;
    let engineTickInProgress = false;
    let pollCycleInProgress = false;
    let isTornDown = false;
    let toastDocMouseMoveHandler = null;
    let toastDocMouseUpHandler = null;
    let toastWindowResizeHandler = null;
    let settingsDocClickHandler = null;
    let settingsWindowResizeHandler = null;
    let settingsWindowScrollHandler = null;
    let settingsDocKeydownHandler = null;
    let cornerDocMouseMoveHandler = null;
    let cornerDocMouseUpHandler = null;
    let cornerWindowResizeHandler = null;
    let trackedTargets = GM_getValue(TRACKED_TARGETS_STORAGE_KEY, []);
    let trackedStates = {};
    const minervaInstanceToken = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    GM_setValue("minerva-tracking-active", true);

    if (!Array.isArray(trackedTargets)) trackedTargets = [];
    if (!Number.isFinite(maxTrackedTargets) || maxTrackedTargets < 1) maxTrackedTargets = 8;
    trackedTargets = trackedTargets.map(String).filter(Boolean);
    trackedTargets = trackedTargets.slice(0, maxTrackedTargets);
    GM_setValue(TRACKED_TARGETS_STORAGE_KEY, trackedTargets);
    trackedTargets.forEach(id => ensureTrackedState(id, id));

    // --- Logging System ---
    function getLogContextSummary() {
        const path = `${window.location.pathname || ""}${window.location.search || ""}`;
        return `ctx{tracking=${isTracking ? 1 : 0},target=${targetId || "-"},tracked=${trackedTargets.length},status=${currentStatus},path=${path}}`;
    }

    function claimActiveMinervaInstance() {
        window[MINERVA_ACTIVE_INSTANCE_SLOT] = minervaInstanceToken;
    }

    function isActiveMinervaInstance() {
        return window[MINERVA_ACTIVE_INSTANCE_SLOT] === minervaInstanceToken;
    }

    function isLiveMinervaRuntime() {
        return !isTornDown && isActiveMinervaInstance();
    }

    function releaseActiveMinervaInstance() {
        if (isActiveMinervaInstance()) {
            delete window[MINERVA_ACTIVE_INSTANCE_SLOT];
        }
    }

    function ensureTrackedState(id, nameHint = null) {
        const key = String(id);
        trackedStates[key] = trackedStates[key] || {
            status: "UNKNOWN",
            thresholdStatus: "UNKNOWN",
            last: "--",
            name: key,
            isHospitalized: null
        };
        if (nameHint) trackedStates[key].name = String(nameHint);
        return trackedStates[key];
    }

    function updateAvailableUiBadge() {
        const badge = document.getElementById("minerva-update-available-badge");
        if (!badge) return;
        const hasUpdate = !!latestAvailableVersion && compareVersions(latestAvailableVersion, MINERVA_VERSION) > 0;
        badge.style.display = hasUpdate ? "inline-flex" : "none";
        badge.textContent = "UPDATE AVAILABLE";
        badge.title = hasUpdate
            ? `Minerva ${latestAvailableVersion} is available. Click to open release page.`
            : "";
    }

    function syncTargetIdFromUrl() {
        const currentSearch = window.location.search || "";
        if (currentSearch === lastKnownLocationSearch) return false;
        lastKnownLocationSearch = currentSearch;
        const nextTargetId = new URLSearchParams(currentSearch).get("XID");
        if (String(nextTargetId || "") === String(targetId || "")) return false;
        const previous = targetId;
        targetId = nextTargetId;
        addLog(`Current profile target changed from ${previous || "-"} to ${targetId || "-"}.`, "DIAGNOSTIC");
        updateTrackCurrentButton();
        renderTrackedList();
        return true;
    }

    function addLog(msg, type = "INFO") {
        let safeMsg = String(msg ?? "");
        if (safeMsg.length > MAX_LOG_MESSAGE_CHARS) {
            safeMsg = `${safeMsg.slice(0, MAX_LOG_MESSAGE_CHARS)} ...[truncated ${safeMsg.length - MAX_LOG_MESSAGE_CHARS} chars]`;
        }
        if (apiKey) {
            safeMsg = safeMsg.split(apiKey).join("[REDACTED_API_KEY]");
        }
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        const logEntry = `[${time}] [${type}] ${safeMsg} ${getLogContextSummary()}`;
        const logContent = document.getElementById("minerva-log-content");
        
        if (logContent) {
            const line = document.createElement("div");
            line.style.color =
                type === "ERROR" ? PINK_COLOR :
                (type === "DIAGNOSTIC" ? "#f39c12" :
                (type === "DEBUG" ? "#7fd8ff" : "#a0a0a0"));
            line.style.marginBottom = "4px";
            line.innerText = logEntry;
            logContent.prepend(line);

            while (logContent.children.length > MAX_UI_LOG_LINES) {
                logContent.removeChild(logContent.lastElementChild);
            }
        }
        console.log(`[Minerva] ${logEntry}`);
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function ensureMinervaStyleOverrides() {
        if (document.getElementById("minerva-style-overrides")) return;
        const style = document.createElement("style");
        style.id = "minerva-style-overrides";
        style.textContent = `
            #minerva-master-container button,
            #minerva-settings-panel button,
            #minerva-master-container select,
            #minerva-settings-panel select {
                background-image: none !important;
                animation: none !important;
                text-shadow: none !important;
                box-shadow: none !important;
                filter: none !important;
                transform: none !important;
                background-position: initial !important;
                transition: color 0.12s ease, border-color 0.12s ease, background-color 0.12s ease !important;
            }
            #minerva-master-container button:hover,
            #minerva-settings-panel button:hover,
            #minerva-master-container button:focus,
            #minerva-settings-panel button:focus,
            #minerva-master-container button:active,
            #minerva-settings-panel button:active {
                animation: none !important;
                filter: none !important;
                transform: none !important;
                background-image: none !important;
                box-shadow: none !important;
            }
        `;
        document.head.appendChild(style);
    }

    function normalizeTrackedTargetsList(inputList) {
        let list = Array.isArray(inputList) ? inputList : [];
        list = list.map(String).filter(Boolean);
        if (!Number.isFinite(maxTrackedTargets) || maxTrackedTargets < 1) maxTrackedTargets = 8;
        return list.slice(0, maxTrackedTargets);
    }

    function syncTrackedTargetsFromStorage(source = "storage") {
        const stored = normalizeTrackedTargetsList(GM_getValue(TRACKED_TARGETS_STORAGE_KEY, []));
        const current = JSON.stringify(trackedTargets);
        const next = JSON.stringify(stored);
        if (current === next) return false;

        trackedTargets = stored;
        trackedTargets.forEach(id => ensureTrackedState(id, id));
        renderTrackedList();
        updateTrackCurrentButton();
        addLog(`Tracked targets synced from ${source}. count=${trackedTargets.length}`, "DIAGNOSTIC");
        return true;
    }

    function bindTrackedTargetsStorageSync() {
        if (typeof GM_addValueChangeListener !== "function") return;
        if (trackedTargetsValueChangeListenerId) return;
        trackedTargetsValueChangeListenerId = GM_addValueChangeListener(TRACKED_TARGETS_STORAGE_KEY, (name, oldValue, newValue, remote) => {
            if (!remote) return;
            trackedTargets = normalizeTrackedTargetsList(newValue);
            trackedTargets.forEach(id => ensureTrackedState(id, id));
            renderTrackedList();
            updateTrackCurrentButton();
            addLog(`Tracked targets synced from another tab. count=${trackedTargets.length}`, "DIAGNOSTIC");
        });
    }

    function isExternalExtensionSource(value) {
        const s = String(value || "");
        return s.startsWith("chrome-extension://") || s.startsWith("moz-extension://") || s.startsWith("safari-extension://");
    }

    function shouldIgnoreGlobalErrorEvent(e) {
        if (!e) return false;
        const msg = String(e.message || "");
        if (/^ResizeObserver loop completed with undelivered notifications\.?$/i.test(msg)) return true;
        if (/^ResizeObserver loop limit exceeded\.?$/i.test(msg)) return true;
        if (isExternalExtensionSource(e.filename)) return true;
        if (e.error && e.error.stack && isExternalExtensionSource(String(e.error.stack))) return true;
        return false;
    }

    function shouldIgnoreUnhandledRejectionEvent(e) {
        if (!e) return false;
        const reason = e.reason;
        if (!reason) return false;
        const stack = String(reason.stack || "");
        const msg = String(reason.message || reason || "");
        if (/ResizeObserver loop (completed with undelivered notifications|limit exceeded)/i.test(msg)) return true;
        return isExternalExtensionSource(stack) || isExternalExtensionSource(msg);
    }

    function getSavedWidgetPosition() {
        return GM_getValue(WIDGET_POS_STORAGE_KEY, { left: 18, bottom: 18 });
    }

    function getSavedApiKeyPromptPosition() {
        return GM_getValue(API_KEY_PROMPT_POS_STORAGE_KEY, { right: 16, top: 16 });
    }

    function getSavedToastHostPosition() {
        return GM_getValue(TOAST_HOST_POS_STORAGE_KEY, { left: null, bottom: 84, right: 16 });
    }

    function hasWebCrypto() {
        return !!(window.crypto && window.crypto.subtle && window.TextEncoder && window.TextDecoder);
    }

    function bytesToBase64(bytes) {
        let binary = "";
        const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
        for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
        return btoa(binary);
    }

    function base64ToBytes(b64) {
        const binary = atob(String(b64 || ""));
        const out = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
        return out;
    }

    async function deriveVaultKey(passphrase, saltBytes) {
        const enc = new TextEncoder();
        const baseKey = await crypto.subtle.importKey(
            "raw",
            enc.encode(passphrase),
            "PBKDF2",
            false,
            ["deriveKey"]
        );
        return crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: saltBytes,
                iterations: 150000,
                hash: "SHA-256"
            },
            baseKey,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
        );
    }

    async function encryptApiKeyToVault(apiKeyPlain, passphrase) {
        const enc = new TextEncoder();
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await deriveVaultKey(passphrase, salt);
        const cipherBuf = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            key,
            enc.encode(apiKeyPlain)
        );
        return {
            v: 1,
            alg: "AES-GCM",
            kdf: "PBKDF2-SHA256",
            iter: 150000,
            salt: bytesToBase64(salt),
            iv: bytesToBase64(iv),
            data: bytesToBase64(new Uint8Array(cipherBuf))
        };
    }

    async function decryptApiKeyFromVault(vault, passphrase) {
        const dec = new TextDecoder();
        const salt = base64ToBytes(vault.salt);
        const iv = base64ToBytes(vault.iv);
        const cipher = base64ToBytes(vault.data);
        const key = await deriveVaultKey(passphrase, salt);
        const plainBuf = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            key,
            cipher
        );
        return dec.decode(plainBuf);
    }

    function clearUnlockedApiKeyCache() {
        GM_setValue(API_KEY_CACHE_STORAGE_KEY, "");
        GM_setValue(API_KEY_CACHE_EXPIRY_STORAGE_KEY, 0);
    }

    function clearAllStoredApiKeyMaterial() {
        GM_setValue(API_KEY_STORAGE_KEY, "");
        GM_setValue(API_KEY_VAULT_STORAGE_KEY, null);
        clearUnlockedApiKeyCache();
    }

    function cacheUnlockedApiKey(plainKey) {
        const expiry = Date.now() + API_KEY_UNLOCK_WINDOW_MS;
        GM_setValue(API_KEY_CACHE_STORAGE_KEY, plainKey);
        GM_setValue(API_KEY_CACHE_EXPIRY_STORAGE_KEY, expiry);
        return expiry;
    }

    function getCachedUnlockedApiKey() {
        const expiry = Number(GM_getValue(API_KEY_CACHE_EXPIRY_STORAGE_KEY, 0));
        const cached = String(GM_getValue(API_KEY_CACHE_STORAGE_KEY, "") || "");
        if (!cached || !Number.isFinite(expiry) || expiry <= Date.now()) {
            if (cached || expiry) clearUnlockedApiKeyCache();
            return null;
        }
        return cached;
    }

    function getVaultPayload() {
        const vault = GM_getValue(API_KEY_VAULT_STORAGE_KEY, null);
        if (!vault || typeof vault !== "object") return null;
        if (!vault.salt || !vault.iv || !vault.data) return null;
        return vault;
    }

    function showPassphraseEntryPanel(options = {}) {
        return new Promise((resolve) => {
            const existing = document.getElementById("minerva-passphrase-modal");
            if (existing) existing.remove();

            const pos = getSavedApiKeyPromptPosition();
            const panel = document.createElement("div");
            panel.id = "minerva-passphrase-modal";
            panel.style.cssText = `
                position: fixed;
                right: ${pos.right}px;
                top: ${pos.top}px;
                width: 380px;
                background: rgba(5, 8, 14, 0.96);
                color: #e8f6ff;
                border: 1px solid rgba(255,255,255,0.12);
                border-radius: 14px;
                box-shadow: 0 12px 28px rgba(0,0,0,0.42), 0 0 14px rgba(0,242,255,0.12);
                font-family: "Courier New", Courier, monospace;
                z-index: 10031;
                overflow: hidden;
            `;

            const title = options.title || "Minerva Passphrase";
            const submitLabel = options.submitLabel || "Continue";
            const showForgot = !!options.showForgot;
            const forgotLabel = options.forgotLabel || "Forgot Passphrase";
            const placeholder = options.placeholder || "Enter passphrase...";
            const initialValue = options.initialValue || "";

            panel.innerHTML = `
                <div id="minerva-passphrase-modal-header" style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 12px; background: rgba(0,0,0,0.35); cursor: move; user-select:none;">
                    <div style="font-size:12px; font-weight:bold; color:#dffbff;">${title}</div>
                    <button id="minerva-passphrase-modal-close" title="Close" style="background:transparent; color:#9fb6c6; border:1px solid rgba(255,255,255,0.12); border-radius:6px; width:20px; height:20px; line-height:16px; padding:0; cursor:pointer;">x</button>
                </div>
                <div style="padding:12px;">
                    <div style="font-size:12px; color:#b8c6d1; line-height:1.4;">${options.message || "Enter passphrase."}</div>
                    <input id="minerva-passphrase-input" type="password" autocomplete="new-password" autocapitalize="off" autocorrect="off" spellcheck="false" data-lpignore="true" data-1p-ignore="true" placeholder="${placeholder}" style="margin-top:10px; width:100%; box-sizing:border-box; background:#0a0f14; color:#e8f6ff; border:1px solid rgba(255,255,255,0.14); border-radius:8px; padding:8px 10px; outline:none;" />
                    <div style="margin-top:10px; display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
                        <div>
                            ${showForgot ? `<button id="minerva-passphrase-forgot" style="background:transparent; color:#ffb7c8; border:1px solid rgba(255,0,85,0.22); border-radius:8px; padding:6px 10px; cursor:pointer;">${forgotLabel}</button>` : ``}
                        </div>
                        <div style="display:flex; justify-content:flex-end; gap:8px;">
                            <button id="minerva-passphrase-cancel" style="background:transparent; color:#aab8c2; border:1px solid rgba(255,255,255,0.12); border-radius:8px; padding:6px 10px; cursor:pointer;">Cancel</button>
                            <button id="minerva-passphrase-submit" style="background:rgba(0,242,255,0.08); color:${CYAN_COLOR}; border:1px solid rgba(0,242,255,0.28); border-radius:8px; padding:6px 10px; cursor:pointer; font-weight:bold;">${submitLabel}</button>
                        </div>
                    </div>
                    <div id="minerva-passphrase-error" style="margin-top:8px; min-height:14px; font-size:11px; color:${PINK_COLOR};"></div>
                </div>
            `;

            document.body.appendChild(panel);

            const input = panel.querySelector("#minerva-passphrase-input");
            const errorEl = panel.querySelector("#minerva-passphrase-error");
            let dragListenersBound = false;
            let moveHandler = null;
            let upHandler = null;
            const cleanupDragListeners = () => {
                if (!dragListenersBound) return;
                document.removeEventListener("mousemove", moveHandler);
                document.removeEventListener("mouseup", upHandler);
                dragListenersBound = false;
            };
            const finish = (action, value = null) => {
                cleanupDragListeners();
                apiKeyPromptDragState = null;
                panel.remove();
                resolve({ action, value });
            };

            if (input) {
                input.value = initialValue;
                input.focus();
                input.select();
            }

            panel.querySelector("#minerva-passphrase-modal-close")?.addEventListener("click", () => finish("cancel", null));
            panel.querySelector("#minerva-passphrase-cancel")?.addEventListener("click", () => finish("cancel", null));
            panel.querySelector("#minerva-passphrase-forgot")?.addEventListener("click", () => finish("forgot", null));
            panel.querySelector("#minerva-passphrase-submit")?.addEventListener("click", () => {
                const value = String(input?.value || "").trim();
                if (!value) {
                    if (errorEl) errorEl.textContent = "Passphrase is required.";
                    return;
                }
                finish("submit", value);
            });

            input?.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    panel.querySelector("#minerva-passphrase-submit")?.click();
                } else if (e.key === "Escape") {
                    e.preventDefault();
                    finish("cancel", null);
                }
            });

            const header = panel.querySelector("#minerva-passphrase-modal-header");
            header?.addEventListener("mousedown", (e) => {
                if (e.target && e.target.id === "minerva-passphrase-modal-close") return;
                const rect = panel.getBoundingClientRect();
                apiKeyPromptDragState = {
                    startX: e.clientX,
                    startY: e.clientY,
                    startLeft: rect.left,
                    startTop: rect.top
                };
                e.preventDefault();
            });

            moveHandler = (e) => {
                if (!apiKeyPromptDragState) return;
                const dx = e.clientX - apiKeyPromptDragState.startX;
                const dy = e.clientY - apiKeyPromptDragState.startY;
                const newLeft = Math.max(8, Math.min(window.innerWidth - panel.offsetWidth - 8, apiKeyPromptDragState.startLeft + dx));
                const newTop = Math.max(8, Math.min(window.innerHeight - panel.offsetHeight - 8, apiKeyPromptDragState.startTop + dy));
                panel.style.left = `${newLeft}px`;
                panel.style.right = "auto";
                panel.style.top = `${newTop}px`;
            };
            upHandler = () => {
                if (!apiKeyPromptDragState) {
                    cleanupDragListeners();
                    return;
                }
                const rect = panel.getBoundingClientRect();
                GM_setValue(API_KEY_PROMPT_POS_STORAGE_KEY, {
                    right: Math.max(8, window.innerWidth - (rect.left + rect.width)),
                    top: Math.max(8, rect.top)
                });
                apiKeyPromptDragState = null;
                cleanupDragListeners();
            };
            document.addEventListener("mousemove", moveHandler);
            document.addEventListener("mouseup", upHandler);
            dragListenersBound = true;
        });
    }

    async function showPassphrasePrompt(message, title = "Minerva Unlock") {
        const result = await showPassphraseEntryPanel({
            title,
            message,
            submitLabel: "OK",
            showForgot: false,
            placeholder: "Enter passphrase..."
        });
        if (!result || result.action !== "submit") return null;
        return String(result.value || "").trim() || null;
    }

    async function unlockApiKeyFromVault() {
        const vault = getVaultPayload();
        if (!vault) return null;
        if (!hasWebCrypto()) {
            console.warn("[Minerva] Web Crypto unavailable; cannot unlock encrypted API key vault.");
            return null;
        }

        const unlockResult = await showPassphraseEntryPanel({
            title: "Minerva Unlock",
            message: "Enter your Minerva passphrase (required every 7 days) to unlock your API key.",
            submitLabel: "Unlock",
            showForgot: true,
            forgotLabel: "Forgot Passphrase",
            placeholder: "Unlock passphrase..."
        });
        if (!unlockResult || unlockResult.action === "cancel") {
            return "__MINERVA_UNLOCK_CANCELLED__";
        }
        if (unlockResult.action === "forgot") {
            const resetConfirmed = confirm("[Minerva] This will delete the stored encrypted API key and require a new API key + passphrase.\n\nContinue?");
            if (resetConfirmed) {
                clearAllStoredApiKeyMaterial();
                return "__MINERVA_VAULT_RESET__";
            }
            return "__MINERVA_UNLOCK_CANCELLED__";
        }
        const passphrase = String(unlockResult.value || "").trim();
        if (!passphrase) return "__MINERVA_UNLOCK_CANCELLED__";

        try {
            const plain = await decryptApiKeyFromVault(vault, passphrase);
            cacheUnlockedApiKey(plain);
            return plain;
        } catch (e) {
            console.warn("[Minerva] Failed to decrypt API key vault.", e);
            const resetConfirmed = confirm("[Minerva] Incorrect passphrase or vault could not be decrypted.\n\nChoose OK to reset the stored encrypted API key and enter a new one.\nChoose Cancel to keep Minerva locked.");
            if (resetConfirmed) {
                clearAllStoredApiKeyMaterial();
                return "__MINERVA_VAULT_RESET__";
            }
            return "__MINERVA_UNLOCK_FAILED__";
        }
    }

    async function storeApiKeySecurely(plainKey) {
        const normalized = String(plainKey || "").trim();
        if (!normalized) return { ok: false, reason: "empty" };

        if (!hasWebCrypto()) {
            GM_setValue(API_KEY_STORAGE_KEY, normalized);
            cacheUnlockedApiKey(normalized);
            return { ok: true, mode: "legacy-plain" };
        }

        const passphrase = await showPassphrasePrompt("Create a Minerva passphrase. You will re-enter it every 7 days to unlock your API key.", "Minerva Passphrase");
        if (!passphrase) return { ok: false, reason: "cancelled" };
        const confirmPassphrase = await showPassphrasePrompt("Confirm your Minerva passphrase.", "Minerva Passphrase");
        if (!confirmPassphrase) return { ok: false, reason: "cancelled" };
        if (passphrase !== confirmPassphrase) return { ok: false, reason: "mismatch" };

        const vault = await encryptApiKeyToVault(normalized, passphrase);
        GM_setValue(API_KEY_VAULT_STORAGE_KEY, vault);
        GM_setValue(API_KEY_STORAGE_KEY, ""); // remove legacy plain storage
        cacheUnlockedApiKey(normalized);
        return { ok: true, mode: "encrypted" };
    }

    async function resolveApiKeyForStartup() {
        const cached = getCachedUnlockedApiKey();
        if (cached) return cached;

        const vault = getVaultPayload();
        if (vault) {
            const unlocked = await unlockApiKeyFromVault();
            if (unlocked === "__MINERVA_UNLOCK_FAILED__") return "__MINERVA_UNLOCK_FAILED__";
            if (unlocked === "__MINERVA_UNLOCK_CANCELLED__") return "__MINERVA_UNLOCK_CANCELLED__";
            if (unlocked === "__MINERVA_VAULT_RESET__") return "__MINERVA_VAULT_RESET__";
            if (unlocked) return unlocked;
            return null;
        }

        // Backward compatibility / first-run legacy storage.
        const legacy = String(GM_getValue(API_KEY_STORAGE_KEY, "") || "").trim();
        if (legacy) {
            cacheUnlockedApiKey(legacy);
            return legacy;
        }
        return null;
    }

    function detectOwnProfileIdFromPage() {
        const scriptText = Array.from(document.scripts || []).map(s => s.textContent || "").join("\n");
        const scriptPatterns = [
            /"player_id"\s*:\s*(\d+)/i,
            /\buserID\b\s*[:=]\s*(\d+)/i,
            /\buid\b\s*[:=]\s*(\d+)/i
        ];
        for (const pattern of scriptPatterns) {
            const match = scriptText.match(pattern);
            if (match && match[1]) return String(match[1]);
        }

        const profileLinks = Array.from(document.querySelectorAll('a[href*="profiles.php?XID="]'));
        for (const link of profileLinks) {
            const href = link.getAttribute("href") || "";
            const match = href.match(/XID=(\d+)/i);
            if (!match) continue;
            const text = (link.textContent || "").trim();
            if (/\[\d+\]/.test(text) || /profile/i.test(text)) {
                return String(match[1]);
            }
        }
        return null;
    }

    function isOwnProfilePage() {
        if (!targetId) return false;
        const ownId = detectOwnProfileIdFromPage();
        return !!ownId && String(ownId) === String(targetId);
    }

    function isTrackedTarget(id) {
        if (!id) return false;
        return trackedTargets.includes(String(id));
    }

    function getAttackUrl(id) {
        return `https://www.torn.com/loader.php?sid=attack&user2ID=${encodeURIComponent(String(id))}`;
    }

    function getProfileUrl(id) {
        return `https://www.torn.com/profiles.php?XID=${encodeURIComponent(String(id))}`;
    }

    function getTrackedTargetLabel(id) {
        const state = trackedStates && trackedStates[String(id)];
        const name = String((state && state.name) || "").trim();
        if (name) return `${name} [${id}]`;
        return `[${id}]`;
    }

    function parseTravelStatusFromProfile(statusStateRaw, statusDescriptionRaw) {
        const state = String(statusStateRaw || "").trim();
        const description = String(statusDescriptionRaw || "").trim();
        const stateLower = state.toLowerCase();
        const descriptionLower = description.toLowerCase();
        const combined = `${state} ${description}`.trim();

        const traveling = /travel/i.test(state) || /traveling to/i.test(description);
        let destination = "";

        const travelToMatch = combined.match(/travel(?:l)?ing\s+to\s+([a-z][a-z\s'-]+)/i);
        if (travelToMatch && travelToMatch[1]) {
            destination = travelToMatch[1].trim();
        } else if (!traveling) {
            const locationStates = [
                "Mexico",
                "Canada",
                "Cayman Islands",
                "Switzerland",
                "Japan",
                "China",
                "UAE",
                "United Arab Emirates",
                "South Africa",
                "Hawaii",
                "Argentina",
                "United Kingdom"
            ];
            const stateNorm = state.toLowerCase();
            const found = locationStates.find(loc => stateNorm === loc.toLowerCase());
            if (found) destination = found;
        }

        return {
            traveling,
            destination: destination || ""
        };
    }

    function updateTrackCurrentButton() {
        const btn = document.getElementById("minerva-track-current");
        if (!btn || !targetId) return;
        const tracked = isTrackedTarget(targetId);
        btn.textContent = tracked ? "Untrack Current" : "Track Current";
        btn.style.color = tracked ? "#ffb0b0" : "#dffbff";
        btn.style.borderColor = tracked ? "rgba(255,100,100,0.25)" : "rgba(0,242,255,0.25)";
    }

    function showApiKeyEntryPanel(options = {}) {
        return new Promise((resolve) => {
            const existing = document.getElementById("minerva-api-key-modal");
            if (existing) existing.remove();

            const pos = getSavedApiKeyPromptPosition();
            const panel = document.createElement("div");
            panel.id = "minerva-api-key-modal";
            panel.style.cssText = `
                position: fixed;
                right: ${pos.right}px;
                top: ${pos.top}px;
                width: 360px;
                background: rgba(5, 8, 14, 0.96);
                color: #e8f6ff;
                border: 1px solid rgba(255,255,255,0.12);
                border-radius: 14px;
                box-shadow: 0 12px 28px rgba(0,0,0,0.42), 0 0 14px rgba(0,242,255,0.12);
                font-family: "Courier New", Courier, monospace;
                z-index: 10030;
                overflow: hidden;
            `;

            panel.innerHTML = `
                <div id="minerva-api-key-modal-header" style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 12px; background: rgba(0,0,0,0.35); cursor: move; user-select:none;">
                    <div style="font-size:12px; font-weight:bold; color:#dffbff;">Minerva API Key</div>
                    <button id="minerva-api-key-modal-close" title="Close" style="background:transparent; color:#9fb6c6; border:1px solid rgba(255,255,255,0.12); border-radius:6px; width:20px; height:20px; line-height:16px; padding:0; cursor:pointer;">x</button>
                </div>
                <div style="padding:12px;">
                    <div style="font-size:12px; color:#b8c6d1; line-height:1.4;">
                        ${options.message || "Enter your Torn Public API key to enable Minerva tracking."}
                    </div>
                    <div style="margin-top:6px; font-size:11px; color:#8ea2b1; line-height:1.35;">
                        Recommended custom key access: <span style="color:#dffbff;">User -> Profile</span>
                    </div>
                    <input id="minerva-api-key-input" type="password" name="minerva_api_key_secret" autocomplete="new-password" autocapitalize="off" autocorrect="off" spellcheck="false" data-lpignore="true" data-1p-ignore="true" placeholder="Enter your Public API Key..." style="margin-top:10px; width:100%; box-sizing:border-box; background:#0a0f14; color:#e8f6ff; border:1px solid rgba(255,255,255,0.14); border-radius:8px; padding:8px 10px; outline:none;" />
                    <div style="margin-top:10px; display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
                        <button id="minerva-api-key-generate" style="background:transparent; color:#bfefff; border:1px solid rgba(0,242,255,0.18); border-radius:8px; padding:6px 10px; cursor:pointer;">Open API Page</button>
                        <div style="display:flex; justify-content:flex-end; gap:8px;">
                        <button id="minerva-api-key-cancel" style="background:transparent; color:#aab8c2; border:1px solid rgba(255,255,255,0.12); border-radius:8px; padding:6px 10px; cursor:pointer;">Cancel</button>
                        <button id="minerva-api-key-save" style="background:rgba(0,242,255,0.08); color:${CYAN_COLOR}; border:1px solid rgba(0,242,255,0.28); border-radius:8px; padding:6px 10px; cursor:pointer; font-weight:bold;">Save Key</button>
                        </div>
                    </div>
                    <div id="minerva-api-key-error" style="margin-top:8px; min-height:14px; font-size:11px; color:${PINK_COLOR};"></div>
                </div>
            `;

            document.body.appendChild(panel);

            const input = panel.querySelector("#minerva-api-key-input");
            const errorEl = panel.querySelector("#minerva-api-key-error");
            let dragListenersBound = false;
            let moveHandler = null;
            let upHandler = null;
            const cleanupDragListeners = () => {
                if (!dragListenersBound) return;
                document.removeEventListener("mousemove", moveHandler);
                document.removeEventListener("mouseup", upHandler);
                dragListenersBound = false;
            };
            const finish = (value) => {
                cleanupDragListeners();
                apiKeyPromptDragState = null;
                panel.remove();
                resolve(value);
            };

            if (input) {
                if (options.initialValue) input.value = options.initialValue;
                input.focus();
                input.select();
            }

            panel.querySelector("#minerva-api-key-modal-close")?.addEventListener("click", () => finish(null));
            panel.querySelector("#minerva-api-key-cancel")?.addEventListener("click", () => finish(null));
            panel.querySelector("#minerva-api-key-generate")?.addEventListener("click", () => {
                window.open("https://www.torn.com/preferences.php", "_blank", "noopener,noreferrer");
                if (errorEl) {
                    errorEl.style.color = "#8ea2b1";
                    errorEl.textContent = "Open the API/Keys section in Preferences, create a custom key with User -> Profile, then paste it here.";
                }
            });
            panel.querySelector("#minerva-api-key-save")?.addEventListener("click", () => {
                const value = String(input?.value || "").trim();
                if (!value) {
                    if (errorEl) errorEl.textContent = "API key is required.";
                    return;
                }
                finish(value);
            });

            input?.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    panel.querySelector("#minerva-api-key-save")?.click();
                } else if (e.key === "Escape") {
                    e.preventDefault();
                    finish(null);
                }
            });

            const header = panel.querySelector("#minerva-api-key-modal-header");
            header?.addEventListener("mousedown", (e) => {
                if (e.target && e.target.id === "minerva-api-key-modal-close") return;
                const rect = panel.getBoundingClientRect();
                apiKeyPromptDragState = {
                    startX: e.clientX,
                    startY: e.clientY,
                    startLeft: rect.left,
                    startTop: rect.top
                };
                e.preventDefault();
            });

            moveHandler = (e) => {
                if (!apiKeyPromptDragState) return;
                const dx = e.clientX - apiKeyPromptDragState.startX;
                const dy = e.clientY - apiKeyPromptDragState.startY;
                const newLeft = Math.max(8, Math.min(window.innerWidth - panel.offsetWidth - 8, apiKeyPromptDragState.startLeft + dx));
                const newTop = Math.max(8, Math.min(window.innerHeight - panel.offsetHeight - 8, apiKeyPromptDragState.startTop + dy));
                panel.style.left = `${newLeft}px`;
                panel.style.right = "auto";
                panel.style.top = `${newTop}px`;
            };
            upHandler = () => {
                if (!apiKeyPromptDragState) {
                    cleanupDragListeners();
                    return;
                }
                const rect = panel.getBoundingClientRect();
                GM_setValue(API_KEY_PROMPT_POS_STORAGE_KEY, {
                    right: Math.max(8, window.innerWidth - (rect.left + rect.width)),
                    top: Math.max(8, rect.top)
                });
                apiKeyPromptDragState = null;
                cleanupDragListeners();
            };
            document.addEventListener("mousemove", moveHandler);
            document.addEventListener("mouseup", upHandler);
            dragListenersBound = true;
        });
    }

    function ensureTrackedTarget(id) {
        const strId = String(id);
        trackedTargets = [strId, ...trackedTargets.filter(t => t !== strId)].slice(0, maxTrackedTargets);
        GM_setValue(TRACKED_TARGETS_STORAGE_KEY, trackedTargets);
        trackedStates[strId] = trackedStates[strId] || { status: "UNKNOWN", thresholdStatus: "UNKNOWN", last: "--", name: strId };
        renderTrackedList();
        updateTrackCurrentButton();
    }

    function removeTrackedTarget(id) {
        const strId = String(id);
        trackedTargets = trackedTargets.filter(t => t !== strId);
        GM_setValue(TRACKED_TARGETS_STORAGE_KEY, trackedTargets);
        renderTrackedList();
        updateTrackCurrentButton();
    }

    function clearTrackedTargetsKeepCurrent() {
        trackedTargets = targetId ? [String(targetId)] : [];
        GM_setValue(TRACKED_TARGETS_STORAGE_KEY, trackedTargets);
        if (targetId) {
            trackedStates[String(targetId)] = trackedStates[String(targetId)] || { status: "UNKNOWN", thresholdStatus: "UNKNOWN", last: "--", name: String(targetId) };
        }
        renderTrackedList();
        updateTrackCurrentButton();
    }

    function setWidgetHidden(hidden) {
        GM_setValue(WIDGET_HIDDEN_STORAGE_KEY, !!hidden);
        const widget = document.getElementById("minerva-corner-widget");
        const reopen = document.getElementById("minerva-corner-reopen");
        if (widget) widget.style.display = hidden ? "none" : "block";
        if (reopen) {
            const pos = widget ? {
                left: parseInt(widget.style.left, 10) || 18,
                bottom: parseInt(widget.style.bottom, 10) || 18
            } : getSavedWidgetPosition();
            reopen.style.left = `${pos.left}px`;
            reopen.style.bottom = `${pos.bottom}px`;
            reopen.style.display = hidden ? "flex" : "none";
        }
    }

    function setWidgetCompact(compact) {
        GM_setValue(WIDGET_COMPACT_STORAGE_KEY, !!compact);
        const details = document.getElementById("minerva-corner-details");
        const btn = document.getElementById("minerva-corner-compact");
        const widget = document.getElementById("minerva-corner-widget");
        if (details) details.style.display = compact ? "none" : "block";
        if (btn) {
            btn.textContent = compact ? "+" : "_";
            btn.title = compact ? "Expand" : "Compact";
        }
        if (widget) {
            widget.style.width = compact ? "260px" : "420px";
            if (!compact) autoSizeCornerWidget();
            clampCornerWidgetIntoViewport();
        }
    }

    function setWidgetLocked(locked) {
        GM_setValue(WIDGET_LOCKED_STORAGE_KEY, !!locked);
        const btn = document.getElementById("minerva-corner-lock");
        const handle = document.getElementById("minerva-corner-drag-handle");
        if (btn) {
            btn.textContent = locked ? "🔒" : "🔓";
            btn.title = locked ? "Unlock Position" : "Lock Position";
            btn.style.color = locked ? "#ffd27a" : "#9fb6c6";
            btn.style.borderColor = locked ? "rgba(255,210,122,0.35)" : "rgba(255,255,255,0.15)";
        }
        if (handle) handle.style.cursor = locked ? "default" : "move";
    }

    function clampCornerWidgetIntoViewport() {
        const widget = document.getElementById("minerva-corner-widget");
        if (!widget || widget.style.display === "none") return;
        const rect = widget.getBoundingClientRect();
        const margin = 8;
        let newLeft = parseInt(widget.style.left, 10);
        let newBottom = parseInt(widget.style.bottom, 10);
        if (!Number.isFinite(newLeft)) newLeft = 18;
        if (!Number.isFinite(newBottom)) newBottom = 18;

        if (rect.left < margin) newLeft += (margin - rect.left);
        if (rect.right > window.innerWidth - margin) newLeft -= (rect.right - (window.innerWidth - margin));
        if (rect.top < margin) newBottom -= (margin - rect.top);
        if (rect.bottom > window.innerHeight - margin) newBottom += (rect.bottom - (window.innerHeight - margin));

        newLeft = Math.max(margin, Math.min(window.innerWidth - widget.offsetWidth - margin, newLeft));
        newBottom = Math.max(margin, Math.min(window.innerHeight - widget.offsetHeight - margin, newBottom));

        widget.style.left = `${newLeft}px`;
        widget.style.bottom = `${newBottom}px`;
        GM_setValue(WIDGET_POS_STORAGE_KEY, { left: newLeft, bottom: newBottom });
    }

    function snapCornerWidgetToGrid(widget) {
        if (!widget) return;

        const margin = 12;
        const rect = widget.getBoundingClientRect();
        const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
        const maxBottom = Math.max(margin, window.innerHeight - rect.height - margin);

        let left = parseInt(widget.style.left, 10);
        let bottom = parseInt(widget.style.bottom, 10);
        if (!Number.isFinite(left)) left = margin;
        if (!Number.isFinite(bottom)) bottom = margin;

        const stepX = Math.max(40, Math.round(rect.width / 2));
        const stepY = Math.max(36, Math.round(rect.height / 2));

        const snappedLeft = Math.max(
            margin,
            Math.min(maxLeft, margin + Math.round((left - margin) / stepX) * stepX)
        );
        const snappedBottom = Math.max(
            margin,
            Math.min(maxBottom, margin + Math.round((bottom - margin) / stepY) * stepY)
        );

        widget.style.left = `${snappedLeft}px`;
        widget.style.bottom = `${snappedBottom}px`;
        GM_setValue(WIDGET_POS_STORAGE_KEY, { left: snappedLeft, bottom: snappedBottom });
    }

    function autoSizeCornerWidget() {
        const widget = document.getElementById("minerva-corner-widget");
        const details = document.getElementById("minerva-corner-details");
        if (!widget || !details) return;
        if (details.style.display === "none") return; // compact mode

        const minWidth = 340;
        const maxWidth = Math.max(minWidth, window.innerWidth - 24);
        let contentWidth = 300; // stable base width for header + threshold chrome

        // Estimate row content width from text lengths to avoid flex/scrollWidth feedback loops.
        const nameValues = trackedTargets.map(id => {
            const state = trackedStates[id] || {};
            const baseName = String(state.name || id || "");
            return `${String(id) === String(targetId) ? "▶" : ""}${baseName}`;
        });
        const statusValues = trackedTargets.map(id => String((trackedStates[id] && trackedStates[id].status) || "UNKNOWN"));
        const lastValues = trackedTargets.map(id => String((trackedStates[id] && trackedStates[id].last) || "--"));

        const maxNameChars = nameValues.reduce((m, s) => Math.max(m, s.length), 0);
        const maxStatusChars = statusValues.reduce((m, s) => Math.max(m, s.length), 0);
        const maxLastChars = lastValues.reduce((m, s) => Math.max(m, s.length), 0);
        const charPx = 7; // close enough for Courier New at this size
        const estimatedRowWidth =
            18 + // dot + spacing
            (maxNameChars * charPx) +
            18 + // gap between left/right sections
            (maxStatusChars * charPx) +
            12 +
            Math.min(maxLastChars, 36) * charPx + // row text is ellipsized
            54 + // attack + remove buttons
            28;  // row padding + borders

        contentWidth = Math.max(contentWidth, estimatedRowWidth);

        const paddedWidth = Math.ceil(contentWidth + 24);
        const targetWidth = Math.max(minWidth, Math.min(maxWidth, paddedWidth));
        widget.style.width = `${targetWidth}px`;
    }

    function autoSizeCornerWidgetListHeight() {
        const list = document.getElementById("minerva-corner-list");
        const widget = document.getElementById("minerva-corner-widget");
        const details = document.getElementById("minerva-corner-details");
        if (!list || !widget || !details) return;
        if (details.style.display === "none") return; // compact mode

        const rows = Array.from(list.children).filter(el => el instanceof HTMLElement);
        if (rows.length === 0) {
            list.style.maxHeight = "";
            list.style.overflowY = "visible";
            return;
        }

        const sampleRow = rows[0];
        const rowHeight = Math.max(24, Math.ceil(sampleRow.getBoundingClientRect().height || 24));
        const rowGap = 5; // matches CSS gap in list
        const desiredVisibleRows = Math.max(rows.length, Math.min(maxTrackedTargets, rows.length));
        const desiredHeight = desiredVisibleRows * rowHeight + Math.max(0, desiredVisibleRows - 1) * rowGap;

        const widgetRect = widget.getBoundingClientRect();
        const topMargin = 12;
        const bottomMargin = 12;
        const availableHeight = Math.max(
            80,
            Math.floor(window.innerHeight - widgetRect.top - topMargin - bottomMargin)
        );

        // Reserve space for header/threshold labels within the widget.
        const chromeHeight = Math.max(70, Math.ceil(widgetRect.height - list.getBoundingClientRect().height));
        const maxListHeight = Math.max(60, availableHeight - chromeHeight);
        const finalListHeight = Math.max(24, Math.min(desiredHeight, maxListHeight));

        list.style.maxHeight = `${finalListHeight}px`;
        list.style.overflowY = desiredHeight > finalListHeight ? "auto" : "visible";
        list.style.paddingRight = desiredHeight > finalListHeight ? "2px" : "0";
    }

    function isCornerWidgetControl(el) {
        if (!(el instanceof Element)) return false;
        return !!el.closest("#minerva-corner-hide, #minerva-corner-compact, #minerva-corner-lock, [data-minerva-remove-id], [data-minerva-attack-id], [data-minerva-ping-id]");
    }

    function notifyIfHidden(title, text) {
        const now = Date.now();
        if (now - lastBackgroundNotificationAt < 30000) return; // avoid spam
        lastBackgroundNotificationAt = now;

        if (document.hidden) {
            let usedBrowserNotification = false;

            if ("Notification" in window) {
                if (Notification.permission === "granted") {
                    const n = new Notification(title, {
                        body: text,
                        silent: true,
                        tag: `minerva-${Date.now()}`
                    });
                    usedBrowserNotification = true;
                    setTimeout(() => { try { n.close(); } catch (_) {} }, 5000);
                } else if (Notification.permission === "default") {
                    Notification.requestPermission().then((perm) => {
                        if (perm === "granted") {
                            const n = new Notification(title, {
                                body: text,
                                silent: true,
                                tag: `minerva-${Date.now()}`
                            });
                            setTimeout(() => { try { n.close(); } catch (_) {} }, 5000);
                        }
                    }).catch(() => {});
                }
            }

            if (!usedBrowserNotification) {
                GM_notification({
                    text,
                    title,
                    timeout: 4000,
                    silent: true
                });
            }
            return;
        }

        showMinervaToast(title, text);
    }

    function ensureToastHost() {
        let host = document.getElementById("minerva-toast-host");
        if (host) return host;

        const saved = getSavedToastHostPosition();
        host = document.createElement("div");
        host.id = "minerva-toast-host";
        host.style.cssText = `
            position: fixed;
            ${Number.isFinite(saved.left) ? `left: ${saved.left}px;` : ""}
            ${!Number.isFinite(saved.left) ? `right: ${Number.isFinite(saved.right) ? saved.right : 16}px;` : ""}
            bottom: ${Number.isFinite(saved.bottom) ? saved.bottom : 84}px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            z-index: 10020;
            pointer-events: none;
            max-width: 360px;
        `;
        document.body.appendChild(host);

        if (!toastDocMouseMoveHandler || !toastDocMouseUpHandler || !toastWindowResizeHandler) {
            toastDocMouseMoveHandler = (e) => {
                if (!isLiveMinervaRuntime()) return;
                if (!toastDragState) return;
                const toastHost = document.getElementById("minerva-toast-host");
                if (!toastHost) return;
                const dx = e.clientX - toastDragState.startX;
                const dy = e.clientY - toastDragState.startY;
                const newLeft = Math.max(8, Math.min(window.innerWidth - toastHost.offsetWidth - 8, toastDragState.startLeft + dx));
                const newTop = Math.max(8, Math.min(window.innerHeight - toastHost.offsetHeight - 8, toastDragState.startTop + dy));
                const newBottom = Math.max(8, window.innerHeight - (newTop + toastHost.offsetHeight));
                toastHost.style.left = `${newLeft}px`;
                toastHost.style.right = "auto";
                toastHost.style.bottom = `${newBottom}px`;
            };
            toastDocMouseUpHandler = () => {
                if (!isLiveMinervaRuntime()) return;
                if (!toastDragState) return;
                const toastHost = document.getElementById("minerva-toast-host");
                if (toastHost) {
                    const rect = toastHost.getBoundingClientRect();
                    GM_setValue(TOAST_HOST_POS_STORAGE_KEY, {
                        left: Math.max(8, Math.round(rect.left)),
                        bottom: Math.max(8, Math.round(window.innerHeight - rect.bottom)),
                        right: null
                    });
                }
                toastDragState = null;
            };
            toastWindowResizeHandler = () => {
                if (!isLiveMinervaRuntime()) return;
                const toastHost = document.getElementById("minerva-toast-host");
                if (!toastHost) return;
                const rect = toastHost.getBoundingClientRect();
                let left = rect.left;
                let top = rect.top;
                left = Math.max(8, Math.min(window.innerWidth - toastHost.offsetWidth - 8, left));
                top = Math.max(8, Math.min(window.innerHeight - toastHost.offsetHeight - 8, top));
                toastHost.style.left = `${left}px`;
                toastHost.style.right = "auto";
                toastHost.style.bottom = `${Math.max(8, Math.round(window.innerHeight - (top + toastHost.offsetHeight)))}px`;
            };
            document.addEventListener("mousemove", toastDocMouseMoveHandler);
            document.addEventListener("mouseup", toastDocMouseUpHandler);
            window.addEventListener("resize", toastWindowResizeHandler);
        }

        return host;
    }

    function showMinervaToast(title, text, durationMs = 8000) {
        const host = ensureToastHost();
        if (!host) return;

        const toast = document.createElement("div");
        toast.style.cssText = `
            pointer-events: auto;
            background: rgba(5, 8, 14, 0.94);
            color: #e8f6ff;
            border: 1px solid rgba(255,255,255,0.12);
            border-left: 3px solid ${CYAN_COLOR};
            border-radius: 12px;
            box-shadow: 0 10px 24px rgba(0,0,0,0.4), 0 0 12px rgba(0,242,255,0.12);
            padding: 10px 12px;
            font-family: "Courier New", Courier, monospace;
            transform: translateY(8px);
            opacity: 0;
            transition: opacity 0.2s ease, transform 0.2s ease;
        `;
        toast.innerHTML = `
            <div data-minerva-toast-drag-handle="1" style="display:flex; align-items:center; justify-content:space-between; gap:8px; cursor:move;">
                <div style="font-size:12px; font-weight:bold; color:#dffbff;">${title}</div>
                <button type="button" data-minerva-toast-close="1" title="Close" style="background:transparent; color:#9fb6c6; border:1px solid rgba(255,255,255,0.12); border-radius:5px; width:18px; height:18px; line-height:14px; padding:0; cursor:pointer; font-size:11px;">x</button>
            </div>
            <div style="margin-top:4px; font-size:12px; color:#b8c6d1;">${text}</div>
        `;
        host.appendChild(toast);

        let removed = false;
        const removeToast = () => {
            if (removed) return;
            removed = true;
            toast.style.opacity = "0";
            toast.style.transform = "translateY(6px)";
            setTimeout(() => toast.remove(), 220);
        };

        toast.querySelector('[data-minerva-toast-close="1"]')?.addEventListener("click", (e) => {
            e.stopPropagation();
            removeToast();
        });
        toast.querySelector('[data-minerva-toast-drag-handle="1"]')?.addEventListener("mousedown", (e) => {
            if (e.target instanceof Element && e.target.closest('[data-minerva-toast-close="1"]')) return;
            const hostRect = host.getBoundingClientRect();
            toastDragState = {
                startX: e.clientX,
                startY: e.clientY,
                startLeft: hostRect.left,
                startTop: hostRect.top
            };
            e.preventDefault();
        });

        requestAnimationFrame(() => {
            toast.style.opacity = "1";
            toast.style.transform = "translateY(0)";
        });

        setTimeout(() => {
            removeToast();
        }, durationMs);
    }

    function showMinervaUpdateToast(latestVersion, releaseUrl) {
        latestAvailableVersion = String(latestVersion || "").trim();
        latestAvailableReleaseUrl = GREASYFORK_SCRIPT_PAGE_URL;
        updateAvailableUiBadge();
        const host = ensureToastHost();
        if (!host) return;

        const toast = document.createElement("div");
        toast.style.cssText = `
            pointer-events: auto;
            background: rgba(5, 8, 14, 0.96);
            color: #e8f6ff;
            border: 1px solid rgba(255,255,255,0.12);
            border-left: 3px solid #42ff8c;
            border-radius: 12px;
            box-shadow: 0 10px 24px rgba(0,0,0,0.4), 0 0 12px rgba(66,255,140,0.12);
            padding: 10px 12px;
            font-family: "Courier New", Courier, monospace;
            transform: translateY(8px);
            opacity: 0;
            transition: opacity 0.2s ease, transform 0.2s ease;
        `;
        toast.innerHTML = `
            <div data-minerva-toast-drag-handle="1" style="display:flex; align-items:center; justify-content:space-between; gap:8px; cursor:move;">
                <div style="font-size:12px; font-weight:bold; color:#dffbff;">Minerva Update Available</div>
                <button type="button" data-minerva-toast-close="1" title="Close" style="background:transparent; color:#9fb6c6; border:1px solid rgba(255,255,255,0.12); border-radius:5px; width:18px; height:18px; line-height:14px; padding:0; cursor:pointer; font-size:11px;">x</button>
            </div>
            <div style="margin-top:4px; font-size:12px; color:#b8c6d1;">Current: <span style="color:#fff;">${MINERVA_VERSION}</span> | Latest: <span style="color:#42ff8c;">${latestVersion}</span></div>
            <div style="margin-top:8px; display:flex; gap:8px; justify-content:flex-end;">
                <button type="button" data-minerva-update-dismiss="1" style="background:transparent; color:#aab8c2; border:1px solid rgba(255,255,255,0.12); border-radius:6px; padding:4px 8px; cursor:pointer; font-size:11px;">Dismiss</button>
                <button type="button" data-minerva-update-open="1" style="background:rgba(66,255,140,0.08); color:#42ff8c; border:1px solid rgba(66,255,140,0.28); border-radius:6px; padding:4px 8px; cursor:pointer; font-size:11px; font-weight:bold;">Update</button>
            </div>
        `;
        host.appendChild(toast);

        let removed = false;
        const removeToast = () => {
            if (removed) return;
            removed = true;
            toast.style.opacity = "0";
            toast.style.transform = "translateY(6px)";
            setTimeout(() => toast.remove(), 220);
        };

        toast.querySelector('[data-minerva-toast-close="1"]')?.addEventListener("click", (e) => {
            e.stopPropagation();
            removeToast();
        });
        toast.querySelector('[data-minerva-update-dismiss="1"]')?.addEventListener("click", (e) => {
            e.stopPropagation();
            GM_setValue(VERSION_CHECK_DISMISSED_VERSION_STORAGE_KEY, latestVersion);
            addLog(`Dismissed update prompt for ${latestVersion}.`, "INFO");
            removeToast();
        });
        toast.querySelector('[data-minerva-update-open="1"]')?.addEventListener("click", (e) => {
            e.stopPropagation();
            window.open(GREASYFORK_SCRIPT_PAGE_URL, "_blank", "noopener,noreferrer");
            removeToast();
        });
        toast.querySelector('[data-minerva-toast-drag-handle="1"]')?.addEventListener("mousedown", (e) => {
            if (e.target instanceof Element && e.target.closest('button')) return;
            const hostRect = host.getBoundingClientRect();
            toastDragState = {
                startX: e.clientX,
                startY: e.clientY,
                startLeft: hostRect.left,
                startTop: hostRect.top
            };
            e.preventDefault();
        });

        requestAnimationFrame(() => {
            toast.style.opacity = "1";
            toast.style.transform = "translateY(0)";
        });
    }

    function parseVersionParts(versionText) {
        const normalized = String(versionText || "").trim().replace(/^v/i, "");
        if (!normalized) return [0, 0, 0];
        return normalized.split(".").map(part => {
            const n = parseInt(part, 10);
            return Number.isFinite(n) ? n : 0;
        });
    }

    function compareVersions(a, b) {
        const av = parseVersionParts(a);
        const bv = parseVersionParts(b);
        const len = Math.max(av.length, bv.length);
        for (let i = 0; i < len; i++) {
            const ai = av[i] || 0;
            const bi = bv[i] || 0;
            if (ai > bi) return 1;
            if (ai < bi) return -1;
        }
        return 0;
    }

    function maybeCheckForMinervaUpdate(options = {}) {
        const force = !!options.force;
        const showNoUpdateToast = !!options.showNoUpdateToast;
        if (versionCheckInFlight) return;
        const lastCheckAt = Number(GM_getValue(VERSION_CHECK_LAST_AT_STORAGE_KEY, 0));
        if (!force && Number.isFinite(lastCheckAt) && (Date.now() - lastCheckAt) < VERSION_CHECK_INTERVAL_MS) return;

        versionCheckInFlight = true;
        GM_setValue(VERSION_CHECK_LAST_AT_STORAGE_KEY, Date.now());

        GM_xmlhttpRequest({
            method: "GET",
            url: GITHUB_LATEST_RELEASE_API_URL,
            headers: {
                "Accept": "application/vnd.github+json"
            },
            timeout: 10000,
            onload: function(response) {
                versionCheckInFlight = false;
                if (response.status !== 200) {
                    addLog(`Version check skipped (HTTP ${response.status}).`, "DIAGNOSTIC");
                    return;
                }
                try {
                    const data = JSON.parse(response.responseText || "{}");
                    const latest = String(data.tag_name || "").trim();
                    if (!latest) {
                        if (showNoUpdateToast) showMinervaToast("Minerva Updates", "Version check did not return a valid release tag.", 5000);
                        return;
                    }
                    const current = MINERVA_VERSION;
                    if (compareVersions(latest, current) <= 0) {
                        latestAvailableVersion = "";
                        latestAvailableReleaseUrl = "";
                        updateAvailableUiBadge();
                        addLog(`Version check complete. Current version ${current} is up to date.`, "INFO");
                        if (showNoUpdateToast) {
                            showMinervaToast("Minerva Updates", `You are on the latest version (${current}).`, 4500);
                        }
                        return;
                    }
                    const dismissed = String(GM_getValue(VERSION_CHECK_DISMISSED_VERSION_STORAGE_KEY, "") || "").trim();
                    latestAvailableVersion = latest;
                    latestAvailableReleaseUrl = GREASYFORK_SCRIPT_PAGE_URL;
                    updateAvailableUiBadge();
                    if (!force && dismissed && dismissed === latest) return;
                    addLog(`New Minerva version available: ${latest} (current ${current}).`, "INFO");
                    showMinervaUpdateToast(latest, GREASYFORK_SCRIPT_PAGE_URL);
                } catch (e) {
                    updateAvailableUiBadge();
                    addLog(`Version check parse failed: ${e.message}`, "DIAGNOSTIC");
                    if (showNoUpdateToast) showMinervaToast("Minerva Updates", "Version check failed while parsing the response.", 5000);
                }
            },
            ontimeout: function() {
                versionCheckInFlight = false;
                addLog("Version check timed out.", "DIAGNOSTIC");
                if (showNoUpdateToast) showMinervaToast("Minerva Updates", "Version check timed out.", 4500);
            },
            onerror: function() {
                versionCheckInFlight = false;
                addLog("Version check network error.", "DIAGNOSTIC");
                if (showNoUpdateToast) showMinervaToast("Minerva Updates", "Version check failed (network error).", 4500);
            }
        });
    }

    function getStatusColor(status) {
        const statusText = String(status || "").toUpperCase();
        if (statusText.startsWith("ACTIVE")) return CYAN_COLOR;
        if (statusText.startsWith("READY")) return CYAN_COLOR;
        if (statusText.startsWith("INACTIVE <")) return "#ffbf66";
        if (status === "PAUSED") return "#ffbf66";
        if (status === "UNKNOWN") return "#9fb6c6";
        return PINK_COLOR;
    }

    function formatThresholdLabel(seconds) {
        if (!Number.isFinite(seconds) || seconds <= 0) return "0s";
        if (seconds % 60 === 0) return `${Math.floor(seconds / 60)}m`;
        return `${seconds}s`;
    }

    function getManualPingCooldownRemainingMs() {
        return Math.max(0, Number(manualPingCooldownUntil || 0) - Date.now());
    }

    function isManualPingCooldownActive() {
        if (getManualPingCooldownRemainingMs() <= 0) {
            manualPingCooldownUntil = 0;
            return false;
        }
        return true;
    }

    function getManualPingCooldownLabel() {
        const remainingMs = getManualPingCooldownRemainingMs();
        if (remainingMs <= 0) return "";
        return `${Math.ceil(remainingMs / 1000)}s`;
    }

    function scheduleManualPingCooldownRefresh() {
        const remainingMs = getManualPingCooldownRemainingMs();
        if (remainingMs <= 0) return;
        setTimeout(() => {
            if (!isManualPingCooldownActive()) {
                renderTrackedList();
            }
        }, remainingMs + 50);
    }

    function tryConsumeManualPingClick() {
        const now = Date.now();

        if (isManualPingCooldownActive()) {
            return {
                ok: false,
                reason: "cooldown",
                remainingMs: getManualPingCooldownRemainingMs()
            };
        }

        manualPingClickTimestamps = manualPingClickTimestamps.filter(ts => now - ts < MANUAL_PING_WINDOW_MS);
        manualPingClickTimestamps.push(now);

        if (manualPingClickTimestamps.length > MANUAL_PING_MAX_CLICKS_PER_WINDOW) {
            manualPingCooldownUntil = now + MANUAL_PING_COOLDOWN_MS;
            manualPingClickTimestamps = [];
            scheduleManualPingCooldownRefresh();
            return {
                ok: false,
                reason: "rate_limited",
                remainingMs: MANUAL_PING_COOLDOWN_MS
            };
        }

        return { ok: true };
    }

    function updateManualPingCooldownVisuals() {
        const badge = document.getElementById("minerva-corner-ping-cooldown");
        if (!badge) return;

        if (isManualPingCooldownActive()) {
            badge.style.display = "inline-flex";
            badge.textContent = `↻ ${getManualPingCooldownLabel()}`;
            badge.title = `Manual ping cooldown: ${getManualPingCooldownLabel()} remaining`;
        } else {
            badge.style.display = "none";
            badge.textContent = "";
            badge.title = "";
        }
    }

    function positionSettingsPopup() {
        const popup = document.getElementById("minerva-settings-panel");
        const gearBtn = document.getElementById("minerva-settings-gear");
        if (!popup || !gearBtn || popup.style.position !== "fixed") return;

        const rect = gearBtn.getBoundingClientRect();
        const margin = 10;
        const desiredWidth = Math.min(980, Math.max(560, window.innerWidth - 24));
        popup.style.width = `${desiredWidth}px`;

        let left = rect.right - desiredWidth;
        let top = rect.bottom + 8;
        left = Math.max(8, Math.min(window.innerWidth - desiredWidth - 8, left));
        top = Math.max(8, Math.min(window.innerHeight - popup.offsetHeight - 8, top));

        popup.style.left = `${left}px`;
        popup.style.top = `${top}px`;
    }

    function setSettingsPopupOpen(open) {
        const popup = document.getElementById("minerva-settings-panel");
        const gearBtn = document.getElementById("minerva-settings-gear");
        if (!popup || !gearBtn || popup.style.position !== "fixed") return;

        isSettingsPopupOpen = !!open;
        popup.style.display = isSettingsPopupOpen ? "block" : "none";
        gearBtn.style.color = isSettingsPopupOpen ? CYAN_COLOR : "#9fb6c6";
        gearBtn.style.borderColor = isSettingsPopupOpen ? "rgba(0,242,255,0.28)" : "rgba(255,255,255,0.15)";
        if (isSettingsPopupOpen) {
            positionSettingsPopup();
        }
    }

    // --- Core UI Construction ---
    function buildUI() {
        if (document.getElementById("minerva-master-container")) return null; 
        ensureMinervaStyleOverrides();

        const wrapper = document.createElement("div");
        wrapper.id = "minerva-master-container";
        wrapper.style.cssText = `
            width: 100%;
            background: rgba(10, 15, 20, 0.85);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border: 1px solid ${isTracking ? CYAN_COLOR : PINK_COLOR};
            border-radius: 12px;
            margin-bottom: 15px;
            box-shadow: 0 0 15px ${isTracking ? CYAN_COLOR + '40' : PINK_COLOR + '40'};
            color: #e0e0e0;
            font-family: "Courier New", Courier, monospace;
            overflow: hidden;
            transition: all 0.3s ease;
            z-index: 9999;
        `;

        const header = document.createElement("div");
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 15px;
            cursor: pointer;
            background: rgba(0, 0, 0, 0.5);
            user-select: none;
        `;
        header.innerHTML = `
            <div style="font-weight: bold; font-size: 15px; letter-spacing: 1px; display:flex; align-items:center; gap:8px; flex-wrap:wrap; min-width:0;">
                <span style="display:inline-flex; align-items:center; min-width:0;">
                    <span style="color: #ffffff;">[ MINERVA ] STATUS: </span>
                    <span id="minerva-status-text" style="color: ${isTracking ? CYAN_COLOR : PINK_COLOR}; text-shadow: 0 0 8px ${isTracking ? CYAN_COLOR : PINK_COLOR};">AWAITING PING</span>
                </span>
                <span id="minerva-update-available-badge" role="button" tabindex="0" title="" style="display:none; color:${PINK_COLOR}; font-weight:bold; font-size:13px; letter-spacing:0.5px; text-shadow:0 0 7px ${PINK_COLOR}; cursor:pointer; white-space:nowrap; user-select:none;">UPDATE AVAILABLE</span>
            </div>
            <div style="font-size: 13px; opacity: 0.9;">
                Next Ping: <span id="minerva-countdown" style="font-weight: bold;">--</span>s <span style="margin-left:8px; font-size:10px;">▼</span>
            </div>
        `;
        
        const settings = document.createElement("div");
        settings.id = "minerva-settings-panel";
        settings.style.cssText = `
            display: none;
            padding: 15px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(0, 0, 0, 0.3);
            font-size: 14px;
        `;
        
        settings.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:12px;">
                <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; padding:8px 10px; border:1px solid rgba(255,255,255,0.08); border-radius:8px; background:rgba(255,255,255,0.02);">
                    <div style="font-size:12px; color:#9fb6c6;">Target List: <span style="color:${CYAN_COLOR}; font-weight:bold;">MANUAL</span> <span style="color:#7f8d98;">(use Track/Untrack Current)</span></div>
                    <div style="display:flex; gap:18px; align-items:center; flex-wrap:wrap;">
                        <label style="display:flex; align-items:center; gap:10px;">
                            <strong style="color:#fff;">Inactive Threshold:</strong>
                            <select id="minerva-time-select" style="background:#0a0f14; color:${CYAN_COLOR}; border:1px solid ${CYAN_COLOR}; padding:4px 10px; border-radius:6px; outline:none; cursor:pointer;">
                                <option value="60" ${thresholdSeconds === 60 ? 'selected' : ''}>1 Minute</option>
                                <option value="300" ${thresholdSeconds === 300 ? 'selected' : ''}>5 Minutes</option>
                                <option value="600" ${thresholdSeconds === 600 ? 'selected' : ''}>10 Minutes</option>
                                <option value="900" ${thresholdSeconds === 900 ? 'selected' : ''}>15 Minutes</option>
                            </select>
                        </label>
                        <label style="display:flex; align-items:center; gap:10px;">
                            <strong style="color:#fff;">Max Tracked:</strong>
                            <select id="minerva-max-tracked-select" style="background:#0a0f14; color:${CYAN_COLOR}; border:1px solid ${CYAN_COLOR}; padding:4px 10px; border-radius:6px; outline:none; cursor:pointer;">
                                <option value="3" ${maxTrackedTargets === 3 ? 'selected' : ''}>3</option>
                                <option value="5" ${maxTrackedTargets === 5 ? 'selected' : ''}>5</option>
                                <option value="8" ${maxTrackedTargets === 8 ? 'selected' : ''}>8</option>
                                <option value="12" ${maxTrackedTargets === 12 ? 'selected' : ''}>12</option>
                            </select>
                        </label>
                    </div>
                </div>
                <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                    <button id="minerva-track-current" style="background: transparent; border: 1px solid rgba(0,242,255,0.25); color: #dffbff; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">Track Current</button>
                    <button id="minerva-key-reset" style="background: transparent; border: 1px solid #774444; color: #ff9a9a; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">Reset API Key</button>
                    <button id="minerva-update-check" style="background: transparent; border: 1px solid rgba(66,255,140,0.2); color: #b9ffd8; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">Check Updates</button>
                    <button id="minerva-toast-test" style="background: transparent; border: 1px solid rgba(0,242,255,0.2); color: #bfefff; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">View Toast</button>
                    <button id="minerva-tracked-clear" style="background: transparent; border: 1px solid #555; color: #d0d0d0; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">Clear Tracked</button>
                    <button id="minerva-log-toggle" style="background: transparent; border: 1px solid #555; color: #aaa; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; transition: 0.2s;">Show Logs ▼</button>
                </div>
            </div>

            <div id="minerva-log-container" style="display: none; margin-top: 15px; padding: 10px; background: rgba(0, 0, 0, 0.7); border: 1px solid #333; border-radius: 6px; max-height: 150px; overflow-y: auto; font-size: 12px; word-wrap: break-word;">
                <div id="minerva-log-content"></div>
            </div>
        `;

        wrapper.appendChild(header);
        wrapper.appendChild(settings);

        // UI Listeners
        const ownProfileControls = isOwnProfilePage();
        header.addEventListener("click", () => {
            if (ownProfileControls) return;
            isUiOpen = !isUiOpen;
            settings.style.display = isUiOpen ? "block" : "none";
        });

        const updateBadgeEl = wrapper.querySelector("#minerva-update-available-badge");
        const openUpdateFromBadge = (e) => {
            if (e) e.stopPropagation();
            if (!latestAvailableVersion) return;
            window.open(latestAvailableReleaseUrl || GITHUB_RELEASES_PAGE_URL, "_blank", "noopener,noreferrer");
        };
        updateBadgeEl?.addEventListener("click", openUpdateFromBadge);
        updateBadgeEl?.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openUpdateFromBadge(e);
            }
        });

        wrapper.querySelector("#minerva-time-select").addEventListener("change", (e) => {
            thresholdSeconds = parseInt(e.target.value);
            GM_setValue("minerva-threshold", thresholdSeconds);
            addLog(`Threshold changed to ${thresholdSeconds / 60} minute(s).`, "INFO");
            if (isTracking) countdownTimer = 0; 
        });

        wrapper.querySelector("#minerva-max-tracked-select").addEventListener("change", (e) => {
            maxTrackedTargets = parseInt(e.target.value);
            if (!Number.isFinite(maxTrackedTargets) || maxTrackedTargets < 1) maxTrackedTargets = 8;
            GM_setValue(MAX_TRACKED_TARGETS_STORAGE_KEY, maxTrackedTargets);
            trackedTargets = trackedTargets.slice(0, maxTrackedTargets);
            GM_setValue(TRACKED_TARGETS_STORAGE_KEY, trackedTargets);
            renderTrackedList();
            addLog(`Max tracked targets set to ${maxTrackedTargets}.`, "INFO");
        });

        wrapper.querySelector("#minerva-log-toggle").addEventListener("click", (e) => {
            isLogOpen = !isLogOpen;
            document.getElementById("minerva-log-container").style.display = isLogOpen ? "block" : "none";
            e.target.innerText = isLogOpen ? "Hide Logs ▲" : "Show Logs ▼";
            e.target.style.color = isLogOpen ? "#fff" : "#aaa";
        });

        wrapper.querySelector("#minerva-track-current").addEventListener("click", () => {
            if (!targetId) return;
            if (isTrackedTarget(targetId)) {
                removeTrackedTarget(targetId);
                addLog(`Removed current target [${targetId}] from tracked list.`, "INFO");
            } else {
                ensureTrackedTarget(targetId);
                hasWarnedNoTargets = false;
                addLog(`Added current target [${targetId}] to tracked list.`, "INFO");
                if (isTracking) countdownTimer = 0;
            }
        });

        wrapper.querySelector("#minerva-key-reset").addEventListener("click", () => {
            const confirmed = confirm("[Minerva] Reset stored Torn API key?");
            if (!confirmed) return;

            clearAllStoredApiKeyMaterial();
            apiKey = "";
            addLog("Stored API key cleared. Prompting for a new key.", "DIAGNOSTIC");

            showApiKeyEntryPanel({
                message: "Enter a new Torn Public API key for Minerva."
            }).then(async (newKey) => {
                if (!newKey) {
                    addLog("No new API key entered. Tracking requests will fail until a key is set.", "ERROR");
                    updateVisuals(PINK_COLOR, "NO API KEY");
                    return;
                }

                const storeResult = await storeApiKeySecurely(newKey.trim());
                if (!storeResult.ok) {
                    if (storeResult.reason === "mismatch") {
                        addLog("Passphrase confirmation mismatch. API key was not updated.", "ERROR");
                    } else {
                        addLog("API key update cancelled before passphrase setup completed.", "ERROR");
                    }
                    updateVisuals(PINK_COLOR, "NO API KEY");
                    return;
                }
                apiKey = newKey.trim();
                addLog(`API key updated (${storeResult.mode === "encrypted" ? "encrypted vault + 7d unlock" : "legacy plain"}).`, "INFO");

                if (isTracking) {
                    countdownTimer = 0;
                    addLog("Forcing immediate ping with new key.", "INFO");
                }
            });
        });

        wrapper.querySelector("#minerva-toast-test").addEventListener("click", () => {
            showMinervaToast("Minerva Preview", "Use this to adjust toast placement/visibility on your screen.", 8000);
        });

        wrapper.querySelector("#minerva-update-check").addEventListener("click", () => {
            addLog("Manual update check requested.", "INFO");
            maybeCheckForMinervaUpdate({ force: true, showNoUpdateToast: true });
        });

        wrapper.querySelector("#minerva-tracked-clear").addEventListener("click", () => {
            clearTrackedTargetsKeepCurrent();
            addLog("Tracked list cleared (kept current target).", "INFO");
        });
        
        updateTrackCurrentButton();
        const keyResetBtn = wrapper.querySelector("#minerva-key-reset");
        const toastTestBtn = wrapper.querySelector("#minerva-toast-test");
        const showOwnerOnlyControls = ownProfileControls;
        if (keyResetBtn) {
            keyResetBtn.style.display = showOwnerOnlyControls ? "" : "none";
        }
        if (toastTestBtn) {
            toastTestBtn.style.display = showOwnerOnlyControls ? "" : "none";
        }

        if (showOwnerOnlyControls) {
            const countdownEl = header.lastElementChild;
            if (countdownEl) {
                countdownEl.style.display = "flex";
                countdownEl.style.alignItems = "center";
                countdownEl.style.gap = "8px";
            }

            const gearBtn = document.createElement("button");
            gearBtn.id = "minerva-settings-gear";
            gearBtn.type = "button";
            gearBtn.title = "Minerva Settings";
            gearBtn.textContent = "⚙";
            gearBtn.style.cssText = `
                background: transparent;
                color: #9fb6c6;
                border: 1px solid rgba(255,255,255,0.15);
                border-radius: 6px;
                width: 24px;
                height: 22px;
                line-height: 18px;
                padding: 0;
                cursor: pointer;
                font-size: 13px;
            `;
            gearBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                setSettingsPopupOpen(!isSettingsPopupOpen);
            });
            countdownEl?.appendChild(gearBtn);

            wrapper.removeChild(settings);
            settings.style.position = "fixed";
            settings.style.display = "none";
            settings.style.padding = "14px";
            settings.style.margin = "0";
            settings.style.background = "rgba(8, 12, 18, 0.96)";
            settings.style.border = "1px solid rgba(255,255,255,0.12)";
            settings.style.borderRadius = "12px";
            settings.style.boxShadow = "0 12px 28px rgba(0,0,0,0.42), 0 0 14px rgba(0,242,255,0.12)";
            settings.style.backdropFilter = "blur(8px)";
            settings.style.webkitBackdropFilter = "blur(8px)";
            settings.style.zIndex = "10025";
            settings.style.maxWidth = "calc(100vw - 16px)";
            settings.style.maxHeight = "calc(100vh - 16px)";
            settings.style.overflow = "auto";
            document.body.appendChild(settings);

            if (!settingsDocClickHandler || !settingsWindowResizeHandler || !settingsWindowScrollHandler || !settingsDocKeydownHandler) {
                settingsDocClickHandler = (e) => {
                    if (!isLiveMinervaRuntime()) return;
                    const popup = document.getElementById("minerva-settings-panel");
                    const gear = document.getElementById("minerva-settings-gear");
                    if (!popup || !gear || popup.style.position !== "fixed") return;
                    if (!isSettingsPopupOpen) return;
                    if (popup.contains(e.target) || gear.contains(e.target)) return;
                    setSettingsPopupOpen(false);
                };
                settingsWindowResizeHandler = () => {
                    if (!isLiveMinervaRuntime()) return;
                    if (isSettingsPopupOpen) positionSettingsPopup();
                };
                settingsWindowScrollHandler = () => {
                    if (!isLiveMinervaRuntime()) return;
                    if (isSettingsPopupOpen) positionSettingsPopup();
                };
                settingsDocKeydownHandler = (e) => {
                    if (!isLiveMinervaRuntime()) return;
                    if (e.key === "Escape" && isSettingsPopupOpen) {
                        setSettingsPopupOpen(false);
                    }
                };
                document.addEventListener("click", settingsDocClickHandler);
                window.addEventListener("resize", settingsWindowResizeHandler);
                window.addEventListener("scroll", settingsWindowScrollHandler, true);
                document.addEventListener("keydown", settingsDocKeydownHandler);
            }
        }

        updateAvailableUiBadge();

        return wrapper;
    }

    function buildCornerWidget() {
        if (document.getElementById("minerva-corner-widget")) return null;
        ensureMinervaStyleOverrides();

        const widget = document.createElement("div");
        widget.id = "minerva-corner-widget";
        const pos = getSavedWidgetPosition();
        widget.style.cssText = `
            position: fixed;
            left: ${pos.left}px;
            bottom: ${pos.bottom}px;
            width: 420px;
            background: rgba(5, 8, 14, 0.92);
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 14px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.45), 0 0 18px rgba(0,242,255,0.12);
            color: #e8f6ff;
            z-index: 10000;
            font-family: "Courier New", Courier, monospace;
            padding: 10px 12px;
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
        `;

        widget.innerHTML = `
            <div id="minerva-corner-drag-handle" style="display:flex; justify-content:space-between; align-items:center; gap:8px; cursor:move;">
                <div style="font-weight:bold; font-size:13px; color:#dffbff;">Minerva Tracking</div>
                <div style="display:flex; align-items:center; gap:6px;">
                    <div id="minerva-corner-pill" style="font-size:11px; padding:2px 8px; border-radius:999px; border:1px solid ${PINK_COLOR}; color:${PINK_COLOR};">IDLE</div>
                    <div id="minerva-corner-ping-cooldown" style="display:none; font-size:10px; padding:2px 6px; border-radius:999px; border:1px solid rgba(255,191,102,0.35); color:#ffbf66; background:rgba(255,191,102,0.07);">↻ 60s</div>
                    <button id="minerva-corner-lock" title="Lock Position" style="background:transparent; color:#9fb6c6; border:1px solid rgba(255,255,255,0.15); border-radius:6px; width:24px; height:20px; line-height:16px; padding:0; cursor:pointer; font-size:12px;">🔓</button>
                    <button id="minerva-corner-compact" title="Compact" style="background:transparent; color:#9fb6c6; border:1px solid rgba(255,255,255,0.15); border-radius:6px; width:20px; height:20px; line-height:16px; padding:0; cursor:pointer;">_</button>
                    <button id="minerva-corner-hide" title="Hide" style="background:transparent; color:#9fb6c6; border:1px solid rgba(255,255,255,0.15); border-radius:6px; width:20px; height:20px; line-height:16px; padding:0; cursor:pointer;">-</button>
                </div>
            </div>
            <div id="minerva-corner-details">
                <div style="margin-top:4px; font-size:12px; color:#a9b6c0;">
                    Threshold: <span id="minerva-corner-threshold" style="color:#fff;">${thresholdSeconds}s</span>
                </div>
                <div style="margin-top:8px; font-size:11px; color:#8ea2b1; text-transform:uppercase; letter-spacing:0.6px;">Tracked Profiles</div>
                <div id="minerva-corner-list" style="margin-top:6px; display:flex; flex-direction:column; gap:5px;"></div>
            </div>
        `;

        return widget;
    }

    function buildCornerReopen() {
        if (document.getElementById("minerva-corner-reopen")) return null;
        const btn = document.createElement("button");
        btn.id = "minerva-corner-reopen";
        btn.textContent = "Minerva";
        btn.style.cssText = `
            position: fixed;
            left: 18px;
            bottom: 18px;
            display: none;
            align-items: center;
            justify-content: center;
            background: rgba(5, 8, 14, 0.92);
            color: #dffbff;
            border: 1px solid rgba(255,255,255,0.14);
            border-radius: 10px;
            padding: 6px 10px;
            font-size: 12px;
            font-family: "Courier New", Courier, monospace;
            cursor: pointer;
            z-index: 10001;
            box-shadow: 0 6px 16px rgba(0,0,0,0.35);
        `;
        btn.addEventListener("click", () => setWidgetHidden(false));
        return btn;
    }

    function updateCornerWidget(statusText) {
        const pill = document.getElementById("minerva-corner-pill");
        const threshold = document.getElementById("minerva-corner-threshold");
        if (!pill || !threshold) return;

        const active = statusText === "ACTIVE";
        const paused = statusText === "PAUSED";
        const color = paused ? PINK_COLOR : (active ? CYAN_COLOR : PINK_COLOR);
        pill.textContent = statusText || "IDLE";
        pill.style.color = color;
        pill.style.borderColor = color;
        pill.style.boxShadow = `0 0 8px ${color}33 inset`;
        threshold.textContent = `${thresholdSeconds}s`;
    }

    function renderTrackedList(forceNow = false) {
        if (!forceNow) {
            if (trackedListRenderInProgress || trackedListRenderScheduled) return;
            trackedListRenderScheduled = true;
            const flush = () => {
                trackedListRenderScheduled = false;
                renderTrackedList(true);
            };
            if (typeof window.requestAnimationFrame === "function") {
                window.requestAnimationFrame(flush);
            } else {
                setTimeout(flush, 16);
            }
            return;
        }

        trackedListRenderInProgress = true;
        try {
        const list = document.getElementById("minerva-corner-list");
        if (!list) return;
        list.innerHTML = "";

        trackedTargets.forEach(id => {
            const state = trackedStates[id] || { status: "UNKNOWN", thresholdStatus: "UNKNOWN", last: "--", isHospitalized: null };
            const row = document.createElement("div");
            const isCurrent = String(id) === String(targetId);
            const color = getStatusColor(state.status);
            const displayName = state.name || id;
            const pingCooldownActive = isManualPingCooldownActive();
            const pingCooldownLabel = getManualPingCooldownLabel();
            const hospitalKnown = typeof state.isHospitalized === "boolean";
            const hospitalColor = !hospitalKnown ? "#9fb6c6" : (state.isHospitalized ? PINK_COLOR : "#42ff8c");
            const hospitalTitle = !hospitalKnown ? "Hospital status unknown" : (state.isHospitalized ? "In hospital" : "Not in hospital");
            const safeDisplayName = escapeHtml(`${isCurrent ? "▶" : ""}${displayName}`);
            const safeStatus = escapeHtml(state.status || "UNKNOWN");
            const safeLast = escapeHtml(state.last || "--");
            row.style.cssText = `
                display:flex;
                align-items:center;
                justify-content:space-between;
                gap:8px;
                border:1px solid ${isCurrent ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.08)"};
                background:${isCurrent ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.015)"};
                border-radius:8px;
                padding:4px 6px;
                font-size:11px;
            `;
            row.title = `ID: ${id}`;
            row.innerHTML = `
                <div style="display:flex; align-items:center; gap:6px; min-width:0;">
                    <span style="width:7px; height:7px; border-radius:999px; background:${color}; box-shadow:0 0 8px ${color}66;"></span>
                    <span title="${hospitalTitle}" style="display:inline-flex; align-items:center; justify-content:center; width:12px; height:12px; color:${hospitalColor}; border:1px solid ${hospitalColor}55; border-radius:4px; font-size:10px; line-height:10px; background:rgba(255,255,255,0.02);">✚</span>
                    <a href="${getProfileUrl(id)}" target="_blank" rel="noopener noreferrer" title="Open profile" style="color:#ffffff; text-decoration:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0; max-width:320px; display:inline-block;">${safeDisplayName}</a>
                </div>
                <div style="display:flex; align-items:center; gap:8px; min-width:0;">
                    <span style="color:${color}; font-weight:bold; white-space:nowrap;">${safeStatus}</span>
                    <span style="color:#9fb6c6; max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${safeLast}</span>
                    <button data-minerva-ping-id="${id}" title="${pingCooldownActive ? `Ping cooldown (${pingCooldownLabel})` : "Ping Now"}" ${pingCooldownActive ? "disabled" : ""} style="background:transparent; color:${pingCooldownActive ? "#6c7f8d" : CYAN_COLOR}; border:1px solid ${pingCooldownActive ? "rgba(255,255,255,0.08)" : "rgba(0,242,255,0.18)"}; border-radius:5px; width:22px; height:16px; line-height:12px; padding:0; cursor:${pingCooldownActive ? "not-allowed" : "pointer"}; font-size:11px; font-weight:bold; opacity:${pingCooldownActive ? "0.55" : "1"};">↻</button>
                    <button data-minerva-attack-id="${id}" title="Attack target" style="background:transparent; color:#ffb0b0; border:1px solid rgba(255,100,100,0.18); border-radius:5px; width:22px; height:16px; line-height:12px; padding:0; cursor:pointer; font-size:11px; font-weight:bold;">⚔</button>
                    <button data-minerva-remove-id="${id}" title="Remove" style="background:transparent; color:#9fb6c6; border:1px solid rgba(255,255,255,0.12); border-radius:5px; width:16px; height:16px; line-height:12px; padding:0; cursor:pointer; font-size:11px;">x</button>
                </div>
            `;
            const pingBtn = row.querySelector(`[data-minerva-ping-id="${id}"]`);
            if (pingBtn) {
                pingBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const limiter = tryConsumeManualPingClick();
                    if (!limiter.ok) {
                        const seconds = Math.ceil((limiter.remainingMs || 0) / 1000);
                        if (limiter.reason === "rate_limited") {
                            addLog(`Manual ping rate limit triggered. Ping buttons locked for ${seconds}s.`, "ERROR");
                            showMinervaToast("Minerva", `Ping cooldown enabled for ${seconds}s (too many manual pings).`, 5000);
                            renderTrackedList();
                        } else if (limiter.reason === "cooldown") {
                            addLog(`Manual ping blocked during cooldown (${seconds}s remaining).`, "DIAGNOSTIC");
                        }
                        return;
                    }
                    if (!apiKey) {
                        addLog(`Cannot ping [${id}] because no API key is set.`, "ERROR");
                        updateVisuals(PINK_COLOR, "NO API KEY");
                        return;
                    }
                    addLog(`Manual ping requested for [${id}].`, "INFO");
                    checkProfileActivityForId(id, String(id) === String(targetId));
                    if (String(id) === String(targetId) && isTracking) {
                        countdownTimer = 60;
                    }
                });
            }
            const attackBtn = row.querySelector(`[data-minerva-attack-id="${id}"]`);
            if (attackBtn) {
                attackBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    window.open(getAttackUrl(id), "_blank", "noopener,noreferrer");
                });
            }
            const removeBtn = row.querySelector(`[data-minerva-remove-id="${id}"]`);
            if (removeBtn) {
                removeBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    removeTrackedTarget(id);
                    addLog(`Removed target [${id}] from tracked list.`, "INFO");
                });
            }
            list.appendChild(row);
        });

        autoSizeCornerWidgetListHeight();
        autoSizeCornerWidget();
        clampCornerWidgetIntoViewport();
        updateManualPingCooldownVisuals();
        } finally {
            trackedListRenderInProgress = false;
        }
    }

    // --- Visual Updater ---
    function updateVisuals(color, text) {
        const container = document.getElementById("minerva-master-container");
        const statusText = document.getElementById("minerva-status-text");
        if (container && statusText) {
            container.style.borderColor = color;
            container.style.boxShadow = `0 0 15px ${color}40`;
            statusText.style.color = color;
            statusText.style.textShadow = `0 0 8px ${color}`;
            if (text) statusText.innerText = text;
        }
        if (text) updateCornerWidget(text);
    }

    function syncTrackingStateFromUi() {
        const statusText = document.getElementById("minerva-status-text");
        if (!isTracking || !statusText) return;

        const uiStatus = String(statusText.innerText || "").trim();
        let resolvedStatus = currentStatus;
        if (!resolvedStatus || resolvedStatus === "UNKNOWN") {
            const currentTargetState = targetId ? trackedStates[String(targetId)] : null;
            let fallbackStatus = currentTargetState && currentTargetState.thresholdStatus;
            if (!fallbackStatus || fallbackStatus === "UNKNOWN") {
                const firstTrackedId = trackedTargets.length ? String(trackedTargets[0]) : "";
                const firstTrackedState = firstTrackedId ? trackedStates[firstTrackedId] : null;
                fallbackStatus = firstTrackedState && firstTrackedState.thresholdStatus;
            }
            if (fallbackStatus && fallbackStatus !== "UNKNOWN") {
                resolvedStatus = fallbackStatus;
                currentStatus = fallbackStatus;
            }
        }
        const hasKnownStatus = !!(resolvedStatus && resolvedStatus !== "UNKNOWN");
        if (!hasKnownStatus) return;

        if ((uiStatus === "PAUSED" || uiStatus === "AWAITING PING" || uiStatus === "NO TARGETS") && trackedTargets.length > 0) {
            updateVisuals(resolvedStatus === "ACTIVE" ? CYAN_COLOR : PINK_COLOR, resolvedStatus);
        }
    }

    // --- Profile UI Injection ---
    function isProfilePageContext() {
        const path = String(window.location.pathname || "").toLowerCase();
        if (path.includes("/profiles.php")) return true;
        if (path.includes("/loader.php")) {
            const sid = String(new URLSearchParams(window.location.search).get("sid") || "").toLowerCase();
            if (sid.includes("profile")) return true;
        }
        return !!targetId;
    }

    function describeInjectionNode(node) {
        if (!(node instanceof Element)) return "(invalid)";
        const id = node.id ? `#${node.id}` : "";
        const cls = typeof node.className === "string" && node.className.trim()
            ? `.${node.className.trim().split(/\s+/).slice(0, 3).join(".")}`
            : "";
        return `${node.tagName.toLowerCase()}${id}${cls}`;
    }

    function scoreInjectionHost(node) {
        if (!(node instanceof Element)) return { score: -Infinity, rejectReason: "not-element" };
        if (node.id === "minerva-master-container") return { score: -Infinity, rejectReason: "self" };
        const existingUi = document.getElementById("minerva-master-container");
        if (existingUi && node.contains(existingUi)) return { score: -Infinity, rejectReason: "contains-existing-ui" };

        const rect = node.getBoundingClientRect();
        const style = window.getComputedStyle(node);
        if (style.display === "none" || style.visibility === "hidden") return { score: -Infinity, rejectReason: "hidden" };
        if (rect.width < 260 || rect.height < 80) return { score: -Infinity, rejectReason: `too-small:${Math.round(rect.width)}x${Math.round(rect.height)}` };

        let score = 0;
        const reasons = [];

        if (node.offsetParent) {
            score += 10;
            reasons.push("visible+10");
        }
        const topScore = Math.max(0, 120 - Math.min(120, Math.abs(rect.top - 80)));
        score += topScore;
        reasons.push(`top+${Math.round(topScore)}`);
        const widthScore = Math.max(0, Math.min(80, rect.width / 12));
        score += widthScore;
        reasons.push(`width+${Math.round(widthScore)}`);

        const ident = `${node.id || ""} ${node.className || ""}`.toLowerCase();
        if (/profile|user|info|content|wrapper|container/.test(ident)) {
            score += 35;
            reasons.push("profile-ident+35");
        }
        if (/maincontainer|content-wrapper|profileroot|user-information|actions/.test(ident)) {
            score += 25;
            reasons.push("strong-ident+25");
        }

        const profileLinks = node.querySelectorAll('a[href*="profiles.php?XID="]').length;
        const attackLinks = node.querySelectorAll('a[href*="sid=attack"], a[href*="attack"]').length;
        const actionButtons = node.querySelectorAll('a,button').length;
        const headingText = Array.from(node.querySelectorAll("h1,h2,h3,h4,header,.title"))
            .map(el => (el.textContent || "").trim().toLowerCase())
            .slice(0, 10)
            .join(" | ");
        if (/user information|actions/.test(headingText)) {
            score += 30;
            reasons.push("heading-match+30");
        }

        const profileLinkScore = Math.min(profileLinks * 20, 80);
        const attackLinkScore = Math.min(attackLinks * 25, 50);
        const actionButtonScore = Math.min(actionButtons, 20);
        score += profileLinkScore + attackLinkScore + actionButtonScore;
        if (profileLinkScore) reasons.push(`profile-links+${profileLinkScore}`);
        if (attackLinkScore) reasons.push(`attack-links+${attackLinkScore}`);
        if (actionButtonScore) reasons.push(`actions+${actionButtonScore}`);

        if (node === document.body) {
            score -= 80;
            reasons.push("body-80");
        }
        if (node === document.documentElement) {
            score -= 120;
            reasons.push("html-120");
        }
        if (rect.height > window.innerHeight * 0.95 && rect.width > window.innerWidth * 0.95) {
            score -= 35;
            reasons.push("fullpage-35");
        }

        return { score, reasons, rect, desc: describeInjectionNode(node) };
    }

    function findBestDynamicInjectionHost(uiElement) {
        const candidates = new Set();

        const seedSelectors = [
            'a[href*="profiles.php?XID="]',
            'a[href*="sid=attack"]',
            'a[href*="loader.php?sid=attack"]',
            '[id*="profile"]',
            '[class*="profile"]',
            '[class*="user-information"]',
            '[class*="userInfo"]',
            '[class*="actions"]',
            '[class*="action"]',
            '[class*="sortable"]',
            '[class*="box"]',
            'h1, h2, h3',
            '#mainContainer',
            '#content-wrapper',
            '#content'
        ];

        for (const selector of seedSelectors) {
            document.querySelectorAll(selector).forEach((el) => {
                if (!(el instanceof Element)) return;
                let cur = el;
                let depth = 0;
                while (cur && depth < 5) {
                    candidates.add(cur);
                    cur = cur.parentElement;
                    depth++;
                }
            });
        }

        let bestHost = null;
        let bestScore = -Infinity;
        const ranked = [];
        for (const node of candidates) {
            if (!(node instanceof Element)) continue;
            if (node.contains(uiElement)) continue;
            const scored = scoreInjectionHost(node);
            if (Number.isFinite(scored.score)) ranked.push(scored);
            if (scored.score > bestScore) {
                bestScore = scored.score;
                bestHost = node;
            }
        }
        ranked.sort((a, b) => b.score - a.score);

        if (bestHost && bestScore > 20) {
            return { host: bestHost, score: bestScore, rankedTop: ranked.slice(0, 5) };
        }
        return { host: null, score: bestScore, rankedTop: ranked.slice(0, 5) };
    }

    function injectUiAsOverlayFallback(uiElement) {
        if (!uiElement || document.getElementById("minerva-profile-overlay-host")) return false;
        if (!document.body) return false;
        const overlayHost = document.createElement("div");
        overlayHost.id = "minerva-profile-overlay-host";
        overlayHost.style.cssText = `
            position: fixed;
            top: 12px;
            left: 12px;
            width: min(560px, calc(100vw - 24px));
            max-height: calc(100vh - 24px);
            overflow: auto;
            z-index: 10024;
        `;
        uiElement.style.width = "100%";
        uiElement.style.marginBottom = "0";
        overlayHost.appendChild(uiElement);
        document.body.appendChild(overlayHost);
        addLog("Minerva UI injected via guarded overlay fallback.", "ERROR");
        return true;
    }

    function disconnectProfileInjectionObserver() {
        if (!profileInjectionObserver) return;
        try {
            profileInjectionObserver.disconnect();
        } catch (_) {}
        profileInjectionObserver = null;
    }

    function teardownMinerva(reason = "teardown") {
        if (isTornDown) return;
        isTornDown = true;
        disconnectProfileInjectionObserver();
        if (engineIntervalId) {
            clearInterval(engineIntervalId);
            engineIntervalId = null;
        }
        pollCycleInProgress = false;
        engineTickInProgress = false;
        trackedListRenderScheduled = false;
        trackedListRenderInProgress = false;
        widgetDragState = null;
        apiKeyPromptDragState = null;
        toastDragState = null;
        try {
            if (typeof GM_removeValueChangeListener === "function" && trackedTargetsValueChangeListenerId) {
                GM_removeValueChangeListener(trackedTargetsValueChangeListenerId);
            }
        } catch (_) {}
        trackedTargetsValueChangeListenerId = null;

        [
            "minerva-master-container",
            "minerva-settings-panel",
            "minerva-corner-widget",
            "minerva-corner-reopen",
            "minerva-toast-host",
            "minerva-api-key-modal",
            "minerva-passphrase-modal",
            "minerva-profile-overlay-host"
        ].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });
        if (toastDocMouseMoveHandler) document.removeEventListener("mousemove", toastDocMouseMoveHandler);
        if (toastDocMouseUpHandler) document.removeEventListener("mouseup", toastDocMouseUpHandler);
        if (toastWindowResizeHandler) window.removeEventListener("resize", toastWindowResizeHandler);
        toastDocMouseMoveHandler = null;
        toastDocMouseUpHandler = null;
        toastWindowResizeHandler = null;

        if (settingsDocClickHandler) document.removeEventListener("click", settingsDocClickHandler);
        if (settingsWindowResizeHandler) window.removeEventListener("resize", settingsWindowResizeHandler);
        if (settingsWindowScrollHandler) window.removeEventListener("scroll", settingsWindowScrollHandler, true);
        if (settingsDocKeydownHandler) document.removeEventListener("keydown", settingsDocKeydownHandler);
        settingsDocClickHandler = null;
        settingsWindowResizeHandler = null;
        settingsWindowScrollHandler = null;
        settingsDocKeydownHandler = null;

        if (cornerDocMouseMoveHandler) document.removeEventListener("mousemove", cornerDocMouseMoveHandler);
        if (cornerDocMouseUpHandler) document.removeEventListener("mouseup", cornerDocMouseUpHandler);
        if (cornerWindowResizeHandler) window.removeEventListener("resize", cornerWindowResizeHandler);
        cornerDocMouseMoveHandler = null;
        cornerDocMouseUpHandler = null;
        cornerWindowResizeHandler = null;

        releaseActiveMinervaInstance();
        if (reason !== "unload") {
            console.log(`[Minerva] Runtime torn down (${reason}).`);
        }
    }

    function injectSafely() {
        if (!isProfilePageContext()) return;
        if (!targetId) return;
        const uiElement = buildUI();
        if (!uiElement) return;
        lastInjectionAttemptAt = Date.now();
        injectionFailureLogged = false;
        disconnectProfileInjectionObserver();

        const possibleTargets = [
            '.profile-wrapper',
            '.user-profile',
            '#profileroot',
            '.profile-container',
            '.profile-mini-root',
            '[class*="profile-root"]',
            '[class*="profile-wrapper"]',
            '[class*="user-information"]',
            '[class*="actions"]',
            '[class*="profile"] [class*="column"]',
            '.content-wrapper',
            '.content-wrapper > div',
            '.content-title + div',
            '#mainContainer .content-wrapper',
            '#mainContainer',
            '#content-wrapper',
            '#content'
        ];

        const tryInject = () => {
            // Preferred placement: wide center-column "Profile Notes" bar (avoid sidebar "Notes" blocks).
            const profileNotesAnchor = Array.from(document.querySelectorAll("div, h2, h3, span, a"))
                .filter((el) => {
                    if (!(el instanceof Element)) return false;
                    const text = String(el.textContent || "").trim();
                    if (!/^profile notes$/i.test(text)) return false;
                    const rect = el.getBoundingClientRect();
                    if (rect.width < 420 || rect.height < 16) return false;
                    const style = window.getComputedStyle(el);
                    if (style.display === "none" || style.visibility === "hidden") return false;
                    return true;
                })
                .sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];
            if (profileNotesAnchor && profileNotesAnchor.parentElement) {
                let host = profileNotesAnchor.closest('div[class], section, article') || profileNotesAnchor;
                let cur = host;
                for (let i = 0; i < 4 && cur && cur.parentElement; i++) {
                    const rect = cur.getBoundingClientRect();
                    if (rect.width >= 500 && rect.height >= 24) host = cur;
                    cur = cur.parentElement;
                }
                if (host && host.parentElement && !host.contains(uiElement)) {
                    host.parentElement.insertBefore(uiElement, host);
                    disconnectProfileInjectionObserver();
                    addLog("Minerva UI injected above Profile Notes bar.", "INFO");
                    return true;
                }
            }

            for (let selector of possibleTargets) {
                let target = document.querySelector(selector);
                if (target && !target.contains(uiElement)) {
                    target.insertBefore(uiElement, target.firstChild);
                    disconnectProfileInjectionObserver();
                    addLog(`Minerva UI injected cleanly at ${selector}`, "INFO");
                    return true;
                }
            }

            // Fallback: anchor near common profile modules, then insert above their parent block.
            const anchors = [
                '.user-information',
                '.profile-mini-root',
                '.profile-container',
                '[class*="user-information"]',
                '[class*="profile"] [class*="information"]',
                '[class*="actions"]',
                'h2',
                'h3'
            ];
            for (const selector of anchors) {
                const anchorCandidates = Array.from(document.querySelectorAll(selector));
                const anchor = anchorCandidates.find((el) => {
                    if (!(el instanceof Element)) return false;
                    if (/^H[23]$/i.test(el.tagName)) {
                        const t = String(el.textContent || "").toLowerCase();
                        return /user information|actions/.test(t);
                    }
                    return true;
                });
                if (!anchor) continue;
                const host = anchor.closest('div[class], section, article') || anchor.parentElement;
                if (host && host.parentElement && !host.contains(uiElement)) {
                    host.parentElement.insertBefore(uiElement, host);
                    disconnectProfileInjectionObserver();
                    addLog(`Minerva UI injected via fallback anchor ${selector}`, "INFO");
                    return true;
                }
            }

            // Dynamic fallback: score likely profile containers for this layout.
            const dynamicHost = findBestDynamicInjectionHost(uiElement);
            if (dynamicHost && dynamicHost.host) {
                dynamicHost.host.insertBefore(uiElement, dynamicHost.host.firstChild || null);
                disconnectProfileInjectionObserver();
                addLog(`Minerva UI injected via dynamic layout match (score=${Math.round(dynamicHost.score)}).`, "INFO");
                return true;
            }
            if (dynamicHost && dynamicHost.rankedTop && dynamicHost.rankedTop.length) {
                addLog(`Dynamic injection candidates: ${dynamicHost.rankedTop.map(c => `${c.desc}:${Math.round(c.score)}`).join(" | ")}`, "DIAGNOSTIC");
            }

            // Last in-flow fallback: prepend into a stable page container if profile selectors miss.
            const genericHosts = [
                '#mainContainer',
                '#content-wrapper',
                '#content',
                'main'
            ];
            for (const selector of genericHosts) {
                const host = document.querySelector(selector);
                if (!host || host.contains(uiElement)) continue;
                host.insertBefore(uiElement, host.firstChild || null);
                disconnectProfileInjectionObserver();
                addLog(`Minerva UI injected via generic fallback ${selector}`, "INFO");
                return true;
            }

            if (injectUiAsOverlayFallback(uiElement)) {
                disconnectProfileInjectionObserver();
                return true;
            }

            return false;
        };
        
        if (tryInject()) return;

        const observer = new MutationObserver((mutations, obs) => {
            if (tryInject()) {
                addLog("Minerva UI injected via Observer.", "INFO");
                obs.disconnect();
                if (profileInjectionObserver === obs) profileInjectionObserver = null;
                return;
            }
        });
        profileInjectionObserver = observer;
        observer.observe(document.body, { childList: true, subtree: true });

        // Last-resort fallback if Torn's profile DOM is unusual.
        setTimeout(() => {
            if (!document.getElementById("minerva-master-container") && tryInject()) {
                observer.disconnect();
                if (profileInjectionObserver === observer) profileInjectionObserver = null;
            }
        }, 2500);

        setTimeout(() => {
            if (!document.getElementById("minerva-master-container") && !injectionFailureLogged) {
                injectionFailureLogged = true;
                addLog(`Profile UI injection still missing after retries. selectors=${possibleTargets.length}, pageTitle=${document.title || "-"}`, "ERROR");
                addLog(`First anchors present snapshot: user-information=${!!document.querySelector('.user-information')}, profile-container=${!!document.querySelector('.profile-container')}, actions=${!!document.querySelector('[class*=\"actions\"]')}`, "DIAGNOSTIC");
                const dyn = findBestDynamicInjectionHost(uiElement);
                if (dyn && dyn.rankedTop && dyn.rankedTop.length) {
                    addLog(`Top dynamic candidates: ${dyn.rankedTop.map(c => `${c.desc}:${Math.round(c.score)}[${(c.reasons || []).slice(0, 3).join(",")}]`).join(" || ")}`, "DIAGNOSTIC");
                }
            }
            if (!document.getElementById("minerva-master-container")) {
                observer.disconnect();
                if (profileInjectionObserver === observer) profileInjectionObserver = null;
            }
        }, 4000);
    }

    function injectCornerWidget() {
        const widget = buildCornerWidget();
        const reopen = buildCornerReopen();
        if (widget) document.body.appendChild(widget);
        if (reopen) document.body.appendChild(reopen);

        const activeWidget = document.getElementById("minerva-corner-widget");
        if (!activeWidget) return;

        const hideBtn = document.getElementById("minerva-corner-hide");
        if (hideBtn) {
            hideBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                setWidgetHidden(true);
            });
        }

        const compactBtn = document.getElementById("minerva-corner-compact");
        if (compactBtn) {
            compactBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const details = document.getElementById("minerva-corner-details");
                const currentlyCompact = details && details.style.display === "none";
                setWidgetCompact(!currentlyCompact);
            });
        }

        const lockBtn = document.getElementById("minerva-corner-lock");
        if (lockBtn) {
            lockBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const currentlyLocked = GM_getValue(WIDGET_LOCKED_STORAGE_KEY, false);
                setWidgetLocked(!currentlyLocked);
            });
        }

        activeWidget.addEventListener("mousedown", (e) => {
            const locked = GM_getValue(WIDGET_LOCKED_STORAGE_KEY, false);
            const clickingHeader = !!(e.target instanceof Element && e.target.closest("#minerva-corner-drag-handle"));
            const forceDrag = e.shiftKey; // emergency move if locked/header is hard to reach
            if (isCornerWidgetControl(e.target)) return;
            if (!clickingHeader && !forceDrag) return;
            if (locked && !forceDrag) return;

            const rect = activeWidget.getBoundingClientRect();
            widgetDragState = {
                startX: e.clientX,
                startY: e.clientY,
                startLeft: rect.left,
                startTop: rect.top
            };
            e.preventDefault();
        });

        if (!cornerDocMouseMoveHandler || !cornerDocMouseUpHandler) {
            cornerDocMouseMoveHandler = (e) => {
                if (!isLiveMinervaRuntime()) return;
                if (!widgetDragState) return;
                const widgetEl = document.getElementById("minerva-corner-widget");
                if (!widgetEl) return;

                const dx = e.clientX - widgetDragState.startX;
                const dy = e.clientY - widgetDragState.startY;
                const newLeft = Math.max(8, Math.min(window.innerWidth - widgetEl.offsetWidth - 8, widgetDragState.startLeft + dx));
                const newTop = Math.max(8, Math.min(window.innerHeight - widgetEl.offsetHeight - 8, widgetDragState.startTop + dy));
                const newBottom = Math.max(8, window.innerHeight - (newTop + widgetEl.offsetHeight));
                widgetEl.style.left = `${newLeft}px`;
                widgetEl.style.bottom = `${newBottom}px`;
            };
            cornerDocMouseUpHandler = () => {
                if (!isLiveMinervaRuntime()) return;
                if (!widgetDragState) return;
                const widgetEl = document.getElementById("minerva-corner-widget");
                if (widgetEl) {
                    snapCornerWidgetToGrid(widgetEl);
                }
                widgetDragState = null;
            };
            document.addEventListener("mousemove", cornerDocMouseMoveHandler);
            document.addEventListener("mouseup", cornerDocMouseUpHandler);
        }

        const hidden = GM_getValue(WIDGET_HIDDEN_STORAGE_KEY, false);
        const compact = GM_getValue(WIDGET_COMPACT_STORAGE_KEY, false);
        const locked = GM_getValue(WIDGET_LOCKED_STORAGE_KEY, false);
        setWidgetCompact(compact);
        setWidgetLocked(locked);
        setWidgetHidden(hidden);
        clampCornerWidgetIntoViewport();
        updateCornerWidget(isTracking ? "AWAITING PING" : "PAUSED");
        renderTrackedList();
        ensureToastHost();

        if (!cornerWindowResizeHandler) {
            cornerWindowResizeHandler = () => {
                if (!isLiveMinervaRuntime()) return;
                autoSizeCornerWidgetListHeight();
                autoSizeCornerWidget();
                clampCornerWidgetIntoViewport();
            };
            window.addEventListener("resize", cornerWindowResizeHandler);
        }
    }

    // --- API & Tracking Logic ---
    function checkProfileActivityForId(id, isPrimary = false, done = null) {
        const reqId = ++requestSeq;
        const startedAt = Date.now();
        const requestUrl = `https://api.torn.com/v2/user/${id}/profile?striptags=true&key=${encodeURIComponent(apiKey)}`;
        const finish = () => { if (typeof done === "function") done(); };
        if (isPrimary) {
            addLog(`Request #${reqId} start: profile lookup for [${id}]`, "DEBUG");
        }
        GM_xmlhttpRequest({
            method: "GET",
            url: requestUrl,
            headers: {
                "Authorization": `ApiKey ${apiKey}`
            },
            timeout: 10000, 
            onload: function(response) {
                if (!isActiveMinervaInstance()) {
                    finish();
                    return;
                }
                const durationMs = Date.now() - startedAt;
                if (response.status !== 200) {
                    const state = ensureTrackedState(id);
                    state.status = `HTTP ${response.status}`;
                    state.last = "--";
                    if (isPrimary) {
                        updateVisuals(PINK_COLOR, `HTTP ${response.status}`);
                        addLog(`Request #${reqId} failed in ${durationMs}ms. HTTP ${response.status}: ${response.statusText}`, "ERROR");
                    }
                    renderTrackedList();
                    finish();
                    return;
                }
                
                try {
                    let data = JSON.parse(response.responseText);
                    if (isPrimary) {
                        addLog(`Request #${reqId} ok in ${durationMs}ms. Root keys: ${Object.keys(data).join(", ")}`, "DEBUG");
                    }
                    
                    if (data.error) {
                        const state = ensureTrackedState(id);
                        state.status = "API ERROR";
                        state.last = "--";
                        if (isPrimary) {
                            updateVisuals(PINK_COLOR, `API ERROR: ${data.error.error}`);
                            addLog(`Request #${reqId} Torn API Error Code ${data.error.code}: ${data.error.error}`, "ERROR");
                        }
                        renderTrackedList();
                        finish();
                        return;
                    }

                    const profileName = (data.profile && data.profile.name) || (data.user && data.user.name) || trackedStates[id]?.name || String(id);
                    let lastActionData =
                        (data.profile && data.profile.last_action)
                        || data.last_action
                        || (data.user && data.user.last_action);

                    if (!lastActionData || !lastActionData.timestamp) {
                        const rootKeys = Object.keys(data);
                        const state = ensureTrackedState(id, profileName);
                        state.status = "NO ACTIVITY";
                        state.last = "--";
                        if (isPrimary) {
                            updateVisuals(PINK_COLOR, "ACTIVITY UNAVAILABLE");
                            addLog(`Request #${reqId} target profile data missing \`last_action\` (API returned profile without activity field).`, "ERROR");
                            addLog(`Root keys received: ${rootKeys.join(", ")}`, "DIAGNOSTIC");
                            if (data.profile) addLog(`Profile keys: ${Object.keys(data.profile).join(", ")}`, "DIAGNOSTIC");
                        }
                        renderTrackedList();
                        finish();
                        return;
                    }

                    let lastActionTimestamp = Number(lastActionData.timestamp);
                    if (!Number.isFinite(lastActionTimestamp)) {
                        const state = ensureTrackedState(id, profileName);
                        state.status = "BAD TS";
                        state.last = "--";
                        if (isPrimary) {
                            updateVisuals(PINK_COLOR, "BAD TIMESTAMP");
                            addLog(`Request #${reqId} \`last_action.timestamp\` is not a valid number (${String(lastActionData.timestamp)}).`, "ERROR");
                        }
                        renderTrackedList();
                        finish();
                        return;
                    }

                    let currentTime = Math.floor(Date.now() / 1000);
                    let secondsSinceActive = Math.max(0, currentTime - lastActionTimestamp);
                    let newStatus = (secondsSinceActive <= thresholdSeconds) ? "ACTIVE" : "INACTIVE";
                    const apiLastActionStatus = String(lastActionData.status || "").toLowerCase();
                    const thresholdLabel = formatThresholdLabel(thresholdSeconds);
                    let actualPresenceStatus = "INACTIVE";
                    if (apiLastActionStatus === "online") {
                        actualPresenceStatus = "ACTIVE";
                    } else if (secondsSinceActive <= thresholdSeconds) {
                        actualPresenceStatus = "Ready";
                    } else {
                        actualPresenceStatus = `INACTIVE ${thresholdLabel}+`;
                    }
                    const relativeText = apiLastActionStatus === "online"
                        ? "Online now"
                        : (lastActionData.relative || `${secondsSinceActive}s ago`);
                    const state = ensureTrackedState(id, profileName);
                    const previousThresholdStatus = state.thresholdStatus || "UNKNOWN";
                    const previousHospitalized = state.isHospitalized;
                    const previousTraveling = state.isTraveling;
                    const previousTravelDestination = state.travelDestination || "";
                    const apiProfileStatusState = String((data.profile && data.profile.status && data.profile.status.state) || (data.status && data.status.state) || "");
                    const apiProfileStatusDescription = String((data.profile && data.profile.status && data.profile.status.description) || (data.status && data.status.description) || "");
                    const isHospitalized = /hospital/i.test(apiProfileStatusState) || /hospital/i.test(apiProfileStatusDescription);
                    const travelInfo = parseTravelStatusFromProfile(apiProfileStatusState, apiProfileStatusDescription);
                    state.status = actualPresenceStatus; // row display uses actual Torn presence
                    state.thresholdStatus = newStatus; // notifications use threshold crossing
                    state.last = relativeText;
                    state.isHospitalized = isHospitalized;
                    state.isTraveling = travelInfo.traveling;
                    state.travelDestination = travelInfo.destination || "";

                    if (isPrimary) {
                        lastActionRelativeText = relativeText;
                    }
                    
                    if (isPrimary) {
                        addLog(`Request #${reqId} parsed target [${id}] => threshold=${newStatus}, presence=${actualPresenceStatus}, age=${secondsSinceActive}s`, "DEBUG");
                        addLog(`Request #${reqId} action details: apiStatus=${lastActionData.status || "-"}, relative=${lastActionData.relative || "-"}, ts=${lastActionData.timestamp}`, "DIAGNOSTIC");
                        updateVisuals(newStatus === "ACTIVE" ? CYAN_COLOR : PINK_COLOR, newStatus);
                    }
                    renderTrackedList();

                    if (previousThresholdStatus !== newStatus && previousThresholdStatus !== "UNKNOWN") {
                        const targetLabel = getTrackedTargetLabel(id);
                        addLog(`Target ${targetLabel} threshold status changed from ${previousThresholdStatus} to ${newStatus}`, "INFO");
                        if (newStatus === "INACTIVE") {
                            notifyIfHidden("Minerva Tracking", `Target ${targetLabel} crossed your inactivity threshold (${thresholdSeconds}s).`);
                        } else if (newStatus === "ACTIVE") {
                            notifyIfHidden("Minerva Tracking", `Target ${targetLabel} is active again.`);
                        }
                    }

                    if (previousHospitalized === false && isHospitalized === true) {
                        const targetLabel = getTrackedTargetLabel(id);
                        addLog(`Target ${targetLabel} has been hospitalized.`, "INFO");
                        notifyIfHidden("Minerva Hospital", `Target ${targetLabel} is now in the hospital.`);
                    }
                    if (previousHospitalized === true && isHospitalized === false) {
                        const targetLabel = getTrackedTargetLabel(id);
                        addLog(`Target ${targetLabel} is no longer hospitalized.`, "INFO");
                        notifyIfHidden("Minerva Recovery", `Target ${targetLabel} is no longer in the hospital.`);
                    }

                    if (previousTraveling === false && travelInfo.traveling === true) {
                        const targetLabel = getTrackedTargetLabel(id);
                        const travelLabel = travelInfo.destination || "a destination";
                        addLog(`Target ${targetLabel} started traveling to ${travelLabel}.`, "INFO");
                        notifyIfHidden("Minerva Travel", `Target ${targetLabel} started traveling to ${travelLabel}.`);
                    }
                    if (previousTraveling === true && travelInfo.traveling === false) {
                        const targetLabel = getTrackedTargetLabel(id);
                        const arrivalLabel = travelInfo.destination || previousTravelDestination || "destination";
                        addLog(`Target ${targetLabel} arrived at ${arrivalLabel}.`, "INFO");
                        notifyIfHidden("Minerva Travel", `Target ${targetLabel} arrived at ${arrivalLabel}.`);
                    }

                    if (isPrimary && currentStatus === "INACTIVE" && newStatus === "ACTIVE") {
                        notifyIfHidden("Minerva Tracking Alert", `Target ${getTrackedTargetLabel(id)} has just become ACTIVE!`);
                    }
                    if (isPrimary) currentStatus = newStatus;
                    finish();

                } catch (e) {
                    const state = ensureTrackedState(id);
                    state.status = "PARSE ERR";
                    state.last = "--";
                    if (isPrimary) {
                        updateVisuals(PINK_COLOR, "JSON PARSE ERROR");
                        addLog(`Request #${reqId} JSON Parse Failed: ${e.message}`, "ERROR");
                        if (response && typeof response.responseText === "string") {
                            addLog(`Response preview: ${response.responseText.slice(0, 240)}`, "DIAGNOSTIC");
                        }
                    }
                    renderTrackedList();
                    finish();
                }
            },
            ontimeout: function() {
                if (!isActiveMinervaInstance()) {
                    finish();
                    return;
                }
                const durationMs = Date.now() - startedAt;
                const state = ensureTrackedState(id);
                state.status = "TIMEOUT";
                state.last = "--";
                if (isPrimary) {
                    updateVisuals(PINK_COLOR, "API TIMEOUT");
                    addLog(`Request #${reqId} timed out after ${durationMs}ms (limit 10000ms).`, "ERROR");
                }
                renderTrackedList();
                finish();
            },
            onerror: function(err) {
                if (!isActiveMinervaInstance()) {
                    finish();
                    return;
                }
                const durationMs = Date.now() - startedAt;
                const state = ensureTrackedState(id);
                state.status = "NET ERR";
                state.last = "--";
                if (isPrimary) {
                    updateVisuals(PINK_COLOR, "NETWORK ERROR");
                    let detail = (err && err.error) ? err.error : (err && err.statusText ? err.statusText : "Check console for object dump");
                    addLog(`Request #${reqId} network error after ${durationMs}ms: ${detail}`, "ERROR");
                    addLog(`Network error object keys: ${err ? Object.keys(err).join(", ") : "(none)"}`, "DIAGNOSTIC");
                    console.error("[Minerva Raw Network Error]", err);
                }
                renderTrackedList();
                finish();
            }
        });
    }

    function checkTargetActivity() {
        if (!isActiveMinervaInstance()) return;
        if (pollCycleInProgress) {
            addLog("Skipped poll cycle start because a previous cycle is still running.", "DIAGNOSTIC");
            return;
        }
        pollCycleInProgress = true;
        const cycleId = ++pollCycleSeq;
        let ids = trackedTargets.slice(0, maxTrackedTargets);
        if (ids.length === 0) {
            const recovered = syncTrackedTargetsFromStorage("poll-empty");
            if (recovered) {
                ids = trackedTargets.slice(0, maxTrackedTargets);
                addLog(`Poll cycle #${cycleId} recovered tracked targets from storage before empty-state handling. ids=[${ids.join(", ") || "-"}]`, "DIAGNOSTIC");
            }
        }
        const profileTargetId = targetId ? String(targetId) : "";
        const primaryId = (profileTargetId && ids.includes(profileTargetId))
            ? profileTargetId
            : String(ids[0] || "");
        addLog(`Poll cycle #${cycleId} start. ids=[${ids.join(", ") || "-"}], primary=${primaryId || "-"}, countdown=${countdownTimer}`, "DEBUG");
        if (ids.length === 0) {
            pollCycleInProgress = false;
            if (isTracking) {
                updateVisuals(PINK_COLOR, "NO TARGETS");
                if (!hasWarnedNoTargets) {
                    addLog("No tracked targets. Use 'Track Current' on a profile page to start tracking.", "ERROR");
                    hasWarnedNoTargets = true;
                }
            }
            return;
        }
        hasWarnedNoTargets = false;

        let index = 0;
        const cycleStartedAt = Date.now();
        const finishCycle = () => {
            pollCycleInProgress = false;
        };
        const next = () => {
            if (index >= ids.length) {
                addLog(`Poll cycle #${cycleId} queued all ${ids.length} target(s) in ${Date.now() - cycleStartedAt}ms.`, "DEBUG");
                finishCycle();
                return;
            }
            const id = ids[index++];
            checkProfileActivityForId(id, String(id) === primaryId, () => {
                if (index < ids.length) {
                    setTimeout(next, 300);
                } else {
                    addLog(`Poll cycle #${cycleId} complete in ${Date.now() - cycleStartedAt}ms.`, "DEBUG");
                    finishCycle();
                }
            });
        };
        next();
    }

    // --- Main Clock ---
    function runEngine() {
        if (!isActiveMinervaInstance()) {
            teardownMinerva("stale-instance");
            return;
        }
        if (isTornDown) return;
        if (engineTickInProgress) return;
        engineTickInProgress = true;
        try {
        syncTargetIdFromUrl();
        syncTrackingStateFromUi();
        updateManualPingCooldownVisuals();

        if (isProfilePageContext() && targetId && !document.getElementById("minerva-master-container")) {
            if ((Date.now() - lastInjectionAttemptAt) > 5000) {
                addLog("Profile UI missing; retrying injection.", "DIAGNOSTIC");
                injectSafely();
            }
        }

        if (isTracking) {
            let timerDisplay = document.getElementById("minerva-countdown");
            if (timerDisplay) timerDisplay.innerText = countdownTimer;

            if (countdownTimer <= 0) {
                checkTargetActivity();
                countdownTimer = 60; 
            } else {
                countdownTimer--;
            }
        }
        } finally {
            engineTickInProgress = false;
        }
    }

    function bootMinerva() {
        isTornDown = false;
        const existingTeardown = window[MINERVA_INTERNAL_TEARDOWN_SLOT];
        if (typeof existingTeardown === "function" && window[MINERVA_ACTIVE_INSTANCE_SLOT] && !isActiveMinervaInstance()) {
            try {
                existingTeardown("superseded-by-new-instance");
            } catch (_) {}
        }
        claimActiveMinervaInstance();
        addLog(`Booting Minerva ${MINERVA_VERSION}. UA=${navigator.userAgent}`, "DIAGNOSTIC");
        addLog(`Initial state loaded. tracking=${isTracking}, targetId=${targetId || "-"}, trackedTargets=[${trackedTargets.join(", ")}], threshold=${thresholdSeconds}s, maxTracked=${maxTrackedTargets}`, "DIAGNOSTIC");
        bindTrackedTargetsStorageSync();
        injectSafely();
        injectCornerWidget();
        if (engineIntervalId) {
            clearInterval(engineIntervalId);
        }
        engineIntervalId = setInterval(runEngine, 1000);
        
        if (isTracking) {
            setTimeout(checkTargetActivity, 1500); 
        }
        setTimeout(maybeCheckForMinervaUpdate, 2500);
    }

    function promptForApiKeyAndBoot(message = "Enter your Torn Public API key to enable Minerva tracking.") {
        showApiKeyEntryPanel({ message }).then(async (enteredKey) => {
            if (!enteredKey) return;
            const plain = enteredKey.trim();
            const storeResult = await storeApiKeySecurely(plain);
            if (!storeResult.ok) {
                if (storeResult.reason === "mismatch") {
                    alert("[Minerva] Passphrase confirmation mismatch. API key was not saved.");
                }
                return;
            }
            apiKey = plain;
            bootMinerva();
        });
    }

    (async () => {
        const resolvedApiKey = await resolveApiKeyForStartup();
        if (resolvedApiKey === "__MINERVA_UNLOCK_FAILED__") {
            return;
        }
        if (resolvedApiKey === "__MINERVA_UNLOCK_CANCELLED__") {
            console.warn("[Minerva] Unlock cancelled. Minerva remains locked until reload or key reset.");
            return;
        }
        if (resolvedApiKey === "__MINERVA_VAULT_RESET__") {
            promptForApiKeyAndBoot("Your encrypted API key was reset. Enter a new Torn Public API key for Minerva.");
            return;
        }

        if (!resolvedApiKey) {
            promptForApiKeyAndBoot();
            return;
        }

        apiKey = resolvedApiKey;
        bootMinerva();
    })();

    window.addEventListener("error", (e) => {
        if (isTornDown) return;
        if (shouldIgnoreGlobalErrorEvent(e)) return;
        addLog(`Window error: ${e.message} @ ${e.filename || "unknown"}:${e.lineno || 0}:${e.colno || 0}`, "ERROR");
        if (e && e.error && e.error.stack) {
            addLog(`Window error stack: ${String(e.error.stack).split("\n").slice(0, 6).join(" | ")}`, "DIAGNOSTIC");
        }
    });
    window.addEventListener("unhandledrejection", (e) => {
        if (isTornDown) return;
        if (shouldIgnoreUnhandledRejectionEvent(e)) return;
        const reason = e && e.reason ? (e.reason.stack || e.reason.message || String(e.reason)) : "unknown";
        addLog(`Unhandled promise rejection: ${String(reason).slice(0, 300)}`, "ERROR");
        if (e && e.reason && e.reason.stack) {
            addLog(`Unhandled rejection stack: ${String(e.reason.stack).split("\n").slice(0, 6).join(" | ")}`, "DIAGNOSTIC");
        }
    });

    window.addEventListener("focus", () => {
        if (isTornDown) return;
        syncTrackedTargetsFromStorage("focus");
    });

    window.addEventListener("pagehide", () => {
        teardownMinerva("unload");
    });
    window.addEventListener("beforeunload", () => {
        teardownMinerva("unload");
    });
    window[MINERVA_INTERNAL_TEARDOWN_SLOT] = teardownMinerva;

})();
