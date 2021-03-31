const fs = require('fs');

let contentData = readJSONFile('private/static/content.json');

let PROCESSING_USER_ANALYSIS = "userAnalysis";
let PROCESSING_HIT_ANALYSIS = "hitAnalysis";
let PROCESSING_ROUND_ANALYSIS = "roundAnalysis";
let PROCESSING_UTIL_ANALYSIS = "utilAnalysis";
let PROCESSING_DISTANCE_ANALYSIS = "distanceAnalysis";

let MATCHES_RAW_PATH = "matches/raw/"
let MATCHES_PROCESSED_PATH = "matches/processed/"

let LEADERBOARD_MATCHES_RAW_PATH = "leaderboard/matches/raw/"
let LEADERBOARD_MATCHES_PROCESSED_PATH = "leaderboard/matches/processed/"

var AGENT_NAMES = {}
var AGENT_PORTRAITS = {}
var AGENT_BUST_PORTRAITS = {}
var AGENT_ABILITY_ICONS = {}
for (var i = 0; i < contentData["Characters"].length; i++) {
  var id = contentData["Characters"][i]["ID"].toLowerCase()
  AGENT_NAMES[id] = contentData["Characters"][i]["Name"]

  var portraitPath = "images/agents/displayicons/"+id+".png"
  if(fs.existsSync(portraitPath)){
    AGENT_PORTRAITS[id] = fs.readFileSync(portraitPath)
  }

  var bustPortraitPath = "images/agents/bustportraits/"+id+".png"
  if(fs.existsSync(bustPortraitPath)){
    AGENT_BUST_PORTRAITS[id] = fs.readFileSync(bustPortraitPath)
  }

  var abilityFolder = "images/agents/abilityicons/"+id+"/"
  if(fs.existsSync(abilityFolder)){
    AGENT_ABILITY_ICONS[id] = {}
    if(fs.existsSync(abilityFolder+"ability1.png")){
      AGENT_ABILITY_ICONS[id]["ability1"] = fs.readFileSync(abilityFolder+"ability1.png")
    }
    if(fs.existsSync(abilityFolder+"ability2.png")){
      AGENT_ABILITY_ICONS[id]["ability2"] = fs.readFileSync(abilityFolder+"ability2.png")
    }
    if(fs.existsSync(abilityFolder+"grenade.png")){
      AGENT_ABILITY_ICONS[id]["grenade"] = fs.readFileSync(abilityFolder+"grenade.png")
    }
    if(fs.existsSync(abilityFolder+"ultimate.png")){
      AGENT_ABILITY_ICONS[id]["ultimate"] = fs.readFileSync(abilityFolder+"ultimate.png")
    }
  }
}

var RANK_IMAGES = {}
for(var i = 0; i < 25; i++){
  var tierPath = "images/TX_CompetitiveTier_Large_"+i+".png"
  if(fs.existsSync(tierPath)){
    RANK_IMAGES[i+""] = fs.readFileSync(tierPath)
    // console.log("load rank "+i)
  }
}

var MAP_NAMES = {}
var MAP_SPLASHES = {}
for (var i = 0; i < contentData["Maps"].length; i++) {
  var asset = contentData["Maps"][i]["AssetName"].toLowerCase()
  var name = contentData["Maps"][i]["Name"]
  MAP_NAMES[asset] = name

  var splashPath = "images/backgrounds/"+name.toLowerCase()+".png"
  if(fs.existsSync(splashPath)){
    MAP_SPLASHES[asset] = fs.readFileSync(splashPath)
  }
}

var GUN_NAMES = {}
for (var i = 0; i < contentData["Equips"].length; i++) {
  var id = contentData["Equips"][i]["ID"]
  var name = contentData["Equips"][i]["Name"]
  GUN_NAMES[id] = name
}
console.log("Loading static content done")

const download = require('image-downloader')

function loadImages(){
  for (var i = 0; i < contentData["Characters"].length; i++) {
    var id = contentData["Characters"][i]["ID"].toLowerCase()
    var url = 'https://media.valorant-api.com/agents/'+id+'/abilities/ultimate/displayicon.png'


    // fs.mkdirSync('images/agents/abilityicons/'+id);

    const options = {
      url: url,
      dest: 'images/agents/abilityicons/'+id+"/ultimate.png"                // will be saved to /path/to/dest/image.jpg
    }
    // console.log("DL "+url)
    download.image(options)
  }
}
// loadImages()

