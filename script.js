const PAGE_MARKER = 2; // how many entries are on a page
const ELEM_IDS = {"logs": "changelogs", "pagination": "changelog-pages", "demonCount": "demon-counts"};

let currentPage, pageCount;
let listChangelog, demonList;
let toastTimer;

function createInput(inputValue, isDisabled = false)
{
    const newPage = inputValue == "&lt;" || inputValue == "lt" ? currentPage - 1 : currentPage + 1;
    if (inputValue == "lt" || inputValue == "rt")
    {
        return `<input id="${inputValue}" name="${newPage}" class="btn btn-custom" type="button" value="..." onclick="getNewPageInput('${inputValue}');">`;
    }
    if (inputValue == "&lt;" || inputValue == "&gt;")
    {
        if (isDisabled)
        {
            return `<input class="btn btn-custom" type="button" value="${inputValue}" disabled>`;
        }
        return `<input class="btn btn-custom" type="button" value="${inputValue}" onclick="updateChangelog(${newPage});">`;
    }
    if (currentPage == inputValue)
    {
        return `<input class="btn btn-custom active" type="button" value="${inputValue}">`;
    }
    return `<input class="btn btn-custom" type="button" value="${inputValue}" onclick="updateChangelog(${inputValue});">`;
}

function getNewPageInput(inputID)
{
    const clickedTrunc = document.getElementById(inputID);
    clickedTrunc.type = "number";
    clickedTrunc.value = clickedTrunc.name;

    document.onclick = function(event) {
        if (event.target != clickedTrunc)
        {
            let newPage = Number(clickedTrunc.value);
            newPage = newPage >= 1 && newPage <= pageCount ? newPage : currentPage;
            updateChangelog(newPage);
            return;
        }
    };
    document.onkeyup = function(event) {
        if (event.code == "Enter")
        {
            let newPage = Number(clickedTrunc.value);
            newPage = newPage >= 1 && newPage <= pageCount ? newPage : currentPage;
            updateChangelog(newPage);
            return;
        }
    };
}

function updatePagination(clickedPage)
{
    const changelogButtons = document.getElementById(ELEM_IDS.pagination);
    let pageButtonsHTML = "";
    currentPage = clickedPage;
    
    const leftArrow = currentPage != 1 ? createInput("&lt;") : createInput("&lt;", true);
    const rightArrow = currentPage != pageCount ? createInput("&gt;") : createInput("&gt;", true);
    
    const leftTruncation = createInput("lt");
    const rightTruncation = createInput("rt");

    if (pageCount > 7)
    {
        let firstButton = createInput(1);
        let endButton = createInput(pageCount);
        if (currentPage < 4)
        {
            for (let i = 0; i <= currentPage; i++)
            {
                pageButtonsHTML += createInput(i + 1);
            }
            pageButtonsHTML = leftArrow + pageButtonsHTML + rightTruncation + endButton + rightArrow;
        }
        else if (currentPage < pageCount - 2)
        {
            let middleButtons = createInput(currentPage - 1) + createInput(currentPage) + createInput(currentPage + 1);
            pageButtonsHTML = leftArrow + firstButton + leftTruncation + middleButtons + rightTruncation + endButton + rightArrow;
        }
        else
        {
            for (let i = currentPage - 1; i <= pageCount; i++)
            {
                pageButtonsHTML += createInput(i);
            }
            pageButtonsHTML = leftArrow + firstButton + leftTruncation + pageButtonsHTML + rightArrow;
        }
        changelogButtons.innerHTML = pageButtonsHTML;
        return;
    }
    
    for (let i = 0; i < pageCount; i++)
    {
        pageButtonsHTML += createInput(i + 1);
    }
    pageButtonsHTML = pageCount > 1 ? leftArrow + pageButtonsHTML + rightArrow : pageCount;
    changelogButtons.innerHTML = pageButtonsHTML;
}

