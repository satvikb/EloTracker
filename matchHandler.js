var AUTH = require('./auth');
var CONSTANTS = require('./constants');
var PROCESSING = require('./matchProcessing');

let matchesDownloadedData = CONSTANTS.readJSONFile('private/matchesDownloaded.json');
let matchHistoryData = CONSTANTS.readJSONFile('private/matchHistory.json');


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
function matchHistory(userId, completion){
  let url = 'https://pd.na.a.pvp.net/mmr/v1/players/'+userId+"/competitiveupdates?startIndex=0&endIndex=20"
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

    var oldMatchesAsArray = []
    var oldMatchesUser = matchHistoryData[userId]
    if(oldMatchesUser != undefined){
      var oldMatches = oldMatchesUser["Matches"]
      for (var key in oldMatches) {
        if (oldMatches.hasOwnProperty(key) && !newMatchIDs.includes(key) == false) {
          oldMatchesAsArray.push(oldMatches[key])
        }
      }
    }else{
      // first time user get everything
      // console.log("Getting entire match history for new user "+userId)
      // updateUserElo(userId, accessToken, entitlementsToken, true, function(){
      //
      // }, true, false)
    }

    var totalMatchesWithExisting = matches.concat(oldMatchesAsArray)
    var finalJson = {
      "Subject":userId,
      "Matches":totalMatchesWithExisting
    }

    completion(finalJson)
    saveMatchHistory(userId, totalMatchesWithExisting)
    downloadMatchIDs(userId, newMatchIDs)
  }, function(error, error2){
    console.log("ER "+error+"_"+error2)
  })
}

// Update matchHistory.json
/*
 matchInfo = [
 {
  "MID":"",
  "TierAfter":0
  }
]

*/
function saveMatchHistory(userId, matchInfo){
  if(matchHistoryData[userId] == undefined){
    matchHistoryData[userId] = {
      "Matches":{},
      "MatchSort":[]
    }
  }

  for(var i = 0; i < matchInfo.length; i++){
    var curMatchInfo = matchInfo[i]
    var matchId = curMatchInfo["MatchID"]
    matchHistoryData[userId]["Matches"][matchId] = matchInfo[matchId]
  }

  var matchItems = Object.keys(matchHistoryData[subject]["Matches"]).map(function(key) {
    return [key, matchHistoryData[subject]["Matches"][key]];
  });
  matchItems.sort(function(firstObj, secondObj) {
    var firstMatch = firstObj[1]
    var secondMatch = secondObj[1]

    return secondMatch["MatchStartTime"] - firstMatch["MatchStartTime"]
  })
  var matchSortArray = []
  for(var i = 0; i < matchItems.length; i++){
    var match = matchItems[i][1]
    var matchId = match["MatchID"]
    matchSortArray.push(matchId)
  }
  matchHistoryData[subject]["MatchSort"] = matchSortArray

  CONSTANTS.writeJSONFile('private/matchHistory.json', matchHistoryData)
}

function downloadMatchIDs(userId, matchIDs){
  if(matchIDs != null){
    if(matchesDownloadedData[userId] == undefined){
      matchesDownloadedData[userId] = {}
    }

    AUTH.getLatestAuth(function(ent, tok){
      var allRequests = []
      for(var i = 0; i < matchIDs.length; i++){
        var matchId = matchIDs[i]
        if(matchesDownloadedData[userId][matchId] == undefined){
          var url = 'https://pd.na.a.pvp.net/match-details/v1/matches/'+matchId
          var matchReq = AUTH.getRequestPromise(url, ent, tok)
          allRequests.push(matchReq);
        }
      }
    })
  }
  Promise.all(allRequests).then((allMatchData) => {
    for(var i = 0; i < allMatchData.length; i++){
      var matchData = JSON.parse(allMatchData[i])
      var matchId = matchData["matchInfo"]["matchId"]

      matchesDownloadedData[subject][matchID] = 1
      saveMatchToFile(matchId, matchData)
      // TODO process here?
      PROCESSING.processMatchData(matchData)
    }
    CONSTANTS.writeJSONFile('private/matchesDownloaded.json', matchesDownloadedData)
  })
}

function saveMatchToFile(matchId, matchData){
  var rawPath = rawMatchPath(matchId)
  CONSTANTS.writeJSONFile(rawPath, matchData)
}

function rawMatchPath(matchID){
  return CONSTANTS.PATHS.RAW_MATCHES+matchID+'.json'
}

module.exports = {
  matchHistory: matchHistory
}
