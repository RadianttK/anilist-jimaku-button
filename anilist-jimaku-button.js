// ==UserScript==
// @name         AniList Jimaku Button
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Adds a button to individual anime pages on AniList that links to the corresponding Jimaku entry
// @author       https://github.com/RadianttK
// @match        https://anilist.co/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=anilist.co
// @grant        GM.getValue
// @grant        GM.setValue
// @run-at       document-start
// ==/UserScript==

(function() {
'use strict';
    let currentPageUrl, anilistId, JIMAKU_API_KEY;

    async function setupVariables() {
        currentPageUrl = window.location.href;
        const anilistIdRegexMatch = currentPageUrl.match(/^https:\/\/anilist\.co\/anime\/(\d+)(\/.*)?$/);
        anilistId = anilistIdRegexMatch ? anilistIdRegexMatch[1] : null;
    }

    async function promptAPIKey() {
        const apiKey = prompt("Please enter your Jimaku API key:");
        if (apiKey !== null && apiKey !== "") {
            await GM.setValue("API_KEY_JIMAKU", apiKey);
        }
    }

    async function getAPIKey() {
        let apiKey = await GM.getValue("API_KEY_JIMAKU");
        if (!apiKey) {
            await promptAPIKey();
            apiKey = await getAPIKey();
        }
        return apiKey;
    }

    document.addEventListener('DOMContentLoaded', function() {
        const pageLoadObserver = new MutationObserver(async function() {
            if (!window.location.href.startsWith('https://anilist.co/anime')) return;
            const overviewButton = document.querySelector('.nav > a.router-link-exact-active');
            if(!overviewButton) return;

            pageLoadObserver.disconnect();
            JIMAKU_API_KEY = await getAPIKey();
            await setupVariables();
            await addJimakuButton(overviewButton);
        });
        const pageNavigationObserver = new MutationObserver(async function() {
            if (!window.location.href.startsWith('https://anilist.co/anime')) return;
            if (window.location.href === currentPageUrl) return;

            const jimakuButton = document.getElementById('jimaku-button');
            if (!jimakuButton) return;

            await setupVariables();
            await updateJimakuButton(jimakuButton);
        });

        const observerConfig = { childList: true, subtree: true };
        pageLoadObserver.observe(document.body, observerConfig);
        pageNavigationObserver.observe(document.body, observerConfig);
        window.addEventListener('popstate', function () {
            pageLoadObserver.disconnect();
            pageLoadObserver.observe(document.body, observerConfig);
        });
    });

    async function fetchJimakuId(anilistId) {
        const cachedJimakuId = await GM.getValue('jimakuId_' + anilistId);
        return cachedJimakuId ? cachedJimakuId : await fetchJimakuIdFromAPI(anilistId);
    }

    async function fetchJimakuIdFromAPI(anilistId) {
        const response = await fetch(`https://jimaku.cc/api/entries/search?anilist_id=${anilistId}`, { headers: { 'authorization': JIMAKU_API_KEY } });
        const data = await response.json();

        if (response.ok && data[0]) {
            const id = data[0].id;
            await GM.setValue('jimakuId_' + anilistId, id);
            return id;
        }
        if (!data[0]) {
            console.log(`No jimaku entry found for anilist id: ${anilistId}`)
        }
        console.error('Error fetching data from Jimaku API:', data.error);
        if (response.status === 401) {
            await GM.setValue("API_KEY_JIMAKU", null);
            console.log("Invalid Jimaku API key supplied.")
            alert("Error: Invalid Jimaku API key.");
        }
        return "..";
    }

    async function addJimakuButton(overviewButton) {
        const jimakuButton = createJimakuButton(overviewButton);
        jimakuButton.href = "https://jimaku.cc/";
        overviewButton.parentNode.insertBefore(jimakuButton, overviewButton.nextSibling);
        updateJimakuButton(jimakuButton);
    }

    async function updateJimakuButton(jimakuButton) {
        try {
            const id = await fetchJimakuId(anilistId);
            jimakuButton.href = `https://jimaku.cc/entry/${id}`;
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    function createJimakuButton(overviewButton) {
        const jimakuButton = document.createElement('a');
        jimakuButton.innerText = 'Jimaku';
        jimakuButton.setAttribute('id', 'jimaku-button');
        for (const { name, value } of overviewButton.attributes) {
            jimakuButton.setAttribute(name, value);
        }
        return jimakuButton;
    }
})();
