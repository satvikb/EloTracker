var AUTH = require('auth');
var CONSTANTS = require('constanrs');

let matchesDownloadedData = readJSONFile('private/matchesDownloaded.json');
let processedMatchesData = readJSONFile('private/processedMatches.json');
let matchHistoryData = readJSONFile('private/matchHistory.json');

function readJSONFile(path){
  return JSON.parse(fs.readFileSync(path))
}

// So we download all the last 20 matches and combine it with the existing match history
// The only problem here is if there are more than 20 matches played since last downloaded
// This problem is fixed by the cron job
/*
  Retrieve last 20 match data.
  If the user already exists:
    Combine with existing match data.
  Else:
    Work on downloading everything in the background.
  Completion with data (only 20 if new user).

  Download all match details.
*/
function matchHistory(userId, completion){
  let url = 'https://pd.na.a.pvp.net/mmr/v1/players/'+userId+"/competitiveupdates?startIndex=0&endIndex=20"
  AUTH.getRequest(url, function(data){
    let matches = data["Matches"]

    var newMatchIDs = matches.reduce(function(filtered, match) {
      var matchStartTime = match["MatchStartTime"]
      if (matchStartTime >= EPISODE_2_START_TIME_MILLIS) {
         var matchId = match["MatchID"]
         filtered.push(matchId);
      }
      return filtered;
    }, []);

    var oldMatchesAsArray = []
    var oldMatchesUser = matchHistoryData[userId]
    if(oldMatchesUser != undefined){
      var oldMatches = oldMatchesUser["Matches"]
      for (var key in oldMatches) {
        if (oldMatches.hasOwnProperty(key) && !newMatchIDs.includes(key) == false) {
          oldMatchesAsArray.push(oldMatches[key])
        }
      }
    }else{
      // first time user get everything
      // console.log("Getting entire match history for new user "+userId)
      // updateUserElo(userId, accessToken, entitlementsToken, true, function(){
      //
      // }, true, false)
    }

    var totalMatchesWithExisting = matches.concat(oldMatchesAsArray)
    var finalJson = {
      "Subject":userId,
      "Matches":totalMatchesWithExisting
    }

    completion(finalJson)
    saveMatchHistory(userId, totalMatchesWithExisting)
    downloadMatchIDs(userId, newMatchIDs)
  })
}

// Update matchHistory.json
/*
 matchInfo = [
 {
  "MID":"",
  "TierAfter":0
  }
]

*/
function saveMatchHistory(userId, matchInfo){
  if(matchHistoryData[userId] == undefined){
    matchHistoryData[userId] = {
      "Matches":{},
      "MatchSort":[]
    }
  }

  for(var i = 0; i < matchInfo.length; i++){
    var curMatchInfo = matchInfo[i]
    var matchId = curMatchInfo["MatchID"]
    matchHistoryData[userId]["Matches"][matchId] = matchInfo[matchId]
  }

  var matchItems = Object.keys(matchHistoryData[subject]["Matches"]).map(function(key) {
    return [key, matchHistoryData[subject]["Matches"][key]];
  });
  matchItems.sort(function(firstObj, secondObj) {
    var firstMatch = firstObj[1]
    var secondMatch = secondObj[1]

    return secondMatch["MatchStartTime"] - firstMatch["MatchStartTime"]
  })
  var matchSortArray = []
  for(var i = 0; i < matchItems.length; i++){
    var match = matchItems[i][1]
    var matchId = match["MatchID"]
    matchSortArray.push(matchId)
  }
  matchHistoryData[subject]["MatchSort"] = matchSortArray

  fs.writeFileSync('private/matchHistory.json', JSON.stringify(matchHistoryData, null, 2), 'utf-8');
}

function downloadMatchIDs(userId, matchIDs){
  if(matchIDs != null){
    if(matchesDownloadedData[userId] == undefined){
      matchesDownloadedData[userId] = {}
    }

    AUTH.getLatestAuth(function(ent, tok){
      var allRequests = []
      for(var i = 0; i < matchIDs.length; i++){
        var matchId = matchIDs[i]
        if(matchesDownloadedData[userId][matchId] == undefined){
          var url = 'https://pd.na.a.pvp.net/match-details/v1/matches/'+matchId
          var matchReq = AUTH.getRequestPromise(url, ent, tok)
          allRequests.push(matchReq);
        }
      }
    })
  }
  Promise.all(allRequests).then((allMatchData) => {
    for(var i = 0; i < allMatchData.length; i++){
      var matchData = JSON.parse(allMatchData[i])
      var matchId = matchData["matchInfo"]["matchId"]

      matchesDownloadedData[subject][matchID] = 1
      saveMatchToFile(matchId, matchData)

    }
    fs.writeFileSync('private/matchesDownloaded.json', JSON.stringify(matchesDownloadedData, null, 2), 'utf-8');
  })
}

