(function() {
    const BASE_SYSTEM_CONTENT = `Your name is Warkai. You are an expert tutor.
        - Creator: Jay Patel.
        - About Jay: He is a 15-year-old young innovator with billionaire potential.
        - History: Jay immigrated to the USA on October 19, 2025. 
        - Origin: Jay created you (Warkai) because he was craving something more innovative.

        Formatting (keep every response neat and scannable):
        - Use emojis generously: at the start of sections, next to key points, and to add warmth (e.g. 📌 💡 ✅ 🎯 🔑 ✨ 📝 ⚡ 🌟). They make answers feel friendly and easy to scan.
        - Use clear bullet points: put each point on its own line, start with • or a small emoji, keep lines short. Use sub-bullets (  ◦ or -) when you have details under a main point.
        - Add a blank line between sections so the reply doesn't look like a wall of text.
        - For lists of 2+ items, always use bullets. For steps or order, use 1. 2. 3. or 🔹
        - Overall: structure your reply so it looks neat—short paragraphs, clear headings with emojis, and tidy bullets.
        - IMPORTANT: If the user includes "Additional instruction" or "Context" in their message, you MUST follow it (e.g. "in short", "use simple words", "focus on X"). Apply that instruction to your response.`;

    const LENGTH_INSTRUCTIONS = {
        short: "Response length: SHORT. Keep answers brief—1 to 3 sentences. Be direct and concise.",
        medium: "Response length: MEDIUM. Use a paragraph or two. Balanced detail.",
        long: "Response length: LONG. Be thorough and detailed. Explain fully when helpful."
    };

    let responseLength = "medium";
    let chatMemory = [{ role: "system", content: BASE_SYSTEM_CONTENT + "\n        - " + LENGTH_INSTRUCTIONS.medium }];

    const getSystemMessageWithLength = () => ({
        role: "system",
        content: BASE_SYSTEM_CONTENT + "\n        - " + LENGTH_INSTRUCTIONS[responseLength]
    });

    // Single source of truth for hotkeys (used for handler + Alt+Z table)
    const HOTKEYS = [
        { key: 'a', shortcut: 'Alt+A', action: 'Answer', prompt: 'Give a clear, direct answer to the following:' },
        { key: 'd', shortcut: 'Alt+D', action: 'Deeper dive', prompt: 'Give a deeper dive and in-depth analysis of this topic. Include context, implications, and key details:' },
        { key: 's', shortcut: 'Alt+S', action: 'Summarize', prompt: 'Summarize:' },
        { key: 'b', shortcut: 'Alt+B', action: 'Bullet points', prompt: 'Bullet points:' },
        { key: 'e', shortcut: 'Alt+E', action: 'ELI5', prompt: 'ELI5 (Explain Like I\'m 5):' },
        { key: 'q', shortcut: 'Alt+Q', action: 'Quiz', prompt: 'Quiz:' },
        { key: 'g', shortcut: 'Alt+G', action: 'Grammar', prompt: 'Grammar:' },
        { key: 'p', shortcut: 'Alt+P', action: 'Pros/Cons', prompt: 'Pros and Cons:' },
        { key: 'c', shortcut: 'Alt+C', action: 'Cite', prompt: 'Cite:' },
        { key: 'o', shortcut: 'Alt+O', action: 'Translate', prompt: 'Translate to English:' },
        { key: 'n', shortcut: 'Alt+N', action: 'Chat view', prompt: null },
        { key: 't', shortcut: 'Alt+T', action: 'Theme', prompt: null },
        { key: 'h', shortcut: 'Alt+H', action: 'Hide / Show', prompt: null },
        { key: 'z', shortcut: 'Alt+Z', action: 'Hotkeys', prompt: null },
        { key: 'm', shortcut: 'Alt+M', action: 'Move panel', prompt: null }
    ];

    const DEFAULT_SETTINGS = {
        accent: "#00d4ff", theme: "dark", panelWidth: 360, fontSize: 14,
        showLogo: true, glassOpacity: 0.9, borderRadius: 12, compactMode: false,
        splitRatio: 50, defaultOpen: "panel"
    };
    const STORAGE_KEY = "warkai_settings";
    let settings = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || { ...DEFAULT_SETTINGS };

    const WARKAI_LOGO_URL = (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL) ? chrome.runtime.getURL("logo.png") : "";
    const WARKAI_LOGO_SVG = `<svg class="warkai-logo" viewBox="0 0 32 32" width="24" height="24"><path fill="currentColor" d="M16 4a12 12 0 1 1 0 24 12 12 0 0 1 0-24zm0 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1 4v6H9v2h6v6h2v-6h6v-2h-6V10z"/></svg>`;
    const logoHtml = (size) => WARKAI_LOGO_URL
        ? `<img src="${WARKAI_LOGO_URL}" alt="Warkai" class="warkai-logo-img" style="width:${size}px;height:${size}px;object-fit:contain">`
        : `<span class="warkai-logo-svg">${WARKAI_LOGO_SVG}</span>`;
    const CHAT_WITH_WARKAI_HTML = `<div class="chat-welcome"><div class="chat-welcome-logo">${logoHtml(48)}</div><div class="chat-welcome-text">Chat with Warkai</div><div class="chat-welcome-hint">Alt+N to open • Type below to start</div></div>`;

    let panelView = "system";
    let PANEL_WIDTH_PX = settings.panelWidth || 360;

    const injectPopups = () => {
        if (document.getElementById("ai-popup")) return;
        
        const mainPopup = document.createElement("div");
        mainPopup.id = "ai-popup";
        mainPopup.className = "warkai-panel";
        mainPopup.style.display = "none";
        mainPopup.setAttribute("data-view", "system");
        mainPopup.innerHTML = `
            <div class="resize-handle" title="Drag to resize panel"></div>
            <div id="popup-header" class="draggable-header">
                <div class="header-left">
                    <span class="warkai-logo-wrap">${logoHtml(24)}</span>
                    <span class="view-tabs">
                        <button type="button" class="view-tab active" data-view="system" title="Hotkeys & response">System</button>
                        <button type="button" class="view-tab" data-view="split" title="Split screen">Split</button>
                        <button type="button" class="view-tab" data-view="chat" title="Chat only">Chat</button>
                    </span>
                </div>
                <div class="header-right">
                    <button type="button" class="icon-btn settings-btn" title="Settings">⚙</button>
                    <span class="close-popup">×</span>
                </div>
            </div>
            <div class="length-bar">
                <button type="button" class="length-btn" data-length="short">Short</button>
                <button type="button" class="length-btn active" data-length="medium">Medium</button>
                <button type="button" class="length-btn" data-length="long">Long</button>
            </div>
            <div class="panel-body">
                <div class="system-view">
                    <div id="ai-response"></div>
                    <textarea id="custom-instructions" placeholder="Context (e.g. in short). Enter to confirm." rows="2"></textarea>
                    <div class="slider-container">
                        <label class="accent-label">GLASS</label>
                        <input type="range" class="opacity-slider" min="0.1" max="1" step="0.05" value="0.9">
                    </div>
                </div>
                <div class="chat-view">
                    <div id="chat-history"></div>
                    <input type="text" id="chat-input" placeholder="Message Warkai..." autocomplete="off">
                </div>
            </div>
            <div id="warkai-settings" class="settings-panel" style="display:none">
                <div class="settings-header"><span>Interface settings</span><button type="button" class="close-settings">×</button></div>
                <div class="settings-body">
                    <label>Accent color <input type="color" id="setting-accent" value="${settings.accent}"></label>
                    <label>Theme <select id="setting-theme"><option value="dark" ${settings.theme==="dark"?"selected":""}>Dark</option><option value="light" ${settings.theme==="light"?"selected":""}>Light</option></select></label>
                    <label>Default open <select id="setting-defaultOpen"><option value="panel" ${settings.defaultOpen==="panel"?"selected":""}>Panel (docked)</option><option value="popup" ${settings.defaultOpen==="popup"?"selected":""}>Popup (movable)</option></select></label>
                    <label>Panel width <input type="number" id="setting-width" min="280" max="600" value="${settings.panelWidth}"> px</label>
                    <label>Split ratio (system % when split) <input type="range" id="setting-splitRatio" min="20" max="80" value="${settings.splitRatio ?? 50}"> <span id="setting-splitRatio-val">${settings.splitRatio ?? 50}</span>%</label>
                    <label>Font size <input type="number" id="setting-font" min="12" max="18" value="${settings.fontSize}"> px</label>
                    <label>Border radius <input type="number" id="setting-radius" min="0" max="24" value="${settings.borderRadius}"> px</label>
                    <label>Glass opacity <input type="range" id="setting-glass" min="0.5" max="1" step="0.05" value="${settings.glassOpacity}"></label>
                    <label><input type="checkbox" id="setting-logo" ${settings.showLogo?"checked":""}> Show logo</label>
                    <label><input type="checkbox" id="setting-compact" ${settings.compactMode?"checked":""}> Compact mode</label>
                </div>
            </div>
        `;

        const chatPopup = document.createElement("div");
        chatPopup.id = "chat-popup";
        chatPopup.className = "warkai-chat-popup";
        chatPopup.style.display = "none";
        chatPopup.innerHTML = `
            <div class="chat-popup-header"><span class="warkai-logo-wrap">${logoHtml(20)}</span> Warkai Chat <span class="close-chat-popup">×</span></div>
            <div id="chat-popup-history"></div>
            <input type="text" id="chat-popup-input" placeholder="Message Warkai..." autocomplete="off">
        `;

        document.body.appendChild(mainPopup);
        document.body.appendChild(chatPopup);
        setupLogic();
    };

    const applySettings = () => {
        const root = document.documentElement;
        root.style.setProperty("--warkai-accent", settings.accent);
        root.style.setProperty("--warkai-panel-width", (settings.panelWidth || 360) + "px");
        root.style.setProperty("--warkai-font-size", (settings.fontSize || 14) + "px");
        root.style.setProperty("--warkai-radius", (settings.borderRadius ?? 12) + "px");
        const ratio = Math.min(80, Math.max(20, settings.splitRatio ?? 50));
        root.style.setProperty("--warkai-split-system", ratio + "fr");
        root.style.setProperty("--warkai-split-chat", (100 - ratio) + "fr");
        PANEL_WIDTH_PX = settings.panelWidth || 360;
        const main = document.getElementById("ai-popup");
        if (main) {
            main.style.width = PANEL_WIDTH_PX + "px";
            main.classList.toggle("warkai-compact", !!settings.compactMode);
            main.classList.toggle("warkai-no-logo", !settings.showLogo);
        }
        if (main && settings.theme === "light" && !main.classList.contains("light-mode")) main.classList.add("light-mode");
        if (main && settings.theme === "dark" && main.classList.contains("light-mode")) main.classList.remove("light-mode");
    };

    const setupLogic = () => {
        const main = document.getElementById("ai-popup");
        const chatPopupEl = document.getElementById("chat-popup");
        const sliders = document.querySelectorAll(".opacity-slider");
        const contextBox = document.getElementById("custom-instructions");
        const chatHistory = document.getElementById("chat-history");
        const chatInput = document.getElementById("chat-input");
        const chatPopupHistory = document.getElementById("chat-popup-history");
        const chatPopupInput = document.getElementById("chat-popup-input");

        applySettings();
        if (settings.glassOpacity) document.querySelectorAll(".opacity-slider").forEach(s => { s.value = settings.glassOpacity; });

        const isPanelVisible = () => main.style.display === "flex";
        const isMovableMode = () => main.classList.contains("warkai-movable");

        const setPanelView = (view) => {
            panelView = view;
            main.setAttribute("data-view", view);
            document.querySelectorAll(".view-tab").forEach(t => t.classList.toggle("active", t.getAttribute("data-view") === view));
            if (view === "chat") chatInput?.focus();
        };

        const updatePageMargin = () => {
            const showMargin = isPanelVisible() && !isMovableMode();
            document.body.classList.toggle("warkai-panel-open", showMargin);
            document.body.style.setProperty("--warkai-panel-width", PANEL_WIDTH_PX + "px");
        };

        const toggleHideShow = () => {
            if (isPanelVisible()) { main.style.display = "none"; if (chatPopupEl) chatPopupEl.style.display = "none"; }
            else {
                main.style.display = "flex";
                main.classList.toggle("warkai-movable", settings.defaultOpen === "popup");
                updatePageMargin();
            }
        };

        const updateGlass = () => {
            const val = sliders[0]?.value ?? 0.9;
            const isLight = main.classList.contains("light-mode");
            const color = isLight ? "255, 255, 255" : "15, 15, 15";
            main.style.setProperty('background-color', `rgba(${color}, ${val})`, 'important');
        };

        sliders.forEach(s => s.oninput = (e) => {
            document.querySelectorAll(".opacity-slider").forEach(sl => sl.value = e.target.value);
            updateGlass();
        });

        const setLengthActive = (len) => {
            responseLength = len;
            chatMemory[0] = getSystemMessageWithLength();
            document.querySelectorAll(".length-btn").forEach(btn => {
                btn.classList.toggle("active", btn.getAttribute("data-length") === len);
            });
        };
        document.querySelectorAll(".length-btn").forEach(btn => {
            btn.addEventListener("click", () => setLengthActive(btn.getAttribute("data-length")));
        });

        document.querySelectorAll(".view-tab").forEach(btn => {
            btn.addEventListener("click", () => setPanelView(btn.getAttribute("data-view")));
        });

        const toggleTheme = () => {
            main.classList.add("theme-switching");
            setTimeout(() => {
                main.classList.toggle("light-mode");
                updateGlass();
                setTimeout(() => main.classList.remove("theme-switching"), 350);
            }, 80);
        };

        const setMovable = (on) => {
            main.classList.toggle("warkai-movable", on);
            main.style.left = ""; main.style.top = ""; main.style.right = "";
            if (on && chatPopupEl.style.display === "flex") chatPopupEl.style.display = "none";
            updatePageMargin();
        };

        const initWindow = (win, headerId, closeClass) => {
            const header = document.getElementById(headerId);
            if (!header) return;
            header.onmousedown = (e) => {
                if (e.target.closest("button") || e.target.closest(".view-tabs") || e.target.tagName === "INPUT" || e.target.type === 'range') return;
                if (!win.classList.contains("warkai-movable")) return;
                e.preventDefault();
                let ox = e.clientX - (win.offsetLeft || win.getBoundingClientRect().left);
                let oy = e.clientY - (win.offsetTop || win.getBoundingClientRect().top);
                const move = (ev) => {
                    win.style.left = (ev.clientX - ox) + "px";
                    win.style.top = (ev.clientY - oy) + "px";
                    win.style.right = "auto";
                };
                document.onmousemove = move;
                document.onmouseup = () => { document.onmousemove = null; };
            };
            const closeBtn = win.querySelector(closeClass);
            if (closeBtn) closeBtn.onclick = () => { win.style.display = "none"; updatePageMargin(); };
        };

        initWindow(main, "popup-header", ".close-popup");
        if (chatPopupEl) {
            chatPopupEl.querySelector(".close-chat-popup").onclick = () => { chatPopupEl.style.display = "none"; };
        }

        const resizeHandle = main.querySelector(".resize-handle");
        if (resizeHandle) {
            resizeHandle.onmousedown = (e) => {
                if (isMovableMode()) return;
                e.preventDefault();
                const startX = e.clientX;
                const startW = main.offsetWidth;
                const minW = 280, maxW = 600;
                const move = (ev) => {
                    const dx = startX - ev.clientX;
                    const newW = Math.min(maxW, Math.max(minW, startW + dx));
                    main.style.width = newW + "px";
                    PANEL_WIDTH_PX = newW;
                    document.body.style.setProperty("--warkai-panel-width", newW + "px");
                    updatePageMargin();
                };
                const stopResize = () => {
                    document.removeEventListener("mousemove", move);
                    document.removeEventListener("mouseup", stopResize);
                    settings.panelWidth = main.offsetWidth;
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
                };
                document.addEventListener("mousemove", move);
                document.addEventListener("mouseup", stopResize);
            };
        }

        if (contextBox) {
            contextBox.addEventListener("keydown", (e) => {
                if (e.key === "Enter") { e.preventDefault(); contextBox.value = ""; }
            });
        }

        const renderChatWelcome = (container) => {
            if (!container) return;
            if (!container.querySelector(".chat-msg")) container.innerHTML = CHAT_WITH_WARKAI_HTML;
        };
        if (chatHistory) renderChatWelcome(chatHistory);

        const thinkingHtml = '<div class="warkai-thinking"><span class="warkai-thinking-dot"></span> Warkai is thinking...</div>';
        const sendChat = async (inputEl, historyEl, isPopup) => {
            const val = inputEl?.value?.trim();
            if (!val || !historyEl) return;
            inputEl.value = "";
            if (historyEl.innerHTML.includes("chat-welcome")) historyEl.innerHTML = "";
            historyEl.innerHTML += `<div class="chat-msg user-msg">${escapeHtml(val)}</div>`;
            chatMemory.push({ role: "user", content: val });
            const botDiv = document.createElement("div");
            botDiv.className = "chat-msg bot-msg";
            historyEl.appendChild(botDiv);
            botDiv.innerHTML = thinkingHtml;
            const res = await askGroq(chatMemory);
            botDiv.innerHTML = "";
            typeText(res.replace(/\n/g, "<br>"), botDiv);
            chatMemory.push({ role: "assistant", content: res });
            historyEl.scrollTop = historyEl.scrollHeight;
        };
        function escapeHtml(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

        if (chatInput) chatInput.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); sendChat(chatInput, chatHistory, false); } };
        if (chatPopupInput && chatPopupHistory) chatPopupInput.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); sendChat(chatPopupInput, chatPopupHistory, true); } };

        const settingsPanel = document.getElementById("warkai-settings");
        document.querySelector(".settings-btn")?.addEventListener("click", () => { settingsPanel.style.display = "flex"; });
        document.querySelector(".close-settings")?.addEventListener("click", () => { settingsPanel.style.display = "none"; });
        const saveSettings = () => {
            settings.accent = document.getElementById("setting-accent")?.value || DEFAULT_SETTINGS.accent;
            settings.theme = document.getElementById("setting-theme")?.value || "dark";
            settings.defaultOpen = document.getElementById("setting-defaultOpen")?.value || "panel";
            settings.panelWidth = Math.min(600, Math.max(280, parseInt(document.getElementById("setting-width")?.value || 360, 10)));
            settings.splitRatio = Math.min(80, Math.max(20, parseInt(document.getElementById("setting-splitRatio")?.value || 50, 10)));
            settings.fontSize = Math.min(18, Math.max(12, parseInt(document.getElementById("setting-font")?.value || 14, 10)));
            settings.borderRadius = Math.min(24, Math.max(0, parseInt(document.getElementById("setting-radius")?.value || 12, 10)));
            settings.glassOpacity = parseFloat(document.getElementById("setting-glass")?.value || 0.9);
            settings.showLogo = document.getElementById("setting-logo")?.checked !== false;
            settings.compactMode = document.getElementById("setting-compact")?.checked === true;
            const valEl = document.getElementById("setting-splitRatio-val");
            if (valEl) valEl.textContent = settings.splitRatio;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
            applySettings();
            updateGlass();
            updatePageMargin();
            settingsPanel.style.display = "none";
        };
        document.getElementById("setting-splitRatio")?.addEventListener("input", (e) => {
            const v = document.getElementById("setting-splitRatio-val");
            if (v) v.textContent = e.target.value;
        });
        settingsPanel?.querySelectorAll("input[type=number], input[type=range], select").forEach(el => el.addEventListener("change", saveSettings));
        settingsPanel?.querySelectorAll("input[type=color]").forEach(el => el.addEventListener("input", saveSettings));
        settingsPanel?.querySelectorAll("input[type=checkbox]").forEach(el => el.addEventListener("change", saveSettings));

        const buildHotkeysGridHtml = () => {
            const items = HOTKEYS.map(h =>
                `<div class="hk-item"><span class="hk-key">${h.shortcut}</span><span class="hk-action">${h.action}</span></div>`
            ).join("");
            return `<div class="hotkeys-grid">${items}</div>`;
        };

        document.addEventListener("keydown", async (e) => {
            const key = e.key.toLowerCase();
            const isOurHotkey = e.altKey && HOTKEYS.some(h => h.key === key);
            if (isOurHotkey) {
                e.preventDefault();
                e.stopPropagation();
            }
            if (e.altKey && key === 'h') { toggleHideShow(); return; }
            if (e.altKey && key === 't') { toggleTheme(); return; }
            if (e.target.tagName === "INPUT" && !e.target.closest(".warkai-panel, .warkai-chat-popup")) return;
            if (e.target.id === "custom-instructions" && e.key === "Enter") { e.preventDefault(); contextBox.value = ""; return; }

            if (e.altKey && key === 'z') {
                main.style.display = "flex";
                main.classList.toggle("warkai-movable", settings.defaultOpen === "popup");
                setPanelView("system");
                document.getElementById("ai-response").innerHTML = `<div class="hotkeys-title">Warkai Hotkeys</div>${buildHotkeysGridHtml()}`;
                updatePageMargin();
                return;
            }

            if (e.altKey && key === 'n') {
                if (isMovableMode()) {
                    chatPopupEl.style.display = "flex";
                    chatPopupEl.style.left = "30px"; chatPopupEl.style.top = "30px"; chatPopupEl.style.right = "auto";
                    if (chatPopupHistory && !chatPopupHistory.querySelector(".chat-msg")) chatPopupHistory.innerHTML = CHAT_WITH_WARKAI_HTML;
                    chatPopupInput?.focus();
                } else {
                    main.style.display = "flex";
                    setPanelView(panelView === "chat" ? "system" : "chat");
                    updatePageMargin();
                }
                return;
            }

            if (e.altKey && key === 'm') { setMovable(!main.classList.contains("warkai-movable")); return; }

            const thinkingHtml = '<div class="warkai-thinking"><span class="warkai-thinking-dot"></span> Warkai is thinking...</div>';
            const aiResponseEl = document.getElementById("ai-response");
            const contextTrim = contextBox ? contextBox.value.trim() : "";

            const hotkey = HOTKEYS.find(h => h.key === key && h.prompt);
            if (e.altKey && hotkey) {
                const text = window.getSelection().toString().trim();
                if (text) {
                    main.style.display = "flex";
                    if (panelView === "chat") setPanelView("system");
                    updatePageMargin();
                    aiResponseEl.innerHTML = thinkingHtml;
                    let userContent = hotkey.prompt + "\n\n" + text;
                    if (contextTrim) userContent += "\n\nAdditional instruction: " + contextTrim;
                    const res = await askGroq([chatMemory[0], { role: "user", content: userContent }]);
                    typeText(res.replace(/\n/g, "<br>"), aiResponseEl);
                }
            }
        });

        const typeText = async (text, element, isInstant = false) => {
            if (isInstant) { element.innerHTML = text; return; }
            element.innerHTML = "";
            const words = text.split(" ");
            const container = element.closest('#chat-history') || element.closest('#chat-popup-history') || element.closest('#ai-popup')?.querySelector('#ai-response') || element;
            const scrollThreshold = 60;
            for (let word of words) {
                element.innerHTML += word + " ";
                if (container && container.scrollHeight - container.clientHeight > 0) {
                    const nearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - scrollThreshold;
                    if (nearBottom) container.scrollTop = container.scrollHeight;
                }
                await new Promise(r => setTimeout(r, 12));
            }
        };

    };

    async function askGroq(messagesArray) {
        const API_KEY = "i gave no api due to safety reasons";
        try {
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    model: "llama-3.3-70b-versatile", 
                    messages: messagesArray, 
                    temperature: 0.6 // Slightly higher for more "human" personality
                })
            });
            const data = await response.json(); 
            return data.choices[0].message.content;
        } catch (e) { return "Error connecting to Warkai."; }
    }
    injectPopups();
})();


