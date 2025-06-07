const divisions = [
    { type: "Infantry", count: 979 },
    { type: "Mechanized", count: 522 },
    { type: "Armored", count: 326 },
    { type: "Airborne", count: 196 },
    { type: "Marine (IRMC)", count: 653 },
    { type: "SRS", count: 261 },
    { type: "Misc./Training", count: 3 }
];

let exceptions;

async function loadExceptions() {
    try {
        const response = await fetch('./exceptions.json');
        exceptions = await response.json();
        // Now you can use the exceptions variable
        // console.log(exceptions);
    } catch (error) {
        console.error('Error loading JSON:', error);
    }
}

await loadExceptions();


async function lookupException(unitType, number) {
    // console.log(await exceptions)
    // console.log(exceptions[unitType.toLowerCase() + number]);
    const exception = exceptions[unitType.toLowerCase() + number];
    if (exception) {
        return {
            unitType: exception.type,
            number: exception.number,
            name: exception.name
        };
    }
    return null;
}
// console.log(await lookupException("brigade", "852"));
// console.log(await lookupException("brigade", "852"))
async function unitExceptionCheck(unit) {
    console.log(unit.split(":")[1]);
    const unitType = (unit.split(":")[0]).toLowerCase();
    const number = unit.split(":")[1];
    console.log(unitType, number);
    if (await lookupException(unitType, number) === null) {
        return { unitType: unitType, number: number, changed: false };

    } else if (await lookupException(unitType, number) !== null) {
        const Exception = await lookupException(unitType, number);
        return { unitType: Exception.unitType, number: Exception.number, name: Exception.name, changed: true };

    }
}

// Match brigade counts to division structure
const brigades = divisions.map(div => ({
    type: div.type,
    count: div.count * (div.type === "Infantry" ? 4 : 3) // Infantry has 4 brigades/div, others have 3
}));

// Estimate battalions per brigade: 4 avg
const battalions = brigades.map(b => ({
    type: b.type,
    count: b.count * 4
}));

// Estimate companies per battalion: 4
const companies = battalions.map(b => ({
    type: b.type,
    count: b.count * 4
}));

// Estimate platoons per company: 4
const platoons = companies.map(c => ({
    type: c.type,
    count: c.count * 4
}));

// Estimate squads per platoon: 4
const squads = platoons.map(p => ({
    type: p.type,
    count: p.count * 4
}));

const structureMap = {
    Division: divisions,
    Brigade: brigades,
    Battalion: battalions,
    Company: companies,
    Platoon: platoons,
    Squad: squads
};

const totalCounts = {
    Division: 2940,
    Brigade: 9550,
    Battalion: 38200,
    Company: 152780,
    Platoon: 612000,
    Squad: 2445000,
};

const unitTypeSelect = document.getElementById("unitType");
const unitNumberInput = document.getElementById("unitNumber");
const resultDiv = document.getElementById("result");

// Update max value when type changes
unitTypeSelect.addEventListener("change", () => {
    const type = unitTypeSelect.value;
    unitNumberInput.max = totalCounts[type];
    unitNumberInput.value = 1;
    resultDiv.innerHTML = "";
});

function addNumberEnding(num) {
    const formattedNum = num.toLocaleString();
    if (num % 10 === 1 && num % 100 !== 11) return formattedNum + "st";
    if (num % 10 === 2 && num % 100 !== 12) return formattedNum + "nd";
    if (num % 10 === 3 && num % 100 !== 13) return formattedNum + "rd";
    return formattedNum + "th";
}

function buildChart(canvasId, structureArray, totalUnits, unitLabel) {
    const ctx = document.getElementById(canvasId).getContext("2d");

    const datasets = [];
    let start = 0;
    const colors = ['#4CAF50', '#2196F3', '#FFC107', '#FF5722', '#9C27B0', '#607D8B', '#795548'];

    for (let i = 0; i < structureArray.length; i++) {
        const unit = structureArray[i];
        const color = colors[i % colors.length];

        datasets.push({
            label: `${unit.type} ${unitLabel}s`,
            data: [unit.count],
            backgroundColor: color,
            stack: 'stack1'
        });
    }

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [''], // One single horizontal bar
            datasets: datasets
        },
        options: {
            indexAxis: 'y',
            responsive: false,
            plugins: {
                tooltip: {
                    maxWidth: 400,      // max tooltip width in pixels (adjust as needed)
                    // mode: 'index',      // or 'nearest' if you want
                    // intersect: false,   // show tooltip when hovering near a segment, not just on it
                    callbacks: {
                        label: function (context) {
                            const index = context.datasetIndex;
                            const type = structureArray[index].type;
                            let start = 1;
                            for (let j = 0; j < index; j++) start += structureArray[j].count;
                            const end = start + structureArray[index].count - 1;
                            return `${addNumberEnding(start)} – ${addNumberEnding(end)}: ${type} ${unitLabel}s`;
                        }
                    },
                    bodyFont: { size: 10 },
                    padding: 10,
                    displayColors: false,
                    caretSize: 6,
                    cornerRadius: 4
                },
                legend: { display: true }
            },
            scales: {
                x: {
                    stacked: true,
                    max: totalUnits
                },
                y: {
                    stacked: true
                }
            }
        }
    });
}

buildChart("divisionChart", divisions, totalCounts["Division"], "Division");
buildChart("brigadeChart", brigades, totalCounts["Brigade"], "Brigade");
buildChart("battalionChart", battalions, totalCounts["Battalion"], "Battalion");
buildChart("companyChart", companies, totalCounts["Company"], "Company");
buildChart("platoonChart", platoons, totalCounts["Platoon"], "Platoon");
buildChart("squadChart", squads, totalCounts["Squad"], "Squad");

