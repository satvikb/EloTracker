const { createCanvas, loadImage, Image } = require('canvas')
var CONSTANTS = require('./constants');
var MATCH_COMPUTATION = require('./matchComputation');

var dateFormat = require('dateformat');

// Draw line under text
// var text = ctx.measureText('Awesome!')
// ctx.strokeStyle = 'rgba(255,255,255,0.5)'
// ctx.beginPath()
// ctx.lineTo(50, 102)
// ctx.lineTo(50 + text.width, 102)
// ctx.stroke()

// Draw cat with lime helmet
// loadImage('examples/images/lime-cat.jpg').then((image) => {
//   ctx.drawImage(image, 50, 0, 70, 70)
//
//   console.log('<img src="' + canvas.toDataURL() + '" />')
// })

function getLatestMatchImage(userId, overviewData, roundData, partyData, statsData, eloData, completion){
  let iw = 1920
  let ih = 1080

  let POSITIVE_COLOR = "rgba(79, 203, 142, 1)"
  let NEGATIVE_COLOR = "rgba(235,84,51,1)"

  const canvas = createCanvas(iw, ih)
  const ctx = canvas.getContext('2d')

  function rect(color, x,y,w,h){
    ctx.fillStyle = color
    ctx.fillRect(x,y,w,h)
    ctx.fillStyle = "rgb(0,0,0,0)"
  }
  function text(text,x,y,color,font,align,vAlign){
    color = color == null ? "white" : color
    font = font == null ? "50px Impact" : font
    align = align || "start"
    vAlign = vAlign || "alphabetic"
    ctx.fillStyle = color
    ctx.textAlign = align
    ctx.font = font
    ctx.textBaseline = vAlign
    ctx.fillText(text, x, y)
  }

  let headerX = 30;
  let headerY = 30;
  let headerHeight = 200
  let headerWidth = iw-60

  // timeline positioning
  var tX = 35
  var tW = iw-70 // timeline width
  var tH = 130
  var tY = ih-150

  // scoreboard position
  let sX = 35;
  let sVerticalPadding = 30
  let sY = headerY+headerHeight+sVerticalPadding;
  let sWidth = headerWidth*0.5
  let sHeight = ih - ((headerY+headerHeight) + (ih-tY)) - (sVerticalPadding*2)

  // comparison position
  let cX = sX + sWidth + 10
  let cY = sY
  let cWidth = iw-sX-sWidth-headerX
  let cHeight = sHeight

  // bust position
  var bustYStart = cY+cHeight*0.5
  var bustHeight = ih-bustYStart
  var bustWidth = bustHeight
  var bustX = (cX+cWidth)-bustWidth

  var playerAgentId = roundData["playerCharacters"][userId]
  var playerAgentName = CONSTANTS.CONTENT.AGENT_NAMES[playerAgentId]

  var allyTeamColor = roundData["teamInfo"][userId]
  var teamKey = allyTeamColor
  var otherTeamKey = allyTeamColor == "Blue" ? "Red" : "Blue"

  var playerOverviewData = {}
  for(var i = 0; i < overviewData["scoreboard"].length; i++){
    if(overviewData["scoreboard"][i]["subject"] == userId){
      playerOverviewData = overviewData["scoreboard"][i]
    }
  }

  function makeTimelime(){
    var roundCount = Object.keys(roundData["winResults"]).length

    var resultPadding = 5;
    var resultWidth = (tW - (resultPadding*roundCount)) / roundCount

    rect("rgb(25,25,25,1)", tX, tY, tW, tH)

    function drawRoundResult(roundNum, x, team, resultCode, allyLoadout, enemyLoadout, allyBank, enemyBank, allyDamage, enemyDamage){
      var ALLY_COLOR = "rgba(79, 203, 142, 0.8)"
      var ENEMY_COLOR = "rgba(235,84,51,0.8)"
      rect("rgb(50,50,50,1)", x, tY, resultWidth, tH)

      function rText(txt,x2,y,color,font,halign,valign){
        text(txt,x+(resultWidth*x2),tY+(tH*y),color,font,halign,valign)
      }
      function rRect(color, x2, y2, w, h){
        rect(color,x+(resultWidth*x2),tY+(tH*y2),w*resultWidth,h*tH)
      }

      var timelineTitleFontSize = 13 + ((26 - roundCount)*0.2)
      var timelineTextFontSize = 15 + ((26 - roundCount)*0.2)

      rText(roundNum+"", 0.5, 0.1, team == teamKey ? ALLY_COLOR : ENEMY_COLOR, "15px impact", "center", "middle")
      if(roundNum <= 1){
        rText("Avg. Loadout", 0, 0.25, "white", timelineTitleFontSize+"px impact", null, "middle")
        rText("Avg. Bank", 0, 0.6, "white", timelineTitleFontSize+"px impact", null, "middle")
      }
      rText(allyLoadout, 0.05, 0.4, ALLY_COLOR, timelineTextFontSize+"px impact", null, "middle")
      rText(enemyLoadout, 0.55, 0.4, ENEMY_COLOR, timelineTextFontSize+"px impact", null, "middle")
      rText(allyBank, 0.05, 0.75, ALLY_COLOR, timelineTextFontSize+"px impact", null, "middle")
      rText(enemyBank, 0.55, 0.75, ENEMY_COLOR, timelineTextFontSize+"px impact", null, "middle")

      var damageTotal = allyDamage + enemyDamage
      var allyDamagePercent = allyDamage / damageTotal;
      var enemyDamagePercent = enemyDamage / damageTotal;

      rRect(ALLY_COLOR, 0, 0.9, allyDamagePercent, 0.1)
      rRect(ENEMY_COLOR, allyDamagePercent, 0.9, enemyDamagePercent, 0.1)
    }

    var roundResults = roundData["roundResults"]
    var roundTeamDetails = roundData["roundTeamDetails"]
    for(var roundNum in roundResults){
      if(roundResults.hasOwnProperty(roundNum)){
        var tD = roundTeamDetails[roundNum] // tD = teamDetails
        var count = parseInt(roundNum)
        var roundNumber = count+1
        // TODO take into account AFKs for each round
        var activePlayersInRound = 5;
        var allyLoadout = tD[teamKey]["loadoutValue"] / activePlayersInRound
        var enemyLoadout = tD[otherTeamKey]["loadoutValue"] / activePlayersInRound
        var allyBank = tD[teamKey]["bankValue"] / activePlayersInRound
        var enemyBank = tD[otherTeamKey]["bankValue"] / activePlayersInRound
        var allyDamage = tD[teamKey]["damage"] / activePlayersInRound
        var enemyDamage = tD[otherTeamKey]["damage"] / activePlayersInRound

        drawRoundResult(roundNumber, tX+(count*resultWidth)+(resultPadding*count), roundData["winResults"][roundNum], roundResults[roundNum], allyLoadout, enemyLoadout, allyBank, enemyBank, allyDamage, enemyDamage)

        if(roundNumber == 12){
          rect("blue",tX+(roundNumber*resultWidth)+(resultPadding*(roundNumber-1)),tY,resultPadding,tH*1.2)
        }
      }
    }
  }
  function makeScoreboard(){
    rect("rgba(25,25,25,0.5)", sX, sY, sWidth, sHeight)
    let headerHeight = sHeight*0.05
    let rowHeight = (sHeight-headerHeight) / 10 // always 10 players?

    let agentX = 0
    let rankX = 0.075
    let nameX = 0.15
    let acsX = 0.4
    let kdaX = 0.6
    let hsX = 0.75
    let fbX = 0.85 // first blood
    // let pX = 0.8 // plants
    // let dX = 0.9 // defuses

    function headerText(txt,x,w){
      // TODO textbox and center
      text(txt, sX + (sWidth*x)+((w*sWidth)/2), sY+(headerHeight/2), "white", "20pt Impact", "center", "middle")//, sWidth*w,h)
    }
    function tableHeader(){
      rect("rgb(50,50,50,1)", sX, sY, sWidth, headerHeight)
      // headerText("Agent", agentX, nameX-agentX)
      headerText("Name", nameX, acsX-nameX)
      headerText("ACS", acsX, kdaX-acsX)
      headerText("KDA", kdaX, hsX-kdaX)
      headerText("HS %", hsX, fbX-hsX)
      headerText("FB", fbX, 1-fbX)
      // headerText("Plants", pX, dX-pX)
      // headerText("Defuses", dX, 1-dX)
    }

    function tableRow(i, bgColor, agentId, rankTier, name, acs, kda, hs, fb, plants, defuses){
      let rowY = sY+headerHeight+((i+1)*rowHeight)
      rect(bgColor, sX, rowY-rowHeight, sWidth, rowHeight)

      function rowLabel(txt, x, w){ // TODO add w and textbox
        text(txt, sX+(sWidth*x)+((w*sWidth)/2), rowY-(rowHeight*0.5), "white", "15pt Impact", "center", "middle")
      }


      var agentImageData = CONSTANTS.CONTENT.AGENT_PORTRAITS[agentId]//await loadImage('https://media.valorant-api.com/agents/'+agentId+'/displayicon.png')
      var img = new Image
      img.src = agentImageData

      var imgS = Math.min((rankX-agentX)*sWidth, rowHeight)
      var imgY = (rowY-imgS) - (rowHeight-imgS)/2
      ctx.drawImage(img, sX, imgY, imgS, imgS)

      // console.log("RR "+rankTier)
      var rankImageData = CONSTANTS.CONTENT.RANK_IMAGES[rankTier+""]//await loadImage('https://media.valorant-api.com/agents/'+agentId+'/displayicon.png')
      var rankImg = new Image
      rankImg.src = rankImageData

      imgS = Math.min((nameX-rankX)*sWidth, rowHeight)
      ctx.drawImage(rankImg, sX+(rankX*sWidth), imgY, imgS, imgS)

      // console.log("Draw "+agentId+"_"+rowY)
      // rowLabel(agent, agentX, nameX-agentX)
      rowLabel(name, nameX, acsX-nameX)
      rowLabel(acs, acsX, kdaX-acsX)
      rowLabel(kda, kdaX, hsX-kdaX)
      rowLabel(hs, hsX, fbX-hsX)
      rowLabel(fb, fbX, 1-fbX)
      // rowLabel(plants, pX, dX-pX)
      // rowLabel(defuses, dX, 1-dX)
    }

    tableHeader()

    var scoreboardData = overviewData["scoreboard"].reverse()
    for(var i = 0; i < scoreboardData.length; i++){
      var playerData = scoreboardData[i]
      var curPlayerId = playerData["subject"]
      var playerTeam = playerData["teamId"]
      var agentId = playerData["characterId"].toLowerCase()
      var tier = playerData["competitiveTier"]
      var agentName = CONSTANTS.CONTENT.AGENT_NAMES[agentId]
      var s = playerData["stats"]
      var gameName = playerData["gameName"]+"#"+playerData["tagLine"]
      var kda = s["kills"]+" / "+s["deaths"]+" / "+s["assists"]

      var totalHits = statsData["hits"][curPlayerId]["headshots"] + statsData["hits"][curPlayerId]["bodyshots"] + statsData["hits"][curPlayerId]["legshots"]
      var hsPercent = ((statsData["hits"][curPlayerId]["headshots"] / totalHits)*100).toFixed(2)+"%"
      tableRow(i, allyTeamColor == playerTeam ? "rgba(79, 203, 142, 0.5)" : "rgba(235,84,51,0.5)", agentId, tier, gameName, s["score"], kda, hsPercent, s["firstBloods"] || 0, s["plants"] || 0, s["defuses"] || 0)
    }
  }
  function makeHeader(){
    rect("rgba(25,25,25,0.5)", headerX, headerY, headerWidth, headerHeight)
    var wonGame = allyTeamColor == overviewData["gameInfo"]["winningTeam"]
    var resultText = wonGame ? "VICTORY" : "DEFEAT"

    var resultColor = wonGame ? POSITIVE_COLOR : NEGATIVE_COLOR
    var oppositeColor = wonGame ? NEGATIVE_COLOR : POSITIVE_COLOR

    var allyScore = overviewData["gameInfo"][teamKey.toLowerCase()+"Score"]
    var enemyScore = overviewData["gameInfo"][otherTeamKey.toLowerCase()+"Score"]

    var eloGained = eloData["RankedRatingEarned"]
    eloGained = eloGained > 0 ? "+"+eloGained : eloGained

    var rankTier = eloData["TierAfterUpdate"]


    text(resultText, headerX+(headerWidth*0.5), headerY+(headerHeight/2), resultColor, "100px Impact", "center", "middle")
    text(allyScore+"", headerX+(headerWidth*0.25),  headerY+(headerHeight/2), resultColor, "120px Impact", "center", "middle")
    text(enemyScore+"", headerX+(headerWidth*0.75),  headerY+(headerHeight/2), oppositeColor, "120px Impact", "center", "middle")


    text(eloGained+" RP", headerX+(headerWidth*0.125), headerY+(headerHeight/2), resultColor, "50px Impact", "center", "middle")

    var rankImageData = CONSTANTS.CONTENT.RANK_IMAGES[rankTier+""]//await loadImage('https://media.valorant-api.com/agents/'+agentId+'/displayicon.png')
    var rankImg = new Image
    rankImg.src = rankImageData

    imgS = headerHeight*0.75
    ctx.drawImage(rankImg, headerX+(headerWidth*0.875)-(imgS/2), headerY+(headerHeight/2)-(imgS/2), imgS, imgS)

    function msToTime(s) {
      var ms = s % 1000;
      s = (s - ms) / 1000;
      var secs = s % 60;
      s = (s - secs) / 60;
      var mins = s % 60;
      var hrs = (s - mins) / 60;

      return (hrs == 0 ? "" : ":") + mins + 'm:' + (secs+"").padStart(2,'0')+"s"
    }
    console.log("T"+overviewData["gameInfo"]["gameLengthMillis"])
    var gameLength = msToTime(overviewData["gameInfo"]["gameLengthMillis"])
    var d = new Date(overviewData["gameInfo"]["gameStartMillis"])
    var fieldDay = dateFormat(d, "m/d h:MMtt");

    // text(gameLength, headerX+(headerWidth*0.4), headerY+(headerHeight*0.75), "white", "30px Impact", "center", "middle")
    // text(fieldDay, headerX+(headerWidth*0.6), headerY+(headerHeight*0.75), "white", "30px Impact", "center", "middle")
    text(gameLength+" | "+fieldDay, headerX+(headerWidth*0.5), headerY+(headerHeight*0.95), "white", "30px Impact", "center", "bottom")

    // headerWidth = oldHeaderWidth
  }
  function makeBackground(){
    rect("black", 0, 0, iw,ih) // bg
    var mapAssetPath = overviewData["gameInfo"]["mapId"].split("/")
    var mapKey = mapAssetPath[mapAssetPath.length-1].toLowerCase()

    var mapSplash = CONSTANTS.CONTENT.MAP_SPLASHES[mapKey]//await loadImage('https://media.valorant-api.com/agents/'+agentId+'/displayicon.png')
    var img = new Image
    img.src = mapSplash
    ctx.drawImage(img, 0,0,iw,ih)
  }
  function makeAverageComparison(){

    let tableX = cWidth*0.2
    let tableWidth = cWidth - tableX

    // rect("gray", cX, cY, cWidth, cHeight)

    let totalAveragePlayerData = MATCH_COMPUTATION.getStatsData()[userId] || {}

    function crect(color,x,y,w,h){
      rect(color,cX+x,cY+y,w,h)
    }
    function ctext(txt,x,y,color,font,align,vAlign){
      text(txt,cX+x,cY+y,color,font,align,vAlign)
    }

    let tableLeftColumnX = tableX+(tableWidth*0.2)
    let tableMiddleColumnX = tableX+(tableWidth*0.5)
    let tableRightColumnX = tableX+(tableWidth*0.8)
    let tableYStart = cHeight*0.075
    let tableHeaderHeight = (cHeight*0.05)

    function makeTitles(){
      ctext("This match", tableLeftColumnX, tableYStart-tableHeaderHeight/2, "white", "20px Impact","center","middle")
      ctext("Total Average", tableRightColumnX, tableYStart-tableHeaderHeight/2, "white", "20px Impact","center","middle")
    }
    function makeStatComparison(){
      let rowHeight = cHeight/10

      function comparisonRow(i,value1,text,value2){
        let rowY = tableYStart+tableHeaderHeight+(i*rowHeight) // the y middle of row
        crect("rgba(20,20,20,0.4)",tableX,rowY-(rowHeight/2),tableWidth,rowHeight)
        ctext(value1,tableLeftColumnX,rowY,parseInt(value1) > parseInt(value2) ? POSITIVE_COLOR : NEGATIVE_COLOR,"30px Impact","center","middle")
        ctext(text,tableMiddleColumnX,rowY,"white","20px Impact","center","middle")
        ctext(value2,tableRightColumnX,rowY,parseInt(value2) > parseInt(value1) ? POSITIVE_COLOR : NEGATIVE_COLOR,"30px Impact","center","middle")
      }

      var gameHeadshotPercent = ((statsData["hits"][userId]["headshots"] / (statsData["hits"][userId]["headshots"]+statsData["hits"][userId]["bodyshots"]+statsData["hits"][userId]["legshots"]))*100).toFixed(2)
      var averageHeadshotPercent = ((totalAveragePlayerData["stats"]["headshots"] / (totalAveragePlayerData["stats"]["headshots"]+totalAveragePlayerData["stats"]["bodyshots"]+totalAveragePlayerData["stats"]["legshots"]))*100).toFixed(2)
      comparisonRow(0,(playerOverviewData["stats"]["score"]/playerOverviewData["stats"]["roundsPlayed"]).toFixed(2),"Avg Combat Score",(totalAveragePlayerData["stats"]["score"]/totalAveragePlayerData["stats"]["roundsPlayed"]).toFixed(2))
      comparisonRow(1,playerOverviewData["stats"]["kills"],"Kills",(totalAveragePlayerData["stats"]["kills"]/totalAveragePlayerData["stats"]["totalGamesPlayed"]).toFixed(2))
      comparisonRow(2,gameHeadshotPercent,"HS %",averageHeadshotPercent)
      // comparisonRow(3,130,"Text3",260)

    }
    function makeRoundStats(){
      // plants, defuses, and clutches.
      // small box
      crect("rgba(20,20,20,0.3)",0,10,150,100)
      ctext("Clutches - "+(playerOverviewData["stats"]["clutches"] || 0)+" ",150,15,"white","20px Impact","right","top")
      ctext("Plants - "+(playerOverviewData["stats"]["plants"] || 0)+" ",150,45,"white","20px Impact","right","top")
      ctext("Defuses - "+(playerOverviewData["stats"]["defuses"] || 0)+" ",150,75,"white","20px Impact","right","top")
    }
    function makeAgentComparison(){
      var aCX = cX
      var aCH = cHeight*0.5
      var aCY = (cY+cHeight)-aCH
      var aCW = cWidth - bustWidth
      rect("rgba(20,20,20,0.4)", aCX, aCY, aCW, aCH)

      function cArect(color,x,y,w,h){
        rect(color,aCX+(x*aCW),aCY+(y*aCH),w*aCW,h*aCH)
      }
      function cAtext(txt,x,y,color,font,align,vAlign){
        text(txt,aCX+(x*aCW),aCY+(y*aCH),color,font,align,vAlign)
      }

      var aCLeftColumnX = 0.25
      var aCRightColumnX = 0.75
      var headerHeight = 0.1

      cAtext(playerAgentName+" this match", aCLeftColumnX, headerHeight/2, "white",  "20px Impact", "center", "middle")
      cAtext(playerAgentName+" all time avg", aCRightColumnX, headerHeight/2, "white", "20px Impact", "center", "middle")

      function drawUtil(y, height, utilName, text, thisMatchNumber, allTimeNumber){
        // cArect("green", 0, y, 1, height)

        var textWidth = 1-(height*2)
        var textXStart = height
        var textXLeftColumn = 0.15
        var textXMiddleColumn = 0.5
        var textXRightColumn = 0.85

        // cArect("yellow", textXStart, y, textWidth, height)
        cAtext(thisMatchNumber+"", height+(textWidth*textXLeftColumn), y+(height/2), thisMatchNumber > allTimeNumber ? POSITIVE_COLOR : NEGATIVE_COLOR, "25px impact", "center", "middle")
        cAtext(text, height+(textWidth*textXMiddleColumn), y+(height/2), "white", "15px impact", "center", "middle")
        cAtext(allTimeNumber+"", height+(textWidth*textXRightColumn), y+(height/2), thisMatchNumber > allTimeNumber ? NEGATIVE_COLOR : POSITIVE_COLOR, "25px impact", "center", "middle")

        var utilityImg = CONSTANTS.CONTENT.AGENT_ABILITY_ICONS[playerAgentId][utilName]
        var img2 = new Image
        img2.src = utilityImg

        var uh = height*aCH
        ctx.drawImage(img2, aCX, (y*aCH)+aCY, uh, uh)
        ctx.drawImage(img2, aCX+aCW-uh, (y*aCH)+aCY, uh, uh)
      }

      var thisGameCast1 = playerOverviewData["stats"]["abilityCasts"]["ability1Casts"] || 0
      var thisGameCast2 = playerOverviewData["stats"]["abilityCasts"]["ability2Casts"] || 0
      var thisGameCast3 = playerOverviewData["stats"]["abilityCasts"]["grenadeCasts"] || 0
      var thisGameCast4 = playerOverviewData["stats"]["abilityCasts"]["ultimateCasts"] || 0

      var agentStats = totalAveragePlayerData["stats"]["statsByAgent"][playerAgentName]
      var totalAverageCast1 = agentStats["ability1Casts"] || 0
      var totalAverageCast2 = agentStats["ability2Casts"] || 0
      var totalAverageCast3 = agentStats["grenadeCasts"] || 0
      var totalAverageCast4 = agentStats["ultimateCasts"] || 0
      totalAverageCast1 = (totalAverageCast1 / totalAveragePlayerData["stats"]["statsByAgent"][playerAgentName]["gamesPlayed"]).toFixed(2)
      totalAverageCast2 = (totalAverageCast2 / totalAveragePlayerData["stats"]["statsByAgent"][playerAgentName]["gamesPlayed"]).toFixed(2)
      totalAverageCast3 = (totalAverageCast3 / totalAveragePlayerData["stats"]["statsByAgent"][playerAgentName]["gamesPlayed"]).toFixed(2)
      totalAverageCast4 = (totalAverageCast4 / totalAveragePlayerData["stats"]["statsByAgent"][playerAgentName]["gamesPlayed"]).toFixed(2)

      drawUtil(0.5, 0.125, "ability1", "Ability 1 Casts", thisGameCast1, totalAverageCast1)
      drawUtil(0.625, 0.125, "ability2", "Ability 2 Casts", thisGameCast2, totalAverageCast2)
      drawUtil(0.75, 0.125, "grenade", "Ability 3 Casts", thisGameCast3, totalAverageCast3)
      drawUtil(0.875, 0.125, "ultimate", "Ultimate Casts", thisGameCast4, totalAverageCast4)
    }

    makeRoundStats()
    makeTitles()
    makeStatComparison()
    makeAgentComparison()
  }
  function drawAgentBust(){


    // rect("black", bustX, bustYStart, bustWidth, bustHeight)

    var agentImageData = CONSTANTS.CONTENT.AGENT_BUST_PORTRAITS[playerAgentId]
    var img = new Image
    img.src = agentImageData

    ctx.drawImage(img, bustX, bustYStart, bustWidth, bustHeight)
  }


  makeBackground()
  makeHeader()
  drawAgentBust()
  makeTimelime()
  makeScoreboard()
  makeAverageComparison()

  const buffer = canvas.toBuffer('image/png')
  console.log("completoin")
  completion(buffer)
}


module.exports = {
  getLatestMatchImage:getLatestMatchImage
}
