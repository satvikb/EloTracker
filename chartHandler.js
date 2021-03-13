var CONSTANTS = require('./constants');
var dateFormat = require('dateformat');
const { stringify } = require("javascript-stringify");
const request = require('request');

// for charting
// now going to assume its sorted
function getCompEloHistoryList(compUpdatesMatches){
  // return array of elo in order as int array [1234, 1255, ...]
  // first is newest, right is oldest
  // let compHistory = matchHistoryData[userId]
  // let matchSort = compHistory["MatchSort"]
  var eloArray = []
  var dateArray = []
  for(var i = 0; i < compUpdatesMatches.length; i++){
    // var matchId = matchSort[i]
    var matchData = compUpdatesMatches[i]//compHistory["Matches"][matchId]
    if(matchData["TierAfterUpdate"] > 0){
      var matchStartDate = matchData["MatchStartTime"]

      if(matchStartDate > CONSTANTS.EPISODE_2_START_TIME_MILLIS){
        eloArray.push(eloFromCompInfo(matchData))

        var d = new Date(matchStartDate)
        // var day = dateFormat(d, "mm/dd/yy h:MM:ss tt");
        var matchDay = dateFormat(d, "m/d");

        // dateArray.push(matchDay)
        dateArray.push(d)
      }
    }
  }
  return {"dates":dateArray, "elo":eloArray}
}
function eloFromCompInfo(matchInfo){
  let RPAfter = matchInfo["RankedRatingAfterUpdate"];
  let tierAfter = matchInfo["TierAfterUpdate"]
  var currentElo = (tierAfter*100) - 300 + RPAfter;
  return currentElo
}
function makeAnnotationsForEloMarkers(lowest, highest){
  var numberOfAnnotations = Math.ceil((highest-lowest)/100) + 1 // extra 1 should be for rank below lowest elo
  var annotations = []
  var lowestEloAnno = Math.floor(lowest/100)*100
  // console.log("ANNO "+lowest+"_"+highest+"_"+numberOfAnnotations+"_"+lowestEloAnno+"_")
  for(var i = 0; i < numberOfAnnotations; i++){
    var anno = {
      type: 'line',
      scaleID: 'y-axis-0',
      mode:"horizontal",
      value: lowestEloAnno,
      borderColor: 'red',
      borderWidth: 1,
      label:{
        enabled: true,
        content:CONSTANTS.RANKS[((lowestEloAnno+300)/100)+""],
        position:"start",
        font:{
          size:9,
          color:"#888",
        },
        xAdjust:-(CONSTANTS.CHART.WIDTH/2)+65
      }
    }
    annotations.push(anno)
    lowestEloAnno += 100
  }


  var act2Marker = {
    type: 'line',
    scaleID: 'x-axis-0',
    mode:"vertical",
    value: new Date(1614694500000),
    borderColor: 'blue',
    borderWidth: 1,
    label:{
      enabled: true,
      content:"ACT 2 START",
      position:"start",
      font:{
        size:12,
        color:"#888",
      },
      yAdjust:50
    }
  }
  annotations.push(act2Marker)


  return annotations
}
function buildEloChart(eloData, userName, userColor){
  if(eloData["elo"].length == 0){
    return null
  }
  var eloMin = Math.min(...eloData["elo"])
  var eloMax = Math.max(...eloData["elo"])

  var sum = 0;
  for(var i = 0; i < eloData["elo"].length; i++){
    sum += eloData["elo"][i]
  }
  var average = sum / eloData["elo"].length

  var averageRankNum = Math.floor((average/100))+3;
  var averageRankText = CONSTANTS.RANKS[""+averageRankNum]
  var eloAnnotations = makeAnnotationsForEloMarkers(eloMin, eloMax)

  var chartOptions = {
    "responsive":true,
    "title":{
      "display":true,
      "text":"Elo History for "+userName+" (Average Elo: "+Math.round(average)+", average rank: "+averageRankText+")"
    },
    "tooltips": {
      "mode":"index",
      "intersect": true
    },
    "legend":{
      "display":false
    },
    "plugins":{},
    "scales":{
      "yAxes":[{
        "ticks":{
          "min": Math.floor(eloMin / 10) * 10,
          "max": Math.ceil(eloMax / 10) * 10,
          "stepSize": 50,
          // "display":function(context) {
          //   var index = context.dataIndex;
          //   var value = context.dataset.data[index];
          //   return parseInt(value) % 50 == 0 ? true : false;
          // }
        }
      }],
      "xAxes":[{
        type:'time',
        time:{
          unit:'day',
          unitStepSize:1,
          displayFormats: {
           'day': 'M/D'
        }
        }
      }]
    },
    "annotation":{
      "annotations":eloAnnotations
    }
  }
  chartOptions["plugins"] = {
    "datalabels": {
      "display": false,
      "align": 'top',
      "backgroundColor": 'transparent',
      "borderRadius": 3
    }
  }

  var chartDatasetArray = []
  var datasetObject = {
    "label": "",
    "borderColor": userColor,
    "backgroundColor": userColor,
    "fill": false,
    "data": eloData["elo"].reverse(),
    "borderWidth":1,
    "pointRadius":1
  }
  // TODO negative dataset
  chartDatasetArray.push(datasetObject)



  var chartObject = {
    "type":"line",
    "data":{
      "labels":eloData["dates"].reverse(),//Array.from(Array(eloData.length).keys()),
      "datasets":chartDatasetArray
    },
    "options":chartOptions
  }
  return chartObject
}
function chartURLFromObject(chartObject, completion){
  var chartPostOps = {
    uri: 'https://quickchart.io/chart/create',
    method: 'POST',
    json: {
      "chart":(stringify(chartObject)),
      "width":CONSTANTS.CHART.WIDTH,
      "backgroundColor":"white"
    }
  }

  request(chartPostOps, function(err, res, body) {
    if(err){
      msg.channel.send("Error getting chart "+err)
    }else{
      // console.log(body)
      // var bodyParse = JSON.parse(body)
      completion(body["url"])
    }
  })
  // return "https://quickchart.io/chart?bkg=white&c="+encodeURIComponent(JSON.stringify(chartObject))
}

module.exports = {
  getCompEloHistoryList: getCompEloHistoryList,
  buildEloChart: buildEloChart,
  chartURLFromObject: chartURLFromObject
}
