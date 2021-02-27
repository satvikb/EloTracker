const fs = require('fs');

var CONSTANTS = require('./constants');

let processedMatchesData = CONSTANTS.readJSONFile('private/processedMatches.json');

function processMatchData(matchData){
  let matchId = matchData["matchInfo"]["matchId"]

  if(shouldProcessMatchData(matchData) == true){
    if(processedMatchesData[matchId] == undefined){
      processedMatchesData[matchId] = {}
    }

    let folderPath = CONSTANTS.PATHS.PROCESSED_MATCHES+matchId
    if (!fs.existsSync(folderPath)){
      fs.mkdirSync(folderPath);
    }
    //a9dcccc3-051b-494f-b62a-4bfe1d798106
    let matchStartTime = matchData["matchInfo"]["gameStartMillis"]
    processedMatchesData[matchId]["gameStartMillis"] = matchStartTime
    console.log("Processing "+matchId)

    if(processedMatchesData[matchId][CONSTANTS.PROCESSING.STAT] == undefined){
      processedMatchesData[matchId][CONSTANTS.PROCESSING.STAT] = 1;
      processMatchStatAnalysis(folderPath, matchData)
    }
    if(processedMatchesData[matchId][CONSTANTS.PROCESSING.OVERVIEW] == undefined){
      processedMatchesData[matchId][CONSTANTS.PROCESSING.OVERVIEW] = 1;
      processMatchOverviewAnalysis(folderPath, matchData)
    }
    if(processedMatchesData[matchId][CONSTANTS.PROCESSING.ROUND] == undefined){
      processedMatchesData[matchId][CONSTANTS.PROCESSING.ROUND] = 1;
      processMatchRoundsAnalysis(folderPath, matchData)
    }
    CONSTANTS.writeJSONFile('private/processedMatches.json', processedMatchesData)
  }else{
  }
}
function processMatchStatAnalysis(path, matchData){
  let rounds = matchData["roundResults"]
  let players = matchData["players"]

  var hitsData = {}
  var utilData = {}
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

  for(var i = 0; i < players.length; i++){
    let player = players[i];
    let subject = player["subject"]

    if(utilData[subject] == undefined){
      utilData[subject] = {
        "grenadeCasts":0,
        "ability1Casts":0,
        "ability2Casts":0,
        "ultimateCasts":0
      }
    }
    let playerStats = player["stats"]
    let abilityCasts = playerStats["abilityCasts"]
    if(abilityCasts != null){
      utilData[subject] = abilityCasts
    }
  }

  var finalData = {
    "hits":hitsData,
    "util":utilData
  }
  CONSTANTS.writeJSONFile(path+'/stats.json', finalData)
}
function processMatchOverviewAnalysis(path, matchData){
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
      "subject":subject,
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
    // "scores":scores,
    "gameStartMillis":matchStartTime
  }

  var playerValues = Object.values(playerData);
  playerValues.sort((a, b) => (a["stats"]["score"] > b["stats"]["score"]) ? 1 : -1)

  var finalUserData = {
    "scoreboard":playerValues,
    "gameInfo":gameInfoData
  }
  CONSTANTS.writeJSONFile(path+'/overview.json', finalUserData)
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
  CONSTANTS.writeJSONFile(path+'/roundStats.json', allRoundDataFinal)
}
function shouldProcessMatchData(matchData){
  let qId = matchData["matchInfo"]["queueID"]
  return qId == "competitive"
}
function readAllRawMatchData(matchDataCallback, completion){
  fs.readdir(CONSTANTS.PATHS.RAW_MATCHES, function(err, filenames) {
    if (err) {
      onError(err);
      return;
    }
    filenames.forEach(function(filename) {
      try{
        let matchId = filename.split(".")[0]
        let rawMatchData = fs.readFileSync(CONSTANTS.PATHS.RAW_MATCHES + filename);
        let matchData = JSON.parse(rawMatchData)
        matchDataCallback(matchId, matchData)
      }catch{

      }
    })
    console.log("Read all done")
    completion()
  })
}
function processAllGames(){
  readAllRawMatchData(function(matchID, matchData){
    processMatchData(matchData)
  }, function(){
    console.log("Done processing all games")
  })
}

module.exports = {
  processMatchData: processMatchData,
  processAllGames:processAllGames
}