function highlightListChange(update, match) 
{
    const {newLevel, placementPhrase, oldRank, newRank, levelAbove, levelBelow} = match.groups;
    let extendedLevel, legacyLevel;

    const doubleChange = /This pushes (?<extendedLevel>.+?) into the extended list, and (?<legacyLevel>.+?) into the legacy list\./;
    const extendedChange = /This pushes (?<extendedLevel>.+?) into the extended list\./;
    const legacyChange = /This pushes (?<legacyLevel>.+?) into the legacy list\./;

    const doubleMatch = update.match(doubleChange);
    extendedLevel = doubleMatch ? doubleMatch.groups.extendedLevel : update.match(extendedChange)?.groups.extendedLevel;
    legacyLevel = doubleMatch ? doubleMatch.groups.legacyLevel : update.match(legacyChange)?.groups.legacyLevel;

    let newUpdate = `<span class="purple-bold">${newLevel}</span> has been ${placementPhrase} `;
    newUpdate += oldRank ? `<span class="purple-bold">${oldRank}</span> to <span class="purple-bold">${newRank}</span>` : `<span class="purple-bold">${newRank}</span>`;

    if (levelAbove || levelBelow) 
    {
        newUpdate += ",";
        if (levelAbove)
        {
            newUpdate += ` above <span class="purple-bold">${levelAbove}</span>`;
        }
        if (levelAbove && levelBelow)
        {
            newUpdate += " and";
        }
        if (levelBelow)
        {
            newUpdate += ` below <span class="purple-bold">${levelBelow}</span>`;
        }
    }
    newUpdate += ".";

    if (extendedLevel && legacyLevel) 
    {
        newUpdate += ` This pushes <span class="purple-bold">${extendedLevel}</span> into the extended list, and <span class="purple-bold">${legacyLevel}</span> into the legacy list.`;
    } 
    else if (extendedLevel) 
    {
        newUpdate += ` This pushes <span class="purple-bold">${extendedLevel}</span> into the extended list.`;
    } 
    else if (legacyLevel) 
    {
        newUpdate += ` This pushes <span class="purple-bold">${legacyLevel}</span> into the legacy list.`;
    }
    return newUpdate;
}