function getHierarchy(unitType, number) {
    const hierarchy = {};

    const structureOrder = ["Division", "Brigade", "Battalion", "Company", "Platoon", "Squad"];
    const soldiersPerSquad = 11;

    // Helper to get division info
    const getDivisionInfo = (number) => {
        let divs = structureMap["Division"];
        let index = number;
        for (let div of divs) {
            if (index <= div.count) {
                return {
                    divisionNumber: index,
                    divisionType: div.type
                };
            }
            index -= div.count;
        }
        return null;
    };

    // Handle Division separately
    if (unitType === "Division") {
        const divInfo = getDivisionInfo(number);
        const isInfantry = divInfo?.divisionType === "Infantry";
        const brigades = isInfantry ? 4 : 3;

        hierarchy.division = `${addNumberEnding(number)} ${divInfo.divisionType} Division`;
        hierarchy.subCounts = {
            Brigade: brigades,
            Battalion: brigades * 4,
            Company: brigades * 4 * 4,
            Platoon: brigades * 4 * 4 * 4,
            Squad: brigades * 4 * 4 * 4 * 4
        };
        hierarchy.totalPersonnel = hierarchy.subCounts.Squad * soldiersPerSquad;
        return hierarchy;
    }

    // Otherwise: go up the hierarchy only
    const currentIndex = structureOrder.indexOf(unitType);
    let tempNumber = number;

    for (let i = currentIndex - 1; i >= 0; i--) {
        const parentType = structureOrder[i];
        tempNumber = Math.ceil(tempNumber / 4);
        hierarchy[parentType.toLowerCase()] = `${addNumberEnding(tempNumber)} ${parentType}`;
    }

    // Compute subunit counts below
    const subCounts = {};
    let count = 1;
    for (let i = currentIndex + 1; i < structureOrder.length; i++) {
        const subType = structureOrder[i];
        count *= 4;
        subCounts[subType] = count;
    }

    hierarchy.subCounts = subCounts;
    hierarchy.totalPersonnel = (subCounts["Squad"] || 1) * soldiersPerSquad;

    return hierarchy;
}



window.lookupUnit = async function () {
    const type = unitTypeSelect.value;
    const num = parseInt(unitNumberInput.value);

    const url = new URL(window.location.href);
    url.hash = `${type}:${num}`;
    window.history.replaceState({}, '', url.toString());


    if (num < 1 || num > totalCounts[type]) {
        resultDiv.innerText = "Invalid number for selected unit type.";
        return;
    }

    const typeArray = structureMap[type];
    let cumulative = 0;
    let localNum = num;
    let unitType = "Unknown";

    for (let i = 0; i < typeArray.length; i++) {
        const group = typeArray[i];
        if (localNum <= group.count) {
            unitType = group.type;
            break;
        } else {
            localNum -= group.count;
        }
    }
    let output = "";
    let useSimple = false;
    console.log((await unitExceptionCheck(type.toLowerCase() + ":" + num)).changed);
    if ((await unitExceptionCheck(type.toLowerCase() + ":" + num)).changed) {
        console.log((await unitExceptionCheck(type.toLowerCase() + ":" + num)).name);
        unitType = (await unitExceptionCheck(type.toLowerCase() + ":" + num)).name
        useSimple = true
    };
    if (useSimple) {
        output = `${addNumberEnding(num)} ${type} — ${unitType}`;
    } else {
        output = `${addNumberEnding(num)} ${type} — ${addNumberEnding(localNum)} ${unitType} ${type}`;
    }
    // let output = `${addNumberEnding(num)} ${type}`;

    const hierarchy = getHierarchy(type, num);

    output += `<br/><br/><strong>Hierarchy:</strong><br/>`;
    if (hierarchy.division) output += `${hierarchy.division} | ${addNumberEnding(localNum)} ${unitType} Division | Division: ${hierarchy.division}<br/>`;
    if (hierarchy.brigade) output += `${addNumberEnding(num)} Brigade | Local: ${addNumberEnding(localNum)} | Brigade: ${hierarchy.brigade}<br/>`;
    if (hierarchy.battalion) output += `${addNumberEnding(num)} Battalion | Local: ${addNumberEnding(localNum)} | Battalion: ${hierarchy.battalion}<br/>`;
    if (hierarchy.company) output += `${addNumberEnding(num)} Company | Local: ${addNumberEnding(localNum)} | Company: ${hierarchy.company}<br/>`;
    if (hierarchy.platoon) output += `${addNumberEnding(num)} Platoon | Local: ${addNumberEnding(localNum)} | Platoon: ${hierarchy.platoon}<br/>`;

    output += `<br/><strong>Subunit Estimates:</strong><br/>`;
    for (let [key, val] of Object.entries(hierarchy.subCounts)) {
        output += `${key}: ${val}<br/>`;
    }

    resultDiv.innerHTML = output;

}

// window.addEventListener("load", () => {
const url = new URL(window.location.href);
const hashParams = url.hash.slice(1).split(":");
if (hashParams.length === 2) {
    const type = hashParams[0];
    const num = parseInt(hashParams[1]);
    if (type in structureMap && !isNaN(num)) {
        unitTypeSelect.value = type;
        unitNumberInput.value = num;
        lookupUnit();
    }
}
// });
