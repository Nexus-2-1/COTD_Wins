const root = document.documentElement;
const savedTheme = localStorage.getItem("theme");
const sortBy = localStorage.getItem("sortBy");
const ctx = document.getElementById('multiAxisChart').getContext('2d');
const toggleBtn = document.getElementById("theme_toggle_border");
const addPlayerBtn = document.getElementById("addPlayerBtn");
const GOLDEN_ANGLE = 137.508;
let hiddenPlayers = [];
let data = [];
let chart;

function parseDate(str) {
  const [day, month, year] = str.split(' ').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
}

function SortPlayersByWins(year){
  players =  {};
  //count wins
  for (let i = 0; i < data.length; i++){
    //filter for year
    if (year !== "all" && !data[i].date.endsWith(year)){continue;} 
    //skip if no winner
    if (data[i].winner === null || data[i].winner === undefined){continue;}

    player = data[i].winner.name;
    if (players[player] === undefined){
      players[player] = 1;
    } else {
      players[player] += 1;
    }
  }
  return Object.entries(players).sort((a, b) => b[1] - a[1]).map(d => d[0]) //sort players
}

function getData(){
  fetch('./data.json')
  .then(response => response.json())
  .then(data_ => {
    data = data_;
    data.sort((a, b) => parseDate(a.date) - parseDate(b.date)); //sort from oldest to newest
    generateDataset("all");
  })
}

function generateDataset(year){
  sortedPlayers = SortPlayersByWins(year);
  hiddenPlayers = sortedPlayers.slice(10); //show only top 10

  var dataset = [];

  for (let i = 0; i < data.length; i++){
    //filter for year
    if (year !== "all" && !data[i].date.endsWith(year)){continue;}
    //skip if no winner
    if (data[i].winner === null || data[i].winner === undefined){continue;}

    player = data[i].winner.name;
    playerIndex = sortedPlayers.indexOf(player);
    
    //add datapoint
    const playerData = dataset.find(d => d.label === player);
    const formattedDate = parseDate(data[i].date);
    if (!playerData) {
      dataset.push({
        label: player,
        order: sortedPlayers.indexOf(player),
        data: [{ x: formattedDate, y: 1 }],
        borderColor: generateLineColor(playerIndex), // line color
        hidden: hiddenPlayers.indexOf(player) !== -1
      });
    } 
    else {
      playerData.data.push({
        x: formattedDate,
        y: playerData.data[playerData.data.length - 1].y + 1
      });
    }
  }

  //get first date
  if (year == "all" || year == "2020"){ first_date = parseDate("03 11 2020") }
  else                                { first_date = parseDate("01 01 "+year)}

  //add datapoint at start to complete the line to the left side
  for (let i = 0; i < dataset.length; i++){
    //skip if player won on the first day
    dataset[i].data.unshift({
      x: first_date,
      y: 0
    });
  }

  //get last date
  currentYear = new Date().getFullYear();
  if (year == "all" || year == currentYear.toString()){ last_date = parseDate(data[data.length - 1].date) }
  else                                                { last_date = parseDate("31 12 " + year);           }

  //add datapoint at end to complete the line to the right side
  for (let i = 0; i < dataset.length; i++){
    //skip if player won on the last day
    if (dataset[i].data.find(d => d.x.getTime() == last_date.getTime()) !== undefined){continue;} 

    dataset[i].data.push({
      x: last_date,
      y: dataset[i].data[dataset[i].data.length - 1].y
    });
  }

  //update chart
  config.data.datasets = dataset;
  chart.update();
  generatePlayerList();
}

function getChartColors(theme) {
  if (theme === "dark") {
    return {
      axisText: "#b0b0b0",
      axisGrid: "rgba(228, 228, 228, 0.16)",
      axisBorder: "rgba(255,255,255,0.2)",
      titleText: "#c7c7c7ff",
      labelText: "#e2e2e2ff"
    };
  }
  // light
  return {
    axisText: "#666666",
    axisGrid: "rgba(0,0,0,0.1)",
    axisBorder: "rgba(0,0,0,0.2)",
    titleText: "#464646ff",
    labelText: "#383838"
  };
}

function setTheme(theme) {
  root.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);

  colors = getChartColors(theme);
  chart.options.scales.x.ticks.color = colors.axisText;
  chart.options.scales.x.grid.color = colors.axisGrid;
  chart.options.scales.x.border.color = colors.axisBorder;

  chart.options.scales.y.ticks.color = colors.axisText;
  chart.options.scales.y.grid.color = colors.axisGrid;
  chart.options.scales.y.border.color = colors.axisBorder;

  chart.options.plugins.title.color = colors.titleText;
  chart.options.plugins.legend.labels.color = colors.labelText;

  chart.update();
}

function legendHover(evt, item, legend){
  player = item.text;
  datapoint = legend.chart.data.datasets.find(d => d.label === player);
  datapoint.borderWidth = 6;
  chart.update();
}

