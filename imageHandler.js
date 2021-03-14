const { createCanvas, loadImage } = require('canvas')
var CONSTANTS = require('./constants');

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

async function getLatestMatchImage(userId, overviewData, roundData, partyData, hitsData, completion){
  let iw = 1920
  let ih = 1080
  const canvas = createCanvas(iw, ih)
  const ctx = canvas.getContext('2d')

  function rect(color, x,y,w,h){
    ctx.fillStyle = color
    ctx.fillRect(x,y,w,h)
  }
  function text(text,x,y,color,font){
    color = color == null ? "white" : color
    font = font == null ? "50px Impact" : font
    ctx.fillStyle = color
    ctx.font = font
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

  function makeTimelime(){
    var roundCount = Object.keys(roundData["winResults"]).length

    var resultPadding = 5;
    var resultWidth = (tW - (resultPadding*roundCount)) / roundCount

    rect("rgb(25,25,25,1)", tX, tY, tW, tH)

    function drawRoundResult(x, team, resultCode){
      rect("rgb(50,50,50,1)", x, tY, resultWidth, tH)

    }

    var roundResults = roundData["roundResults"]
    var count = 0
    for(var roundNum in roundResults){
      if(roundResults.hasOwnProperty(roundNum)){

        drawRoundResult(tX+(count*resultWidth)+(resultPadding*count), roundData["winResults"][roundNum], roundResults[roundNum])
        count += 1
      }
    }
  }
  async function makeScoreboard(){
    rect("rgb(25,25,25,1)", sX, sY, sWidth, sHeight)
    let headerHeight = sHeight*0.05
    let rowHeight = (sHeight-headerHeight) / 10 // always 10 players?

    let agentX = 0
    let nameX = 0.1
    let acsX = 0.3
    let kdaX = 0.4
    let econX = 0.5
    let fbX = 0.6 // first blood
    let pX = 0.7 // plants
    let dX = 0.8 // defuses

    function headerText(txt,x,w){
      // TODO textbox and center
      text(txt, sX + (sWidth*x), sY+headerHeight, "white", "20pt Impact")//, sWidth*w,h)
    }
    function tableHeader(){
      rect("rgb(50,50,50,1)", sX, sY, sWidth, headerHeight)
      headerText("Agent", agentX, nameX-agentX)
      headerText("Name", nameX, acsX-nameX)
      headerText("ACS", acsX, kdaX-acsX)
      headerText("KDA", kdaX, econX-kdaX)
      headerText("HS", econX, fbX-econX)
      headerText("fb", fbX, pX-fbX)
      headerText("Plants", pX, dX-pX)
      headerText("Defuses", dX, 1-dX)
    }

    async function tableRow(i, bgColor, agentId, name, acs, kda, hs, fb, plants, defuses){
      let rowY = sY+headerHeight+((i+1)*rowHeight)
      rect(bgColor, sX, rowY-rowHeight, sWidth, rowHeight)

      function rowLabel(txt, x){ // TODO add w and textbox
        text(txt, sX+(sWidth*x), rowY, "white", "15pt Impact")
      }

      var agentImage = await loadImage('https://media.valorant-api.com/agents/'+agentId+'/displayicon.png')
      let imgS = 50;//Math.min((nameX-agentX)*sWidth, rowHeight)
      ctx.drawImage(agentImage, sX, rowY, imgS, imgS)
      console.log("Draw")
      // rowLabel(agent, agentX, nameX-agentX)
      rowLabel(name, nameX, acsX-nameX)
      rowLabel(acs, acsX, kdaX-acsX)
      rowLabel(kda, kdaX, econX-kdaX)
      rowLabel(hs, econX, fbX-econX)
      rowLabel(fb, fbX, pX-fbX)
      rowLabel(plants, pX, dX-pX)
      rowLabel(defuses, dX, 1-dX)
    }

    tableHeader()

    var scoreboardData = overviewData["scoreboard"].reverse()
    for(var i = 0; i < scoreboardData.length; i++){
      var playerData = scoreboardData[i]
      var playerTeam = playerData["teamId"]
      var agentId = playerData["characterId"].toLowerCase()
      var agentName = CONSTANTS.CONTENT.AGENT_NAMES[agentId]
      var s = playerData["stats"]
      var gameName = playerData["gameName"]+"#"+playerData["tagLine"]
      var kda = s["kills"]+" / "+s["deaths"]+" / "+s["assists"]

      var totalHits = hitsData[userId]["headshots"] + hitsData[userId]["bodyshots"] + hitsData[userId]["legshots"]
      var hsPercent = ((hitsData[userId]["headshots"] / totalHits)*100).toFixed(2)+"%"

      tableRow(i, allyTeamColor == playerTeam ? "gray" : "rgb("+(30*i)+", 0, 0, 1)", agentId, gameName, s["score"], kda, hsPercent, s["firstBloods"] || 0, s["plants"] || 0, s["defuses"] || 0)
    }
  }

  rect("black", 0, 0, canvas.width, canvas.height) // bg

  rect("rgb(25,25,25,1)", headerX, headerY, headerWidth, headerHeight)
  text("Score", 50, 130)

  makeTimelime()
  makeScoreboard()


  const buffer = canvas.toBuffer('image/png')
  console.log("completoin")
  completion(buffer)
}


module.exports = {
  getLatestMatchImage:getLatestMatchImage
}
