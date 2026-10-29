var settings = {};

initPopup();

const refreshableSettings = [
    "blurImages",
    "blurVideos",
    "blurMale",
    "blurFemale",
    "unblurImages",
    "unblurVideos",
    "blurryStartMode",
    "strictness",
    "whitelist",
];

const allSettings = ["blurAmount", "gray", ...refreshableSettings];

var currentWebsite, refreshMessage;

const initCalls = () => {
    const browserLang = navigator.language?.split("-")[0] ?? "en";
    changeLanguage(settings.language ?? browserLang, settings);
    addListeners();
    displaySettings(settings);
};

function initPopup() {
    loadLocalSettings()
        .then(() => getCurrentWebsite())
        .then(() => {
            if (document.readyState !== "loading") {
                initCalls();
            } else {
                document.addEventListener("DOMContentLoaded", initCalls);
            }
        });
}

function getCurrentWebsite() {
    return new Promise(function (resolve) {
        chrome.tabs?.query(
            { active: true, currentWindow: true },
            function (tabs) {
                if (!tabs?.[0]?.id) {
                    resolve();
                    return;
                }
                chrome.tabs.sendMessage(
                    tabs[0].id,
                    { type: "getCurrentWebsite" },
                    function (response) {
                        // Internal Chrome pages do not have a content script.
                        void chrome.runtime.lastError;
                        currentWebsite =
                            response?.currentWebsite?.split("www.")?.[1] ??
                            response?.currentWebsite ??
                            null;
                        resolve();
                    }
                );
            }
        );
    });
}

function loadLocalSettings() {
    return new Promise(function (resolve) {
        chrome.storage.sync.get(["hb-settings"], function (storage) {
            settings = storage["hb-settings"] ?? {};
            settings.whitelist ??= [];
            resolve();
        });
    });
}

function toggleAllInputs() {
    updateProtectionStatus();
    allSettings.forEach(function (setting) {
        document.querySelector("input[name=" + setting + "]").disabled =
            !settings.status;
    });
}

function displaySettings(settings) {
    document.querySelector("input[name=status]").checked = settings.status;
    document.querySelector("input[name=blurryStartMode]").checked =
        settings.blurryStartMode;
    document.querySelector("input[name=blurAmount]").value =
        settings.blurAmount;
    document.getElementById("blur-amount-value").innerHTML =
        `${settings.blurAmount}%`;
    document.querySelector("input[name=gray]").checked = settings.gray ?? true;
    document.querySelector("input[name=strictness]").value =
        +settings.strictness;
    document.querySelector("span[id=strictness-value]").innerHTML =
        +settings.strictness * 100 + "%";
    document.querySelector("input[name=blurImages]").checked =
        settings.blurImages;
    document.querySelector("input[name=blurVideos]").checked =
        settings.blurVideos;
    document.querySelector("input[name=blurMale]").checked = settings.blurMale;
    document.querySelector("input[name=blurFemale]").checked =
        settings.blurFemale;
    document.querySelector("input[name=unblurImages]").checked =
        settings.unblurImages;
    document.querySelector("input[name=unblurVideos]").checked =
        settings.unblurVideos;
    document.getElementById("language").value = settings.language;
    displayWhiteList();
    document.querySelectorAll(".form-range").forEach(updateRangeDisplay);
    toggleAllInputs();
}

/* addListeners - (1) Listen for changes to popup modal inputs (2) route to appropriate function  */
function addListeners() {
    document
        .querySelector("input[name=status]")
        .addEventListener("change", updateStatus);
    document
        .querySelector("input[name=blurryStartMode]")
        .addEventListener("change", updateCheckbox("blurryStartMode"));
    document
        .querySelector("input[name=blurImages]")
        .addEventListener("change", updateCheckbox("blurImages"));
    document
        .querySelector("input[name=blurVideos]")
        .addEventListener("change", updateCheckbox("blurVideos"));
    document
        .querySelector("input[name=blurMale]")
        .addEventListener("change", updateCheckbox("blurMale"));
    document
        .querySelector("input[name=blurFemale]")
        .addEventListener("change", updateCheckbox("blurFemale"));
    document
        .querySelector("input[name=blurAmount]")
        .addEventListener("change", updateBlurAmount);
    document
        .querySelector("input[name=gray]")
        .addEventListener("change", updateCheckbox("gray"));
    document
        .querySelector("input[name=strictness]")
        .addEventListener("change", updateStrictness);
    document
        .querySelector("input[name=unblurImages]")
        .addEventListener("change", updateCheckbox("unblurImages"));
    document
        .querySelector("input[name=unblurVideos]")
        .addEventListener("change", updateCheckbox("unblurVideos"));
    document.getElementById("language").addEventListener("change", function () {
        changeLanguage(this.value, settings);
    });
    document
        .getElementById("whitelist")
        .addEventListener("change", updateWhitelist);

    document.querySelectorAll(".form-range").forEach((input) => {
        input.addEventListener("input", () => updateRangeDisplay(input));
    });

    refreshMessage = document.querySelector("#refresh-message");
}

