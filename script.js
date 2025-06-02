const divisions = [
    { type: "Infantry", count: 979 },
    { type: "Mechanized", count: 522 },
    { type: "Armored", count: 326 },
    { type: "Airborne", count: 196 },
    { type: "Marine (IRMC)", count: 653 },
    { type: "SRS", count: 261 },
    { type: "Misc./Training", count: 3 }
];

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
                    bodyFont: { size: 14 },
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

    const subPerUnit = {
        Division: { sub: 4, next: "Brigade", altSub: 3 },
        Brigade: { sub: 4, next: "Battalion" },
        Battalion: { sub: 4, next: "Company" },
        Company: { sub: 4, next: "Platoon" },
        Platoon: { sub: 4, next: "Squad" },
        Squad: { sub: 1, next: null }
    };

    const soldiersPerSquad = 11;

    const getDivisionInfo = (unitType, number) => {
        let divs = structureMap["Division"];
        let cumulative = 0, index = number;
        for (let div of divs) {
            let divSize = div.count;
            if (index <= divSize) {
                return {
                    divisionNumber: index,
                    divisionType: div.type
                };
            }
            index -= divSize;
        }
        return null;
    };

    // Calculate Division & Brigade ownership
    if (unitType === "Division") {
        const divInfo = getDivisionInfo("Division", number);
        hierarchy.division = `${addNumberEnding(number)} ${divInfo.divisionType} Division`;
        hierarchy.bridgesInDiv = divInfo.divisionType === "Infantry" ? 4 : 3;
        hierarchy.totalPersonnel = 12000;
        hierarchy.subCounts = {
            Brigades: hierarchy.bridgesInDiv,
            Battalions: hierarchy.bridgesInDiv * 4,
            Companies: hierarchy.bridgesInDiv * 4 * 4,
            Platoons: hierarchy.bridgesInDiv * 4 * 4 * 4,
            Squads: hierarchy.bridgesInDiv * 4 * 4 * 4 * 4
        };
    } else {
        // Traverse up the chain
        const chain = ["Squad", "Platoon", "Company", "Battalion", "Brigade", "Division"];
        const currentIndex = chain.indexOf(unitType);
        let currentNumber = number;

        for (let i = currentIndex; i < chain.length - 1; i++) {
            const parent = chain[i + 1];
            const perUnit = (parent === "Division")
                ? structureMap[parent].reduce((acc, div) => acc + div.count, 0)
                : totalCounts[parent];

            const childPerParent = (structureMap[parent][0].type === "Infantry" && parent === "Brigade") ? 4 : 3;
            const parentNumber = Math.ceil(currentNumber / Math.pow(4, i - currentIndex + 1));
            hierarchy[parent.toLowerCase()] = addNumberEnding(parentNumber) + " " + parent;
        }

        // Estimate size
        const subUnits = {};
        let subs = 1;
        let personnel = 1;

        if (unitType === "Division") {
            subs = 4;
            personnel = 12000;
        } else if (unitType === "Brigade") {
            subs = 4;
            personnel = 3000;
        } else if (unitType === "Battalion") {
            subs = 4;
            personnel = 800;
        } else if (unitType === "Company") {
            subs = 4;
            personnel = 200;
        } else if (unitType === "Platoon") {
            subs = 4;
            personnel = 40;
        } else if (unitType === "Squad") {
            subs = 1;
            personnel = 11;
        }

        let c = {
            Company: 0,
            Platoon: 0,
            Squad: 0
        };

        switch (unitType) {
            case "Division":
                c.Brigade = (structureMap["Brigade"][0].type === "Infantry") ? 4 : 3;
                c.Battalion = c.Brigade * 4;
                c.Company = c.Battalion * 4;
                c.Platoon = c.Company * 4;
                c.Squad = c.Platoon * 4;
                break;
            case "Brigade":
                c.Battalion = 4;
                c.Company = 16;
                c.Platoon = 64;
                c.Squad = 256;
                break;
            case "Battalion":
                c.Company = 4;
                c.Platoon = 16;
                c.Squad = 64;
                break;
            case "Company":
                c.Platoon = 4;
                c.Squad = 16;
                break;
            case "Platoon":
                c.Squad = 4;
                break;
        }

        c.Personnel = personnel;
        hierarchy.subCounts = c;
    }

    return hierarchy;
}


function lookupUnit() {
    const type = unitTypeSelect.value;
    const num = parseInt(unitNumberInput.value);

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

    let output = `${addNumberEnding(num)} ${type} — ${addNumberEnding(localNum)} ${unitType} ${type}`;
    // let output = `${addNumberEnding(num)} ${type}`;

    const hierarchy = getHierarchy(type, num);

    output += `<br/><br/><strong>Hierarchy:</strong><br/>`;

    if (hierarchy.division) output += `Division: ${hierarchy.division}<br/>`;
    if (hierarchy.brigade) output += `Brigade: ${hierarchy.brigade}<br/>`;
    if (hierarchy.battalion) output += `Battalion: ${hierarchy.battalion}<br/>`;
    if (hierarchy.company) output += `Company: ${hierarchy.company}<br/>`;
    if (hierarchy.platoon) output += `Platoon: ${hierarchy.platoon}<br/>`;

    output += `<br/><strong>Subunit Estimates:</strong><br/>`;
    for (let [key, val] of Object.entries(hierarchy.subCounts)) {
        output += `${key}: ${val}<br/>`;
    }

    resultDiv.innerHTML = output;

}