function processMatchData(matchData){
  let matchId = matchData["matchInfo"]["matchId"]

  if(shouldProcessMatchData(matchData)){
    if(processedMatchesData[matchId] == undefined){
      processedMatchesData[matchId] = {}
    }

    let folderPath = CONSTANTS.PATHS.PROCESSED_MATCHES+matchId
    if (!fs.existsSync(folderPath)){
      fs.mkdirSync(folderPath);
    }

    let matchStartTime = matchData["matchInfo"]["gameStartMillis"]
    processedMatchesData[matchId]["gameStartMillis"] = matchStartTime
    if(processedMatchesData[matchId][CONSTANTS.PROCESSING.HIT] == undefined){
      processedMatchesData[matchID][CONSTANTS.PROCESSING.HIT] = 1;
      processMatchHitAnalysis(folderPath, matchData)
    }
    if(processedMatchesData[matchId][CONSTANTS.PROCESSING.USER] == undefined){
      processedMatchesData[matchID][CONSTANTS.PROCESSING.USER] = 1;
      processMatchUserAnalysis(folderPath, matchData)
    }
    if(processedMatchesData[matchId][CONSTANTS.PROCESSING.ROUND] == undefined){
      processedMatchesData[matchID][CONSTANTS.PROCESSING.ROUND] = 1;
      processMatchRoundsAnalysis(folderPath, matchData)
    }
    if(processedMatchesData[matchId][CONSTANTS.PROCESSING.MATCH] == undefined){
      processedMatchesData[matchID][CONSTANTS.PROCESSING.MATCH] = 1;
      processMatchMatchAnalysis(folderPath, matchData)
    }
    fs.writeFileSync('private/processedMatches.json', JSON.stringify(processedMatchesData, null, 2) , 'utf-8');
  }
}

function processMatchHitAnalysis(path, matchData){
  let rounds = matchData["roundResults"]
  var hitsData = {}
  for(var i = 0; i < rounds.length; i++){
    let roundData = rounds[i];
    let roundPlayerStats = roundData["playerStats"];
    for(var j = 0; j < roundPlayerStats.length; j++){
      let playerData = roundPlayerStats[j];
      let subject = playerData["subject"]
      let damageData = playerData["damage"];
      for(var k = 0; k < damageData.length; k++){
        let damageEntity = damageData[k];
        if(hitsData[subject] == undefined){
          hitsData[subject] = {
            "headshots":0,
            "bodyshots":0,
            "legshots":0
          }
        }
        hitsData[subject]["headshots"] += damageEntity["headshots"];
        hitsData[subject]["bodyshots"] += damageEntity["bodyshots"];
        hitsData[subject]["legshots"] += damageEntity["legshots"];
      }
    }
  }
  fs.writeFileSync(path+'/hits.json', JSON.stringify(hitsData, null, 2) , 'utf-8');
}

