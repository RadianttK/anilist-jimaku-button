// ==UserScript==
// @name         AniList Jimaku Button
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Adds a button to individual anime pages on AniList that links to the corresponding Jimaku entry
// @author       https://github.com/RadianttK
// @match        https://anilist.co/anime/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=anilist.co
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function() {
'use strict';
    let currentPageUrl, urlArr, anilistId, anilistIdLong, JIMAKU_API_KEY;

    function setupVariables() {
        currentPageUrl = window.location.href;
        urlArr = currentPageUrl.split('/');
        anilistId = urlArr[4];
        anilistIdLong = urlArr.length > 6 ? `${urlArr[4]}/${urlArr[5]}` : urlArr[4];
    }

    async function promptAPIKey() {
        var apiKey = prompt("Please enter your Jimaku API key:");
        if (apiKey !== null && apiKey !== "") {
            await GM_setValue("API_KEY_JIMAKU", apiKey);
        }
    }

    async function getAPIKey() {
        let apiKey = await GM_getValue("API_KEY_JIMAKU");
        if (!apiKey) {
            await promptAPIKey();
            apiKey = await getAPIKey();
        }
        return apiKey;
    }

    window.onload = function() {
        const observer = new MutationObserver(function(mutations) {
            if (!document.querySelector('.jimaku-button')) {
                addJimakuButton();
            }

            const jimakuButtons = document.querySelectorAll('.jimaku-button');
            if (jimakuButtons.length > 1) {
                console.log("Removing old Jimaku button")
                jimakuButtons[1].parentNode.removeChild(jimakuButtons[1]);
            }

            const newPageUrl = window.location.href;
            if (newPageUrl !== currentPageUrl) {
                console.log("Updating Jimaku button")
                setupVariables();
                addJimakuButton();
            }
        });

        setupVariables();
        const config = { childList: true, subtree: true };
        observer.observe(document.body, config);
    };

    async function fetchJimakuId(anilistId) {
        const cachedJimakuId = await GM_getValue('jimakuId_' + anilistId);
        return cachedJimakuId ? cachedJimakuId : await fetchJimakuIdFromAPI(anilistId);
    }

    async function fetchJimakuIdFromAPI(anilistId) {
        const JIMAKU_API_URL = "https://jimaku.cc/api/entries/search?anilist_id=%s";
        const response = await fetch(JIMAKU_API_URL.replace('%s', anilistId), { headers: { 'authorization': JIMAKU_API_KEY } });
        const data = await response.json();
        
        if (response.ok && data[0]) {
            const id = data[0].id;
            await GM_setValue('jimakuId_' + anilistId, id);
            return id;
        }
        if (!data[0]) {
            console.log(`No jimaku entry found for anilist id: ${anilistId}`)
        }
        console.error('Error fetching data from Jimaku API:', data.error);
        if (response.status === 401) {
            await GM_setValue("API_KEY_JIMAKU", null);
            console.log("Invalid Jimaku API key supplied.")
            alert("Error: Invalid Jimaku API key.");
        }
        return "..";
    }

    async function addJimakuButton() {
        JIMAKU_API_KEY = await getAPIKey();

        const socialButtonShort = document.querySelector('.nav > a[href="/anime/' + anilistId + '/social"]');
        const socialButtonLong = document.querySelector('.nav > a[href="/anime/' + anilistIdLong + '/social"]');
        const socialButton = socialButtonShort ? socialButtonShort : socialButtonLong;

        if (socialButton) {
            const jimakuButton = createJimakuButton();
            jimakuButton.href = "https://jimaku.cc/";
            socialButton.parentNode.insertBefore(jimakuButton, socialButton.nextSibling);

            try {
                const id = await fetchJimakuId(anilistId);
                updateButtonHref(jimakuButton, id);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        }
    }

    function createJimakuButton() {
        const jimakuButton = document.createElement('a');
        jimakuButton.innerText = 'Jimaku';
        jimakuButton.classList.add('link', 'jimaku-button');
        jimakuButton.setAttribute('data-v-5776f768', '');
        return jimakuButton;
    }

    function updateButtonHref(button, id) {
        const jimakuEntry = `https://jimaku.cc/entry/${id}`;
        button.href = jimakuEntry;
    }
    
    function removeJimakuButton() {
        const jimakuButton = document.querySelector('.jimaku-button');
        if (jimakuButton) {
            jimakuButton.remove();
        }
    }
})();
