var CHART_HANDLER = require('./chartHandler');
var TABLE_HANDLER = require('./tableHandler');
var MATCH_HANDLER = require('./matchHandler');
var MATCH_COMPUTATION = require('./matchComputation');
var IMAGE_HANDLER = require('./imageHandler');
var AUTH = require('./auth');

const fs = require('fs');

var LOG = require('./logging');

var CONSTANTS = require('./constants');

// todo move to constants
var ETH_PER_DAY_PER_HASHRATE = 0.00005955// * 0.99 // for conservative
var ETH_TO_USD = 1612.37// * 0.995
var USD_PAYOUT_THRESHOLD = ETH_TO_USD*0.1; // 0.1 eth

var dateFormat = require('dateformat');
const discord = require('discord.js');

var userColors = CONSTANTS.readJSONFile('private/userColors.json')
var USER_ACCOUNTS = CONSTANTS.readJSONFile('private/static/valAuths.json')["users"]
var SC_TOTALS = CONSTANTS.readJSONFile('private/sc.json')

function calcElo(tierAfter, rpAfter){
  return (tierAfter*100) - 300 + rpAfter;
}

async function sendEmbedForEloHistory(msg, eloHistory, args, userFullName){
  var discordId = msg.member.id
  var numToShow = 5;
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
          if(eloChange >= 25){
            competitiveMovement = CONSTANTS.RANK_ARROWS.INC_MAJOR
          }else if(eloChange >= 16 && eloChange < 25){
            competitiveMovement = CONSTANTS.RANK_ARROWS.INCREASE
          }else if(eloChange >= 6 && eloChange < 16){
            competitiveMovement =  CONSTANTS.RANK_ARROWS.INC_MINOR
          }else if(eloChange >= -6 && eloChange < 6){
            competitiveMovement = CONSTANTS.RANK_ARROWS.DRAW
          }else if(eloChange >= -16 && eloChange < -6){
            competitiveMovement = CONSTANTS.RANK_ARROWS.DEC_MINOR
          }else if(eloChange >= -25 && eloChange < -16){
            competitiveMovement = CONSTANTS.RANK_ARROWS.DECREASE
          }else if(eloChange < -25){
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
          case CONSTANTS.RANK_ARROWS.PROMOTED:
            compMovementEmoji = CONSTANTS.RANK_EMOJIS.PROMOTED
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
async function sendEmbedForPlayerGunStats(msg, userId){
  var discordId = msg.member.id

  var statsObject = MATCH_COMPUTATION.getStatsData()
  var userStats = statsObject[userId]
  if(userStats != undefined){

    let userColor = userColors[discordId] == undefined ? CONSTANTS.DEFAULT_MSG_COLOR : userColors[discordId]

    var userFullName = userStats["gameName"]+"#"+userStats["tagLine"]
    const embed = new discord.MessageEmbed()
          .setColor(userColor)
          .setTitle('Gun stats for ACT 2')
          // .setURL('https://discord.js.org/')
          .setAuthor(userFullName, '', '')

    var statData = userStats["stats"]

    var totalKills = 0; // debug
    var count = 0;
    function addFieldForGun(gunId){
      var gunName = CONSTANTS.CONTENT.GUN_NAMES[gunId] || gunId
      var gunData = statData["guns"][gunId]
      var kills = gunData["kills"]
      var hit = gunData["hits"]
      var hs = ((hit["headshots"] / (hit["headshots"] + hit["bodyshots"] + hit["legshots"]))*100).toFixed(2)
      var avgDist = ((gunData["totalDistance"] / kills)/100).toFixed(2)+"m"
      embed.addField("**"+gunName+"**", kills+ "k (HS: "+hs+"%) "+avgDist, (count % 3) == 0 ? false : true)

      totalKills += kills

      count += 1
    }

    for(var gunId in statData["guns"]){
      if(statData["guns"].hasOwnProperty(gunId)){
        addFieldForGun(gunId)
      }
    }

    console.log("T "+totalKills)

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
  var numToShow = 5;
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

        if(scoreboard != undefined){
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
        tableData.push([agentName, s["gamesWon"]+"/"+s["gamesPlayed"], ((s["gamesWon"] / s["gamesPlayed"])*100).toFixed(2)+"%", (s["score"]/s["gamesPlayed"]).toFixed(1), s["kills"], s["deaths"], s["assists"], (s["kills"]/s["deaths"]).toFixed(2), (s["playtimeMillis"] / (3600*1000)).toFixed(2)+"h"])
      }
    }

    tableData.sort(function(a,b){
      // Sort by the 2nd value in each array
      if ( a[8] == b[8] ) return 0;
      return parseInt(a[8]) < parseInt(b[8]) ? 1 : -1;
    });

    var tableHeaders = ["Agent", "Won", "Win Rate", "ACS", "K", "D", "A", "K/D", "Playtime"]
    var table = TABLE_HANDLER.buildAsciiTable("Win/Loss per agent", tableHeaders, tableData, false, false)
    msg.channel.send(table)
  }else{
    msg.channel.send("No data.")
  }
}
function sendMessageForAllParties(msg, userId){
  var partyData = MATCH_COMPUTATION.getPartyData()
  var totalStats = MATCH_COMPUTATION.getStatsData()
  var matchHistoryData = MATCH_HANDLER.getMatchHistoryData()

  var playerName = totalStats[userId]["gameName"]+"#"+totalStats[userId]["tagLine"]

  var finalParties = {}
  for(var partyKey in partyData){
    if(partyData.hasOwnProperty(partyKey)){
      var curPartyData = partyData[partyKey]
      var curMembers = curPartyData["members"]
      var matches = curPartyData["matchIds"]
      var playtime = curPartyData["playtimeMillis"]

      if(curMembers.includes(userId)){
        var curPartyNames = []
        for(var i = 0; i < curMembers.length; i++){
          var curUserId = curMembers[i]
          var userData = totalStats[curUserId]
          var userName = userData["gameName"]+"#"+userData["tagLine"]
          curPartyNames.push(userName)
        }
        curPartyNames.sort()

        var key = partyKey.toString()
        if(finalParties[key] == undefined){
          finalParties[key] = {
            "members":[],
            "totalEloChange":0,
            "playtime":0
          }

          var totalEloChange = 0
          var badMatches = 0
          for(var i = 0; i < matches.length; i++){
            var matchId = matches[i]
            var matchInfo = matchHistoryData[userId]["Matches"][matchId]
            if(matchInfo != undefined){
              var eloChange = matchInfo["RankedRatingEarned"]
              totalEloChange += eloChange
            }else{
              badMatches += 1
            }

          }
          finalParties[key]["totalEloChange"] = totalEloChange
          finalParties[key]["members"] = curPartyNames
          finalParties[key]["playtime"] = playtime
          finalParties[key]["badMatches"] = badMatches

        }
        // 61669 - 70179
      }
    }
  }

  var absoluteTotalEloChange = 0
  var tableData = []
  for(var partyKey in finalParties){
    if(finalParties.hasOwnProperty(partyKey)){
      var s = finalParties[partyKey]
      absoluteTotalEloChange += s["totalEloChange"]
      tableData.push([s["members"], s["totalEloChange"] + (s["badMatches"] > 0 ? "(w/o "+s["badMatches"]+")" : ""), (s["playtime"] / (3600*1000)).toFixed(2)+"h"])
    }
  }

  tableData.sort(function(a,b){
    // Sort by the 2nd value in each array
    if ( a[1] == b[1] ) return 0;
    return parseInt(a[1]) < parseInt(b[1]) ? 1 : -1;
  });

  var tableHeaders = ["Members", "Elo Delta", "Playtime"]
  var table = TABLE_HANDLER.buildAsciiTable("Elo change for "+playerName+" (top 5 and bottom 5 out of "+tableData.length+" parties) "+absoluteTotalEloChange+" RP total", tableHeaders, tableData.slice(0,5).concat(tableData.slice(-5)), false, false)
  msg.channel.send(table)

}
function sendImageForLatestCompetitiveMatch(msg, userId, discordId, matchOffset){
  matchOffset = matchOffset || 0

  var processedPath = CONSTANTS.PATHS.PROCESSED_MATCHES;

  MATCH_HANDLER.matchHistory(userId, null, function(history){
    if(history != null){
      let historyData = MATCH_HANDLER.getMatchHistoryData()
      let matches = historyData[userId]["MatchSort"]
      for(var i = 0; i < matches.length; i++){
        var id = matches[i]
        var matchId = id

        if(historyData[userId]["Matches"][id]["TierAfterUpdate"] != 0){
          if(fs.existsSync(processedPath + matchId + "/overview.json") == false){
            continue
          }
          if(matchOffset > 0){
            matchOffset -= 1;
            continue
          }
          console.log("LATEST MATCH "+matches[i]["MatchStartTime"]+"_"+matchId)
          // ranked
          try{
            let matchOverviewData = CONSTANTS.readJSONFile(processedPath + matchId + "/overview.json")
            let matchRoundData = CONSTANTS.readJSONFile(processedPath + matchId + "/roundStats.json")
            let matchPartyData = CONSTANTS.readJSONFile(processedPath + matchId + "/party.json")
            let matchStatsData = CONSTANTS.readJSONFile(processedPath + matchId + "/stats.json")

            IMAGE_HANDLER.getLatestMatchImage(userId, matchOverviewData, matchRoundData, matchPartyData, matchStatsData, historyData[userId]["Matches"][id], function(imageBuffer){
              const attachment = new discord.MessageAttachment(imageBuffer, 'image.png');
              msg.channel.send("",attachment)
            })
          }catch(err){
            LOG.log(0, "ERROR SENDING IMAGE "+err)
          }
          break; // only first match
        }
      }
      if(matchOffset > 0){
        msg.channel.send("Match not found (too far back)")
      }
    }else{
      msg.channel.send("No match history")
    }
  })

}
function setUserColor(discordUserId, color){
  userColors[discordUserId] = color
  CONSTANTS.writeJSONFile('private/userColors.json', userColors)
}
function sendMiningCalculations(msg, args){
  var persons = {"individuals":[]}

  var totalDailyMinedEth = 0;
  for(var i = 1; i < args.length; i += 2){
    var person = {}

    var hashrate = args[i]
    var hoursPerDay = args[i+1]
    person["hashrate"] = hashrate
    person["hoursperday"] = hoursPerDay

    var percentOfDay = hoursPerDay/24;
    var ethPerDay = ETH_PER_DAY_PER_HASHRATE*hashrate*percentOfDay
    var ethForMonth = ethPerDay*30
    person["perdayminedETH"] = ethPerDay
    person["perdayminedUSD"] = ethPerDay*ETH_TO_USD
    person["USDperHour"] = (ethPerDay*ETH_TO_USD)/24
    person["30dayminedETH"] = ethForMonth
    person["30dayminedUSD"] = ethForMonth*ETH_TO_USD

    totalDailyMinedEth += ethPerDay
    persons["individuals"].push(person)
  }

  persons["totalPerDayETH"] = totalDailyMinedEth
  persons["totalPerDayUSD"] = totalDailyMinedEth*ETH_TO_USD
  persons["totalPer30daysETH"] = totalDailyMinedEth*30
  persons["totalPer30daysUSD"] = totalDailyMinedEth*30*ETH_TO_USD

  persons["timeToHitThreshold"] = (USD_PAYOUT_THRESHOLD/(totalDailyMinedEth*ETH_TO_USD)).toFixed(2)+" days"

  for(var i = 0; i < persons["individuals"].length; i++){
    persons["individuals"][i]["USDEveryPayoutRaw"] = USD_PAYOUT_THRESHOLD * (persons["individuals"][i]["perdayminedETH"]/persons["totalPerDayETH"])
    persons["individuals"][i]["USDEveryPayout90percent"] = persons["individuals"][i]["USDEveryPayoutRaw"]*0.9
  }

  msg.channel.send("```"+JSON.stringify(persons, null, 2)+"```")
}
function sendMiningHistory(msg){
  var currentMiningHistory = CONSTANTS.readJSONFile("private/mining.json")

  function sharesUntil(start, end){
    start = start || 0
    end = end || Number.MAX_SAFE_INTEGER

    var latestTimeHistory = 0;
    var latestUnpaid = 0;
    var shareTotal = 0

    var totalHistory = currentMiningHistory["totalHistory"]
    for(var time in totalHistory){
      if(totalHistory.hasOwnProperty(time)){
        if(time != undefined && totalHistory[time]["validShares"] != undefined){
          shareTotal += totalHistory[time]["validShares"]
          // console.log(time+"_"+totalHistory[time]["validShares"]+"___"+(time == undefined))
        }
      }
    }
    // console.log("Total "+shareTotal)

    var workerShares = {}
    var workerStats = currentMiningHistory["workerStats"]
    for(var time in workerStats){
      if(workerStats.hasOwnProperty(time)){
        var workers = workerStats[time]["workers"]

        if(time > latestTimeHistory){
          latestTimeHistory = time
          latestUnpaid = workerStats[time]["unpaid"] || 0
        }

        for(var i = 0; i < workers.length; i++){
          var worker = workers[i]
          var name = worker["worker"]
          if(workerShares[name] == undefined){
            workerShares[name] = {
              "worker":name,
              "shares":0
            }
          }
          workerShares[name]["shares"] += worker["validShares"]
        }
      }
    }

    return {
      "totalShares":shareTotal,
      "workerShares":workerShares,
      "unpaidTotal":latestUnpaid
    }
  }

  /*
    special case pre bot
  */
  var totalSharesPre = sharesUntil()
  var wD = totalSharesPre["workerShares"]

  var weiTotal = totalSharesPre["unpaidTotal"];
  var weiPerShare = (weiTotal / totalSharesPre["totalShares"])

  var headers = ["worker", "shares", "eth", "usd"]

  var data = []
  for(var name in wD){
    if(wD.hasOwnProperty(name)){
      var workerShares = wD[name]["shares"]
      var workerWei = weiPerShare * workerShares
      var eth = workerWei / Math.pow(10, 18)
      var usd = ETH_TO_USD*eth
      data.push([name, workerShares, eth, usd >= 0.01 ? usd.toFixed(2) : usd.toFixed(8)])
    }
  }

  var totalUSD = (weiTotal / Math.pow(10, 18)) * ETH_TO_USD

  // msg.channel.send(JSON.stringify(totalSharesPre)+"___Wei per share: "+)

  var table = TABLE_HANDLER.buildAsciiTable("Mining history. Total shares: "+totalSharesPre["totalShares"]+" / Total USD: "+totalUSD.toFixed(2), headers, data, false, false)
  msg.channel.send(table)
}
function sendCurrentStore(msg, alias){
  if(USER_ACCOUNTS[alias] != null){
    var cr = USER_ACCOUNTS[alias]
    if(cr["uid"] != undefined){
      AUTH.getRequest("https://pd.na.a.pvp.net/store/v2/storefront/"+cr["uid"], function(body){
        var d = body["SkinsPanelLayout"]
        var s = d["SingleItemOffersRemainingDurationInSeconds"]

        var offerString = ""
        var os = d["SingleItemOffers"]
        for(var o in os){
          offerString += CONSTANTS.CONTENT.getSkinNameFromID(os[o])+" | "
        }
        msg.channel.send(offerString)
      }, function(error, err2){
        console.log("ERRR "+error, err2)
      }, cr["username"], cr["password"])
    }else{
      msg.channel.send("ID not added. Tell me to add.")
    }
  }
}
function sendCurrentSC(msg){
  var finalStr = ""
  for (const [key, value] of Object.entries(SC_TOTALS)) {
    finalStr += key + " - " + value + "\n"
  }
  msg.channel.send(finalStr)
}
function editSC(msg, alias, scChange, authorized){
  let exists = alias in SC_TOTALS
  if(!authorized || !exists){
    msg.react("❌")
    return;
  }
  SC_TOTALS[alias] += scChange
  CONSTANTS.writeJSONFile('private/sc.json', SC_TOTALS)
  msg.react("✅")
  return;
}
function newSCuser(msg, alias, authorized){
  let exists = alias in SC_TOTALS
  if(!authorized || exists){
    msg.react("❌")
    return;
  }
  SC_TOTALS[alias] = 0
  CONSTANTS.writeJSONFile('private/sc.json', SC_TOTALS)
  msg.react("✅")
  return;
}
module.exports = {
  sendEmbedForEloHistory:sendEmbedForEloHistory,
  sendEmbedForPlayerStats:sendEmbedForPlayerStats,
  sendEmbedForPlayerGunStats:sendEmbedForPlayerGunStats,
  sendEmbedForPartyStats:sendEmbedForPartyStats,
  sendMessageForMatchHistory:sendMessageForMatchHistory,
  sendMessageForAgentWinLoss:sendMessageForAgentWinLoss,
  sendMessageForAllParties:sendMessageForAllParties,
  sendImageForLatestCompetitiveMatch: sendImageForLatestCompetitiveMatch,
  sendMiningCalculations:sendMiningCalculations,
  sendMiningHistory:sendMiningHistory,
  sendCurrentStore:sendCurrentStore,
  sendCurrentSC:sendCurrentSC,
  editSC:editSC,
  newSCuser:newSCuser
}
