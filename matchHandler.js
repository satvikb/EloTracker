var AUTH = require('./auth');
var CONSTANTS = require('./constants');
var PROCESSING = require('./matchProcessing');
var COMPUTATION = require('./matchComputation');
var LOG = require('./logging');

var matchesDownloadedData = CONSTANTS.readJSONFile('private/matchesDownloaded.json');
var matchHistoryData = CONSTANTS.readJSONFile('private/matchHistory.json');


// So we download all the last 20 matches and combine it with the existing match history
// The only problem here is if there are more than 20 matches played since last downloaded
// This problem is fixed by the cron job
/*
  Retrieve last 20 match data.
  If the user already exists:
    Combine with existing match data.
  Else:
    Work on downloading everything in the background.
  Completion with data (only 20 if new user).

  Download all match details.
*/
function getAllMatchHistory(start,end,total){

}
function matchHistory(userId, completion, computationCompletion, start, end){
  start = start || 0
  end = end || 20
  LOG.log(4, "Getting match history from competitiveupdates endpoint")

  let url = 'https://pd.na.a.pvp.net/mmr/v1/players/'+userId+"/competitiveupdates?startIndex="+start+"&endIndex="+end
  AUTH.getRequest(url, function(data){
    let matches = data["Matches"]
    var newMatchIDs = matches.reduce(function(filtered, match) {
      var matchStartTime = match["MatchStartTime"]
      if (matchStartTime >= CONSTANTS.EPISODE_2_START_TIME_MILLIS) {
         var matchId = match["MatchID"]
         filtered.push(matchId);
      }
      return filtered;
    }, []);
    LOG.log(3, "Retrieved matches from competitiveupdates endpoint. Raw number of matches: "+matches.length+". Filtered matches number: "+newMatchIDs.length)

    var oldMatchesAsArray = []
    var oldMatchesUser = matchHistoryData[userId]
    if(oldMatchesUser != undefined){
      var oldMatches = oldMatchesUser["Matches"]
      // console.log("OLD MATCHES "+JSON.stringify(oldMatches))
      for (var key in oldMatches) {
        if (oldMatches.hasOwnProperty(key) && newMatchIDs.includes(key) == false) {
          oldMatchesAsArray.push(oldMatches[key])
        }
      }
    }else{
      // first time user get everything
      LOG.log(0, "First time user. Get entire match history not implemented. UserID: "+userId)
      // updateUserElo(userId, accessToken, entitlementsToken, true, function(){
      //
      // }, true, false)
    }

    var totalMatchesWithExisting = matches.concat(oldMatchesAsArray)
    var finalJson = {
      "Subject":userId,
      "Matches":totalMatchesWithExisting
    }
    LOG.log(2, "Got match history for "+userId+". Entire history count: "+totalMatchesWithExisting.length)
    if(completion != null){
      completion(finalJson)
    }
    saveMatchHistory(userId, totalMatchesWithExisting)
    downloadMatchIDs(userId, newMatchIDs, function(){
      if(computationCompletion != null){
        computationCompletion(finalJson)
      }
    })
  }, function(error, error2){
    console.log("ER "+error+"_"+error2)
  })
}
// function scoreboardForMatches(matchIds){
//   var processedPath = CONSTANTS.PATHS.PROCESSED_MATCHES;
//
//   var scoreboards = []
//   for(var i = 0; i < matchIds.length; i++){
//     var matchId = matchIds[i];
//     try{
//       let matchOverviewData = CONSTANTS.readJSONFile(processedPath + matchId + "/overview.json")
//       scoreboards.push(matchOverviewData)
//     }catch(err){
//       console.log("TOTAL ERR "+err)
//     }
//   }
// }
function scoreboardForMatch(matchId){
  var processedPath = CONSTANTS.PATHS.PROCESSED_MATCHES;
  try{
    let matchOverviewData = CONSTANTS.readJSONFile(processedPath + matchId + "/overview.json")
    LOG.log(4, "Got scoreboard (overview data) for match "+matchId)
    return matchOverviewData
  }catch(err){
    console.log("No Scoreboard Data "+err)
    return undefined
  }
}
function saveMatchHistory(userId, matchInfo){
  if(matchHistoryData[userId] == undefined){
    LOG.log(4, "New user to create match history in file for: "+userId)
    matchHistoryData[userId] = {
      "Matches":{},
      "MatchSort":[]
    }
  }

  for(var i = 0; i < matchInfo.length; i++){
    var curMatchInfo = matchInfo[i]
    var matchId = curMatchInfo["MatchID"]
    matchHistoryData[userId]["Matches"][matchId] = matchInfo[i]
  }
  LOG.log(4, "Saved "+matchInfo.length+" matches for matchHistory file")

  var allMatches = matchHistoryData[userId]["Matches"]
  var matchItems = Object.keys(allMatches).map(function(key) {
    if(allMatches[key] == null)
      LOG.log(0, "Error finding match ID in dictionary? UID "+userId+" MID "+key)
    return [key, allMatches[key]];
  });
  matchItems.sort(function(firstObj, secondObj) {
    var firstMatch = firstObj[1]
    var secondMatch = secondObj[1]

    return secondMatch["MatchStartTime"] - firstMatch["MatchStartTime"]
  })
  LOG.log(4, "Sorted matches based on matchStartTime")
  var matchSortArray = []
  for(var i = 0; i < matchItems.length; i++){
    var match = matchItems[i][1]
    var matchId = match["MatchID"]
    matchSortArray.push(matchId)
  }
  matchHistoryData[userId]["MatchSort"] = matchSortArray
  CONSTANTS.writeJSONFile('private/matchHistory.json', matchHistoryData)
  LOG.log(3, "Saved match history for user "+userId+". Match count: "+matchSortArray.length)
}