function displayWhiteList(skipSet = false) {
    const whiteListContainer = document.getElementById("whitelist-container");
    const whiteList = document.getElementById("whitelist");
    const websiteName = document.getElementById("website-name");
    const whiteListStatusOn = document.getElementById("whitelist-status-on");
    const whiteListStatusOff = document.getElementById("whitelist-status-off");
    if (!currentWebsite) {
        whiteListContainer.classList.add("hidden");
        return;
    } else {
        whiteListContainer.classList.remove("hidden");
    }
    if (!skipSet) {
        websiteName.textContent = currentWebsite;
        whiteList.checked = !settings.whitelist.includes(currentWebsite);
    }
    if (whiteList.checked) {
        whiteListStatusOn.classList.remove("hidden");
        whiteListStatusOff.classList.add("hidden");
    } else {
        whiteListStatusOn.classList.add("hidden");
        whiteListStatusOff.classList.remove("hidden");
    }
}

function updateStatus() {
    settings.status = document.querySelector("input[name=status]").checked;
    chrome.storage.sync.set({ "hb-settings": settings });
    toggleAllInputs();
    sendUpdatedSettings("status");
    showRefreshMessage("status");
}

function updateBlurAmount() {
    settings.blurAmount = document.querySelector(
        "input[name=blurAmount]"
    ).value;
    document.querySelector("span[id=blur-amount-value]").innerHTML =
        settings.blurAmount + "%";
    chrome.storage.sync.set({ "hb-settings": settings });
    sendUpdatedSettings("blurAmount");
    showRefreshMessage("blurAmount");
}

function updateStrictness() {
    settings.strictness = document.querySelector(
        "input[name=strictness]"
    ).value;

    document.querySelector("span[id=strictness-value]").innerHTML =
        +settings.strictness * 100 + "%";

    chrome.storage.sync.set({ "hb-settings": settings });
    sendUpdatedSettings("strictness");
    showRefreshMessage("strictness");
}

function updateCheckbox(key) {
    return function () {
        settings[key] = document.querySelector(
            "input[name=" + key + "]"
        ).checked;
        chrome.storage.sync.set({ "hb-settings": settings });
        sendUpdatedSettings(key);
        showRefreshMessage(key);
    };
}

function changeLanguage(lang, settings) {
    lang = Object.hasOwn(HB_TRANSLATIONS_DIR, lang) ? lang : "en";
    document.documentElement.lang = lang;
    document.documentElement.dir = HB_TRANSLATIONS_DIR[lang];

    const translations = getTranslations(settings)?.[lang];
    const keys = Object.keys(translations);
    keys.forEach((key) => {
        const elements = document.querySelectorAll(key);
        elements.forEach((element) => {
            element.innerHTML = translations[key];
            // change direction of element
            if (HB_TRANSLATIONS_DIR[lang]) {
                element.dir = HB_TRANSLATIONS_DIR[lang];
            }
        });
    });

    settings.language = lang;
    chrome.storage.sync.set({ "hb-settings": settings });
    displayWhiteList();
    document.querySelectorAll(".form-range").forEach(updateRangeDisplay);
    updateProtectionStatus();
}

function updateWhitelist(e) {
    if (e.target.checked) {
        settings.whitelist = settings.whitelist.filter(
            (item) => item !== currentWebsite
        );
    } else {
        settings.whitelist.push(currentWebsite);
    }
    chrome.storage.sync.set({ "hb-settings": settings });
    sendUpdatedSettings("whitelist");
    showRefreshMessage("whitelist");
    displayWhiteList(true);
}

/* sendUpdatedSettings - Send updated settings object to tab.js to modify active tab blur CSS */
function sendUpdatedSettings(key) {
    const message = {
        type: "updateSettings",
        newSetting: {
            key: key,
            value: settings[key],
        },
    };

    chrome.runtime.sendMessage(message);
    chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
        var activeTab = tabs[0];
        if (activeTab?.id && currentWebsite) {
            chrome.tabs.sendMessage(activeTab.id, message, () => {
                void chrome.runtime.lastError;
            });
        }
    });
}

function showRefreshMessage(key) {
    if (refreshableSettings.includes(key)) {
        refreshMessage.classList.remove("hidden");
    }
}

function updateRangeDisplay(input) {
    const progress =
        ((+input.value - +input.min) / (+input.max - +input.min)) * 100;
    input.style.setProperty("--range-progress", `${progress}%`);
    const value =
        input.name === "strictness"
            ? Math.round(+input.value * 100)
            : input.value;
    const outputId =
        input.name === "strictness" ? "strictness-value" : "blur-amount-value";
    document.getElementById(outputId).textContent = `${value}%`;
    input.setAttribute("aria-valuetext", `${value}%`);
}

function updateProtectionStatus() {
    document.body.dataset.enabled = String(Boolean(settings.status));
    const translations = getTranslations(settings)[settings.language ?? "en"];
    document.getElementById("protection-status").textContent =
        translations["#protection-status"];
}
