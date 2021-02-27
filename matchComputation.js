// loop through all the processed match data and
// create the aggregate info
const fs = require('fs');

var CONSTANTS = require('./constants');
// var PROCESSING = require('matchProcessing');

// let rawUserStats = fs.readFileSync('private/totalStats/users.json');
let totalStatsData = CONSTANTS.readJSONFile('private/totalStats/stats.json')

function getStatsData(){
  return totalStatsData
}

function computeAggregate(){
  computeTotalStats()
}

function computeTotalStats(){
  var statsData = {}

  var processedPath = CONSTANTS.PATHS.PROCESSED_MATCHES;

  fs.readdir(processedPath, function(err, filenames) {
    if (err) {
      onError(err);
      return;
    }
    filenames.forEach(function(filename) {
      try{
        let matchId = filename

        // TODO find a way to only process comps
        // let rawStatsData = fs.readFileSync(processedPath + filename + "/stats.json");
        let matchOverviewData = CONSTANTS.readJSONFile(processedPath + filename + "/overview.json")
        let players = matchOverviewData["scoreboard"]
        let matchStartTime = matchOverviewData["gameInfo"]["gameStartMillis"]

        for(var i = 0; i < players.length; i++){
          var player = players[i]
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
                "totalGamesPlayed": 0,
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
          let userEntity = player
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
          var kills = stats["kills"]
          var deaths = stats["deaths"]
          var assists = stats["assists"]
          var playtimeMillis = stats["playtimeMillis"]
          var defuses = stats["defuses"] == null ? 0 : stats["defuses"]
          var firstBloods = stats["firstBloods"] == null ? 0 : stats["firstBloods"]
          var plants = stats["plants"] == null ? 0 : stats["plants"]

          var curstats = statsData[subject]["stats"]
          var curscore = curstats["score"]
          var curroundsPlayed = curstats["roundsPlayed"]
          var curkills = curstats["kills"]
          var curdeaths = curstats["deaths"]
          var curassists = curstats["assists"]
          var curplaytimeMillis = curstats["playtimeMillis"]
          var curdefuses = curstats["defuses"] == null ? 0 : curstats["defuses"]
          var curfirstBloods = curstats["firstBloods"] == null ? 0 : curstats["firstBloods"]
          var curplants = curstats["plants"] == null ? 0 : curstats["plants"]

          statsData[subject]["stats"]["score"] = score + curscore
          statsData[subject]["stats"]["roundsPlayed"] = roundsPlayed + curroundsPlayed
          statsData[subject]["stats"]["kills"] = kills + curkills
          statsData[subject]["stats"]["deaths"] = deaths + curdeaths
          statsData[subject]["stats"]["assists"] = assists + curassists
          statsData[subject]["stats"]["playtimeMillis"] = playtimeMillis + curplaytimeMillis
          statsData[subject]["stats"]["defuses"] = defuses + curdefuses
          statsData[subject]["stats"]["firstBloods"] = firstBloods + curfirstBloods
          statsData[subject]["stats"]["plants"] = plants + curplants
        }

        let playerStatsData = CONSTANTS.readJSONFile(processedPath + filename + "/stats.json")

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

      }catch(err){
        console.log("TOTAL ERR "+err)
      }
    });
    totalStatsData = statsData;


    // TODO remove the data for users with less than N games played
    CONSTANTS.writeJSONFile('private/totalStats/stats.json', statsData)
  });
}

module.exports = {
  computeAggregate: computeAggregate,
  getStatsData: getStatsData
}
