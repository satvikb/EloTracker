const { createCanvas, loadImage, Image } = require('canvas')
var CONSTANTS = require('./constants');
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

function getLatestMatchImage(userId, overviewData, roundData, partyData, statsData, completion){
  let iw = 1920
  let ih = 1080
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

  let sX = 35;
  let sVerticalPadding = 30
  let sY = headerY+headerHeight+sVerticalPadding;
  let sWidth = headerWidth*0.75
  let sHeight = ih - ((headerY+headerHeight) + (ih-tY)) - (sVerticalPadding*2)

  var allyTeamColor = roundData["teamInfo"][userId]
  var teamKey = allyTeamColor.toLowerCase()
  var otherTeamKey = allyTeamColor == "Blue" ? "red" : "blue"

  function makeTimelime(){
    var roundCount = Object.keys(roundData["winResults"]).length

    var resultPadding = 5;
    var resultWidth = (tW - (resultPadding*roundCount)) / roundCount

    rect("rgb(25,25,25,1)", tX, tY, tW, tH)

    function drawRoundResult(roundNum, x, team, resultCode){
      rect("rgb(50,50,50,1)", x, tY, resultWidth, tH)

      text(roundNum+"",x+(resultWidth/2),tY+(tH*0.15),"white","15px Impact", "center", "middle")
    }

    var roundResults = roundData["roundResults"]
    var count = 0
    for(var roundNum in roundResults){
      if(roundResults.hasOwnProperty(roundNum)){

        drawRoundResult(count+1, tX+(count*resultWidth)+(resultPadding*count), roundData["winResults"][roundNum], roundResults[roundNum])
        count += 1
      }
    }
  }
  function makeScoreboard(){
    rect("rgba(25,25,25,0.5)", sX, sY, sWidth, sHeight)
    let headerHeight = sHeight*0.05
    let rowHeight = (sHeight-headerHeight) / 10 // always 10 players?

    let agentX = 0
    let rankX = 0.05
    let nameX = 0.1
    let acsX = 0.3
    let kdaX = 0.4
    let hsX = 0.5
    let fbX = 0.6 // first blood
    let pX = 0.7 // plants
    let dX = 0.8 // defuses

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
      headerText("FB", fbX, pX-fbX)
      headerText("Plants", pX, dX-pX)
      headerText("Defuses", dX, 1-dX)
    }

    function tableRow(i, bgColor, agentId, rankTier, name, acs, kda, hs, fb, plants, defuses){
      let rowY = sY+headerHeight+((i+1)*rowHeight)
      rect(bgColor, sX, rowY-rowHeight, sWidth, rowHeight)

      function rowLabel(txt, x, w){ // TODO add w and textbox
        text(txt, sX+(sWidth*x)+((w*sWidth)/2), rowY-(rowHeight*0.25), "white", "15pt Impact", "center")
      }

      var agentImageData = CONSTANTS.CONTENT.AGENT_PORTRAITS[agentId]//await loadImage('https://media.valorant-api.com/agents/'+agentId+'/displayicon.png')
      var img = new Image
      img.src = agentImageData

      var imgS = Math.min((rankX-agentX)*sWidth, rowHeight)
      ctx.drawImage(img, sX, rowY-imgS, imgS, imgS)

console.log("RR "+rankTier)
      var rankImageData = CONSTANTS.CONTENT.RANK_IMAGES[rankTier+""]//await loadImage('https://media.valorant-api.com/agents/'+agentId+'/displayicon.png')
      var rankImg = new Image
      rankImg.src = rankImageData

      imgS = Math.min((nameX-rankX)*sWidth, rowHeight)
      ctx.drawImage(rankImg, sX+(rankX*sWidth), rowY-imgS, imgS, imgS)

      // console.log("Draw "+agentId+"_"+rowY)
      // rowLabel(agent, agentX, nameX-agentX)
      rowLabel(name, nameX, acsX-nameX)
      rowLabel(acs, acsX, kdaX-acsX)
      rowLabel(kda, kdaX, hsX-kdaX)
      rowLabel(hs, hsX, fbX-hsX)
      rowLabel(fb, fbX, pX-fbX)
      rowLabel(plants, pX, dX-pX)
      rowLabel(defuses, dX, 1-dX)
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
      tableRow(i, allyTeamColor == playerTeam ? "rgba(20,226,134,0.5)" : "rgba(226, 86, 20, 0.5)", agentId, tier, gameName, s["score"], kda, hsPercent, s["firstBloods"] || 0, s["plants"] || 0, s["defuses"] || 0)
    }
  }
  function makeHeader(){
    rect("rgba(25,25,25,0.5)", headerX, headerY, headerWidth, headerHeight)
    var wonGame = allyTeamColor == overviewData["gameInfo"]["winningTeam"]
    var resultText = wonGame ? "VICTORY" : "DEFEAT"
    var resultColor = wonGame ? "blue" : "red"
    var oppositeColor = wonGame ? "red" : "blue"

    var allyScore = overviewData["gameInfo"][teamKey+"Score"]
    var enemyScore = overviewData["gameInfo"][otherTeamKey+"Score"]

    var oldHeaderWidth = headerWidth
    headerWidth = headerWidth*0.8

    text(resultText, headerX+(headerWidth/2), headerY+(headerHeight/2), resultColor, "70px Impact", "center", "middle")
    text(allyScore+"", headerX+(headerWidth*0.25),  headerY+(headerHeight/2), resultColor, "70px Impact", "center", "middle")
    text(enemyScore+"", headerX+(headerWidth*0.75),  headerY+(headerHeight/2), oppositeColor, "70px Impact", "center", "middle")

    var rightSideHeaderWidth = oldHeaderWidth-headerWidth
    var rightSideHeaderX = headerX+headerWidth

    function msToTime(s) {
      var ms = s % 1000;
      s = (s - ms) / 1000;
      var secs = s % 60;
      s = (s - secs) / 60;
      var mins = s % 60;
      var hrs = (s - mins) / 60;

      return (hrs == 0 ? "" : ":") + mins + ':' + secs
    }
    console.log("T"+overviewData["gameInfo"]["gameLengthMillis"])
    var gameLength = msToTime(overviewData["gameInfo"]["gameLengthMillis"])
    var d = new Date(overviewData["gameInfo"]["gameStartMillis"])
    var fieldDay = dateFormat(d, "m/d h:MMtt");

    text(gameLength, rightSideHeaderX+(rightSideHeaderWidth/2), headerY+(headerHeight*0.1), "white", "30px Impact", "center", "middle")
    text(fieldDay, rightSideHeaderX+(rightSideHeaderWidth/2), headerY+(headerHeight*0.3), "white", "30px Impact", "center", "middle")

    headerWidth = oldHeaderWidth
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

  makeBackground()
  makeHeader()
  makeTimelime()
  makeScoreboard()


  const buffer = canvas.toBuffer('image/png')
  console.log("completoin")
  completion(buffer)
}


module.exports = {
  getLatestMatchImage:getLatestMatchImage
}