function legendHoverLeave(evt, item, legend){
  player = item.text;
  datapoint = legend.chart.data.datasets.find(d => d.label === player);
  datapoint.borderWidth = undefined;
  chart.update();
}

function LegendClickHandler(e, legendItem, legend){
  console.log(e, legendItem, legend);
}

function resetZoom(){
  chart.resetZoom();
}

function addYears(){
  selection = document.getElementById("yearSelection");
  currentYear = new Date().getFullYear();
  option = document.createElement("option");
  option.value = "all";
  option.innerText = "2020-" + currentYear;
  selection.appendChild(option);
  for (let i = 2020; i <= currentYear; i++){
    option = document.createElement("option");
    option.value = i;
    option.innerText = i;
    selection.appendChild(option);
  }
}

function showYear(){
  selection = document.getElementById("yearSelection");
  year = selection.value;
  generateDataset(year);
  resetZoom();
  chart.update();
}

function generatePlayerList(){
  addPlayerList = document.getElementById("playerSelection");
  sortBy_ = document.getElementById("sortBy").value;
  localStorage.setItem("sortBy", sortBy_);
  if (sortBy_ === "name"){
    hiddenPlayersSorted = hiddenPlayers.slice();;
    hiddenPlayersSorted.sort();
  }
  else
  {                    
    hiddenPlayersSorted = hiddenPlayers;
  }

  addPlayerList.innerHTML = '<option value="none">Add Player</option>';
  for (let i = 0; i < hiddenPlayersSorted.length; i++){
    option = document.createElement("option");
    option.value = hiddenPlayersSorted[i];
    option.innerText = hiddenPlayersSorted[i];
    addPlayerList.appendChild(option);
  }
}

function playerSelected(){
  addPlayerList = document.getElementById("playerSelection");
  if (addPlayerList.value !== "none"){
    addPlayer();
  }
}

function addPlayer(){
  addPlayerList = document.getElementById("playerSelection");
  selectedPlayer = addPlayerList.value;
  //update hiddenPlayers
  hiddenPlayers = hiddenPlayers.filter(x => x !== selectedPlayer);
  //show player in chart
  chart.data.datasets.find(d => d.label === selectedPlayer).hidden = false;
  //remove player from selection
  addPlayerList.selectedOptions[0].remove();
  //reset player selection List
  addPlayerList.value = "none";
  //update chart
  chart.update();
}

function generateLineColor(index) {
  const lightnessLevels = [50, 70];

  const hue = (index * GOLDEN_ANGLE) % 360;
  const saturation = 70;
  const lightness = lightnessLevels[index % lightnessLevels.length];

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function calculateChartSize(){
  const container = document.querySelector('.chart-container');
  const yPosition = container.getBoundingClientRect().y;
  container.style.height = `${window.innerHeight - yPosition - window.innerHeight*0.03 - 20}px`; //100vh - startHeight - 3vh - 20px padding
}

const config = {
  type: 'line',
  data: {
    datasets: []
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 500,
      easing: "easeInOutExpo"
    },
    datasets: {
      line: {
        stepped: true,
        borderWidth: 2,
        pointRadius: 2,
        pointHitRadius: 5,
        hoverRadius: 5
      }
    },
    interaction: {
      mode: 'nearest', // nearest point in both x and y
      intersect: true   // triggers only if close enough to the line
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'month',
          tooltipFormat: 'dd.MM.yyyy',
        },
      },
      y: {
        beginAtZero: true,
      },
    },
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        onHover: legendHover,
        onLeave: legendHoverLeave,
        labels: {
          boxWidth: 20,
          useBorderRadius: true,
          borderRadius: 3,
          filter: (item, chart) => {
            return !hiddenPlayers.includes(item.text);
          },
          sort: (a, b, data) => {
            const datasetA = data.datasets[a.datasetIndex];
            const datasetB = data.datasets[b.datasetIndex];
            const totalA = datasetA.data[datasetA.data.length - 1].y;
            const totalB = datasetB.data[datasetB.data.length - 1].y;
            return totalB - totalA;
          }
        }
      },
      zoom: {
        limits: {
          x: {min: 'original', max: 'original'},
        },
        pan: {
          enabled: true,
          mode: 'x'
        },
        zoom: {
          mode: 'x',
          wheel: {
            enabled: true,
          },
          drag: {
            enabled: true,
            modifierKey: 'shift',
            mode: 'y',
            borderWidth: 1
          }
        }
      },
    }
  }
};



chart = new Chart(ctx, config);
calculateChartSize();
addYears();
getData();

if (sortBy) {
  document.getElementById("sortBy").value = sortBy;
}

if (savedTheme) {
  setTheme(savedTheme);
}
else {
  const systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
  if (systemDarkMode) setTheme('dark');
  else                setTheme('light');
}

toggleBtn.addEventListener("click", () => {
  const isDark = root.getAttribute("data-theme") === "dark";
  const newTheme = isDark ? "light" : "dark";
  setTheme(newTheme);
});


window.addEventListener('resize', () => {
  calculateChartSize();
  chart.resize();
});

