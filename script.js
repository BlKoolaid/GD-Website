const PAGE_MARKER = 7; // how many entries are on a page
const ELEM_IDS = {"logs": "changelogs", "pagination": "changelog-pages", "demonCount": "demon-counts"};

let currentPage, pageCount;
let clickListener, keyupListener;
let listChangelog, demonList;

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

function submitInput(event, action, clickedTrunc)
{
    let isSubmission = false;
    switch (action)
    {
        case "click":
            isSubmission = event.target != clickedTrunc;
            break;
        case "keyup":
            isSubmission = event.code == "Enter";
            break;
    }

    if (isSubmission)
    {
        let newPage = Number(clickedTrunc.value);
        newPage = newPage >= 1 && newPage <= pageCount ? newPage : currentPage;
        updateChangelog(newPage);
    }
}

function getNewPageInput(inputID)
{
    const clickedTrunc = document.getElementById(inputID);
    clickedTrunc.type = "number";
    clickedTrunc.value = clickedTrunc.name;
    
    clickListener = (event) => submitInput(event, "click", clickedTrunc); // i fucking hate javascript ~ uses listeners variables so they can be properly removed later
    keyupListener = (event) => submitInput(event, "keyup", clickedTrunc);
    
    document.addEventListener("click", clickListener);
    document.addEventListener("keyup", keyupListener);
}

function updatePagination(clickedPage)
{
    document.removeEventListener("click", clickListener);
    document.removeEventListener("keyup", keyupListener);

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

    const listChangeExpr = /^(?<newLevel>.+?) has been (?<placementPhrase>placed at|moved from) ((?<oldRank>#\d+) to )?(?<newRank>#\d+)((, (above (?<levelAbove>.+?))?( and )?(below (?<levelBelow>.+?))?))?\./; // might fail with a level with an "and" in it
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
    [["0 of which", "none of which"], ["(1 of which are", "(1 of which is"]].forEach(([oldString, newString]) => countMessage = countMessage.replace(oldString, newString));
    
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

function getListEntry(row, listIndexes)
{
    let [rank, name, creator, difficulty, id, gddlTier, idsNLWTier, rating, enjoyment, attempts, worstFail] = row;
    const completionDate = row[listIndexes.completionDate], videoLink = row[listIndexes.videoLink];

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
    for (let item of data)
    {
        if (!item.trim()) break; // stop on an empty line

        const row = item.split("\t");
        let id = row[listIndexes.id], listEntry = getListEntry(row, listIndexes);
        if (isInteger(id)) demonList.set(id, listEntry);

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

function updateChangelog(clickedPage = 1)
{
    document.removeEventListener("click", clickListener);
    document.removeEventListener("keyup", keyupListener);
    
    updatePagination(clickedPage);
    updateActivePage(clickedPage);
}

async function makeUpdates()
{
    // note: takes a little to update after making a sheet change
    const [demonCounts, lists] = await fetchSheetData();
    updateBoxes(demonCounts, lists);
    updateChangelog();
}

async function fetchSheetData()
{
    const isReload = performance.getEntriesByType('navigation')[0]?.type === 'reload' || performance.navigation?.type === 1;
    let changelogData = sessionStorage.getItem("changelog");

    if (!changelogData || isReload)
    {
        const changelogURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQiHBiXlIZGJzidxWfpn4PbMhVRP_xO0ozivg0J60YqW9lAmU99lgala5r4Fc7BT84aX28ZxkKWLEPi/pub?gid=1804136036&single=true&output=tsv";
        const response = await fetch(changelogURL);
        changelogData = await response.text();
        sessionStorage.setItem("changelog", changelogData);
    }
    // let changelogData = localStorage.getItem("changelog"); // temp
    
    let listData = sessionStorage.getItem("demon-list");
    if (!listData || isReload)
    {
        const demonListURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQiHBiXlIZGJzidxWfpn4PbMhVRP_xO0ozivg0J60YqW9lAmU99lgala5r4Fc7BT84aX28ZxkKWLEPi/pub?gid=1881466420&single=true&output=tsv";
        const response = await fetch(demonListURL);
        listData = await response.text();
        sessionStorage.setItem("demon-list", listData);
    }
    listChangelog = parseChangelog(changelogData);
    pageCount = Math.ceil(listChangelog.size / PAGE_MARKER);

    const [demonListData, demonCounts, ...lists] = parseDemonList(listData); // ... gets the rest of the list to the variable
    demonList = demonListData;
    return [demonCounts, lists];
}

async function loadLevels()
{
    await fetchSheetData();
    addLevels();

    const listElem = document.querySelector(".levels-container");
    listElem.style.display = "block";

    const boxLoader = document.querySelector(".loader-container");
    boxLoader.style.display = "none";
}

function getLevelThumbnail(imageElem, id) {
    imageElem.src = `https://levelthumbs.prevter.me/thumbnail/${id}`;
    imageElem.onerror = "";
}

// non home page
async function addLevels() 
{
    const listElem = document.querySelector(".levels-container");
    const templateElem = document.getElementsByTagName("template")[0];
    const cardTemplate = templateElem.content.querySelector("a");
    
    let demonListSets = Array.from(demonList.entries());
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