function readJSONFile(path){
  return JSON.parse(fs.readFileSync(path))
}

function writeJSONFile(path, object){
  fs.writeFileSync(path, JSON.stringify(object, null, 2) , 'utf-8');
}

module.exports = {
  readJSONFile:readJSONFile,
  writeJSONFile:writeJSONFile,
  PREFIX:'?',
  PROCESSING:{
    OVERVIEW:"overviewAnalysis",
    STAT:"statAnalysis",
    ROUND:"roundAnalysis",
    PARTY:"partyAnalysis"
  },
  PATHS:{
    RAW_MATCHES:"matches/raw/",
    PROCESSED_MATCHES:"matches/processed/"
  },
  CHART:{
    DAMAGE:"Damage",
    SCORE:"Score",
    ECONOMY:"Economy",
    CARRY:"Carry"
  },
  RANK_ARROWS:{
    INC_MAJOR:"MAJOR_INCREASE",
    DEC_MAJOR:"MAJOR_DECREASE",
    INC_MINOR:"MINOR_INCREASE",
    DEC_MINOR:"MINOR_DECREASE",
    INCREASE:"INCREASE",
    DECREASE:"DECREASE",
    PROMOTED:"PROMOTED",
    DEMOTED:"DEMOTED",
    DRAW:"STABLE"
  },
  RANK_EMOJIS:{
    INC_MAJOR:"<:rank_major_increase:797332822859055104>",
    DEC_MAJOR:"<:rank_major_decrease:797316110482538526>",
    INC_MINOR:"<:rank_minor_increase:797323018120331285>",
    DEC_MINOR:"<:rank_minor_decrease:797322976022364170>",
    INCREASE:"<:rank_medium_increase:797332778730782721>",
    DECREASE:"<:rank_medium_decrease:797322863722889257>",
    PROMOTED:"<:rank_promote:797348352664272947>",
    DEMOTED:"<:rank_demote:797348431609593856>",
    DRAW:"<:rank_stable:797332889971720213>"
  },
  CHART:{
    WIDTH: 700
  },
  DEFAULT_MSG_COLOR: "#000000",
  RANKS:{
    "0": "Unrated",
    "1": "Unknown 1",
    "2": "Unknown 2",
    "3": "Iron 1",
    "4": "Iron 2",
    "5": "Iron 3",
    "6": "Bronze 1",
    "7": "Bronze 2",
    "8": "Bronze 3",
    "9": "Silver 1",
    "10": "Silver 2",
    "11": "Silver 3",
    "12": "Gold 1",
    "13": "Gold 2",
    "14": "Gold 3",
    "15": "Platinum 1",
    "16": "Platinum 2",
    "17": "Platinum 3",
    "18": "Diamond 1",
    "19": "Diamond 2",
    "20": "Diamond 3",
    "21": "Immortal 1",
    "22": "Immortal 2",
    "23": "Immortal 3",
    "24": "Radiant"
  },
  EPISODE_2_START_TIME_MILLIS:1610442000000,
  EPISODE_2_ACT2_START_TIME_MILLIS:1614694500000,
  COMMANDS:{
    ELO:"elo",
    STATS:"stats",
    PLAYTIME:"playtime",
    PARTY:"party",
    PARTYRAWID:"partywithids",
    PARTIES:"parties",
    PROCESSALL:"processall",
    COMPUTEALL:"computeall",
    SETCOLOR:"setcolor",
    HISTORY:"history",
    AGENTWINLOSS:"agentwinloss",
    AWL:"awl",
    HISTORYIMAGE:"lm", // latestmatch,
    MINING:"mining",
    MININGHISTORY:"mininghistory",
    GUNS:"guns"
  },
  DISCORD_ADMIN_USERS:["295701594715062272"],
  CONTENT:{
    AGENT_NAMES: AGENT_NAMES,
    AGENT_PORTRAITS: AGENT_PORTRAITS,
    AGENT_BUST_PORTRAITS:AGENT_BUST_PORTRAITS,
    AGENT_ABILITY_ICONS: AGENT_ABILITY_ICONS,
    MAP_NAMES: MAP_NAMES,
    MAP_SPLASHES: MAP_SPLASHES,
    RANK_IMAGES: RANK_IMAGES,
    GUN_NAMES: GUN_NAMES
  }
}
