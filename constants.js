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

let CHART_TYPE_DAMAGE = "Damage"
let CHART_TYPE_SCORE = "Score"
let CHART_TYPE_ECONOMY = "Economy"
let CHART_TYPE_CARRY = "Carry"

let COMP_INC_MAJOR = "MAJOR_INCREASE"
let COMP_DEC_MAJOR = "MAJOR_DECREASE"
let COMP_INC_MINOR = "MINOR_INCREASE"
let COMP_DEC_MINOR = "MINOR_DECREASE"
let COMP_INCRASE = "INCREASE"
let COMP_DECREASE = "DECREASE"
let COMP_PROMOTED = "PROMOTED"
let COMP_DEMOTED = "DEMOTED"
let COMP_DRAW = "STABLE"

let EMOJI_COMP_INC_MAJOR = "<:rank_major_increase:797332822859055104> "
let EMOJI_COMP_DEC_MAJOR = "<:rank_major_decrease:797316110482538526> "
let EMOJI_COMP_INC_MINOR = "<:rank_minor_increase:797323018120331285> "
let EMOJI_COMP_DEC_MINOR = "<:rank_minor_decrease:797322976022364170> "
let EMOJI_COMP_INCRASE = "<:rank_medium_increase:797332778730782721> "
let EMOJI_COMP_DECREASE = "<:rank_medium_decrease:797322863722889257> "
let EMOJI_COMP_PROMOTED = "<:rank_promote:797348352664272947>"
let EMOJI_COMP_DEMOTED = "<:rank_demote:797348431609593856>"
let EMOJI_COMP_DRAW = "<:rank_stable:797332889971720213>"

let ELO_CHART_WIDTH = 700
let EPISODE_2_START_TIME_MILLIS = 1610442000000

var RANKS = {
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
}

var AGENT_NAMES = {}
for (var i = 0; i < contentData["Characters"].length; i++) {
  AGENT_NAMES[contentData["Characters"][i]["ID"].toLowerCase()] = contentData["Characters"][i]["Name"]
}

function readJSONFile(path){
  return JSON.parse(fs.readFileSync(path))
}

modules.exports = {
  PROCESSING:{
    USER:"userAnalysis",
    HIT:"hitAnalysis",
    ROUND:"roundAnalysis",
    UTIL:"utilAnalysis",
    DISTANCE:"distanceAnalysis",
    MATCH:"matchAnalysis"
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

  }
}