function downloadMatchIDs(userId, matchIDs, completion){
  if(matchIDs != null){
    LOG.log(4, "Downloading "+matchIDs.length+" matches")
    if(matchesDownloadedData[userId] == undefined){
      matchesDownloadedData[userId] = {}
    }

    AUTH.getLatestAuth(function(ent, tok){
      var allRequests = []
      LOG.log(4, "Creating match download requests and checking processing for "+matchIDs.length+" matches.")
      for(var i = 0; i < matchIDs.length; i++){
        var matchId = matchIDs[i]
        if(matchesDownloadedData[userId][matchId] == undefined){
          var url = 'https://pd.na.a.pvp.net/match-details/v1/matches/'+matchId
          var matchReq = AUTH.getRequestPromise(url, ent, tok)
          allRequests.push(matchReq);
        }else{
          // already downloaded. process again to be sure (only because old version of bot also downloaded matches)
          PROCESSING.processMatchData(getMatchDataFromMatchId(matchId))
          LOG.log(6, "Reprocessed "+matchId)
        }
      }
      LOG.log(4, "Downloading matches... "+(allRequests.length))
      Promise.allSettled(allRequests).then((results) => {
        LOG.log(4, "Saving and processing "+results.length+" matches")
        results.forEach(function(result){
          if(result.status == "fulfilled"){
            var matchData = JSON.parse(result.value)
            var matchId = matchData["matchInfo"]["matchId"]

            matchesDownloadedData[userId][matchId] = 1
            saveMatchToFile(matchId, matchData)

            PROCESSING.processMatchData(matchData)
            LOG.log(6, "Processed and saved match "+matchId)
          }else{
            LOG.log(4, "Match not downloaded: "+result.reason.error.message)
          }
        }); // end of foreach

        CONSTANTS.writeJSONFile('private/matchesDownloaded.json', matchesDownloadedData)
        LOG.log(4, "Saving matchesDownloaded")
        COMPUTATION.computeAggregate()
        if(completion != null){
          completion()
        }
      });

    })
  }
}

function saveMatchToFile(matchId, matchData){
  var rawPath = rawMatchPath(matchId)
  CONSTANTS.writeJSONFile(rawPath, matchData)
  LOG.log(6, "Saved match to "+rawPath)
}
function getMatchDataFromMatchId(matchId){
  LOG.log(6, "Reading match data for match "+matchId)
  return CONSTANTS.readJSONFile(rawMatchPath(matchId))
}
function rawMatchPath(matchId){
  return CONSTANTS.PATHS.RAW_MATCHES+matchId+'.json'
}
function getMatchHistoryData(){
  return matchHistoryData
}
module.exports = {
  matchHistory: matchHistory,
  scoreboardForMatch:scoreboardForMatch,
  getMatchDataFromMatchId:getMatchDataFromMatchId,
  getMatchHistoryData:getMatchHistoryData
}