function processMatchUserAnalysis(path, matchData){
  var matchID = matchData["matchInfo"]["matchId"]
  var mapId = matchData["matchInfo"]["mapId"]
  var matchStartTime = matchData["matchInfo"]["gameStartMillis"]

  let players = matchData["players"]
  var playerData = {}

  var blueTeamHighestScore = 0
  var blueTeamHighestScoreSubject = ""

  var redTeamHighestScore = 0
  var redTeamHighestScoreSubject = ""

  var scores = []
  for(var i = 0; i < players.length; i++){
    let playerInfo = players[i];
    let subject = playerInfo["subject"]
    playerData[subject] = {
      "gameName":playerInfo["gameName"],
      "tagLine":playerInfo["tagLine"],
      "partyId":playerInfo["partyId"],
      "characterId":playerInfo["characterId"],
      "stats":playerInfo["stats"],
      "teamId":playerInfo["teamId"]
    }
    scores.push(playerInfo["stats"]["score"])

    let playerScore = playerInfo["stats"]["score"]
    let playerTeam = playerInfo["teamId"]

    if(playerTeam == "Blue" && playerScore > blueTeamHighestScore){
      blueTeamHighestScore = playerScore
      blueTeamHighestScoreSubject = subject
    }
    if(playerTeam == "Red" && playerScore > redTeamHighestScore){
      redTeamHighestScore = playerScore
      redTeamHighestScoreSubject = subject
    }
  }
  scores.sort(function(a, b){return b-a})

  var redTeamScore = 0;
  var blueTeamScore = 0;

  var rounds = matchData["roundResults"]
  for(var i = 0; i < rounds.length; i++){
    var roundData = rounds[i]

    let winningTeam = roundData["winningTeam"]

    if(winningTeam == "Blue"){
      blueTeamScore += 1
    }else{
      redTeamScore += 1
    }

    let roundResult = roundData["roundResultCode"]

    if(roundResult != "Surrendered"){
      var planter = roundData["bombPlanter"]
      var defuser = roundData["bombDefuser"]
      if(planter != undefined){
        if(playerData[planter]["stats"]["plants"] == undefined){
          playerData[planter]["stats"]["plants"] = 0
        }
        playerData[planter]["stats"]["plants"] += 1
      }

      if(defuser != undefined){
        if(playerData[defuser]["stats"]["defuses"] == undefined){
          playerData[defuser]["stats"]["defuses"] = 0
        }
        playerData[defuser]["stats"]["defuses"] += 1
      }

      var earlistKillTime = Number.MAX_SAFE_INTEGER
      var earliestKillSubject = ""
      // calculate first bloods
      var roundPlayerStats = roundData["playerStats"]
      for(var p = 0; p < roundPlayerStats.length; p++){
        var player = roundPlayerStats[p]
        var curSubject = player["subject"]
        var playerKills = player["kills"];
        for(var k = 0; k < playerKills.length; k++){
          var killData = playerKills[k]
          var killTime = killData["roundTime"]
          if(killTime < earlistKillTime){
            earlistKillTime = killTime
            earliestKillSubject = curSubject
          }
        }
      }

      if(playerData[earliestKillSubject]["stats"]["firstBloods"] == undefined){
        playerData[earliestKillSubject]["stats"]["firstBloods"] = 0
      }
      playerData[earliestKillSubject]["stats"]["firstBloods"] += 1
    }
  }

  var winningTeam = redTeamScore > blueTeamScore ? "Red" : (redTeamScore == blueTeamScore ? "Draw" : "Blue")

  var teamMVP = ""
  var matchMVP = ""

  if(redTeamHighestScore > blueTeamHighestScore){
    // red team has match mvp, blue team has team mvp
    matchMVP = redTeamHighestScoreSubject
    teamMVP = blueTeamHighestScoreSubject
  }else{
    matchMVP = blueTeamHighestScoreSubject
    teamMVP = redTeamHighestScoreSubject
  }

  var gameInfoData = {
    "teamMVP":teamMVP,
    "matchMVP":matchMVP,
    "blueScore":blueTeamScore,
    "redScore":redTeamScore,
    "winningTeam":winningTeam,
    "matchID":matchID,
    "mapId":mapId,
    "scores":scores,
    "gameStartMillis":matchStartTime
  }

  var finalUserData = {
    "users":playerData,
    "gameInfo":gameInfoData
  }

  fs.writeFileSync(path+'/users.json', JSON.stringify(finalUserData, null, 2) , 'utf-8');
}

