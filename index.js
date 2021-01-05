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
            'redirect_uri': 'https://beta.playvalorant.com/opt_in',
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
          matchString += "Comp Game started on "+day+": "+eloSign+eloChange+" RP "+endString
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
          try {
            var matchPath = "matches/raw/"+matchID+".json";
            var matchExists = fs.existsSync(matchPath)
            console.log("Mathc "+matchPath+" "+matchExists +" "+numCompleted[userId])
            if (!matchExists) {
              downloadMatchData(accessToken, entitlementsToken, matchID, function(matchID_){
                matchesDownloadedData[userId][matchID_] = 1;
                if(numCompleted[userId] == parseInt(total)-1){
                  fs.writeFileSync('private/matchesDownloaded.json', JSON.stringify(matchesDownloadedData, null, 2) , 'utf-8');
                  allMatchMsg.edit("Done downloading match data. "+(numCompleted[userId]+1)+" / "+total+" matches stored.")
                }else{
                  allMatchMsg.edit("Downloading match data. "+numCompleted[userId]+" / "+total+" matches downloaded.")
                }
              });
              await sleep(2000); // rate limiting
            }else{
              // await sleep(100)
              matchesDownloadedData[userId][matchID] = 1;
              console.log("already downloaded "+matchID)
            }
            numCompleted[userId] += 1;

            if(numCompleted[userId] == parseInt(total)-1){
              fs.writeFileSync('private/matchesDownloaded.json', JSON.stringify(matchesDownloadedData, null, 2) , 'utf-8');
              allMatchMsg.edit("Done downloading match data. "+(numCompleted[userId]+1)+" / "+total+" matches stored.")
            }
          } catch(err) {
            allMatchMsg.edit("ERROR CHECKING FILE EXISTS "+err)
          }

          // download match every 2 seconds
        }
      });
    }

    async function processAllUnprocessedGames(){
      // loop through raw files
      let rawPath = "matches/raw/"
      const dir = await fs.promises.opendir(path)
      for await (const dirent of dir) {
        console.log(dirent.name)
        let matchFileName = dirent.name
        let matchID = matchFileName.split(".")[0]
        processMatchData(matchID, rawPath+matchID+".json")
      }
    }

    function processMatchData(matchID, dataPath){
      console.log("Processing "+dataPath)
      if(processedMatchesData[matchID] == undefined){
        processedMatchesData[matchID] = {}
      }
      
      let matchDataRaw = fs.readFileSync(dataPath);
      let matchData = JSON.parse(matchDataRaw)

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
      if(processedMatchesData[matchID][PROCESSING_UTIL_ANALYSIS] == undefined){
        processMatchHitAnalysis(folderPath, matchData)
        processedMatchesData[matchID][PROCESSING_UTIL_ANALYSIS] = 1;
      }

      fs.writeFileSync('private/processedMatches.json', JSON.stringify(processedMatchesData, null, 2) , 'utf-8');
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

    function processMatchUtilAnalysis(matchData){

    }

    function sleep(ms) {
      return new Promise((resolve) => {
        setTimeout(resolve, ms);
      });
    }

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

      }else if(arg == "processgame"){
        if(args.length >= 2){
          let matchID = args[1]
          let fN = matchID
          processMatchData(fN,  "matches/raw/"+fN+".json")
          msg.channel.send("Processed "+matchID)
        }
      }
    }
});



bot.login(token);
