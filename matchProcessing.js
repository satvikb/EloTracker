const fs = require('fs');

var CONSTANTS = require('./constants');
var LOG = require('./logging');

var processedMatchesData = CONSTANTS.readJSONFile('private/processedMatches.json');

function processMatchData(matchData, force){
  let matchId = matchData["matchInfo"]["matchId"]

  if(shouldProcessMatchData(matchData) == true){
    if(processedMatchesData[matchId] == undefined || force){
      LOG.log(6, "Force processing match "+matchId)
      processedMatchesData[matchId] = {}
    }

    let folderPath = CONSTANTS.PATHS.PROCESSED_MATCHES+matchId
    if (!fs.existsSync(folderPath)){
      LOG.log(5, "Making folder for processing "+folderPath)
      fs.mkdirSync(folderPath);
    }
    //a9dcccc3-051b-494f-b62a-4bfe1d798106
    let matchStartTime = matchData["matchInfo"]["gameStartMillis"]
    processedMatchesData[matchId]["gameStartMillis"] = matchStartTime

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
    if(processedMatchesData[matchId][CONSTANTS.PROCESSING.PARTY] == undefined){
      processedMatchesData[matchId][CONSTANTS.PROCESSING.PARTY] = 1;
      processMatchPartyAnalysis(folderPath, matchData)
    }
    CONSTANTS.writeJSONFile('private/processedMatches.json', processedMatchesData)
    LOG.log(4, "Updated processed matches file")
  }else{
    LOG.log(7, "Not processing match "+matchId)
  }
}
function processMatchStatAnalysis(path, matchData){
  let rounds = matchData["roundResults"]
  let players = matchData["players"]

  var hitsData = {}
  var utilData = {}
  var gunsData = {}

  LOG.log(7, "Processing stat analysis "+path)

  for(var i = 0; i < rounds.length; i++){
    let roundData = rounds[i];
    let roundPlayerStats = roundData["playerStats"];
    for(var j = 0; j < roundPlayerStats.length; j++){
      let playerData = roundPlayerStats[j];
      let subject = playerData["subject"]
      let damageData = playerData["damage"];

      // only with kills can we confirm the weapon used
      var killsByDamage = {}
      for(var k = 0; k < damageData.length; k++){
        let damageEntity = damageData[k];
        var damage = damageEntity["damage"]
        var receiver = damageEntity["receiver"]

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

        if(damage >= 150){
          // a kill
          if(killsByDamage[subject] == undefined){
            killsByDamage[subject] = {}
          }
          killsByDamage[subject][receiver] = damageEntity
        }
      }

      let killData = playerData["kills"];
      for(var k = 0; k < killData.length; k++){
        if(gunsData[subject] == undefined){
          gunsData[subject] = {}
        }

        var kill = killData[k]

        var finishingDamage = kill["finishingDamage"]
        var finishingWeapon = finishingDamage["damageItem"]
        var secondary = finishingDamage["isSecondaryFireMode"]

        if(gunsData[subject][finishingWeapon] == undefined){
          gunsData[subject][finishingWeapon] = {
            "hits":{
              "headshots":0,
              "bodyshots":0,
              "legshots":0
            },
            "kills":0,
            "secondaryFireKills":0,
            "totalDistance":0
          }
        }

        var victim = kill["victim"]
        var victimLocation = kill["victimLocation"]

        var playerLocations = kill["playerLocations"]
        for(var l = 0; l < playerLocations.length; l++){
          var pl = playerLocations[l]
          if(pl["subject"] == subject){
            var sl = pl["location"]
            // the player that got the kill
            var a = victimLocation["x"]-sl["x"]
            var b = victimLocation["y"]-sl["y"]
            var distance = Math.sqrt(a*a + b*b)
            gunsData[subject][finishingWeapon]["totalDistance"] += distance
          }
        }

        gunsData[subject][finishingWeapon]["kills"] += 1
        gunsData[subject][finishingWeapon]["secondaryFireKills"] += secondary ? 1 : 0

        if(killsByDamage[subject] != undefined){ // subject got kills
          var killByDamage = killsByDamage[subject][victim]
          if(killByDamage != undefined){
            gunsData[subject][finishingWeapon]["hits"]["headshots"] += killByDamage["headshots"]
            gunsData[subject][finishingWeapon]["hits"]["bodyshots"] += killByDamage["bodyshots"]
            gunsData[subject][finishingWeapon]["hits"]["legshots"] += killByDamage["legshots"]
          }
        }
      }
      // console.log("")

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
    "util":utilData,
    "guns":gunsData
  }
  CONSTANTS.writeJSONFile(path+'/stats.json', finalData)
  LOG.log(4, "Processed stats analysis "+path)
}
function processMatchOverviewAnalysis(path, matchData){
  var matchID = matchData["matchInfo"]["matchId"]
  var mapId = matchData["matchInfo"]["mapId"]
  var matchStartTime = matchData["matchInfo"]["gameStartMillis"]
  var gameLengthMillis = matchData["matchInfo"]["gameLengthMillis"]

  let players = matchData["players"]
  var playerData = {}
  var playerTeams = {}

  var blueTeamHighestScore = 0
  var blueTeamHighestScoreSubject = ""

  var redTeamHighestScore = 0
  var redTeamHighestScoreSubject = ""

  var scores = []
  // var playersInMatch = new Set()
  for(var i = 0; i < players.length; i++){
    let playerInfo = players[i];
    let subject = playerInfo["subject"]
    // playersInMatch.add(subject)
    playerTeams[subject] = playerInfo["teamId"]
    playerData[subject] = {
      "subject":subject,
      "gameName":playerInfo["gameName"],
      "tagLine":playerInfo["tagLine"],
      "partyId":playerInfo["partyId"],
      "characterId":playerInfo["characterId"],
      "stats":playerInfo["stats"],
      "teamId":playerInfo["teamId"],
      "competitiveTier":playerInfo["competitiveTier"]
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
    roundResult == "" ? roundData["roundResult"] : roundResult
    let roundCeremony = roundData["roundCeremony"]

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

      var latestKillTime = 0
      var latestKillSubject = ""
      // calculate first bloods
      var roundPlayerStats = roundData["playerStats"]
      // var playersDead = new Set()
      for(var p = 0; p < roundPlayerStats.length; p++){
        var player = roundPlayerStats[p]
        var curSubject = player["subject"]

        if(playerData[curSubject]["stats"]["killsByNumber"] == undefined){
          playerData[curSubject]["stats"]["killsByNumber"] = {"0":0,"1":0,"2":0,"3":0,"4":0,"5":0,"6":0}
        }


        var playerKills = player["kills"];
        var killCount = playerKills.length
        playerData[curSubject]["stats"]["killsByNumber"][""+killCount] += 1

        for(var k = 0; k < playerKills.length; k++){
          var killData = playerKills[k]
          var killTime = killData["roundTime"]
          // playersDead.add(killData["victim"])
          if(killTime < earlistKillTime){
            earlistKillTime = killTime
            earliestKillSubject = curSubject
          }

          if(killTime > latestKillTime && playerTeams[curSubject] == winningTeam){
            latestKillTime = killTime
            latestKillSubject = curSubject
          }
        }
      }

      if(roundCeremony == "CeremonyClutch"){
        if(playerTeams[latestKillSubject] == winningTeam){
          if(playerData[latestKillSubject]["stats"]["clutches"] == undefined){
            playerData[latestKillSubject]["stats"]["clutches"] = 0
          }
          playerData[latestKillSubject]["stats"]["clutches"] += 1
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
    "gameStartMillis":matchStartTime,
    "gameLengthMillis":gameLengthMillis
  }

  var playerValues = Object.values(playerData);
  playerValues.sort((a, b) => (a["stats"]["score"] > b["stats"]["score"]) ? 1 : -1)

  var finalUserData = {
    "scoreboard":playerValues,
    "gameInfo":gameInfoData
  }
  CONSTANTS.writeJSONFile(path+'/overview.json', finalUserData)
  LOG.log(4, "Processed overview analysis "+path)
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
  var roundTeamDetails = {}

  for(var i = 0; i < rounds.length; i++){
    let roundData = rounds[i];

    let roundNum = roundData["roundNum"]
    let winningTeam = roundData["winningTeam"]
    let roundResult = roundData["roundResultCode"]

    roundWinInfo[""+roundNum] = winningTeam
    roundResultInfo[""+roundNum] = roundResult

    var teamDetails = {
      "Blue":{
        "loadoutValue":0,
        "bankValue":0,
        "damage":0
      },
      "Red":{
        "loadoutValue":0,
        "bankValue":0,
        "damage":0
      },
    }

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

        teamDetails[playerTeam]["damage"] += roundPlayerData["damage"]["total"]

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

        teamDetails[playerTeam]["loadoutValue"] += economyData["loadoutValue"]
        teamDetails[playerTeam]["bankValue"] += economyData["spent"]+economyData["remaining"]

        roundPlayerData["score"] = score;

        roundDataFinal[subject].push(roundPlayerData)
      }
    }
    roundTeamDetails[""+roundNum] = teamDetails
  }

  allRoundDataFinal["winResults"] = roundWinInfo
  allRoundDataFinal["roundInfo"] = roundDataFinal
  allRoundDataFinal["scoreTotals"] = roundScoreTotals
  allRoundDataFinal["roundResults"] = roundResultInfo
  allRoundDataFinal["roundTeamDetails"] = roundTeamDetails

  allRoundDataFinal["playerCharacters"] = playerCharacters
  CONSTANTS.writeJSONFile(path+'/roundStats.json', allRoundDataFinal)
  LOG.log(4, "Processed round analysis "+path)
}
function processMatchPartyAnalysis(path, matchData){
  var partyData = {}
  var partyIds = {} // associate player id with the party
  var players = matchData["players"]
  var teamInfo = matchData["teams"]

  var mapAssetPath = matchData["matchInfo"]["mapId"].split("/")
  var mapRawAsset = mapAssetPath[mapAssetPath.length-1]

  function getTeamInfoFromId(teamId){
    for(var i = 0; i < teamInfo.length; i++){
      if(teamInfo[i]["teamId"] == teamId){
        return teamInfo[i]
      }
    }
    return null
  }

  try{
    for(var p = 0; p < players.length; p++){
      var player = players[p]
      var userId = player["subject"]
      var partyId = player["partyId"]
      var teamId = player["teamId"]
      var playerStats = player["stats"]

      // partyIds[userId] = partyId
      if(partyData[partyId] == undefined){
        partyData[partyId] = {
          "playtimeMillis":0,
          "totalKills":0,
          "totalDeaths":0,
          "totalAssists":0,
          "members":[]
        }
      }
      var playerTeam = getTeamInfoFromId(teamId)
      if(playerTeam != null){
        partyData[partyId]["roundsPlayed"] = playerTeam["roundsPlayed"]
        partyData[partyId]["roundsWon"] = playerTeam["roundsWon"]
        partyData[partyId]["wonGame"] = playerTeam["won"]
      }

      partyData[partyId]["totalKills"] += playerStats["kills"]
      partyData[partyId]["totalDeaths"] += playerStats["deaths"]
      partyData[partyId]["totalAssists"] += playerStats["assists"]
      partyData[partyId]["playtimeMillis"] = playerStats["playtimeMillis"] // will be set multiple times, but should be the same
      partyData[partyId]["mapKey"] = mapRawAsset
      partyData[partyId]["members"].push(userId)
    }
  }catch(err){
    console.log(err)
  }
  CONSTANTS.writeJSONFile(path+'/party.json', partyData)
  LOG.log(4, "Processed party analysis "+path)
}
function shouldProcessMatchData(matchData){
  let qId = matchData["matchInfo"]["queueID"]
  let startTime = matchData["matchInfo"]["gameStartMillis"]
  return qId == "competitive" && startTime > CONSTANTS.EPISODE_2_ACT2_START_TIME_MILLIS
}
function readAllRawMatchData(matchDataCallback, completion){
  LOG.log(4, "Reading all raw match data")
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
    LOG.log(4, "Raw read all matches done")
    completion()
  })
}
function processAllGames(){
  readAllRawMatchData(function(matchID, matchData){
    processMatchData(matchData, true)
  }, function(){
    LOG.log(3, "Done processing all games")
  })
}
function getProcessedMatchesData(){
  return processedMatchesData
}
module.exports = {
  processMatchData: processMatchData,
  processAllGames:processAllGames,
  getProcessedMatchesData:getProcessedMatchesData
}