function formatUpdate(update)
{
    const tierChangeExpr = /(?<level>.+) tier changed to (?<tier>.+)\./; // regex is actually so sick what
    const tierMessage = `<span class="purple-bold">$<level></span> tier changed to <span class="purple-bold">$<tier></span>.`;

    const replaceChangeExpr = /(?<newLevel>.+) has replaced (?<oldLevel>.+) as my hardest (?<category>.+) level\./;
    const replaceMessage = `<span class="purple-bold">$<newLevel></span> has replaced <span class="purple-bold">$<oldLevel></span> as my hardest <span class="purple-bold">$<category></span> level.`;

    const attemptChangeExpr = /(?<newLevel>.+) has placed at (?<ranking>.+) in my highest attempt counts with (?<attempts>.+)\./;
    const attemptMessage = `<span class="purple-bold">$<newLevel></span> has placed at <span class="purple-bold">$<ranking></span> in my highest attempt counts with <span class="purple-bold">$<attempts></span>.`;

    const swapChangeExpr = /(?<firstSwap>.+) and (?<secondSwap>.+) have been swapped, with (?<topLevel>.+) now sitting above at (?<ranking>.+)\./;
    const swapMessage = `<span class="purple-bold">$<firstSwap></span> and <span class="purple-bold">$<secondSwap></span> have been swapped, with <span class="purple-bold">$<topLevel></span> now sitting above at <span class="purple-bold">$<ranking></span>.`;
    
    const sections = [[tierChangeExpr, tierMessage], [replaceChangeExpr, replaceMessage], [attemptChangeExpr, attemptMessage], [swapChangeExpr, swapMessage]]
    for (const section of sections)
    {
        const [expr, message] = section
        if (expr.test(update))
        {
            const newUpdate = update.replace(expr, message);
            return `<li>${newUpdate}</li>`;
        }
    }

    const listChangeExpr = /^(?<newLevel>.+?) has been (?<placementPhrase>retroactively added at|placed at|moved from) ((?<oldRank>#\d+) to )?(?<newRank>#\d+)((, (above (?<levelAbove>.+?))?( and )?(below (?<levelBelow>.+?))?))?\./; // might fail with a level with an "and" in it
    const match = update.match(listChangeExpr);
    if (match) 
    {
        let newUpdate = highlightListChange(update, match);
        return `<li>${newUpdate}</li>`;
    }
    return `<li>${update}</li>`; // if nothing else works
}

function updateActivePage(clickedPage)
{
    // get the set of entries from listChangelog
    const startIndex = (clickedPage - 1) * PAGE_MARKER;
    const endIndex = startIndex + PAGE_MARKER;

    const changelogKeys = Array.from(listChangelog.keys());
    const changelogEntries = changelogKeys.slice(startIndex, endIndex);
    
    const logsElem = document.getElementById(ELEM_IDS.logs);
    logsElem.scrollTop = 0;

    let logsHTML = "";
    for (const entry of changelogEntries)
    {
        logsHTML += `<h3>${entry}:</h3>`;
        const entryUpdates = listChangelog.get(entry);

        let innerList = "";
        entryUpdates.forEach(update => {
            innerList += formatUpdate(update);
        })
        logsHTML += `<ul>${innerList}</ul>`;
    }
    logsElem.innerHTML = logsHTML;
    logsElem.style.display = "block";

    const boxLoader = document.querySelector("#changelog-box .loader-container");
    boxLoader.style.display = "none";
}

function parseChangelog(data)
{
    let changelog = new Map(); // why is {} not a dictionary i hate this language
    data.split("\n")
        .forEach(item => {
            const [entry, log] = item.split("\t");
            if (!changelog.has(entry))
            {
                changelog.set(entry, []);
            }
            changelog.get(entry).push(log);
        });
    return changelog;
}

function updateBoxes(demonCounts, boxLists)
{
    let [mainExtremes, mainInsanes, legacyExtremes, legacyInsanes] = demonCounts;
    const totalExtremes = Number(mainExtremes) + Number(legacyExtremes), totalInsanes = Number(mainInsanes) + Number(legacyInsanes);
    
    let countMessage = `Right now, the list has <span class="purple-bold">${totalExtremes} Extreme Demons</span> (${legacyExtremes} of which are legacy) and <span class="purple-bold">${totalInsanes} Insane Demons</span> (${legacyInsanes} of which are legacy).`;
    [["(0 of which", "(none of which"], ["(1 of which are", "(1 of which is"]].forEach(([oldString, newString]) => countMessage = countMessage.replace(oldString, newString));
    
    const demonCountElem = document.getElementById(ELEM_IDS.demonCount);
    demonCountElem.innerHTML = countMessage;
    demonCountElem.style.display = "block";

    const elemsList = document.querySelectorAll(".list");
    elemsList.forEach((elem, index) => {
        elem.innerHTML = boxLists[index].join("");
        elem.style.display = "block";
    })

    const boxLoaders = document.querySelectorAll(".loader-container");
    boxLoaders.forEach(loader => {
        loader.style.display = "none";
    })
}

function addEntrytoList(expr, item, message, list)
{
    if (expr.test(item))
    {
        const entry = item.replace(expr, message);
        list.push(entry);
    }
}

function isInteger(value) 
{
    return /^-?\d+$/.test(value);
}

function getMonth(month)
{
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    return months[month - 1];
}

function getDateSuffix(day) 
{
  if (day > 3 && day < 21) 
  {
    return 'th';
  }

  switch (day % 10) 
  {
    case 1:  
      return 'st';
    case 2:  
      return 'nd';
    case 3:  
      return 'rd';
    default: 
      return 'th';
  }
}

function getListEntry(row, listIndexes, videoLink)
{
    let [rank, name, creator, difficulty, id, gddlTier, idsNLWTier, rating, enjoyment, attempts, worstFail] = row;
    const completionDate = row[listIndexes.completionDate];

    difficulty = difficulty.replace("Demon", "");
    const [month, day, year] = completionDate.split('/');
    const dateString = `${getMonth(month)} ${day}${getDateSuffix(day)}, 20${year}`;

    return [rank, name, creator, dateString, difficulty, idsNLWTier, gddlTier, id, enjoyment, attempts, worstFail, videoLink]
}

function parseDemonList(data)
{
    const listIndexes = {"id": 4, "worstFail": 9, "completionDate": 11, "count": 13, "abc": 14, "month": 15, "attempt": 16, "videoLink": 35};
    let demonList = new Map();
    let demonCounts = [], abcList = [], monthList = [], attemptList = [];
    data = data.split("\n");
    
    const abcMessage = `<li>$<letter> - <span class="purple-bold">$<level></span> (Tier $<tier>)</li>`;
    let abcExpr = /\\?(?<letter>.) - (?<level>.+) :tier(?<tier>\d+):$/;

    const monthMessage = `<li>$<month> - <span class="purple-bold">$<level></span> (Tier $<tier>)</li>`;
    let monthExpr = /(?<month>.+) - (?<level>.+) :tier(?<tier>\d+):$/;

    const attemptMessage = `<li><span class="purple-bold">$<level></span> (Tier $<tier>) - $<attempts></li>`;
    let attemptExpr = /\d+\. (?<level>.+) :tier(?<tier>\d+): - (?<attempts>.+)$/;

    const videoLinks = getVideoLinks(data, listIndexes);
    let listCount = 0;
    for (let item of data)
    {
        if (!item.trim()) break; // stop on an empty line

        const row = item.split("\t");
        let id = row[listIndexes.id];
        if (isInteger(id)) {
            const videoLink = videoLinks[listCount];
            listEntry = getListEntry(row, listIndexes, videoLink);
            demonList.set(id, listEntry);
            listCount++;
        }

        let countExpr = /: (?<demonCount>\d+)$/;
        let match = row[listIndexes.count].match(countExpr);
        if (match)
        {
            const count = match.groups.demonCount;
            demonCounts.push(count);
        }

        addEntrytoList(abcExpr, row[listIndexes.abc], abcMessage, abcList);
        addEntrytoList(monthExpr, row[listIndexes.month], monthMessage, monthList);
        addEntrytoList(attemptExpr, row[listIndexes.attempt], attemptMessage, attemptList);
    }
    return [demonList, demonCounts, abcList, monthList, attemptList];
}

function getVideoLinks(data, listIndexes) 
{
    let videoLinks = []
    for (let item of data) {
        const row = item.split("\t");
        const videoLink = row[listIndexes.videoLink].trim();
        if (videoLink != "") {
            videoLinks.push(row[listIndexes.videoLink]);
        }
    }
    // console.log(videoLinks)
    return videoLinks;
}

function updateChangelog(clickedPage = 1)
{    
    updatePagination(clickedPage);
    updateActivePage(clickedPage);
}

async function fetchSheetData(isLoadingListTab = false)
{
    const isReload = performance.getEntriesByType('navigation')[0].type === 'reload';
    const isNavigate = performance.getEntriesByType('navigation')[0].type === 'navigate';
    const isHomePage = location.pathname.split("/").pop() === "index.html";

    let changelogData = localStorage.getItem("changelog");
    if (changelogData)
    {
        listChangelog = parseChangelog(changelogData);
        pageCount = Math.ceil(listChangelog.size / PAGE_MARKER);
        if (!isLoadingListTab) updateChangelog();
    }

    let listData = localStorage.getItem("demon-list");
    if (listData)
    {
        const [demonListData, demonCounts, ...lists] = parseDemonList(listData); // ... gets the rest of the list to the variable
        demonList = demonListData;
        if (isLoadingListTab) {
            if (isReload) {
                sessionStorage.removeItem("sort-type");
                sessionStorage.removeItem("sort-direction");
            }
            // get sortType and sortDirection from session storage
            const sortType = sessionStorage.getItem("sort-type");
            const sortDirection = sessionStorage.getItem("sort-direction");
            // default is down so if sortDirection is ascending, set flipDirection = true, otherwise make it false
            const flipDirection = sortDirection == "ascending" ? true : false;
            sortLevelSets(flipDirection, sortType);
        }
        else {
            updateBoxes(demonCounts, lists);
        }
    }

    // console.log(isNavigate);
    if (isReload || isHomePage && isNavigate)
    {
        refetchSheetData(isLoadingListTab)
    }
}

async function refetchSheetData(isLoadingListTab)
{
    const updateContainer = document.querySelector(".update-container");
    updateContainer.style.opacity = 100;

    const changelogURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQiHBiXlIZGJzidxWfpn4PbMhVRP_xO0ozivg0J60YqW9lAmU99lgala5r4Fc7BT84aX28ZxkKWLEPi/pub?gid=1804136036&single=true&output=tsv";
    const demonListURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQiHBiXlIZGJzidxWfpn4PbMhVRP_xO0ozivg0J60YqW9lAmU99lgala5r4Fc7BT84aX28ZxkKWLEPi/pub?gid=1881466420&single=true&output=tsv";
    
    let response = await fetch(changelogURL);
    changelogData = await response.text();
    localStorage.setItem("changelog", changelogData);

    listChangelog = parseChangelog(changelogData);
    pageCount = Math.ceil(listChangelog.size / PAGE_MARKER);
    if (!isLoadingListTab) updateChangelog();

    response = await fetch(demonListURL);
    listData = await response.text();
    localStorage.setItem("demon-list", listData);

    const [demonListData, demonCounts, ...lists] = parseDemonList(listData); // ... gets the rest of the list to the variable
    demonList = demonListData;
    if (isLoadingListTab) {
        sortLevelSets();
    }
    else {
        updateBoxes(demonCounts, lists);
    }
    hideUpdateContainer();
}

async function loadLevels()
{
    const isLoadingListTab = true;
    await fetchSheetData(isLoadingListTab);
}

function getLevelThumbnail(imageElem, id) {
    imageElem.src = `https://levelthumbs.prevter.me/thumbnail/${id}`;
    imageElem.onerror = "";
}

// non home page
function addLevels(sortedDemonList = null) 
{
    const listElem = document.querySelector(".levels-container");
    const templateElem = document.getElementsByTagName("template")[0];
    const cardTemplate = templateElem.content.querySelector("a");
    
    listElem.innerHTML = "";
    let demonListSets = sortedDemonList == null ? Array.from(demonList.entries()) : sortedDemonList;
    const pageName = location.pathname.split("/").pop();
    if (pageName == "main-list.html")
    {
        demonListSets = demonListSets.slice(0, 75);
    }
    else if (pageName == "extended-list.html")
    {
        demonListSets = demonListSets.slice(75, 150);
    }
    else
    {
        demonListSets = demonListSets.slice(150);
    }

    for (const [id, levelDataSet] of demonListSets)
    {
        const levelCard = document.importNode(cardTemplate, true);
        const classList = levelCard.querySelectorAll("div span[class]");

        classList.forEach((classElem, index) => {
            const attribute = levelDataSet[index];
            classElem.textContent = attribute;
            
            if (classElem.classList.contains("id")) {
                levelCard.id = attribute;
            }
        });
        const videoLink = levelDataSet[levelDataSet.length - 1];
        if (videoLink.includes("http"))
        {
            levelCard.href = videoLink; // video link is the last item
            levelCard.target = "_blank";
        }

        const mainImage = `images/level-thumbnails/${id}.png`;
        const cardImageElem = levelCard.querySelector(".card-image img");

        cardImageElem.src = mainImage;
        cardImageElem.onerror = () => getLevelThumbnail(cardImageElem, id);

        levelCard.style.backgroundImage = `url(${mainImage}), url("https://levelthumbs.prevter.me/thumbnail/${id}")`;
        listElem.appendChild(levelCard);
    }
}

function updateListVisuals()
{
    const listElem = document.querySelector(".levels-container");
    listElem.style.display = "block";

    const boxLoader = document.querySelector(".loader-container");
    boxLoader.style.display = "none";
}

function hideUpdateContainer() 
{
    const updateContainer = document.querySelector(".update-container");
    updateContainer.classList.add('update-animate');
    updateContainer.style.opacity = 0;
}

function showSortOptions()
{
    const sortOptions = document.querySelector(".sort-options");
    window.onresize = function(event) {
        document.querySelector(".sort-options").style.width = `${document.querySelector(".btn-sort").offsetWidth}px`;
    }

    document.onclick = function(event) {
        if (sortOptions.style.display == "flex") { // clicked on dropdown option
            const dropdownBtn = event.target;
            if (dropdownBtn.value != undefined) { // sorting by selected filter
                sortLevelSets(false, dropdownBtn.value);
                saveFilters(dropdownBtn.value);
            }

            sortOptions.style.display = "none";
            document.activeElement.blur(); // removes focus from active element
            document.getElementsByTagName("body")[0].style.pointerEvents = "all"; // restore input
        }
        else if (event.target == document.querySelector(".btn-sort")) {
            sortOptions.style.display = "flex";
            document.getElementsByTagName("body")[0].style.pointerEvents = "none";
            sortOptions.style.pointerEvents = "all"; // remove input from everything except the dropdown
            document.querySelector(".sort-options").style.width = `${document.querySelector(".btn-sort").offsetWidth}px`;
        }
        else if (event.target == document.querySelector(".btn-sort-direction")) {
            sortLevelSets(true);
            const sortType = getSortType();
            saveFilters(sortType);
        }
    };
    document.onmouseup = function(event) {
        if (event.target == document.querySelector(".btn-sort-direction")) {
            document.activeElement.blur();
        }
    }
}

function saveFilters(sortType) 
{
    const sortButton = document.querySelector(".btn-sort-direction");
    const sortDirection = sortButton.value == "\u2191" ? "ascending" : "descending";

    sessionStorage.setItem("sort-type", sortType);
    sessionStorage.setItem("sort-direction", sortDirection);
}

function getSortType(flipDirection = false) {
    const dropdownBtn = document.querySelector(".btn-sort");
    const sortExpr = /Sort by: (?<sortType>.+) \u25BE/;
    return sortExpr.exec(dropdownBtn.value)[1];
}

function sortLevelSets(flipDirection = false, dropdownValue = null)
{
    // NOTE: u2193 == down / u2191 == up
    if (dropdownValue == null) {
        dropdownValue = getSortType(flipDirection);
    }
    if (flipDirection) {
        const sortButton = document.querySelector(".btn-sort-direction");
        sortButton.value = sortButton.value == "\u2193" ? "\u2191" : "\u2193";
    }

    const OPTIONS = {"GDDL": 6, "ID": 7, "Enjoyment": 8, "Worst Death": 9, "Attempts": 10};
    let demonListValues = Array.from(demonList.values());
    const sortDirectionBtn = document.querySelector(".btn-sort-direction");
    
    if (dropdownValue != "Default") { // remove , and % for proper sorting on wf and attempts
        demonListValues.sort((a,b) => b[OPTIONS[dropdownValue]].replace(",", "").replace("%", "") - a[OPTIONS[dropdownValue]].replace(",", "").replace("%", ""));
    }
    if (sortDirectionBtn.value == "\u2191") {
        demonListValues.reverse();
    }

    let sortedDemonList = [];
    demonListValues.forEach((item, index) => {
        item[0] = index + 1;
        sortedDemonList.push([item[OPTIONS.ID], item]);
    });
    
    addLevels(sortedDemonList);
    updateListVisuals();
    document.querySelector(".btn-sort").value = `Sort by: ${dropdownValue} \u25BE`;
}

function showToast()
{
    const toastElem = document.getElementById("toast-alert");
    clearTimeout(toastTimer);

    toastElem.style.opacity = 1;
    toastTimer = setTimeout(() => {
        toastElem.style.opacity = 0;
    }, 2000);
}

function copyToClipboard(card)
{
    navigator.clipboard.writeText(card.id);
    showToast();
}

// TODO: save filter changes across pages, session storage perhaps, and then load them when the page loads
// TODO: add comments?