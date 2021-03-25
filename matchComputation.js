// loop through all the processed match data and
// create the aggregate info
const fs = require('fs');

var CONSTANTS = require('./constants');
var PROCESSING = require('./matchProcessing');
var LOG = require('./logging');

// let rawUserStats = fs.readFileSync('private/totalStats/users.json');
var totalStatsData = CONSTANTS.readJSONFile('private/totalStats/stats.json')
var totalPartyData = CONSTANTS.readJSONFile('private/totalStats/party.json')
console.log("Read total stats")

function getStatsData(){
  return totalStatsData
}

function getPartyData(){
  return totalPartyData
}
function getPartyDataForParty(members, wildcard){
  if(wildcard == false){
    let key = members.sort().toString()
    return totalPartyData[key]
  }else{

    var totalData = {
      "playtimeMillis": 0,
      "totalKills": 0,
      "totalDeaths": 0,
      "totalAssists": 0,
      "members": members,
      "roundsPlayed": 0,
      "roundsWon": 0,
      "gamesPlayed":0,
      "gamesWon":0,
      "gamesByMap":{},
      "numberParties":0
    }

    for(var partyKey in totalPartyData){
      if(totalPartyData.hasOwnProperty(partyKey)){
        var curPartyData = totalPartyData[partyKey]
        var curMembers = curPartyData["members"]

        var validParty = members.every(val => curMembers.includes(val));

        if(validParty){
          totalData["numberParties"] += 1

          var playtime = curPartyData["playtimeMillis"]
          var kills = curPartyData["totalKills"]
          var deaths = curPartyData["totalDeaths"]
          var assists = curPartyData["totalAssists"]
          var roundsPlayed = curPartyData["roundsPlayed"]
          var roundsWon = curPartyData["roundsWon"]
          var gamesWon = curPartyData["gamesWon"]
          var gamesPlayed = curPartyData["gamesPlayed"]

          totalData["playtimeMillis"] += playtime
          totalData["totalKills"] += kills
          totalData["totalDeaths"] += deaths
          totalData["totalAssists"] += assists
          totalData["roundsPlayed"] += roundsPlayed
          totalData["roundsWon"] += roundsWon
          totalData["gamesWon"] += gamesWon
          totalData["gamesPlayed"] += gamesPlayed

          var mapData = curPartyData["gamesByMap"]
          for(var mapKey in mapData){
            if(mapData.hasOwnProperty(mapKey)){


              if(totalData["gamesByMap"][mapKey] == undefined){
                totalData["gamesByMap"][mapKey] = {
                  "mapName":mapData[mapKey]["mapName"],
                  "gamesWon":0,
                  "gamesPlayed":0
                }
              }

              totalData["gamesByMap"][mapKey]["gamesPlayed"] += mapData[mapKey]["gamesPlayed"]
              totalData["gamesByMap"][mapKey]["gamesWon"] += mapData[mapKey]["gamesWon"]

            }
          }
        }


      }
    }

    return totalData
  }
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
          var overviewPath = processedPath + matchId + "/overview.json"
          if(!fs.existsSync(overviewPath)){
            LOG.log(2, "Match overview DNE. Procesing match for computation "+matchId)
            PROCESSING.processMatchData(CONSTANTS.readJSONFile(CONSTANTS.PATHS.RAW_MATCHES+matchId+'.json'), true)
          }
          let matchOverviewData = CONSTANTS.readJSONFile(overviewPath)

          if(!includeMatchInComputation(matchOverviewData)){
            LOG.log(7, "Skipping match in computation for "+matchId)
            continue
          }

          let players = matchOverviewData["scoreboard"]
          let winTeam = matchOverviewData["gameInfo"]["winningTeam"]
          let matchStartTime = matchOverviewData["gameInfo"]["gameStartMillis"]

          var playerAgents = {}

          for(var i = 0; i < players.length; i++){
            var player = players[i]
            var playerTeam = player["teamId"]
            var subject = player["subject"]
            var stats = player["stats"]

            if(statsData[subject] == undefined){
              LOG.log(6, "Creating new stats data object for player "+subject)
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
                  "ultimateCasts": 0,
                  "statsByAgent":{}
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
            var agentKey = CONSTANTS.CONTENT.AGENT_NAMES[player["characterId"].toLowerCase()]
            playerAgents[subject] = player["characterId"].toLowerCase()

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

            if(statsData[subject]["stats"]["statsByAgent"] == undefined){
              statsData[subject]["stats"]["statsByAgent"] = {}
            }
            if(statsData[subject]["stats"]["statsByAgent"][agentKey] == undefined){
              statsData[subject]["stats"]["statsByAgent"][agentKey] = {
                "kills":0,
                "deaths":0,
                "assists":0,
                "playtimeMillis":0,
                "gamesWon":0,
                "gamesPlayed":0,
                "roundsPlayed":0,
                "score":0,
                "grenadeCasts": 0,
                "ability1Casts": 0,
                "ability2Casts": 0,
                "ultimateCasts":0
              }
            }
            statsData[subject]["stats"]["statsByAgent"][agentKey]["kills"] += kills
            statsData[subject]["stats"]["statsByAgent"][agentKey]["deaths"] += deaths
            statsData[subject]["stats"]["statsByAgent"][agentKey]["assists"] += assists
            statsData[subject]["stats"]["statsByAgent"][agentKey]["score"] += score
            statsData[subject]["stats"]["statsByAgent"][agentKey]["playtimeMillis"] += playtimeMillis
            statsData[subject]["stats"]["statsByAgent"][agentKey]["gamesPlayed"] += 1
            if(playerTeam == winTeam){
              statsData[subject]["stats"]["statsByAgent"][agentKey]["gamesWon"] += 1
            }
            statsData[subject]["stats"]["statsByAgent"][agentKey]["roundsPlayed"] += roundsPlayed


          }
          LOG.log(5, "Updated overview for players in match.")

          let playerStatsData = CONSTANTS.readJSONFile(processedPath + matchId + "/stats.json")

          let util = playerStatsData["util"]
          for (var subject in util) {
            if (util.hasOwnProperty(subject)) {
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

              var agentKey = CONSTANTS.CONTENT.AGENT_NAMES[playerAgents[subject.toLowerCase()]]

              statsData[subject]["stats"]["grenadeCasts"] += utilEntity["grenadeCasts"];
              statsData[subject]["stats"]["ability1Casts"] += utilEntity["ability1Casts"];
              statsData[subject]["stats"]["ability2Casts"] += utilEntity["ability2Casts"];
              statsData[subject]["stats"]["ultimateCasts"] += utilEntity["ultimateCasts"];

              statsData[subject]["stats"]["statsByAgent"][agentKey]["grenadeCasts"] += utilEntity["grenadeCasts"];
              statsData[subject]["stats"]["statsByAgent"][agentKey]["ability1Casts"] += utilEntity["ability1Casts"];
              statsData[subject]["stats"]["statsByAgent"][agentKey]["ability2Casts"] += utilEntity["ability2Casts"];
              statsData[subject]["stats"]["statsByAgent"][agentKey]["ultimateCasts"] += utilEntity["ultimateCasts"];

            }
          }
          LOG.log(5, "Updated util for players in match.")

          let hits = playerStatsData["hits"]
          for (var subject in hits) {
            if (hits.hasOwnProperty(subject)) {
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
          LOG.log(5, "Updated hits for players in match.")


          let matchPartyData = CONSTANTS.readJSONFile(processedPath + matchId + "/party.json")
          for(var partyId in matchPartyData){
            if (matchPartyData.hasOwnProperty(partyId)) {
              var curPartyData = matchPartyData[partyId]
              var members = curPartyData["members"]

              members.sort()
              var computeKey = members.toString()
              if(partyData[computeKey] == undefined){
                partyData[computeKey] = {
                  "playtimeMillis": 0,
                  "totalKills": 0,
                  "totalDeaths": 0,
                  "totalAssists": 0,
                  "members": members,
                  "roundsPlayed": 0,
                  "roundsWon": 0,
                  "gamesPlayed":0,
                  "gamesWon":0,
                  "gamesByMap":{},
                  "matchIds":[],
                  "scores":{}
                }
              }

              partyData[computeKey]["matchIds"].push(matchId)

              var playtime = curPartyData["playtimeMillis"]
              var kills = curPartyData["totalKills"]
              var deaths = curPartyData["totalDeaths"]
              var assists = curPartyData["totalAssists"]
              var roundsPlayed = curPartyData["roundsPlayed"]
              var roundsWon = curPartyData["roundsWon"]
              var wonGame = curPartyData["wonGame"]
              var partyMap = curPartyData["mapKey"]
              var mapName = CONSTANTS.CONTENT.MAP_NAMES[partyMap.toLowerCase()]

              partyData[computeKey]["playtimeMillis"] += playtime
              partyData[computeKey]["totalKills"] += kills
              partyData[computeKey]["totalDeaths"] += deaths
              partyData[computeKey]["totalAssists"] += assists
              partyData[computeKey]["roundsPlayed"] += roundsPlayed
              partyData[computeKey]["roundsWon"] += roundsWon
              partyData[computeKey]["gamesWon"] += (wonGame ? 1 : 0)
              partyData[computeKey]["gamesPlayed"] += 1

              if(partyData[computeKey]["gamesByMap"][partyMap] == undefined){
                partyData[computeKey]["gamesByMap"][partyMap] = {
                  "mapName":mapName,
                  "gamesWon":0,
                  "gamesPlayed":0
                }
              }
              partyData[computeKey]["gamesByMap"][partyMap]["gamesPlayed"] += 1
              partyData[computeKey]["gamesByMap"][partyMap]["gamesWon"] += (wonGame ? 1 : 0)

            }
          }
          for(var partyKey in partyData){
            if (partyData.hasOwnProperty(partyKey)) {
              partyData[partyKey]["matchIds"] = [...new Set(partyData[partyKey]["matchIds"])]
            }
          }
          LOG.log(5, "Updated party for players in match.")

          LOG.log(4, "Computation done for match "+matchId)
        }catch(err){
          LOG.log(0, "Error in computation for match: "+err)
        }
      }
    }
  }

  totalPartyData = partyData;

  // remove the data for users with less than N games played
  var filteredStats = Object.keys(statsData).reduce(function (filteredStats, key) {
    if (statsData[key]["stats"]["totalGamesPlayed"] >= 0) filteredStats[key] = statsData[key];
    return filteredStats;
  }, {});

  totalStatsData = filteredStats;//statsData;

  CONSTANTS.writeJSONFile('private/totalStats/stats.json', filteredStats)
  CONSTANTS.writeJSONFile('private/totalStats/party.json', partyData)
  LOG.log(3, "Computation for all matches done")
}
function includeMatchInComputation(matchOverviewData){
  var gameInfo = matchOverviewData["gameInfo"]
  return gameInfo["gameStartMillis"] > CONSTANTS.EPISODE_2_ACT2_START_TIME_MILLIS;
}
module.exports = {
  computeAggregate: computeAggregate,
  getStatsData: getStatsData,
  getPartyData: getPartyData,
  getPartyDataForParty:getPartyDataForParty
}
