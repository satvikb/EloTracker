var CHART_HANDLER = require('./chartHandler');
var TABLE_HANDLER = require('./tableHandler');
var MATCH_HANDLER = require('./matchHandler');
var MATCH_COMPUTATION = require('./matchComputation');
var IMAGE_HANDLER = require('./imageHandler');

var LOG = require('./logging');

var CONSTANTS = require('./constants');
var dateFormat = require('dateformat');
const discord = require('discord.js');

var userColors = CONSTANTS.readJSONFile('private/userColors.json')

function calcElo(tierAfter, rpAfter){
  return (tierAfter*100) - 300 + rpAfter;
}

async function sendEmbedForEloHistory(msg, eloHistory, args, userFullName){
  var discordId = msg.member.id
  var numToShow = 3;
  var debugMode = false
  var showAuth = false;
  if(args.length >= 3){
    let count = args[2];
    numToShow = parseInt(count);
  }
  if(args.length >= 4){
    if(args[3] == "d")
      debugMode = true;
    if(args[3] == "a" && CONSTANTS.DISCORD_ADMIN_USERS.includes(msg.member.id)){
      showAuth = true;
    }
  }

  let userColor = userColors[discordId] == undefined ? CONSTANTS.DEFAULT_MSG_COLOR : userColors[discordId]
  let matchData = eloHistory["Matches"]
  let subjectId = eloHistory["Subject"]
  matchData.sort((a, b) => (a["MatchStartTime"] > b["MatchStartTime"]) ? -1 : 1)

  // var matchSortArray = compHistoryData[userId]["MatchSort"]
  var numOfCompMatchesAvailable = 0
  for(var i = 0; i < matchData.length; i++){
    var m = matchData[i]
    var t = m["TierAfterUpdate"]
    if(t > 0){
      numOfCompMatchesAvailable += 1
    }
  }

  var latestRank = ""
  var latestElo = 0
  var latestTier = 0

  var matchString = ""


  var numMatchesToShow = Math.min(numToShow, numOfCompMatchesAvailable)
  var compGamesShowed = 0
  LOG.log(4, "Show ELO embed. Number of fields: "+numMatchesToShow+". Number of competitive matches: "+numOfCompMatchesAvailable)

  var useAlternateDisplayMethod = numMatchesToShow > 20 // discord has hard limit on embeds
  var alternateDisplayEmbeds = []
  var GAMES_PER_FIELD = 15;

  var embedFieldArray = []
  for(var i = 0; i < matchData.length; i++){
    let latestMatchJson = matchData[i]//compHistoryData[userId]["Matches"][matchSortArray[i]]//matchData[i]
    if(latestMatchJson != undefined){
      let RPBefore = latestMatchJson["RankedRatingBeforeUpdate"];
      let RPAfter = latestMatchJson["RankedRatingAfterUpdate"];
      let tierBefore = latestMatchJson["TierBeforeUpdate"]
      let tierAfter = latestMatchJson["TierAfterUpdate"]
      let matchDate = latestMatchJson["MatchStartTime"]
      let matchID = latestMatchJson["MatchID"]
      let competitiveMovement = latestMatchJson["CompetitiveMovement"]

      if(tierAfter > 0 && compGamesShowed < numMatchesToShow){
        let eloChange;
        var eloSign = "+"
        if(tierBefore != tierAfter){
          // demote or promote
          if(tierBefore > tierAfter){
            // demote
            // (elo before + 100) - (elo after)
            eloChange = (RPAfter - RPBefore) - 100
            eloSign = "" // negative sign accounted for
            competitiveMovement = CONSTANTS.RANK_ARROWS.DEMOTED
          }else{
            // promote
            //  (elo after + 100) - elo before
            eloChange = (RPAfter - RPBefore) + 100
            competitiveMovement = CONSTANTS.RANK_ARROWS.PROMOTED
          }
        }else{
          // same
          eloChange = RPAfter - RPBefore;
          if(eloChange >= 30){
            competitiveMovement = CONSTANTS.RANK_ARROWS.INC_MAJOR
          }else if(eloChange >= 20 && eloChange < 30){
            competitiveMovement = CONSTANTS.RANK_ARROWS.INCREASE
          }else if(eloChange >= 10 && eloChange < 20){
            competitiveMovement =  CONSTANTS.RANK_ARROWS.INC_MINOR
          }else if(eloChange >= -10 && eloChange < 10){
            competitiveMovement = CONSTANTS.RANK_ARROWS.DRAW
          }else if(eloChange >= -20 && eloChange < -10){
            competitiveMovement = CONSTANTS.RANK_ARROWS.DEC_MINOR
          }else if(eloChange >= -30 && eloChange < -20){
            competitiveMovement = CONSTANTS.RANK_ARROWS.DECREASE
          }else if(eloChange < -30){
            competitiveMovement = CONSTANTS.RANK_ARROWS.DEC_MAJOR
          }
          eloSign = eloChange < 0 ? "" : "+"
        }
        let eloChangeFromData = latestMatchJson["RankedRatingEarned"]
        var showBothEloChange = eloChangeFromData != eloChange

        let rankName = CONSTANTS.RANKS[tierAfter];
        var currentElo = calcElo(tierAfter, RPAfter)

        if(compGamesShowed == 0){
          latestRank = rankName
          latestElo = currentElo
          latestTier = tierAfter
        }

        var d = new Date(matchDate)
        // var day = dateFormat(d, "mm/dd/yy h:MM:ss tt");
        var fieldDay = dateFormat(d, "m/d h:MMtt");

        var endString = debugMode ? " Match ID: "+matchID+"" : ""
        // matchString += "Comp Game started on "+day+": **"+eloSign+eloChange+" RP **"+endString
        var compMovementEmoji = ""
        switch(competitiveMovement){
          case CONSTANTS.RANK_ARROWS.COMP_PROMOTED:
            compMovementEmoji = CONSTANTS.RANK_EMOJIS.PROMOTED
            break;
          case CONSTANTS.RANK_ARROWS.INC_MAJOR:
            compMovementEmoji = CONSTANTS.RANK_EMOJIS.INC_MAJOR
            break;
          case CONSTANTS.RANK_ARROWS.INCREASE:
            compMovementEmoji = CONSTANTS.RANK_EMOJIS.INCREASE
            break;
          case CONSTANTS.RANK_ARROWS.INC_MINOR:
            compMovementEmoji = CONSTANTS.RANK_EMOJIS.INC_MINOR
            break;
          case CONSTANTS.RANK_ARROWS.DEC_MINOR:
            compMovementEmoji = CONSTANTS.RANK_EMOJIS.DEC_MINOR
            break;
          case CONSTANTS.RANK_ARROWS.DECREASE:
            compMovementEmoji = CONSTANTS.RANK_EMOJIS.DECREASE
            break;
          case CONSTANTS.RANK_ARROWS.DEC_MAJOR:
            compMovementEmoji = CONSTANTS.RANK_EMOJIS.DEC_MAJOR
            break;
          case CONSTANTS.RANK_ARROWS.DEMOTED:
            compMovementEmoji = CONSTANTS.RANK_EMOJIS.DEMOTED
            break;
          case CONSTANTS.RANK_ARROWS.DRAW:
            compMovementEmoji = CONSTANTS.RANK_EMOJIS.DRAW
            break;
          default:
            break;
        }

        var extraElo = showBothEloChange ? "** ("+eloChangeFromData+") ** RR **" : " RR **"
        var embedFieldObject = {name:compMovementEmoji+"**"+eloSign+eloChange+extraElo, value:fieldDay+endString, inline: debugMode ? false : true}
        embedFieldArray.push(embedFieldObject)

        if(useAlternateDisplayMethod){
          var currentEmbed = Math.floor((i / GAMES_PER_FIELD))+1; // 30 games per embed
          if(alternateDisplayEmbeds.length < currentEmbed){
            // new embed
            var embedFieldObject = {name: "Games "+(currentEmbed-1)*GAMES_PER_FIELD+" to "+(currentEmbed*GAMES_PER_FIELD), value: "", inline: false}
            alternateDisplayEmbeds.push(embedFieldObject)
          }
          alternateDisplayEmbeds[currentEmbed-1].value += compMovementEmoji+"**"+eloSign+eloChange+extraElo+", "+fieldDay+endString+"\n"
        }

        compGamesShowed += 1
      }else{
        // numMatchesToShow += 1
      }
    }
  }

  var currentEloAddOnText = ""
  if(latestElo % 100 == 0 && latestTier > 0){
    currentEloAddOnText = "(Derank if next game lost)"
  }else if(latestTier == 0){
    currentEloAddOnText = "Currently unranked. Please finish placement games first."
    latestElo = "Unknown"
  }else{
    currentEloAddOnText = "(**"+((100) - (latestElo % 100))+"** RR needed to rank up)"
  }

  const rankImage = new discord.MessageAttachment('images/TX_CompetitiveTier_Large_'+latestTier+".png", 'rank.png');
  const embed = new discord.MessageEmbed()
        .setColor(userColor)
        .setTitle('Total Ranked Rating: '+latestElo+" RR ")
        // .setURL('https://discord.js.org/')
        .setAuthor(userFullName, '', '')
        .setDescription(latestRank+" "+currentEloAddOnText)
        .attachFiles(rankImage)
        .setThumbnail('attachment://rank.png');

  if(numMatchesToShow > 0){
    embed.addField('Competitive history for the last '+compGamesShowed+" matches:", "⠀", false)
    .addFields(useAlternateDisplayMethod ? alternateDisplayEmbeds : embedFieldArray)
  }

  var eloData = CHART_HANDLER.getCompEloHistoryList(matchData)
  var eloChart = CHART_HANDLER.buildEloChart(eloData, userFullName, userColor)

  var statMsg = await msg.channel.send({embed})
  if(eloChart != null){
    CHART_HANDLER.chartURLFromObject(eloChart, function(url){
      embed.setImage(url)
      statMsg.edit(embed) // TODO does this work? statMsg is defined after
    })
  }
}
async function sendEmbedForPlayerStats(msg, userId){
  var discordId = msg.member.id

  var statsObject = MATCH_COMPUTATION.getStatsData()
  var userStats = statsObject[userId]
  if(userStats != undefined){

    let userColor = userColors[discordId] == undefined ? CONSTANTS.DEFAULT_MSG_COLOR : userColors[discordId]

    var userFullName = userStats["gameName"]+"#"+userStats["tagLine"]
    const embed = new discord.MessageEmbed()
          .setColor(userColor)
          .setTitle('Overall stats for ACT 2')
          // .setURL('https://discord.js.org/')
          .setAuthor(userFullName, '', '')

    var statData = userStats["stats"]

    var hs = statData["headshots"], bs = statData["bodyshots"], ls = statData["legshots"]
    embed.addField("**Playtime**", (statData["playtimeMillis"] / (3600*1000)).toFixed(2)+"h", true)
    embed.addField("**Kills**", statData["kills"], true)
    embed.addField("**Deaths**", statData["deaths"], true)
    embed.addField("**Assists**", statData["assists"], true)
    embed.addField("**K/D**", statData["kd"].toFixed(2), true)
    embed.addField("**First Bloods %**", ((statData["firstBloods"] / statData["roundsPlayed"])*100).toFixed(2)+"%", true)
    // embed.addField("First Bloods", statData["firstBloods"], true)
    embed.addField("**Plants**", statData["plants"], true)
    embed.addField("**Defuses**", statData["defuses"], true)
    embed.addField("**Clutches**", statData["clutches"], true)

    let kbn = statData["killsByNumber"]
    embed.addField("**Kills per round**", ["0k: "+kbn["0"], "1k: "+kbn["1"], "2k: "+kbn["2"], "3k: "+kbn["3"], "4k: "+kbn["4"], "5k: "+kbn["5"], "6k: "+kbn["6"]].join(" | "), true)

    embed.addField('\u200b', '\u200b')
    embed.addField("**Games**", statData["totalGamesPlayed"], true)
    embed.addField("**Score**", statData["score"], true)
    embed.addField("**Rounds**", statData["roundsPlayed"], true)
    embed.addField("**Game Win Rate**", ((statData["totalGamesWon"] / statData["totalGamesPlayed"])*100).toFixed(2)+"%", true)
    embed.addField("**Round Win Rate**", ((statData["roundsWon"] / statData["roundsPlayed"])*100).toFixed(2)+"%", true)
    embed.addField('\u200b', '\u200b')
    embed.addField("**Util 1**", statData["ability1Casts"], true)
    embed.addField("**Util 2**", statData["ability2Casts"], true)
    embed.addField("**Util 3**", statData["grenadeCasts"], true)

    embed.addField("**Headshots**", hs, true)
    embed.addField("**Bodyshots**", bs, true)
    embed.addField("**Legshots**", ls, true)
    embed.addField("**HS %**", ((hs/(hs+bs+ls))*100).toFixed(2)+"%", true)

    var sent = await msg.channel.send({embed})
  }else{
    msg.channel.send("Not enough game data to show stats. Play more games.")
  }
}
async function sendEmbedForPartyStats(msg, partyStats){
  var discordId = msg.member.id
  let userColor = userColors[discordId] == undefined ? CONSTANTS.DEFAULT_MSG_COLOR : userColors[discordId]

  var statsObject = MATCH_COMPUTATION.getStatsData()
  var partyNameText = ""
  var mems = partyStats["members"]
  for(var i = 0; i < mems.length; i++){
    var mem = mems[i]
    var userStats = statsObject[mem]
    if(userStats != undefined){
      partyNameText += userStats["gameName"]+"#"+userStats["tagLine"]+(i < mems.length - 1 ? " / " : "")
    }
  }
  if(partyStats["numberParties"] != undefined){
    partyNameText += " (w/ "+partyStats["numberParties"]+" parties)"
  }
  const embed = new discord.MessageEmbed()
        .setColor(userColor)
        .setTitle('Party Stats')
        // .setURL('https://discord.js.org/')
        .setAuthor(partyNameText, '', '')

  embed.addField("**Playtime**", (partyStats["playtimeMillis"] / (3600*1000)).toFixed(2)+"h", true)
  embed.addField("**Total Kills**", partyStats["totalKills"], true)
  embed.addField("**Total Deaths**", partyStats["totalDeaths"], true)
  embed.addField("**Total Assists**", partyStats["totalAssists"], true)
  embed.addField('\u200b', '\u200b')
  embed.addField("**Games**", partyStats["gamesPlayed"], true)
  embed.addField("**Games Won**", partyStats["gamesWon"], true)
  embed.addField("**Rounds**", partyStats["roundsPlayed"], true)
  embed.addField("**Game Win Rate**", ((partyStats["gamesWon"] / partyStats["gamesPlayed"])*100).toFixed(2)+"%", true)
  embed.addField("**Round Win Rate**", ((partyStats["roundsWon"] / partyStats["roundsPlayed"])*100).toFixed(2)+"%", true)
  embed.addField('\u200b', '\u200b')

  for(var mapId in partyStats["gamesByMap"]){
    if(partyStats["gamesByMap"].hasOwnProperty(mapId)){
      embed.addField("**"+partyStats["gamesByMap"][mapId]["mapName"]+" Win Rate** ("+partyStats["gamesByMap"][mapId]["gamesPlayed"]+")", ((partyStats["gamesByMap"][mapId]["gamesWon"] / partyStats["gamesByMap"][mapId]["gamesPlayed"])*100).toFixed(2)+"%", true)
    }
  }

  var sent = await msg.channel.send({embed})

}
function sendMessageForMatchHistory(msg, userId, eloHistory, args, userFullName, discordId){
  var numToShow = 3;
  var debugMode = false
  var showAuth = false;
  if(args.length >= 3){
    let count = args[2];
    numToShow = parseInt(count);
  }
  if(args.length >= 4){
    if(args[3] == "d")
      debugMode = true;
    if(args[3] == "a" && CONSTANTS.DISCORD_ADMIN_USERS.includes(msg.member.id)){
      showAuth = true;
    }
  }

  var reducedColumns = numToShow > 7

  numToShow = numToShow > 15 ? 15 : numToShow

  let userColor = userColors[discordId] == undefined ? CONSTANTS.DEFAULT_MSG_COLOR : userColors[discordId]
  let matchData = eloHistory["Matches"]
  let subjectId = eloHistory["Subject"]
  matchData.sort((a, b) => (a["MatchStartTime"] > b["MatchStartTime"]) ? -1 : 1)

  // var matchSortArray = compHistoryData[userId]["MatchSort"]
  var numOfCompMatchesAvailable = 0
  for(var i = 0; i < matchData.length; i++){
    var m = matchData[i]
    var t = m["TierAfterUpdate"]
    if(t > 0){
      numOfCompMatchesAvailable += 1
    }
  }

  var latestRank = ""
  var latestElo = 0
  var latestTier = 0

  var matchString = ""


  var numMatchesToShow = Math.min(numToShow, numOfCompMatchesAvailable)
  var compGamesShowed = 0

  var tableData = []
  for(var i = 0; i < matchData.length; i++){
    let latestMatchJson = matchData[i]//compHistoryData[userId]["Matches"][matchSortArray[i]]//matchData[i]
    if(latestMatchJson != undefined){
      let RPBefore = latestMatchJson["RankedRatingBeforeUpdate"];
      let RPAfter = latestMatchJson["RankedRatingAfterUpdate"];
      let tierBefore = latestMatchJson["TierBeforeUpdate"]
      let tierAfter = latestMatchJson["TierAfterUpdate"]
      let matchDate = latestMatchJson["MatchStartTime"]
      let matchID = latestMatchJson["MatchID"]
      let competitiveMovement = latestMatchJson["CompetitiveMovement"]

      if(tierAfter > 0 && compGamesShowed < numMatchesToShow){
        let eloChange;
        var eloSign = "+"
        var eloTierChangeText = ""
        if(tierBefore != tierAfter){
          // demote or promote
          if(tierBefore > tierAfter){
            // demote
            // (elo before + 100) - (elo after)
            eloChange = (RPAfter - RPBefore) - 100
            eloSign = "" // negative sign accounted for
            competitiveMovement = CONSTANTS.RANK_ARROWS.DEMOTED
            eloTierChangeText = !reducedColumns ? "DEMOTED ("+CONSTANTS.RANKS[tierAfter]+")" : "D"
          }else{
            // promote
            //  (elo after + 100) - elo before
            eloChange = (RPAfter - RPBefore) + 100
            competitiveMovement = CONSTANTS.RANK_ARROWS.PROMOTED
            eloTierChangeText = !reducedColumns ? "PROMOTED ("+CONSTANTS.RANKS[tierAfter]+")" : "P"
          }
        }else{
          // same
          eloChange = RPAfter - RPBefore;
          if(eloChange >= 30){
            competitiveMovement = CONSTANTS.RANK_ARROWS.INC_MAJOR
          }else if(eloChange >= 20 && eloChange < 30){
            competitiveMovement = CONSTANTS.RANK_ARROWS.INCREASE
          }else if(eloChange >= 10 && eloChange < 20){
            competitiveMovement =  CONSTANTS.RANK_ARROWS.INC_MINOR
          }else if(eloChange >= -10 && eloChange < 10){
            competitiveMovement = CONSTANTS.RANK_ARROWS.DRAW
          }else if(eloChange >= -20 && eloChange < -10){
            competitiveMovement = CONSTANTS.RANK_ARROWS.DEC_MINOR
          }else if(eloChange >= -30 && eloChange < -20){
            competitiveMovement = CONSTANTS.RANK_ARROWS.DECREASE
          }else if(eloChange < -30){
            competitiveMovement = CONSTANTS.RANK_ARROWS.DEC_MAJOR
          }
          eloSign = eloChange < 0 ? "" : "+"
        }
        let eloChangeFromData = latestMatchJson["RankedRatingEarned"]
        var showBothEloChange = false //eloChangeFromData != eloChange

        let rankName = CONSTANTS.RANKS[tierAfter];
        var currentElo = calcElo(tierAfter, RPAfter)

        if(compGamesShowed == 0){
          latestRank = rankName
          latestElo = currentElo
          latestTier = tierAfter
        }

        var d = new Date(matchDate)
        // var day = dateFormat(d, "mm/dd/yy h:MM:ss tt");
        var fieldDay = reducedColumns ? dateFormat(d, "m/d") : dateFormat(d, "m/d h:MMtt");

        var endString = debugMode ? " Match ID: "+matchID+"" : ""
        // matchString += "Comp Game started on "+day+": **"+eloSign+eloChange+" RP **"+endString

        var extraElo = showBothEloChange ? "("+eloChangeFromData+") RR" : " RR"
        var eloText = eloSign+eloChange+extraElo+" "+eloTierChangeText
        // var embedFieldObject = {name:compMovementEmoji+"**"+eloSign+eloChange+extraElo, value:fieldDay+endString, inline: debugMode ? false : true}

        compGamesShowed += 1

        var scoreboard = MATCH_HANDLER.scoreboardForMatch(matchID)
        var players = scoreboard["scoreboard"]
        var gameInfo = scoreboard["gameInfo"]
        var winningTeam = gameInfo["winningTeam"]
        var blueScore = gameInfo["blueScore"]
        var redScore = gameInfo["redScore"]
        var mapAssetPath = gameInfo["mapId"].split("/")
        var mapRawAsset = mapAssetPath[mapAssetPath.length-1]

        for(var p = 0; p < players.length; p++){
          var player = players[p]
          if(player["subject"] == userId){
            var playerStats = player["stats"]

            var characterId = player["characterId"]
            var playerTeam = player["teamId"]
            var won = playerTeam == winningTeam
            var kills = playerStats["kills"]
            var playerScore = playerStats["score"]
            var deaths = playerStats["deaths"]
            var assists = playerStats["assists"]
            var firstBloods = playerStats["firstBloods"]
            var plants = playerStats["plants"]
            var defuses = playerStats["defuses"]
            var allyScore = playerTeam == "Red" ? redScore : blueScore
            var enemyScore = playerTeam == "Red" ? blueScore : redScore
            var teamMVP = userId == gameInfo["teamMVP"]
            var matchMVP = userId == gameInfo["matchMVP"]


            var agentName = CONSTANTS.CONTENT.AGENT_NAMES[characterId.toLowerCase()]
            var kda = kills+" / "+deaths+" / "+assists
            var place = (9-p)
            var placeText = place == 0 ? "1st" : (place == 1 ? "2nd" : (place == 2 ? "3rd" : (place+1)+"th"))
            var mvpText = teamMVP ? "(Team MVP)" : (matchMVP ? "(Match MVP)" : "")
            var combatScoreText = playerScore+" ("+placeText+") "+mvpText
            var wonText = won ? "VICTORY" : "DEFEAT"
            var scoreText = allyScore + " - " + enemyScore
            var map = CONSTANTS.CONTENT.MAP_NAMES[mapRawAsset.toLowerCase()]

            if(reducedColumns){
              // var tableHeaders = ["Agent", "KDA", "Score & MVPs", "Result", "Score", "Map"]
              tableData.push([agentName, kda, combatScoreText, wonText[0], scoreText, map[0], eloText, fieldDay])
            }else{
              tableData.push([agentName, kda, combatScoreText, wonText, scoreText, map, eloText, fieldDay])
            }
          }
        }
      }
    }
  }

  var currentEloAddOnText = ""
  if(latestElo % 100 == 0 && latestTier > 0){
    currentEloAddOnText = "(Derank if next game lost)"
  }else if(latestTier == 0){
    currentEloAddOnText = "Currently unranked. Please finish placement games first."
    latestElo = "Unknown"
  }else{
    currentEloAddOnText = "(**"+((100) - (latestElo % 100))+"** RR needed to rank up)"
  }

  var tableHeaders = reducedColumns ? ["Agent", "KDA", "Score & MVPs", "R", "Score", "Map", "Elo", "Day"] : ["Agent", "KDA", "Score & MVPs", "Result", "Score", "Map", "Elo", "Time"]
  var table = TABLE_HANDLER.buildAsciiTable("MATCH HISTORY FOR "+userFullName+" ("+latestElo+" RP)", tableHeaders, tableData, false, false)
  msg.channel.send(table)
}
function sendMessageForAgentWinLoss(msg, userId, statsByAgent, discordId){
  if(statsByAgent != undefined){
    var tableData = []
    for(var agentName in statsByAgent){
      if(statsByAgent.hasOwnProperty(agentName)){
        var s = statsByAgent[agentName]
        tableData.push([agentName, s["gamesWon"], s["gamesPlayed"], ((s["gamesWon"] / s["gamesPlayed"])*100).toFixed(2)+"%", s["score"], s["kills"], s["deaths"], s["assists"], (s["kills"]/s["deaths"]).toFixed(2), (s["playtimeMillis"] / (3600*1000)).toFixed(2)+"h"])
      }
    }

    var tableHeaders = ["Agent", "Won", "Played", "Win Rate", "Score", "Kills", "Deaths", "Assists", "K/D", "Playtime"]
    var table = TABLE_HANDLER.buildAsciiTable("Win/Loss per agent", tableHeaders, tableData, false, false)
    msg.channel.send(table)
  }else{
    msg.channel.send("No data.")
  }
}
function sendImageForLatestCompetitiveMatch(msg, userId, discordId){

  MATCH_HANDLER.matchHistory(userId, null, function(history){
    if(history != null){
      let historyData = MATCH_HANDLER.getMatchHistoryData()
      let matches = historyData[userId]["MatchSort"]
      for(var i = 0; i < matches.length; i++){
        var id = matches[i]
        if(historyData[userId]["Matches"][id]["TierAfterUpdate"] != 0){
          var matchId = id//matches[i]["MatchID"]
          console.log("LATEST MATCH "+matches[i]["MatchStartTime"]+"_"+matchId)
          // ranked
          var processedPath = CONSTANTS.PATHS.PROCESSED_MATCHES;
          try{
            let matchOverviewData = CONSTANTS.readJSONFile(processedPath + matchId + "/overview.json")
            let matchRoundData = CONSTANTS.readJSONFile(processedPath + matchId + "/roundStats.json")
            let matchPartyData = CONSTANTS.readJSONFile(processedPath + matchId + "/party.json")
            let matchStatsData = CONSTANTS.readJSONFile(processedPath + matchId + "/stats.json")

            IMAGE_HANDLER.getLatestMatchImage(userId, matchOverviewData, matchRoundData, matchPartyData, matchStatsData, function(imageBuffer){
              const attachment = new discord.MessageAttachment(imageBuffer, 'image.png');
              msg.channel.send("",attachment)
            })
          }catch(err){
            LOG.log(0, "ERROR SENDING IMAGE "+err)
          }
          break; // only first match
        }
      }
    }
  })

}
function setUserColor(discordUserId, color){
  userColors[discordUserId] = color
  CONSTANTS.writeJSONFile('private/userColors.json', userColors)
}
module.exports = {
  sendEmbedForEloHistory:sendEmbedForEloHistory,
  sendEmbedForPlayerStats:sendEmbedForPlayerStats,
  sendEmbedForPartyStats:sendEmbedForPartyStats,
  sendMessageForMatchHistory:sendMessageForMatchHistory,
  sendMessageForAgentWinLoss:sendMessageForAgentWinLoss,
  sendImageForLatestCompetitiveMatch: sendImageForLatestCompetitiveMatch
}
