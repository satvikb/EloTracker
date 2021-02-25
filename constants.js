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
for (var i = 0; i < contentData["Characters"].length; i++) {
  AGENT_NAMES[contentData["Characters"][i]["ID"].toLowerCase()] = contentData["Characters"][i]["Name"]
}

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
    ROUND:"roundAnalysis"
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
  COMMANDS:{
    ELO:"elo",
    PLAYTIME:"playtime",
    PROCESSALL:"processall",
    COMPUTEALL:"computeall"
  }
}
