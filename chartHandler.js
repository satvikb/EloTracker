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

      if(matchStartDate > EPISODE_2_START_TIME_MILLIS){
        eloArray.push(eloFromCompInfo(matchData))

        var d = new Date(matchStartDate)
        // var day = dateFormat(d, "mm/dd/yy h:MM:ss tt");
        var matchDay = dateFormat(d, "m/d");

        dateArray.push(matchDay)
      }
    }
  }
  return {"dates":dateArray, "elo":eloArray}
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
  var averageRankText = RANKS[""+averageRankNum]
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
    "data": eloData["elo"].reverse()
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
  // console.log("CHART: "+JSON.stringify(chartObject))
  return chartObject
}
function chartURLFromObject(chartObject, completion){
  var chartPostOps = {
    uri: 'https://quickchart.io/chart/create',
    method: 'POST',
    json: {
      "chart":(stringify(chartObject)),
      "width":ELO_CHART_WIDTH,
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
