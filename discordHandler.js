var CHART_HANDLER = require('./chartHandler');
var CONSTANTS = require('./constants');
var dateFormat = require('dateformat');

function calcElo(tierAfter, rpAfter){
  return (tierAfter*100) - 300 + rpAfter;
}

function getEmbedForEloHistory(eloHistory, numToShow, debugMode, userFullName, chartCompletion){
  let matchData = eloHistory["Matches"]
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
  console.log("Num to show: "+numMatchesToShow+"__"+numToShow+"__"+numOfCompMatchesAvailable)

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
  if(eloChart != null){
    CHART_HANDLER.chartURLFromObject(eloChart, function(url){
      chartCompletion(url)
    })
  }

  return embed
}

module.exports = {
  getEmbedForEloHistory:getEmbedForEloHistory
}