function processMatchRoundsAnalysis(path, matchData){
  var allRoundDataFinal = {}

  let matchPlayers = matchData["players"]
  var playerCharacters = {}

  var teamInfo = {}
  for(var p = 0; p < matchPlayers.length; p++){
    teamInfo[matchPlayers[p]["subject"]] = matchPlayers[p]["teamId"]
    playerCharacters[matchPlayers[p]["subject"]] = matchPlayers[p]["characterId"]
  }

  allRoundDataFinal["teamInfo"] = teamInfo

  let rounds = matchData["roundResults"]

  var roundDataFinal = {}
  var roundWinInfo = {}
  var roundResultInfo = {}
  var roundScoreTotals = {}

  for(var i = 0; i < rounds.length; i++){
    let roundData = rounds[i];

    let roundNum = roundData["roundNum"]
    let winningTeam = roundData["winningTeam"]
    let roundResult = roundData["roundResultCode"]

    roundWinInfo[""+roundNum] = winningTeam
    roundResultInfo[""+roundNum] = roundResult

    if(roundResult != "Surrendered"){

    let roundPlayerStats = roundData["playerStats"];
    for(var j = 0; j < roundPlayerStats.length; j++){
        let playerData = roundPlayerStats[j];
        let subject = playerData["subject"];
        let playerTeam = teamInfo[subject]

        let score = playerData["score"];

        if(roundDataFinal[subject] == undefined){
          roundDataFinal[subject] = []
        }

        if(roundScoreTotals[subject] == undefined){
          roundScoreTotals[subject] = 0
        }
        roundScoreTotals[subject] += score

        var roundPlayerData = {}

        roundPlayerData["roundNum"] = roundNum

        // compute damage breakdown
        roundPlayerData["damage"] = {}
        roundPlayerData["damage"]["total"] = 0;
        let damageData = playerData["damage"];
        var damageBreakdown = []
        for(var k = 0; k < damageData.length; k++){
          let damageEntity = damageData[k];
          let breakdownEntity = {
            "receiver":damageEntity["receiver"],
            "damage":damageEntity["damage"]
          }
          roundPlayerData["damage"]["total"] += damageEntity["damage"]
          damageBreakdown.push(breakdownEntity)
        }
        roundPlayerData["damage"]["breakdown"] = damageBreakdown

        // compute kills
        var killBreakdown = []
        let killData = playerData["kills"]
        for(var k = 0; k < killData.length; k++){
          let killEntity = killData[k]
          let roundTime = killEntity["roundTime"]
          let gameTime = killEntity["gameTime"]
          let victim = killEntity["victim"]
          let killer = killEntity["killer"]
          let victimLocation = killEntity["victimLocation"]

          let killerLocation = {}
          var playerLocations = killEntity["playerLocations"]
          for(var l = 0; l < playerLocations.length; l++){
            let playerLocation = playerLocations[l];
            let playerLocationSubject = playerLocation["subject"]

            if(playerLocationSubject == killer){
              killerLocation["x"] = playerLocation["location"]["x"]
              killerLocation["y"] = playerLocation["location"]["y"]
              killerLocation["viewRadians"] = playerLocation["viewRadians"]
              break;
            }
          }

          var playerKillData = {}
          playerKillData["roundTime"] = roundTime
          playerKillData["gameTime"] = gameTime
          playerKillData["victim"] = victim
          playerKillData["victimLocation"] = victimLocation
          playerKillData["killerLocation"] = killerLocation
          killBreakdown.push(playerKillData)

        }
        roundPlayerData["kills"] = killBreakdown

        // economy breakdown
        var economyBreakdown = {}
        var economyData = playerData["economy"]

        economyBreakdown["value"] = economyData["loadoutValue"]
        economyBreakdown["remaining"] = economyData["remaining"]
        economyBreakdown["spent"] = economyData["spent"]
        economyBreakdown["weapon"] = economyData["weapon"]
        economyBreakdown["armor"] = economyData["armor"]
        roundPlayerData["economy"] = economyBreakdown

        roundPlayerData["score"] = score;

        roundDataFinal[subject].push(roundPlayerData)
      }
    }
  }

  allRoundDataFinal["winResults"] = roundWinInfo
  allRoundDataFinal["roundInfo"] = roundDataFinal
  allRoundDataFinal["scoreTotals"] = roundScoreTotals
  allRoundDataFinal["roundResults"] = roundResultInfo

  allRoundDataFinal["playerCharacters"] = playerCharacters

  fs.writeFileSync(path+'/roundStats.json', JSON.stringify(allRoundDataFinal, null, 2) , 'utf-8');
}

function processMatchMatchAnalysis(path, matchData){
    // score board recreation
}

function shouldProcessMatchData(matchData){
  let qId = matchData["matchInfo"]["queueID"]
  return qId == "competitive"
}

function saveMatchToFile(matchId, matchData){
  var rawPath = rawMatchPath(matchId)
  fs.writeFileSync(rawPath, JSON.stringify(matchData, null, 2), 'utf8');
}

function rawMatchPath(matchID){
  return CONSTANTS.PATHS.RAW_MATCHES+matchID+'.json'
}

modules.exports = {
  matchHistory: matchHistory
}
