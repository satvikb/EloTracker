const discord = require('discord.js');
const bot = new discord.Client();
const fs = require('fs');
const path = require('path');

const PREFIX = '?';
const ytdl = require('ytdl-core-discord');
const request = require('request');
const querystring = require('querystring');
var dateFormat = require('dateformat');

let rawdata = fs.readFileSync('private/valAuths.json');
let rawCacheData = fs.readFileSync('private/authCache.json');
let rawMatchDownloads = fs.readFileSync('private/matchesDownloaded.json');
let rawProcessedMatches = fs.readFileSync('private/processedMatches.json');

let discordTokenRaw = fs.readFileSync('secret.json');

let token = JSON.parse(discordTokenRaw)["key"];
let authData = JSON.parse(rawdata);
let authCacheData = JSON.parse(rawCacheData);
let matchesDownloadedData = JSON.parse(rawMatchDownloads);
let processedMatchesData = JSON.parse(rawProcessedMatches);

let rawUserStats = fs.readFileSync('private/totalStats/users.json');
let rawHitsStats = fs.readFileSync('private/totalStats/hits.json');

let totalUserStats = JSON.parse(rawUserStats);
let totalHitsStats = JSON.parse(rawHitsStats);

let PROCESSING_USER_ANALYSIS = "userAnalysis";
let PROCESSING_HIT_ANALYSIS = "hitAnalysis";
let PROCESSING_UTIL_ANALYSIS = "utilAnalysis";
let PROCESSING_DISTANCE_ANALYSIS = "distanceAnalysis";


var mems = [];
var currentVoiceBans = {}

var RANKS = {
  "0": "Unrated",
  "1": "Unknown 1",
  "2": "Unknown 2",
  "3": "Iron 1",
  "4": "Iron 2",
  "5": "Iron 3",
  "6": "Bronze 1",
  "7": "Bronze 2",
  "8": "Bronze 3",
  "9": "Silver 1",
  "10": "Silver 2",
  "11": "Silver 3",
  "12": "Gold 1",
  "13": "Gold 2",
  "14": "Gold 3",
  "15": "Platinum 1",
  "16": "Platinum 2",
  "17": "Platinum 3",
  "18": "Diamond 1",
  "19": "Diamond 2",
  "20": "Diamond 3",
  "21": "Immortal 1",
  "22": "Immortal 2",
  "23": "Immortal 3",
  "24": "Radiant"
}

bot.on('ready', function() {
    console.log("It's Working");
    bot.user.setStatus("Invisible");
});

