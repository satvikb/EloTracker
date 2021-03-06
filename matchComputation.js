// loop through all the processed match data and
// create the aggregate info
const fs = require('fs');

var CONSTANTS = require('./constants');
var PROCESSING = require('./matchProcessing');

// let rawUserStats = fs.readFileSync('private/totalStats/users.json');
var totalStatsData = CONSTANTS.readJSONFile('private/totalStats/stats.json')
var totalPartyData = CONSTANTS.readJSONFile('private/totalStats/party.json')
console.log("Read total stats")

function getStatsData(){
  return totalStatsData
}

function computeAggregate(){
  computeTotalStats()
}

// TODO take into account alts
function computeTotalStats(){
  var statsData = {}
  var partyData = {}

  var processedPath = CONSTANTS.PATHS.PROCESSED_MATCHES;

  var processedMatches = PROCESSING.getProcessedMatchesData()
  for(var matchId in processedMatches){
    if(processedMatches.hasOwnProperty(matchId)){
      var processInfo = processedMatches[matchId]
      if(processInfo["gameStartMillis"] > CONSTANTS.EPISODE_2_ACT2_START_TIME_MILLIS){
        try{
          // TODO find a way to only process comps
          // let rawStatsData = fs.readFileSync(processedPath + filename + "/stats.json");
          let matchOverviewData = CONSTANTS.readJSONFile(processedPath + matchId + "/overview.json")

          if(!includeMatchInComputation(matchOverviewData)){
            continue
          }

          let players = matchOverviewData["scoreboard"]
          let winTeam = matchOverviewData["gameInfo"]["winningTeam"]
          let matchStartTime = matchOverviewData["gameInfo"]["gameStartMillis"]

          for(var i = 0; i < players.length; i++){
            var player = players[i]
            var playerTeam = player["teamId"]
            var subject = player["subject"]
            var stats = player["stats"]

            if(statsData[subject] == undefined){
              statsData[subject] = {
                "gameName":"",
                "tagLine":"",
                "latestMatchTime":0,
                "previousNames":[],
                "stats":{
                  "kills": 0,
                  "deaths": 0,
                  "assists": 0,
                  "playtimeMillis": 0,
                  "score": 0,
                  "roundsPlayed": 0,
                  "roundsWon": 0,
                  "totalGamesPlayed": 0,
                  "totalGamesWon": 0,
                  "defuses": 0,
                  "plants": 0,
                  "firstBloods": 0,
                  "kd": 0,
                  "headshots": 0,
                  "bodyshots": 0,
                  "legshots": 0,
                  "grenadeCasts": 0,
                  "ability1Casts": 0,
                  "ability2Casts": 0,
                  "ultimateCasts": 0
                }
              }
            }

            let userEntity = player // TODO find and replace
            if(userEntity == undefined){
              userEntity = {
                "gameName":null,
                "tagLine":null
              }
            }
            var k = statsData[subject]["latestMatchTime"]
            if(statsData[subject]["gameName"] != userEntity["gameName"] || statsData[subject]["tagLine"] != userEntity["tagLine"]){
              if(matchStartTime > k){
                // newer name
                statsData[subject]["gameName"] = userEntity["gameName"];
                statsData[subject]["tagLine"] = userEntity["tagLine"];

                statsData[subject]["latestMatchTime"] = k = matchStartTime

                if(userEntity["gameName"] != null){
                  var userStr = userEntity["gameName"]+"#"+userEntity["tagLine"]
                  statsData[subject]["previousNames"].push(userStr)
                }
                // console.log("New "+userEntity["gameName"]+" vs "+playerData[subject]["gameName"])

              }
            }


            var score = stats["score"]
            var roundsPlayed = stats["roundsPlayed"]

            var scoreKey = playerTeam.toLowerCase()+"Score"
            var roundsWon = matchOverviewData["gameInfo"][scoreKey]
            roundsWon = roundsWon == undefined ? 0 : roundsWon
            var kills = stats["kills"]
            var deaths = stats["deaths"]
            var assists = stats["assists"]
            var playtimeMillis = stats["playtimeMillis"]
            var defuses = stats["defuses"] == null ? 0 : stats["defuses"]
            var firstBloods = stats["firstBloods"] == null ? 0 : stats["firstBloods"]
            var plants = stats["plants"] == null ? 0 : stats["plants"]
            var clutches = stats["clutches"] == null ? 0 : stats["clutches"]
            var killsByNumber = stats["killsByNumber"] == null ? 0 : stats["killsByNumber"]

            if(statsData[subject]["stats"]["killsByNumber"] == undefined){
              statsData[subject]["stats"]["killsByNumber"] = {"0":0,"1":0,"2":0,"3":0,"4":0,"5":0,"6":0}
            }

            var curstats = statsData[subject]["stats"]
            var curscore = curstats["score"]
            var curroundsPlayed = curstats["roundsPlayed"]
            var curroundsWon = curstats["roundsWon"]
            var curkills = curstats["kills"]
            var curdeaths = curstats["deaths"]
            var curassists = curstats["assists"]
            var curplaytimeMillis = curstats["playtimeMillis"]
            var curdefuses = curstats["defuses"] == null ? 0 : curstats["defuses"]
            var curfirstBloods = curstats["firstBloods"] == null ? 0 : curstats["firstBloods"]
            var curplants = curstats["plants"] == null ? 0 : curstats["plants"]
            var curclutches = curstats["clutches"] == null ? 0 : curstats["plants"]
            var curkillsbynumber = curstats["killsByNumber"]


            statsData[subject]["stats"]["score"] = score + curscore
            statsData[subject]["stats"]["roundsPlayed"] = roundsPlayed + curroundsPlayed
            statsData[subject]["stats"]["roundsWon"] = roundsWon + curroundsWon

            statsData[subject]["stats"]["kills"] = kills + curkills
            statsData[subject]["stats"]["deaths"] = deaths + curdeaths
            statsData[subject]["stats"]["assists"] = assists + curassists
            statsData[subject]["stats"]["playtimeMillis"] = playtimeMillis + curplaytimeMillis
            statsData[subject]["stats"]["defuses"] = defuses + curdefuses
            statsData[subject]["stats"]["firstBloods"] = firstBloods + curfirstBloods
            statsData[subject]["stats"]["plants"] = plants + curplants
            statsData[subject]["stats"]["clutches"] = clutches + curclutches

            statsData[subject]["stats"]["killsByNumber"]["0"] = killsByNumber["0"] + curkillsbynumber["0"]
            statsData[subject]["stats"]["killsByNumber"]["1"] = killsByNumber["1"] + curkillsbynumber["1"]
            statsData[subject]["stats"]["killsByNumber"]["2"] = killsByNumber["2"] + curkillsbynumber["2"]
            statsData[subject]["stats"]["killsByNumber"]["3"] = killsByNumber["3"] + curkillsbynumber["3"]
            statsData[subject]["stats"]["killsByNumber"]["4"] = killsByNumber["4"] + curkillsbynumber["4"]
            statsData[subject]["stats"]["killsByNumber"]["5"] = killsByNumber["5"] + curkillsbynumber["5"]
            statsData[subject]["stats"]["killsByNumber"]["6"] = killsByNumber["6"] + curkillsbynumber["6"]

            statsData[subject]["stats"]["kd"] = statsData[subject]["stats"]["kills"] / statsData[subject]["stats"]["deaths"]
            statsData[subject]["stats"]["totalGamesPlayed"] += 1
            if(playerTeam == winTeam){
              statsData[subject]["stats"]["totalGamesWon"] += 1
            }
          }

          let playerStatsData = CONSTANTS.readJSONFile(processedPath + matchId + "/stats.json")

          let util = playerStatsData["util"]
          for (var subject in util) {
            // check if the property/key is defined in the object itself, not in parent
            if (util.hasOwnProperty(subject)) {
              // console.log(subject, dictionary[subject]);
              let utilEntity = util[subject];
              if(statsData[subject] == undefined){
                statsData[subject] = {
                  "stats":{
                    "grenadeCasts": 0,
                    "ability1Casts": 0,
                    "ability2Casts": 0,
                    "ultimateCasts":0
                  }
                }
              }
              statsData[subject]["stats"]["grenadeCasts"] += utilEntity["grenadeCasts"];
              statsData[subject]["stats"]["ability1Casts"] += utilEntity["ability1Casts"];
              statsData[subject]["stats"]["ability2Casts"] += utilEntity["ability2Casts"];
              statsData[subject]["stats"]["ultimateCasts"] += utilEntity["ultimateCasts"];
            }
          }

          let hits = playerStatsData["hits"]
          for (var subject in hits) {
            // check if the property/key is defined in the object itself, not in parent
            if (hits.hasOwnProperty(subject)) {
              // console.log(subject, dictionary[subject]);
              let hitsEntity = hits[subject];
              if(statsData[subject] == undefined){
                statsData[subject] = {
                  "stats":{
                    "headshots": 0,
                    "bodyshots": 0,
                    "legshots": 0
                  }
                }
              }
              statsData[subject]["stats"]["headshots"] += hitsEntity["headshots"];
              statsData[subject]["stats"]["bodyshots"] += hitsEntity["bodyshots"];
              statsData[subject]["stats"]["legshots"] += hitsEntity["legshots"];
            }
          }


          let matchPartyData = CONSTANTS.readJSONFile(processedPath + matchId + "/party.json")
          // TODO
        }catch(err){
          console.log("TOTAL ERR "+err)
        }
      }
    }
  }

  totalStatsData = statsData;
  totalPartyData = partyData;

  // TODO remove the data for users with less than N games played
  CONSTANTS.writeJSONFile('private/totalStats/stats.json', statsData)
  CONSTANTS.writeJSONFile('private/totalStats/party.json', partyData)
}
function includeMatchInComputation(matchOverviewData){
  var gameInfo = matchOverviewData["gameInfo"]
  return gameInfo["gameStartMillis"] > CONSTANTS.EPISODE_2_ACT2_START_TIME_MILLIS;
}
module.exports = {
  computeAggregate: computeAggregate,
  getStatsData: getStatsData
}