bot.on('message', async function(msg) {
    let args = msg.content.substring(PREFIX.length).split(" "); //returns the text after the prefix smart move by me nc
    var arg = ((args[0].toString()).toLowerCase());

    if (arg =='destroy') {
        msg.channel.send("Bot Restarting...")
        bot.destroy();
        bot.login(token);
    }

    function getUserAuth(username, password, completion){
      var userAuthCache = authCacheData[username]
      var expired = true;
      if(userAuthCache != undefined){
        var expireDate = userAuthCache["expiry"]
        var d = new Date();
        var seconds = Math.round(d.getTime() / 1000);
        if(seconds > expireDate){
          expired = true
        }else{
          expired = false
        }
      }

      if(userAuthCache != undefined && expired == false){
        console.log("Using cache")
        completion(userAuthCache)
      }else{
        // not found, get it

        var cookieJar = request.jar();
        var initialAuthOpts = {
          uri: 'https://auth.riotgames.com/api/v1/authorization',
          method: 'POST',
          json: {
            'client_id': 'play-valorant-web-prod',
            'nonce': '1',
            'redirect_uri': 'https://playvalorant.com/opt_in',
            'response_type': 'token id_token'
          },
          jar: cookieJar
        }

        request(initialAuthOpts, function(err, res, body) {

          initialAuthOpts.json = {
            'type': 'auth',
            'username': username,
            'password': password
          }
          initialAuthOpts.method = "PUT"
          request(initialAuthOpts, function(err1, res, body1) {
            if(body1["error"] != undefined){
              msg.channel.send("Bad username/password. Contact account owner.\nThe API might also be down.")
            }else{
              let returnData = body1["response"]["parameters"]["uri"]
              let rDS = returnData.split('#')[1];
              let params = querystring.parse(rDS)

              let accessToken = params["access_token"];
              let expireTime = params["expires_in"]; // TODO add to current time and store

              const entitlementsTokenOptions = {
                  url: "https://entitlements.auth.riotgames.com/api/token/v1",
                  method: 'POST',
                  headers: {
                      'Authorization': 'Bearer '+accessToken,
                      "Content-Type": "application/json"
                  },
                  json:{},
                  jar: cookieJar
              };
              request(entitlementsTokenOptions, function(err, res, body2) {
                var entitlementsToken = body2["entitlements_token"]

                const userInfoData = {
                    url: "https://auth.riotgames.com/userinfo",
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer '+accessToken,
                        "Content-Type": "application/json"
                    },
                    json:{},
                    jar: cookieJar
                };
                request(userInfoData, function(err, res, body3) {
                  var userId = body3["sub"];
                  var d = new Date();
                  var seconds = Math.round(d.getTime() / 1000);
                  var finalExpireTime = parseInt(expireTime) + seconds;
                  var creds = {
                    "userId":userId,
                    "entitlementsToken":entitlementsToken,
                    "accessToken":accessToken,
                    "expiry":finalExpireTime
                  }
                  authCacheData[username] = creds;
                  fs.writeFileSync('private/authCache.json', JSON.stringify(authCacheData, null, 2) , 'utf-8');
                  completion(creds)
                });
              });
            }
          });
        });
      }
    }

    function displayUserElo(userId, usernameArg, accessToken, entitlementsToken){
      const options = {
          url: 'https://pd.na.a.pvp.net/mmr/v1/players/'+userId+"/competitiveupdates",
          method: 'GET',
          headers: {
              "Content-Type": "application/json",
              'Authorization': 'Bearer '+accessToken,
              'X-Riot-Entitlements-JWT': entitlementsToken
          },
      };

      request(options, function(err, res, body) {
        // console.log(err);

        let json = JSON.parse(body);
        // console.log("JSON: "+JSON.stringify(json));
        // msg.channel.send(json);
        let matchData = json["Matches"]
        matchData.sort((a, b) => (a["MatchStartTime"] > b["MatchStartTime"]) ? -1 : 1)

        var processedData = []

        for(var i = 0; i < matchData.length; i++){
          let latestMatchJson = matchData[i]

          let RPBefore = latestMatchJson["TierProgressBeforeUpdate"];
          let RPAfter = latestMatchJson["TierProgressAfterUpdate"];
          let tierBefore = latestMatchJson["TierBeforeUpdate"]
          let tierAfter = latestMatchJson["TierAfterUpdate"]
          let matchDate = latestMatchJson["MatchStartTime"]
          let matchID = latestMatchJson["MatchID"]

          ensureGameIsDownloaded(userId, matchID, accessToken, entitlementsToken)

          let eloChange;
          var eloSign = "+"
          if(tierBefore != tierAfter){
            // demote or promote
            if(tierBefore > tierAfter){
              // demote
              // (elo before + 100) - (elo after)
              eloChange = (RPBefore + 100) - RPAfter
              eloSign = "-" // negative sign accounted for
            }else{
              // promote
              //  (elo after + 100) - elo before
              eloChange = (RPAfter + 100) - RPBefore

            }
          }else{
            // same
            eloChange = RPAfter - RPBefore;
            eloSign = eloChange < 0 ? "" : "+"
          }

          let rankName = RANKS[tierAfter];
          var currentElo = (tierAfter*100) - 300 + RPAfter;

          var data = {
            "eloChange":eloChange,
            "currentElo":currentElo,
            "rank":rankName,
            "date":matchDate,
            "eloSign":eloSign,
            "matchID":matchID
          }

          // filter out unrated
          if(rankName != "Unrated"){
            processedData.push(data)
          }
          // console.log(username+": "+rankName+" "+currentElo+" "+RPAfter+" "+eloSign);
          // msg.channel.send("Rank: "+rankName+"\n"+"Elo: "+currentElo+"\nLatest Game: "+eloSign+""+eloChange+" RP")
        }

        var numToShow = 3;
        if(args.length >= 3){
          let count = args[2];
          numToShow = parseInt(count);
        }

        var latestRank = ""
        var latestElo = 0

        var matchString = ""

        var debugMode = false
        var showAuth = false;
        if(args.length >= 4){
          if(args[3] == "d")
            debugMode = true;
          if(args[3] == "a"){
            showAuth = true;
          }
        }
        for(var i = 0; i < Math.min(numToShow, processedData.length); i++){
          var currentMatchData = processedData[i]
          var eloSign = currentMatchData["eloSign"];
          var eloChange = currentMatchData["eloChange"];
          var currentElo = currentMatchData["currentElo"];
          var currentRank = currentMatchData["rank"];
          var matchDate = currentMatchData["date"];
          var matchID = currentMatchData["matchID"];

          if(i == 0){
            latestRank = currentRank
            latestElo = currentElo
          }

          var d = new Date(matchDate)
          var day = dateFormat(d, "mm/dd/yy h:MM:ss tt");

          var endString = debugMode ? "Match ID: "+matchID+"\n" : "\n"
          matchString += "Comp Game started on "+day+": **"+eloSign+eloChange+" RP **"+endString
        }

        var currentEloAddOnText = ""
        if(latestElo % 100 == 0){
          currentEloAddOnText = "(Close to Derank)"
        }else{
          currentEloAddOnText = "(**"+((100) - (latestElo % 100))+"** RP needed to rank up)"
        }
        var finalString = "**Rank data for** __***"+usernameArg+"***__\n**Current Rank:** "+latestRank+"\n**Current Elo**: "+latestElo+" RP "+currentEloAddOnText+"\n"+matchString
        msg.channel.send(finalString)
        if(showAuth){
          msg.channel.send("Access Token: "+accessToken+"\nEntitlement: "+entitlementsToken+"\nUser ID: "+userId)
        }
      });
    }

    function ensureGameIsDownloaded(userId, matchId, accessToken, entitlementsToken){
      handleMatchDownloading(userId, matchId, accessToken, entitlementsToken, function(){
        fs.writeFileSync('private/matchesDownloaded.json', JSON.stringify(matchesDownloadedData, null, 2) , 'utf-8');
      }, function(){
        fs.writeFileSync('private/matchesDownloaded.json', JSON.stringify(matchesDownloadedData, null, 2) , 'utf-8');
      }, function(err){

      })
    }

    function downloadMatchData(accessToken, entitlementsToken, matchID, downloadCompletion){
      const options = {
          url: 'https://pd.na.a.pvp.net/match-details/v1/matches/'+matchID,
          method: 'GET',
          headers: {
              "Content-Type": "application/json",
              'Authorization': 'Bearer '+accessToken,
              'X-Riot-Entitlements-JWT': entitlementsToken
          },
      };
      request(options, function(err, res, body) {
        fs.writeFile('matches/raw/'+matchID+'.json', body, 'utf8', function (err) {
            if (err) {
              console.log(err);
            }else{
              downloadCompletion(matchID)
            }
        });
      });
    }

    var numCompleted = {}
    async function handleMatchDownloading(userId, matchID, accessToken, entitlementsToken, matchDoneHandler, downloadCompletion, errComp){
      try {
        var matchPath = "matches/raw/"+matchID+".json";
        var matchExists = fs.existsSync(matchPath)
        // console.log("Mathc "+matchPath+" "+matchExists +" "+numCompleted[userId])

        if(matchesDownloadedData[userId] == undefined){
          matchesDownloadedData[userId] = {}
        }
        if (!matchExists) {
          downloadMatchData(accessToken, entitlementsToken, matchID, function(matchID_){
            matchesDownloadedData[userId][matchID_] = 1;
            downloadCompletion()
          });
          await sleep(2000); // rate limiting
        }else{
          // await sleep(100)
          matchesDownloadedData[userId][matchID] = 1;
          // console.log("already downloaded "+matchID)
        }
        matchDoneHandler()

      } catch(err) {
        errComp(err)
      }
    }

    function batchDownloadMatchData(userId, accessToken, entitlementsToken, startIndex, endIndex, allMatchMsg){
      // keep getting match data until EndIndex == Total
      const matchHistoryOptions = {
          url: 'https://pd.na.a.pvp.net/match-history/v1/history/'+userId+"?startIndex="+startIndex+"&endIndex="+endIndex,
          method: 'GET',
          headers: {
              "Content-Type": "application/json",
              'Authorization': 'Bearer '+accessToken,
              'X-Riot-Entitlements-JWT': entitlementsToken
          },
      };
      request(matchHistoryOptions, async function(err, res, body) {
        let historyData = JSON.parse(body);
        let total = historyData["Total"]
        if(historyData["EndIndex"] == total){
          // finish
        }else{
          // download next batch
          batchDownloadMatchData(userId, accessToken, entitlementsToken, startIndex+20, endIndex+20, allMatchMsg)
        }

        let histories = historyData["History"];

        for(var i = 0; i < histories.length; i++){
          let matchID = histories[i]["MatchID"]

          handleMatchDownloading(userId, matchID, accessToken, entitlementsToken, function(){
            numCompleted[userId] += 1;

            if(numCompleted[userId] == parseInt(total)-1){
              fs.writeFileSync('private/matchesDownloaded.json', JSON.stringify(matchesDownloadedData, null, 2) , 'utf-8');
              allMatchMsg.edit("Done downloading match data. "+(numCompleted[userId]+1)+" / "+total+" matches stored.")
            }
          }, function(){
            if(numCompleted[userId] == parseInt(total)-1){
              fs.writeFileSync('private/matchesDownloaded.json', JSON.stringify(matchesDownloadedData, null, 2) , 'utf-8');
              allMatchMsg.edit("Done downloading match data. "+(numCompleted[userId]+1)+" / "+total+" matches stored.")
            }else{
              allMatchMsg.edit("Downloading match data. "+numCompleted[userId]+" / "+total+" matches downloaded.")
            }
          }, function(err){
            allMatchMsg.edit("ERROR CHECKING FILE EXISTS "+err)
          })

          // download match every 2 seconds
        }
      });
    }

    async function processAllUnprocessedGames(){
      // loop through raw files
      let rawPath = "matches/raw/"
      const dir = await fs.promises.opendir(rawPath)
      var gamesToProcess = 0
      for await (const dirent of dir) {
        console.log(dirent.name)
        let matchFileName = dirent.name
        let matchID = matchFileName.split(".")[0]
        // if(processedMatchesData[matchID] == undefined){
          processMatchData(matchID, rawPath+matchID+".json", function(){
            gamesToProcess += 1
          })
        // }
      }
      msg.channel.send("Processed "+gamesToProcess+" competitive games.")
    }

    function processMatchData(matchID, dataPath, didProcess){
      console.log("Processing "+dataPath)
      if(processedMatchesData[matchID] == undefined){
        processedMatchesData[matchID] = {}
      }

      let matchDataRaw = fs.readFileSync(dataPath);
      try{
        let matchData = JSON.parse(matchDataRaw)

        let matchType = matchData["matchInfo"]["queueID"];
        console.log("MATCH TYPE "+matchType)
        // TODO for now only process competitive games.
        if(matchType == "competitive"){
          let folderPath = "matches/processed/"+matchID
          console.log(folderPath)
          if (!fs.existsSync(folderPath)){
            console.log("E "+folderPath)
              fs.mkdirSync(folderPath);
          }

          if(processedMatchesData[matchID][PROCESSING_HIT_ANALYSIS] == undefined){
            processMatchHitAnalysis(folderPath, matchData)
            processedMatchesData[matchID][PROCESSING_HIT_ANALYSIS] = 1;
          }

          if(processedMatchesData[matchID][PROCESSING_USER_ANALYSIS] == undefined){
            processMatchUserAnalysis(folderPath, matchData)
            processedMatchesData[matchID][PROCESSING_USER_ANALYSIS] = 1;
          }
          didProcess()
          fs.writeFileSync('private/processedMatches.json', JSON.stringify(processedMatchesData, null, 2) , 'utf-8');
        }
      }catch{
         // bad game
      }
    }

    function processMatchUserAnalysis(folderPath, matchData){
      let players = matchData["players"]
      var playerData = {}
      for(var i = 0; i < players.length; i++){
        let playerInfo = players[i];
        let subject = playerInfo["subject"]
        playerData[subject] = {
          "gameName":playerInfo["gameName"],
          "tagLine":playerInfo["tagLine"],
          "partyId":playerInfo["partyId"],
          "characterId":playerInfo["characterId"],
          "stats":playerInfo["stats"],
          "teamId":playerInfo["teamId"]
        }
      }
      fs.writeFileSync(folderPath+'/users.json', JSON.stringify(playerData, null, 2) , 'utf-8');
    }

    function processMatchHitAnalysis(folderPath, matchData){
      let rounds = matchData["roundResults"]
      var hitsData = {}
      for(var i = 0; i < rounds.length; i++){
        let roundData = rounds[i];
        let roundPlayerStats = roundData["playerStats"];
        for(var j = 0; j < roundPlayerStats.length; j++){
          let playerData = roundPlayerStats[j];
          let subject = playerData["subject"]
          let damageData = playerData["damage"];
          for(var k = 0; k < damageData.length; k++){
            let damageEntity = damageData[k];
            if(hitsData[subject] == undefined){
              hitsData[subject] = {
                "headshots":0,
                "bodyshots":0,
                "legshots":0
              }
            }
            hitsData[subject]["headshots"] += damageEntity["headshots"];
            hitsData[subject]["bodyshots"] += damageEntity["bodyshots"];
            hitsData[subject]["legshots"] += damageEntity["legshots"];
          }
        }
      }
      fs.writeFileSync(folderPath+'/hits.json', JSON.stringify(hitsData, null, 2) , 'utf-8');
    }

    function processMatchUtilAnalysis(folderPath, matchData){
      // let rounds = matchData["roundResults"]
      // var utilData = {}
      // for(var i = 0; i < rounds.length; i++){
      //   let roundData = rounds[i];
      //   let roundPlayerStats = roundData["playerStats"];
      //   for(var j = 0; j < roundPlayerStats.length; j++){
      //     let playerData = roundPlayerStats[j];
      //     let subject = playerData["subject"]
      //     let damageData = playerData["damage"];
      //     for(var k = 0; k < damageData.length; k++){
      //       let damageEntity = damageData[k];
      //       if(hitsData[subject] == undefined){
      //         hitsData[subject] = {
      //           "headshots":0,
      //           "bodyshots":0,
      //           "legshots":0
      //         }
      //       }
      //       hitsData[subject]["headshots"] += damageEntity["headshots"];
      //       hitsData[subject]["bodyshots"] += damageEntity["bodyshots"];
      //       hitsData[subject]["legshots"] += damageEntity["legshots"];
      //     }
      //   }
      // }
      // fs.writeFileSync(folderPath+'/hits.json', JSON.stringify(hitsData, null, 2) , 'utf-8');
    }

    function sleep(ms) {
      return new Promise((resolve) => {
        setTimeout(resolve, ms);
      });
    }

    function computeTotalHits(){
      let processedDir = "matches/processed/"
      var hitsData = {}

      fs.readdir(processedDir, function(err, filenames) {
        if (err) {
          onError(err);
          return;
        }
        filenames.forEach(function(filename) {
          console.log("FS "+filename)
          try{
            let rawHitsData = fs.readFileSync(processedDir + filename + "/hits.json");
            let matchHitsData = JSON.parse(rawHitsData)

            for (var subject in matchHitsData) {
              // check if the property/key is defined in the object itself, not in parent
              if (matchHitsData.hasOwnProperty(subject)) {
                // console.log(subject, dictionary[subject]);
                let damageEntity = matchHitsData[subject];
                if(hitsData[subject] == undefined){
                  hitsData[subject] = {
                    "headshots":0,
                    "bodyshots":0,
                    "legshots":0
                  }
                }
                hitsData[subject]["headshots"] += damageEntity["headshots"];
                hitsData[subject]["bodyshots"] += damageEntity["bodyshots"];
                hitsData[subject]["legshots"] += damageEntity["legshots"];
              }
            }
          }catch{

          }

        });
        totalHitsStats = hitsData;
        fs.writeFileSync('private/totalStats/hits.json', JSON.stringify(hitsData, null, 2) , 'utf-8');
      });
    }

    // build aliases
    function computeTotalUsers(){
      let processedDir = "matches/processed/"
      var playerData = {}

      fs.readdir(processedDir, function(err, filenames) {
        if (err) {
          onError(err);
          return;
        }
        filenames.forEach(function(filename) {
          console.log("FS "+filename)
          try {
            let rawUsersData = fs.readFileSync(processedDir + filename + "/users.json");
            let matchUsersData = JSON.parse(rawUsersData)

            for (var subject in matchUsersData) {
              // check if the property/key is defined in the object itself, not in parent
              if (matchUsersData.hasOwnProperty(subject)) {
                // console.log(subject, dictionary[subject]);
                let userEntity = matchUsersData[subject];
                if(playerData[subject] == undefined){
                  playerData[subject] = {
                    "gameName":userEntity["gameName"],
                    "tagLine":userEntity["tagLine"],
                    "stats":{
                      "kills":0,
                      "deaths":0,
                      "assists":0,
                      "playtimeMillis":0,
                      "score":0,
                      "roundsPlayed":0 // do we even need this
                    }
                  }
                }
                playerData[subject]["stats"]["kills"] += userEntity["stats"]["kills"];
                playerData[subject]["stats"]["score"] += userEntity["stats"]["score"];
                playerData[subject]["stats"]["deaths"] += userEntity["stats"]["deaths"];
                playerData[subject]["stats"]["assists"] += userEntity["stats"]["assists"];
                playerData[subject]["stats"]["playtimeMillis"] += userEntity["stats"]["playtimeMillis"];
                playerData[subject]["stats"]["roundsPlayed"] += userEntity["stats"]["roundsPlayed"];
                playerData[subject]["stats"]["kd"] = playerData[subject]["stats"]["kills"]/playerData[subject]["stats"]["deaths"];
              }
            }
          }catch{

          }

        });
        totalUserStats = playerData
        fs.writeFileSync('private/totalStats/users.json', JSON.stringify(playerData, null, 2) , 'utf-8');
      });
    }

    function cleanHSPercent(hs){
      return ((Math.trunc(hs*10000)/10000).toFixed(4))*100;
    }

    // elo = get elo
    // gam = get all matches
    if(arg == "elo" || arg == "gam"){
      let usernameRawArg = args[1]
      if(usernameRawArg != undefined){
        let usernameArg = usernameRawArg.toLowerCase()
        let userData = authData["users"][usernameArg];
        if(userData != undefined){
          let username = userData["username"];
          let password = userData["password"];

          getUserAuth(username, password, async function(creds){
            let userId = creds["userId"];
            let entitlementsToken = creds["entitlementsToken"];
            let accessToken = creds["accessToken"];
            let expiryTime = creds["expiry"];

            if(arg == "elo"){
              displayUserElo(userId, usernameArg, accessToken, entitlementsToken)
            }else if(arg == "gam"){
              let allMatchMsg = await msg.channel.send("Downloading all raw match data for "+usernameArg)
              numCompleted[userId] = 0;

              if(matchesDownloadedData[userId] == undefined){
                matchesDownloadedData[userId] = {}
              }

              batchDownloadMatchData(userId, accessToken, entitlementsToken, 0, 20, allMatchMsg)
            }
          });
        }else{
          msg.channel.send("Username not found")
        }
      }else{
        msg.channel.send("Please enter a username: ?elo <username>")
      }
    }

    if(arg == "processgame" || arg == "pag"){
      if(arg == "pag"){
        // process all games
        processAllUnprocessedGames()
      }else if(arg == "processgame"){
        if(args.length >= 2){
          let matchID = args[1]
          let fN = matchID
          processMatchData(fN, "matches/raw/"+fN+".json", function(){
            msg.channel.send("Processed "+matchID)
          })
        }
      }
    }

    if(arg == "computeall"){
      computeTotalHits()
      computeTotalUsers()
      msg.channel.send("All stats have been computed.")
    }

    if(arg == "stats"){
      let usernameRawArg = args[1]
      if(usernameRawArg != undefined){
        let usernameArg = usernameRawArg.toLowerCase()

        var obj;

        if(usernameArg.split("#").length > 1){
          var gameName = usernameArg.split("#")[0]
          var tagLine = usernameArg.split("#")[1]
          Object.keys(totalUserStats).forEach(x => obj = (totalUserStats[x].gameName.toLowerCase() === gameName && totalUserStats[x].tagLine.toLowerCase() === tagLine) ? {"id":x,"obj":totalUserStats[x]}: obj);
        }else{
          Object.keys(totalUserStats).forEach(x => obj = totalUserStats[x].gameName.toLowerCase() === usernameRawArg ? {"id":x,"obj":totalUserStats[x]}: obj);
        }
        if(obj != undefined){
          var userId = obj["id"];
          var userObj = obj["obj"];

          var disclaimer = "**Note: These stats may not be inclusive for all matches in Act 3. Some old matches do not have data available.**\nFor now, this data only includes competitive games.\nStarting from Episode 2, all data should be accurate."

          var userFullName = userObj["gameName"]+"#"+userObj["tagLine"]

          var kills = userObj["stats"]["kills"];
          var deaths = userObj["stats"]["deaths"]
          var roundsPlayed = userObj["stats"]["roundsPlayed"];

          var totalKDA = "K/D/A: "+kills+"/"+deaths+"/"+userObj["stats"]["assists"]+" (**"+(userObj["stats"]["kd"]).toFixed(2)+"** KD) (Average Kills per Round: **"+(kills/roundsPlayed).toFixed(2)+"**)"
          var totalPlaytimeHours = (userObj["stats"]["playtimeMillis"] / (3600*1000)).toFixed(2);
          var score = userObj["stats"]["score"]

          var hitsDataForUser = totalHitsStats[userId]
          var headshots = hitsDataForUser["headshots"]
          var bodyshots = hitsDataForUser["bodyshots"]
          var legshots = hitsDataForUser["legshots"]

          var totalHits = headshots+bodyshots+legshots
          var headshotPercent = cleanHSPercent(headshots/totalHits);
          var legshotPercent = cleanHSPercent(legshots/totalHits);
          var bodyshotPercent = cleanHSPercent(bodyshots/totalHits);

          var hitsPercentText = "**Hit %**\nHeadshots: **"+headshotPercent+"%**\nBodyshots: **"+bodyshotPercent+"%**\nLegshots: **"+legshotPercent+"%**"

          msg.channel.send(disclaimer+"\nStats for **"+userFullName+"**\n"+totalKDA+"\n(underestimated) play time: **"+totalPlaytimeHours+"** hours\nTotal score: **"+score+"** score over **"+roundsPlayed+"** rounds played. (Average score per round: **"+(score/roundsPlayed).toFixed(2)+"**)\n\n"+hitsPercentText)
          // console.log("PRinting Stats for "+obj.gameName+"#"+obj.tagLine)
        }else{
          msg.channel.send("User not found.")
        }

      }
    }

    if(arg == "leaderboard"){
      var killThreshold = 100;
      let thresholdArg = args[1]
      if(thresholdArg != undefined){
        killThreshold = thresholdArg
      }
      // HS % leaderboard
      var hitsItems = Object.keys(totalHitsStats).map(function(key) {
        return [key, totalHitsStats[key]];
      });

      // Sort the array based on the second element
      hitsItems.sort(function(firstObj, secondObj) {
        var first = firstObj[1]
        var second = secondObj[1]

        var firstTotal = first["headshots"]+first["bodyshots"]+first["legshots"]
        var secondTotal = second["headshots"]+second["bodyshots"]+second["legshots"]

        var firstHSPercent = first["headshots"] / firstTotal
        var secondHSPercent = second["headshots"] / secondTotal

        firstObj.push(firstHSPercent)
        secondObj.push(secondHSPercent)

        var firstKills = totalUserStats[firstObj[0]]["stats"]["kills"]
        var secondKills = totalUserStats[secondObj[0]]["stats"]["kills"]
        if(firstKills < killThreshold && secondKills < killThreshold){
          return 0
        }else{
          if(firstKills < killThreshold && secondKills >= killThreshold){
            return 1;// secondHSPercent - firstHSPercent
          }else if(secondKills < killThreshold && firstKills >= killThreshold){
            return -1;//firstHSPercent - secondHSPercent
          }else{
            return secondHSPercent - firstHSPercent
          }
        }
      });

      var leaderboardDataString = "__**[BETA] Headshot % Leaderboard**__\n"
      var toPrint = hitsItems.slice(0, 15)
      for(var i = 0; i < toPrint.length; i++){
        var userId = toPrint[i][0]
        var userStats = totalUserStats[userId];
        var userFullName = userStats["gameName"]+"#"+userStats["tagLine"]
        leaderboardDataString += ((userFullName+": ").padEnd(41))+(cleanHSPercent(toPrint[i][2]))+"%\n"
      }
      msg.channel.send(leaderboardDataString)
    }

    if(arg == "scores"){
      var killThreshold = 100;
      let thresholdArg = args[1]
      if(thresholdArg != undefined){
        killThreshold = thresholdArg
      }
      // HS % leaderboard
      var userItems = Object.keys(totalUserStats).map(function(key) {
        return [key, totalUserStats[key]];
      });

      // Sort the array based on the second element
      userItems.sort(function(firstObj, secondObj) {
        var first = firstObj[1]["stats"]
        var second = secondObj[1]["stats"]

        var firstAvg = first["score"] / first["roundsPlayed"]
        var secondAvg = second["score"] / second["roundsPlayed"]

        firstObj.push(firstAvg)
        secondObj.push(secondAvg)

        var firstKills = first["kills"]
        var secondKills = second["kills"]
        if(firstKills < killThreshold && secondKills < killThreshold){
          return 0
        }else{
          if(firstKills < killThreshold && secondKills >= killThreshold){
            return 1;// secondHSPercent - firstHSPercent
          }else if(secondKills < killThreshold && firstKills >= killThreshold){
            return -1;//firstHSPercent - secondHSPercent
          }else{
            return secondAvg - firstAvg
          }
        }
      });

      var leaderboardDataString = "__**[BETA] Average Score Per Round Leaderboard**__\n"
      var toPrint = userItems.slice(0, 15)
      for(var i = 0; i < toPrint.length; i++){
        var userId = toPrint[i][0]
        var userStats = totalUserStats[userId];
        var userFullName = userStats["gameName"]+"#"+userStats["tagLine"]
        leaderboardDataString += ((userFullName+": ").padEnd(41))+(toPrint[i][2].toFixed(2))+"\n"
      }
      msg.channel.send(leaderboardDataString)
    }
});



bot.login(token);
