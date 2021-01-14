const discord = require('discord.js');
const bot = new discord.Client();
const fs = require('fs');
const path = require('path');
const { stringify } = require("javascript-stringify");
var AsciiTable = require('ascii-table')

const PREFIX = '?';
const ytdl = require('ytdl-core-discord');
const request = require('request');
const querystring = require('querystring');
var dateFormat = require('dateformat');

let rawUserColors = fs.readFileSync('private/userColors.json');
let rawdata = fs.readFileSync('private/static/valAuths.json');
let rawCacheData = fs.readFileSync('private/authCache.json');
let rawMatchDownloads = fs.readFileSync('private/matchesDownloaded.json');
let rawProcessedMatches = fs.readFileSync('private/processedMatches.json');
let rawCompHistory = fs.readFileSync('private/compHistory.json');

// let rawPlayerAliases = fs.readFileSync('private/playerAliases.json');

let discordTokenRaw = fs.readFileSync('secret.json');

let userColorsData = JSON.parse(rawUserColors);
let token = JSON.parse(discordTokenRaw)["key"];
let authData = JSON.parse(rawdata);
let authCacheData = JSON.parse(rawCacheData);
let matchesDownloadedData = JSON.parse(rawMatchDownloads);
let processedMatchesData = JSON.parse(rawProcessedMatches);
let compHistoryData = JSON.parse(rawCompHistory);

// let playerAliases = JSON.parse(rawPlayerAliases);

let rawUserStats = fs.readFileSync('private/totalStats/users.json');
let rawHitsStats = fs.readFileSync('private/totalStats/hits.json');

let totalUserStats = JSON.parse(rawUserStats);
let totalHitsStats = JSON.parse(rawHitsStats);

let PROCESSING_USER_ANALYSIS = "userAnalysis";
let PROCESSING_HIT_ANALYSIS = "hitAnalysis";
let PROCESSING_ROUND_ANALYSIS = "utilAnalysis";
let PROCESSING_UTIL_ANALYSIS = "utilAnalysis";
let PROCESSING_DISTANCE_ANALYSIS = "distanceAnalysis";

let MATCHES_RAW_PATH = "matches/raw/"
let MATCHES_PROCESSED_PATH = "matches/processed/"

let CHART_TYPE_DAMAGE = "Damage"
let CHART_TYPE_SCORE = "Score"
let CHART_TYPE_ECONOMY = "Economy"
let CHART_TYPE_CARRY = "Carry"

let COMP_INC_MAJOR = "MAJOR_INCREASE"
let COMP_DEC_MAJOR = "MAJOR_DECREASE"
let COMP_INC_MINOR = "MINOR_INCREASE"
let COMP_DEC_MINOR = "MINOR_DECREASE"
let COMP_INCRASE = "INCREASE"
let COMP_DECREASE = "DECREASE"
let COMP_PROMOTED = "PROMOTED"
let COMP_DEMOTED = "DEMOTED"
let COMP_DRAW = "STABLE"

let EMOJI_COMP_INC_MAJOR = "<:rank_major_increase:797332822859055104> "
let EMOJI_COMP_DEC_MAJOR = "<:rank_major_decrease:797316110482538526> "
let EMOJI_COMP_INC_MINOR = "<:rank_minor_increase:797323018120331285> "
let EMOJI_COMP_DEC_MINOR = "<:rank_minor_decrease:797322976022364170> "
let EMOJI_COMP_INCRASE = "<:rank_medium_increase:797332778730782721> "
let EMOJI_COMP_DECREASE = "<:rank_medium_decrease:797322863722889257> "
let EMOJI_COMP_PROMOTED = "<:rank_promote:797348352664272947>"
let EMOJI_COMP_DEMOTED = "<:rank_demote:797348431609593856>"
let EMOJI_COMP_DRAW = "<:rank_stable:797332889971720213>"

let ELO_CHART_WIDTH = 700

let USERNAME_FOR_LEADERBOARD = "knife"

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

    var userCanUseBot = true;
    if(msg.member.id == 303249695386501122 || msg.member.id == 166999847277297664){
      userCanUseBot = true;
    }

    var userColor = userColorsData[msg.member.id] == undefined ? "#000000" : userColorsData[msg.member.id]

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

    function saveCompHistory(userId, matches){
      var totalSaved = 0;
      if(compHistoryData[userId] == undefined){
        compHistoryData[userId] = {}
      }
      if(compHistoryData[userId]["Matches"] == undefined){
        compHistoryData[userId]["Matches"] = {}
      }

      for(var i = 0; i < matches.length; i++){
        var match = matches[i]
        var matchId = match["MatchID"]
        var tierAfter = match["TierAfterUpdate"]
        var matchStartTime = match["MatchStartTime"]

        if(tierAfter > 0 && matchStartTime > 1610442000000){ // only store actual comp games
          compHistoryData[userId]["Matches"][matchId] = match
          totalSaved += 1
        }
      }

      var compItems = Object.keys(compHistoryData[userId]["Matches"]).map(function(key) {
        return [key, compHistoryData[userId]["Matches"][key]];
      });

      // Sort the array based on the second element
      compItems.sort(function(firstObj, secondObj) {
        var firstMatch = firstObj[1]
        var secondMatch = secondObj[1]

        return secondMatch["MatchStartTime"] - firstMatch["MatchStartTime"]
      })

      var matchSortArray = []
      for(var i = 0; i < compItems.length; i++){
        var match = compItems[i][1]
        var matchId = match["MatchID"]
        matchSortArray.push(matchId)
      }

      compHistoryData[userId]["MatchSort"] = matchSortArray

      fs.writeFileSync('private/compHistory.json', JSON.stringify(compHistoryData, null, 2), 'utf-8');
      return totalSaved
    }

    function calcElo(tierAfter, rpAfter){
      return (tierAfter*100) - 300 + rpAfter;
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

      request(options, async function(err, res, body) {
        let json = JSON.parse(body);

        let matchData = json["Matches"]
        matchData.sort((a, b) => (a["MatchStartTime"] > b["MatchStartTime"]) ? -1 : 1)

        saveCompHistory(userId, matchData)

        var numToShow = 3;
        if(args.length >= 3){
          let count = args[2];
          numToShow = parseInt(count);
        }
        var matchSortArray = compHistoryData[userId]["MatchSort"]
        var numOfMatchesAvailable = matchSortArray.length
        // var processedData = []

        var latestRank = ""
        var latestElo = 0
        var latestTier = 0

        var matchString = ""

        var debugMode = false
        var showAuth = false;
        if(args.length >= 4){
          if(args[3] == "d")
            debugMode = true;
          if(args[3] == "a" && msg.member.id == 295701594715062272){
            showAuth = true;
          }
        }

        var numMatchesToShow = Math.min(numToShow, numOfMatchesAvailable)

        var embedFieldArray = []
        for(var i = 0; i < numMatchesToShow; i++){
          let latestMatchJson = compHistoryData[userId]["Matches"][matchSortArray[i]]//matchData[i]
          let RPBefore = latestMatchJson["RankedRatingBeforeUpdate"];
          let RPAfter = latestMatchJson["RankedRatingAfterUpdate"];
          let tierBefore = latestMatchJson["TierBeforeUpdate"]
          let tierAfter = latestMatchJson["TierAfterUpdate"]
          let matchDate = latestMatchJson["MatchStartTime"]
          let matchID = latestMatchJson["MatchID"]
          let competitiveMovement = latestMatchJson["CompetitiveMovement"]

          ensureGameIsDownloaded(userId, matchID, accessToken, entitlementsToken)

          let eloChange;
          var eloSign = "+"
          if(tierBefore != tierAfter){
            // demote or promote
            if(tierBefore > tierAfter){
              // demote
              // (elo before + 100) - (elo after)
              eloChange = (RPAfter - RPBefore) - 100
              eloSign = "-" // negative sign accounted for
            }else{
              // promote
              //  (elo after + 100) - elo before
              eloChange = (RPAfter - RPBefore) + 100

            }
          }else{
            // same
            eloChange = RPAfter - RPBefore;
            eloSign = eloChange < 0 ? "" : "+"
          }
          let eloChangeFromData = latestMatchJson["RankedRatingEarned"]
          var showBothEloChange = eloChangeFromData != eloChange

          let rankName = RANKS[tierAfter];
          var currentElo = calcElo(tierAfter, RPAfter)

          if(i == 0){
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
            case COMP_PROMOTED:
              compMovementEmoji = EMOJI_COMP_PROMOTED
              break;
            case COMP_INC_MAJOR:
              compMovementEmoji = EMOJI_COMP_INC_MAJOR
              break;
            case COMP_INCRASE:
              compMovementEmoji = EMOJI_COMP_INCRASE
              break;
            case COMP_INC_MINOR:
              compMovementEmoji = EMOJI_COMP_INC_MINOR
              break;
            case COMP_DEC_MINOR:
              compMovementEmoji = EMOJI_COMP_DEC_MINOR
              break;
            case COMP_DECREASE:
              compMovementEmoji = EMOJI_COMP_DECREASE
              break;
            case COMP_DEC_MAJOR:
              compMovementEmoji = EMOJI_COMP_DEC_MAJOR
              break;
            case COMP_DEMOTED:
              compMovementEmoji = EMOJI_COMP_DEMOTED
              break;
            case COMP_DRAW:
              compMovementEmoji = EMOJI_COMP_DRAW
              break;
            default:
            // case "MOVEMENT_UNKNOWN":
              break;

          }

          var extraElo = showBothEloChange ? "** ("+eloChangeFromData+") ** RR **" : " RR **"
          var embedFieldObject = {name:compMovementEmoji+"**"+eloSign+eloChange+extraElo, value:fieldDay+endString, inline: debugMode ? false : true}
          embedFieldArray.push(embedFieldObject)
        }
        var userStats = totalUserStats[userId];
        var userFullName;
        if(userStats != undefined){
          userFullName = userStats["gameName"]+"#"+userStats["tagLine"]
        }else{
          // new user
          userFullName = usernameArg
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
          embed.addField('Competitive history for the last '+numMatchesToShow+" matches:", "⠀", false)
          .addFields(embedFieldArray)
        }

              // .addField("\u200B", "\u200B", false)
              // .addField(latestRank, currentEloAddOnText, false)
              // .addField('Inline field title', 'Some value here', true)
              // .setImage('https://i.imgur.com/wSTFkRM.png')
              // .setTimestamp()
              // .setFooter('Some footer text here', 'https://i.imgur.com/wSTFkRM.png')
              // .setTitle('Wicked Sweet Title')


        var sentEmbed = await msg.channel.send({embed});


        var eloData = getCompEloHistoryList(userId)
        var eloChart = buildEloChart(eloData, userFullName, userColor)
        if(eloChart != null){
          chartURLFromObject(eloChart, function(url){
            console.log(url)
            embed.setImage(url)
            sentEmbed.edit(embed)
          })
        }

        // var finalString = "**Rank data for** __***"+usernameArg+"***__\n**Current Rank:** "+latestRank+"\n**Current Elo**: "+latestElo+" RP "+currentEloAddOnText+"\n"+matchString
        // msg.channel.send(finalString)
        if(showAuth){
          msg.channel.send("Access Token: `"+accessToken+"`\n\nEntitlement: `"+entitlementsToken+"`\n\nUser ID: "+userId)
        }
      });
    }

    function ensureGameIsDownloaded(userId, matchId, accessToken, entitlementsToken){
      handleMatchDownloading(userId, matchId, accessToken, entitlementsToken, function(){
        processMatchData(matchId, rawMatchPath(matchId), function(){
          bot.channels.cache.get("798343660001165332").send("Processed match "+matchId+" for user "+userId);
          doAllComputation()
        }, false)
        // fs.writeFileSync('private/matchesDownloaded.json', JSON.stringify(matchesDownloadedData, null, 2) , 'utf-8');
      }, function(){
        fs.writeFileSync('private/matchesDownloaded.json', JSON.stringify(matchesDownloadedData, null, 2) , 'utf-8');
      }, function(err){
        bot.channels.cache.get("798343660001165332").send("Error ensuring game is downloaded "+err);
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
        fs.writeFile(rawMatchPath(matchID), body, 'utf8', function (err) {
            if (err) {
              console.log(err);
            }else{
              downloadCompletion(matchID, JSON.parse(body))
            }
        });
      });
    }

    function rawMatchPath(matchID){
      return MATCHES_RAW_PATH+matchID+'.json'
    }

    var numCompleted = {}
    async function handleMatchDownloading(userId, matchID, accessToken, entitlementsToken, matchDoneHandler, downloadCompletion, errComp){
      try {
        var matchPath = rawMatchPath(matchID);
        var matchExists = fs.existsSync(matchPath)
        // console.log("Mathc "+matchPath+" "+matchExists +" "+numCompleted[userId])

        if(matchesDownloadedData[userId] == undefined){
          matchesDownloadedData[userId] = {}
        }
        if (!matchExists) {
          downloadMatchData(accessToken, entitlementsToken, matchID, function(matchID_, matchData){
            matchesDownloadedData[userId][matchID_] = 1;
            downloadCompletion()

            let matchDate = matchData["matchInfo"]["gameStartMillis"]
            var d = new Date(matchDate)
            var matchDayStr = dateFormat(d, "m/d h:MMtt");

            bot.channels.cache.get("798343660001165332").send("Downloaded match "+matchID_+" ("+matchDayStr+") for user "+userId);
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

    function batchSaveCompHistory(userId, accessToken, entitlementsToken){
      var totalSaved = 0;
      async function downloadCompHistory(matchTotal, startIndex, endIndex){
        if(endIndex > matchTotal){
          endIndex = matchTotal
        }
        const matchCompHistoryOptions = {
            url: 'https://pd.na.a.pvp.net/mmr/v1/players/'+userId+"/competitiveupdates?startIndex="+startIndex+"&endIndex="+endIndex,
            method: 'GET',
            headers: {
                "Content-Type": "application/json",
                'Authorization': 'Bearer '+accessToken,
                'X-Riot-Entitlements-JWT': entitlementsToken
            },
        };
        request(matchCompHistoryOptions, async function(err, res, body) {
          let compHistoryData = JSON.parse(body);
          let matches = compHistoryData["Matches"]
          if(matches != undefined){
            console.log(JSON.stringify(matches))
            totalSaved += saveCompHistory(userId, matches)
            console.log("Got Comp history till "+endIndex)

            if(endIndex != matchTotal){
              downloadCompHistory(matchTotal, startIndex+20, endIndex+20)
              await sleep(1000)
            }else{
              msg.channel.send("Got rank data for "+totalSaved+" competitive games")
            }
          }else{
            msg.channel.send("Got rank data for "+totalSaved+" competitive games")
          }
        })
      }

      const matchHistoryOptions = {
          url: 'https://pd.na.a.pvp.net/match-history/v1/history/'+userId+"?startIndex=0&endIndex=2",
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
        console.log("Downloading comp history with total "+total)
        downloadCompHistory(total, 0, 20)
      })
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

        bot.channels.cache.get("798343660001165332").send("Batch downloading for user "+userId+" from "+startIndex+" to "+endIndex);

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

    async function processAllUnprocessedGames(forceProcess){
      // loop through raw files
      const dir = await fs.promises.opendir(MATCHES_RAW_PATH)
      var gamesToProcess = 0
      for await (const dirent of dir) {
        // console.log(dirent.name)
        let matchFileName = dirent.name
        let matchID = matchFileName.split(".")[0]
        if(processedMatchesData[matchID] == undefined || forceProcess){
          processMatchData(matchID, rawMatchPath(matchID), function(){
            console.log("Processed "+matchID)
            gamesToProcess += 1
          }, forceProcess)
        }
      }
      if(gamesToProcess > 0){
        msg.channel.send("Processed "+gamesToProcess+" competitive games.")
      }
    }

    function processMatchData(matchID, dataPath, didProcess, forceProcess){
      if(processedMatchesData[matchID] == undefined){
        processedMatchesData[matchID] = {}
      }

      let matchDataRaw = fs.readFileSync(dataPath);
      try{
        let matchData = JSON.parse(matchDataRaw)

        let matchType = matchData["matchInfo"]["queueID"];
        // console.log("MATCH TYPE "+matchType)
        // TODO for now only process competitive games.
        if(matchType == "competitive"){

          let matchStartTime = matchData["matchInfo"]["gameStartMillis"]
          let folderPath = MATCHES_PROCESSED_PATH+matchID
          // console.log(folderPath)
          if (!fs.existsSync(folderPath)){
            console.log("Making folder "+folderPath)
            fs.mkdirSync(folderPath);
          }

          processedMatchesData[matchID]["gameStartMillis"] = matchStartTime
          var didProcessMatch = false;
          if(processedMatchesData[matchID][PROCESSING_HIT_ANALYSIS] == undefined || forceProcess){
            processMatchHitAnalysis(folderPath, matchData)
            processedMatchesData[matchID][PROCESSING_HIT_ANALYSIS] = 1;
            didProcessMatch = true;
          }

          if(processedMatchesData[matchID][PROCESSING_USER_ANALYSIS] == undefined || forceProcess){
            processMatchUserAnalysis(folderPath, matchData)
            processedMatchesData[matchID][PROCESSING_USER_ANALYSIS] = 1;
            didProcessMatch = true;
          }

          if(processedMatchesData[matchID][PROCESSING_ROUND_ANALYSIS] == undefined || forceProcess){
            processMatchRoundsAnalysis(folderPath, matchData)
            processedMatchesData[matchID][PROCESSING_ROUND_ANALYSIS] = 1;
            didProcessMatch = true;
          }
          // console.log("")
          if(didProcessMatch == true){
            didProcess()
          }
          fs.writeFileSync('private/processedMatches.json', JSON.stringify(processedMatchesData, null, 2) , 'utf-8');
          console.log("Handled "+dataPath+", processed: "+didProcessMatch)
        }
      }catch(err){
         // bad game
         console.log("ERROR "+err)
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

      var rounds = matchData["roundResults"]
      for(var i = 0; i < rounds.length; i++){
        var roundData = rounds[i]
        var planter = roundData["bombPlanter"]
        var defuser = roundData["bombDefuser"]
        if(planter != undefined){
          if(playerData[planter]["stats"]["plants"] == undefined){
            playerData[planter]["stats"]["plants"] = 0
          }
          playerData[planter]["stats"]["plants"] += 1
        }

        if(defuser != undefined){
          if(playerData[defuser]["stats"]["defuses"] == undefined){
            playerData[defuser]["stats"]["defuses"] = 0
          }
          playerData[defuser]["stats"]["defuses"] += 1
        }

        var earlistKillTime = Number.MAX_SAFE_INTEGER
        var earliestKillSubject = ""
        // calculate first bloods
        var roundPlayerStats = roundData["playerStats"]
        for(var p = 0; p < roundPlayerStats.length; p++){
          var player = roundPlayerStats[p]
          var curSubject = player["subject"]
          var playerKills = player["kills"];
          for(var k = 0; k < playerKills.length; k++){
            var killData = playerKills[k]
            var killTime = killData["roundTime"]
            if(killTime < earlistKillTime){
              earlistKillTime = killTime
              earliestKillSubject = curSubject
            }
          }
        }
        if(playerData[earliestKillSubject]["stats"]["firstBloods"] == undefined){
          playerData[earliestKillSubject]["stats"]["firstBloods"] = 0
        }
        playerData[earliestKillSubject]["stats"]["firstBloods"] += 1
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

    function processMatchRoundsAnalysis(folderPath, matchData){
      var allRoundDataFinal = {}

      let matchPlayers = matchData["players"]
      var teamInfo = {}
      for(var p = 0; p < matchPlayers.length; p++){
        teamInfo[matchPlayers[p]["subject"]] = matchPlayers[p]["teamId"]
      }

      allRoundDataFinal["teamInfo"] = teamInfo

      let rounds = matchData["roundResults"]

      var roundDataFinal = {}
      var roundWinInfo = {}
      var roundScoreTotals = {}
      for(var i = 0; i < rounds.length; i++){
        let roundData = rounds[i];

        let roundNum = roundData["roundNum"]
        let winningTeam = roundData["winningTeam"]
        roundWinInfo[""+roundNum] = winningTeam

        let roundPlayerStats = roundData["playerStats"];
        for(var j = 0; j < roundPlayerStats.length; j++){
          let playerData = roundPlayerStats[j];
          let subject = playerData["subject"];

          let score = playerData["score"];

          if(roundDataFinal[subject] == undefined){
            roundDataFinal[subject] = []
          }

          if(roundScoreTotals[subject] == undefined){
            roundScoreTotals[subject] = 0
          }
          roundScoreTotals[subject] += score

          var roundPlayerData = {}

          roundPlayerData["roundNum"] = roundNum

          // compute damage breakdown
          roundPlayerData["damage"] = {}
          roundPlayerData["damage"]["total"] = 0;
          let damageData = playerData["damage"];
          var damageBreakdown = []
          for(var k = 0; k < damageData.length; k++){
            let damageEntity = damageData[k];
            let breakdownEntity = {
              "receiver":damageEntity["receiver"],
              "damage":damageEntity["damage"]
            }
            roundPlayerData["damage"]["total"] += damageEntity["damage"]
            damageBreakdown.push(breakdownEntity)
          }
          roundPlayerData["damage"]["breakdown"] = damageBreakdown

          // compute kills
          var killBreakdown = []
          let killData = playerData["kills"]
          for(var k = 0; k < killData.length; k++){
            let killEntity = killData[k]
            let roundTime = killEntity["roundTime"]
            let gameTime = killEntity["gameTime"]
            let victim = killEntity["victim"]
            let killer = killEntity["killer"]
            let victimLocation = killEntity["victimLocation"]

            let killerLocation = {}
            var playerLocations = killEntity["playerLocations"]
            for(var l = 0; l < playerLocations.length; l++){
              let playerLocation = playerLocations[l];
              let playerLocationSubject = playerLocation["subject"]

              if(playerLocationSubject == killer){
                killerLocation["x"] = playerLocation["location"]["x"]
                killerLocation["y"] = playerLocation["location"]["y"]
                killerLocation["viewRadians"] = playerLocation["viewRadians"]
                break;
              }
            }

            var playerKillData = {}
            playerKillData["roundTime"] = roundTime
            playerKillData["gameTime"] = gameTime
            playerKillData["victim"] = victim
            playerKillData["victimLocation"] = victimLocation
            playerKillData["killerLocation"] = killerLocation
            killBreakdown.push(playerKillData)

          }
          roundPlayerData["kills"] = killBreakdown

          // economy breakdown
          var economyBreakdown = {}
          var economyData = playerData["economy"]

          economyBreakdown["value"] = economyData["loadoutValue"]
          economyBreakdown["remaining"] = economyData["remaining"]
          economyBreakdown["spent"] = economyData["spent"]
          economyBreakdown["weapon"] = economyData["weapon"]
          economyBreakdown["armor"] = economyData["armor"]
          roundPlayerData["economy"] = economyBreakdown

          roundPlayerData["score"] = score;

          roundDataFinal[subject].push(roundPlayerData)
        }
      }
      allRoundDataFinal["winResults"] = roundWinInfo
      allRoundDataFinal["roundInfo"] = roundDataFinal
      allRoundDataFinal["scoreTotals"] = roundScoreTotals
      // console.log("ROUND STATS DATA "+folderPath)
      fs.writeFileSync(folderPath+'/roundStats.json', JSON.stringify(allRoundDataFinal, null, 2) , 'utf-8');
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

    function eloFromCompInfo(matchInfo){
      let RPAfter = matchInfo["RankedRatingAfterUpdate"];
      let tierAfter = matchInfo["TierAfterUpdate"]
      var currentElo = (tierAfter*100) - 300 + RPAfter;
      return currentElo
    }

    function getCompEloHistoryList(userId){
      // return array of elo in order as int array [1234, 1255, ...]
      // first is newest, right is oldest
      let compHistory = compHistoryData[userId]
      let matchSort = compHistory["MatchSort"]
      var eloArray = []
      var dateArray = []
      for(var i = 0; i < matchSort.length; i++){
        var matchId = matchSort[i]
        var matchData = compHistory["Matches"][matchId]
        var matchStartDate = matchData["MatchStartTime"]

        eloArray.push(eloFromCompInfo(matchData))

        var d = new Date(matchStartDate)
        // var day = dateFormat(d, "mm/dd/yy h:MM:ss tt");
        var matchDay = dateFormat(d, "m/d");

        dateArray.push(matchDay)
      }
      return {"dates":dateArray, "elo":eloArray}
    }

    function sleep(ms) {
      return new Promise((resolve) => {
        setTimeout(resolve, ms);
      });
    }

    function computeTotalHits(){
      var hitsData = {}

      fs.readdir(MATCHES_PROCESSED_PATH, function(err, filenames) {
        if (err) {
          onError(err);
          return;
        }
        filenames.forEach(function(filename) {
          try{
            let rawHitsData = fs.readFileSync(MATCHES_PROCESSED_PATH + filename + "/hits.json");
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
      var playerData = {}

      fs.readdir(MATCHES_PROCESSED_PATH, function(err, filenames) {
        if (err) {
          onError(err);
          return;
        }
        filenames.forEach(function(filename) {
          try {
            let rawUsersData = fs.readFileSync(MATCHES_PROCESSED_PATH + filename + "/users.json");
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
                      "roundsPlayed":0,
                      "totalGamesPlayed":0,
                      "defuses":0,
                      "plants":0,
                      "firstBloods":0
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
                playerData[subject]["stats"]["totalGamesPlayed"] += 1;
                if(userEntity["stats"]["defuses"] != undefined)
                  playerData[subject]["stats"]["defuses"] += userEntity["stats"]["defuses"];
                if(userEntity["stats"]["plants"] != undefined)
                  playerData[subject]["stats"]["plants"] += userEntity["stats"]["plants"];
                if(userEntity["stats"]["firstBloods"] != undefined)
                  playerData[subject]["stats"]["firstBloods"] += userEntity["stats"]["firstBloods"];
              }
            }
          }catch{

          }

        });
        totalUserStats = playerData
        fs.writeFileSync('private/totalStats/users.json', JSON.stringify(playerData, null, 2) , 'utf-8');
      });
    }

    function analyzeMatchRoundData(matchID, analysisType){
      var dataFilePath = MATCHES_PROCESSED_PATH + matchID + "/roundStats.json"
      try {
        let rawRoundData = fs.readFileSync(dataFilePath);
        let roundData = JSON.parse(rawRoundData)
        let teamInfo = roundData["teamInfo"]
        let winResults = roundData["winResults"]
        let roundInfo = roundData["roundInfo"]
        let scoreTotals = roundData["scoreTotals"]

        let numberOfRounds = Object.keys(winResults).length
        // TODO user users.json roundsPlayed > 40 to filter

        var damageDatasetData = {}
        var scoreDatasetData = {}
        var carryDatasetData = {}
        var finalCarryData = []

        var subjectIdOfOurPlayer = ""
        for (var subjectId in roundInfo) {
          // check if the property/key is defined in the object itself, not in parent
          if (roundInfo.hasOwnProperty(subjectId)) {
            var userData = totalUserStats[subjectId]
            // console.log(JSON.stringify(userData))
            var playerGameName = userData["gameName"]+"#"+userData["tagLine"]

            if(userData["stats"]["roundsPlayed"] > 50){ // assuming no game is more than 50 rounds
              subjectIdOfOurPlayer = subjectId
              var subjectRounds = roundInfo[subjectId]

              for(var i = 0; i < subjectRounds.length; i++){
                var subjectData = subjectRounds[i]
                let roundNumber = subjectData["roundNum"]

                if(damageDatasetData[playerGameName] == undefined){
                  damageDatasetData[playerGameName] = Array(numberOfRounds).fill(0);
                }

                if(scoreDatasetData[playerGameName] == undefined){
                  scoreDatasetData[playerGameName] = Array(numberOfRounds).fill(0);
                }
                damageDatasetData[playerGameName][roundNumber] = subjectData["damage"]["total"]
                scoreDatasetData[playerGameName][roundNumber] = subjectData["score"]
                carryDatasetData[playerGameName] = scoreTotals[subjectId]
              }
            }
          }
        }

        var datasetToUse = {}

        switch (analysisType) {
          case CHART_TYPE_DAMAGE:
            datasetToUse = damageDatasetData
            break;
          case CHART_TYPE_SCORE:
            datasetToUse = scoreDatasetData
            break;
          case CHART_TYPE_CARRY:

            break;
          case CHART_TYPE_ECONOMY:
            // datasetToUse = scoreDatasetData
            break;
          default:

        }
        console.log("DATA TO USE "+analysisType+"_"+CHART_TYPE_SCORE)

        var teamOfOurPlayer = teamInfo[subjectIdOfOurPlayer]

        var ourTeamScore = 0;
        var enemyTeamScore = 0;

        var chartXLabels = []
        for(var r = 0; r < numberOfRounds; r++){
          var roundWinner = winResults[""+r]
          var didWinRound = roundWinner == teamOfOurPlayer
          ourTeamScore += didWinRound ? 1 : 0
          enemyTeamScore += didWinRound ? 0 : 1

          if(analysisType == CHART_TYPE_SCORE || analysisType == CHART_TYPE_DAMAGE || analysisType == CHART_TYPE_ECONOMY){
            chartXLabels.push((didWinRound ? "Won" : "Lost")+" ("+(r+1)+")")
          }
        }

        var highestCarry = ""
        var carryScoreHighest = 0
        if(analysisType == CHART_TYPE_CARRY){
          for (var playerName in carryDatasetData) {
            // check if the property/key is defined in the object itself, not in parent
            if (carryDatasetData.hasOwnProperty(playerName)) {
              chartXLabels.push(playerName)
              var score = carryDatasetData[playerName]
              if(score > carryScoreHighest){
                carryScoreHighest = score
                highestCarry = playerName
              }
              finalCarryData.push(score)
            }
          }
        }

        var matchResult = (ourTeamScore > enemyTeamScore) ? "Won" : ((ourTeamScore == enemyTeamScore) ? "Draw" : "Lost")
        var chart;
        if(analysisType == CHART_TYPE_SCORE || analysisType == CHART_TYPE_DAMAGE || analysisType == CHART_TYPE_ECONOMY){
          chart = buildChartObject("line", analysisType+" chart for match ("+matchResult+" "+ourTeamScore+"-"+enemyTeamScore+")", chartXLabels, datasetToUse)
        }else if(analysisType == CHART_TYPE_CARRY){
          chart = buildChartObject("doughnut", analysisType+" chart for match ("+matchResult+" "+ourTeamScore+"-"+enemyTeamScore+")", chartXLabels, {"data":finalCarryData}, highestCarry)
        }
        var chartURL = chartURLFromObject(chart, function(url){
          console.log(url)
          msg.channel.send(url)
        })

      }catch(err){
        console.log("ANALYZE ERR "+err)
      }
    }

    function random_rgba() {
        var o = Math.round, r = Math.random, s = 255;
        return 'rgba(' + o(r()*s) + ',' + o(r()*s) + ',' + o(r()*s) + ', 0.5)';
    }

    function buildChartObject(chartType, title, xLabels, datasets, doughnutMainLabel){
      var chartOptions = {
        "responsive":true,
        "title":{
          "display":true,
          "text":title
        },
        "tooltips": {
          "mode":"index",
          "intersect": true
        },
        "plugins":{}
      }

      if(chartType == "line"){
        chartOptions["plugins"] = {
          "datalabels": {
            "display": function(context) {
              var index = context.dataIndex;
              var value = context.dataset.data[index];
              return parseInt(value) > 0 ? "auto" : false;
            },
            "align": 'top',
            "backgroundColor": 'transparent',
            "borderRadius": 3
          }
        }
      }else if(chartType == "doughnut"){
        chartOptions["plugins"] = {
          "datalabels": {
            "formatter": (value) => {
              return value + ' score';
            },
            "color":"white",
            "font":{
              "weight":"bold",
              "size":10
            }
          },
          "doughnutlabel": {
            "labels":[
              {
                "text":doughnutMainLabel,
                "font":{
                  "size":20
                }
              },
              {
                "text":"carry"
              }
            ],
            "align": 'center',
            "backgroundColor": 'transparent',
            "borderRadius": 3
          }
        }
      }

      var chartDatasetArray = []

      for (var playerName in datasets) {
        // check if the property/key is defined in the object itself, not in parent
        if (datasets.hasOwnProperty(playerName)) {

          var datasetObject = {
            "type": chartType,
            "label": playerName,
            "borderColor": random_rgba(),
            // "backgroundColor": "rgb(255, 99, 132)",
            "borderWidth": chartType == "doughnut" ? 0 : 1,
            "fill": false,
            "data": datasets[playerName]
          }
          chartDatasetArray.push(datasetObject)

        }
      }

      var chartObject = {
        "type":chartType,
        "data":{
          "labels":xLabels,
          "datasets":chartDatasetArray
        },
        "options":chartOptions
      }
      console.log("CHART: "+JSON.stringify(chartObject))
      return chartObject
    }

    function makeAnnotationsForEloMarkers(lowest, highest){
      var numberOfAnnotations = Math.ceil((highest-lowest)/100) + 1 // extra 1 should be for rank below lowest elo
      var annotations = []
      var lowestEloAnno = Math.floor(lowest/100)*100
      console.log("ANNO "+lowest+"_"+highest+"_"+numberOfAnnotations+"_"+lowestEloAnno+"_")
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
            content:RANKS[((lowestEloAnno+300)/100)+""],
            position:"start",
            font:{
              size:12,
              color:"#888",
            },
            xAdjust:-(ELO_CHART_WIDTH/2)+55
          }
        }
        annotations.push(anno)
        lowestEloAnno += 100
      }
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
      console.log("CHART: "+JSON.stringify(chartObject))
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
          console.log(body)
          // var bodyParse = JSON.parse(body)
          completion(body["url"])
        }
      })
      // return "https://quickchart.io/chart?bkg=white&c="+encodeURIComponent(JSON.stringify(chartObject))
    }

    function buildAsciiTable(title, tableHeaders, data, raw){
      var table = new AsciiTable().fromJSON({
        title:title,
        heading: tableHeaders,
        rows: data
      })

      return raw == true ? table : "`"+table.toString()+"`"
    }

    function combineTwoAsciiTables(table1, table2){
      var s1 = table1.toString()
      var s2 = table2.toString()
      var s1Lines = s1.split(/\r?\n/)
      var s2Lines = s2.split(/\r?\n/)
      var shorterLength = Math.min(s1Lines.length, s2Lines.length)

      var final = ""
      for(var i = 0; i < shorterLength; i++){
        final += s1Lines[i]+"|"+s2Lines[i]+"\n"
      }
      return final
    }

    function computeLeaderboards(){
      var killThreshold = 50;
      let thresholdArg = args[1]
      if(thresholdArg != undefined){
        killThreshold = thresholdArg
      }

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

      var toPrintScores = userItems.slice(0, 15)
      var scoresTable = makeLeaderboardTable(toPrintScores, "Avg score/round Leaderboard", "Score", function(num){
        return (num.toFixed(2))
      })


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
      var toPrintHeadshots = hitsItems.slice(0, 15)
      var hsTable = makeLeaderboardTable(toPrintHeadshots, "Headshot % Leaderboard", "HS %", function(num){
        return ((num*100).toFixed(2))+"%"
      })



      // kills leaderboard
      userItems.sort(function(firstObj, secondObj) {
        var first = firstObj[1]["stats"]
        var second = secondObj[1]["stats"]


        var firstKills = first["kills"]
        var secondKills = second["kills"]

        firstObj[2] = (firstKills) // because we already pushed an element earlier
        secondObj[2] = (secondKills)
        if(firstKills < killThreshold && secondKills < killThreshold){
          return 0
        }else{
          if(firstKills < killThreshold && secondKills >= killThreshold){
            return 1;// secondHSPercent - firstHSPercent
          }else if(secondKills < killThreshold && firstKills >= killThreshold){
            return -1;//firstHSPercent - secondHSPercent
          }else{
            return secondKills - firstKills
          }
        }
      });

      var toPrintKills = userItems.slice(0, 15)
      var killsTable = makeLeaderboardTable(toPrintKills, "Total Kills Leaderboard", "Kills", function(num){
        return num
      })



      // playtime leaderboard
      userItems.sort(function(firstObj, secondObj) {
        var first = firstObj[1]["stats"]
        var second = secondObj[1]["stats"]


        var firstKills = first["kills"]
        var secondKills = second["kills"]

        var firstPlaytime = first["playtimeMillis"]
        var secondPlaytime = second["playtimeMillis"]

        firstObj[2] = (firstPlaytime) // because we already pushed an element earlier
        secondObj[2] = (secondPlaytime)
        if(firstKills < killThreshold && secondKills < killThreshold){
          return 0
        }else{
          if(firstKills < killThreshold && secondKills >= killThreshold){
            return 1;// secondHSPercent - firstHSPercent
          }else if(secondKills < killThreshold && firstKills >= killThreshold){
            return -1;//firstHSPercent - secondHSPercent
          }else{
            return secondPlaytime - firstPlaytime
          }
        }
      });

      var toPrintPlaytime = userItems.slice(0, 15)
      var playtimeTable = makeLeaderboardTable(toPrintPlaytime, "Total Playtime Leaderboard", "Playtime (hrs)", function(num){
        return (num / (3600*1000)).toFixed(2);
      })


      // Order: Playtime, Kills, Score, HS %
      // var tableCombo1 = combineTwoAsciiTables(playtimeTable, killsTable)
      // var tableCombo2 = combineTwoAsciiTables(tableCombo1, scoresTable)
      // var tableCombo3 = combineTwoAsciiTables(tableCombo2, hsTable)
      // return tableCombo3

      // Could be used in the future to break up leaderboards into multiple messages
      return [playtimeTable, killsTable, scoresTable, hsTable] // TODO return more leaderboards
    }

    function makeLeaderboardTable(toPrintItems, tableTitle, dataHeader, numFomatting){

      var finalDataArray = []
      for(var i = 0; i < toPrintItems.length; i++){
        var userId = toPrintItems[i][0]
        var userStats = totalUserStats[userId];
        var userFullName = userStats["gameName"]+"#"+userStats["tagLine"]
        var num = numFomatting(toPrintItems[i][2])
        finalDataArray.push([userFullName, num])
      }

      var table = buildAsciiTable(tableTitle, ["Name", dataHeader], finalDataArray, true)
      table.removeBorder()
      return table
    }

    function getGlobalLeaderboard(page, accessToken, entitlementsToken, completion){
      const options = {
          url: "https://pd.na.a.pvp.net/mmr/v1/leaderboards/affinity/na/queue/competitive/season/97b6e739-44cc-ffa7-49ad-398ba502ceb0",
          method: 'GET',
          headers: {
              "Content-Type": "application/json",
              'Authorization': 'Bearer '+accessToken,
              'X-Riot-Entitlements-JWT': entitlementsToken,
              'X-Riot-ClientVersion':"release-02.00-shipping-16-508517"
          },
      };

      var tableData = []
      request(options, async function(err, res, body) {
        var leaderboardData = JSON.parse(body)
        var leaderboardPlayersAll = leaderboardData["Players"]

        var totalPages = Math.floor(leaderboardPlayersAll.length/10)
        if((page+1)*10 > leaderboardPlayersAll.length){
          page = totalPages
        }
        var leaderboardPlayers = leaderboardPlayersAll.slice(page*10, (page+1)*10)
        for(var i = 0; i < leaderboardPlayers.length; i++){
          var playerData = leaderboardPlayers[i]
          var playerSubject = playerData["subject"]
          var playerRank = playerData["LeaderboardRank"]
          var playerRating = playerData["RankedRating"]
          var playerWins = playerData["NumberOfWins"]

          var anon = playerData["IsAnonymized"]
          var banned = playerData["IsBanned"]

          var fullName = ""
          if(anon == true){
            fullName = "Secret Agent"
          }else{
            var gameName = playerData["GameName"]
            var tagLine = playerData["TagLine"]

            fullName = gameName+"#"+tagLine
          }
          if(banned){
            fullName += "[Banned]"
          }
          var data = [playerRank, playerRating, fullName, playerWins]
          tableData.push(data)
        }

        var tableStr = buildAsciiTable("NA Top 500 Leaderboard (Page "+(page+1)+"/"+(totalPages+1)+")", ["Rank", "Rating", "Name", "Wins"], tableData, false)
        completion(tableStr)
      })
    }

    function cleanHSPercent(hs){
      var num = ((hs*100).toFixed(2))
      return num;
      // return ((Math.floor(hs*10000)/10000).toFixed(4))*100;
    }

    const capitalize = (s) => {
      if (typeof s !== 'string') return ''
      return s.charAt(0).toUpperCase() + s.slice(1)
    }

    function doAllComputation(){
      computeTotalHits()
      computeTotalUsers()
      bot.channels.cache.get("798343660001165332").send("Computed all stats.");
    }
    // elo = get elo
    // gam = get all matches
    if(arg == "elo" || arg == "gam" || arg == "uocm"){
      if(!userCanUseBot){
        msg.channel.send("You are not allowed to use this bot. 😊")
        return;
      }
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
            }else if(arg == "uocm"){ // update old comp matches
              batchSaveCompHistory(userId, accessToken, entitlementsToken)
            }
          });
        }else{
          msg.channel.send("Username not found")
        }
      }else{
        msg.channel.send("Please enter a username: ?elo <username>")
      }
    }

    if(arg == "processgame" || arg == "pag" || arg == "fpag"){
      if(arg == "pag"){
        // process all games
        processAllUnprocessedGames(false)
      }else if(arg == "processgame"){
        if(args.length >= 2){
          let matchID = args[1]
          processMatchData(matchID, rawMatchPath(matchID), function(){
            msg.channel.send("Processed "+matchID)
          }, true)
        }
      }else if(arg == "fpag"){
        console.log("Force")
        processAllUnprocessedGames(true)
      }
    }

    if(arg == "computeall"){
      doAllComputation()
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

          var disclaimer = "**For now, this data only includes competitive games.**"

          var userFullName = userObj["gameName"]+"#"+userObj["tagLine"]

          var kills = userObj["stats"]["kills"];
          var deaths = userObj["stats"]["deaths"]
          var assists = userObj["stats"]["assists"]
          var roundsPlayed = userObj["stats"]["roundsPlayed"];
          var kd = userObj["stats"]["kd"].toFixed(2)
          var killsPerRound = (kills/roundsPlayed).toFixed(2)

          var kdaTable = buildAsciiTable(null, ["Kills", "Deaths", "Assists", "K/D", "Average kills per round"], [[kills+"", deaths+"", assists+"", kd+"", killsPerRound+""]])

          var totalPlaytimeHours = (userObj["stats"]["playtimeMillis"] / (3600*1000)).toFixed(2);
          var score = userObj["stats"]["score"]
          var scorePerRound = (score/roundsPlayed).toFixed(2)

          var scoreTable = buildAsciiTable(null, ["Total rounds played", "Total score", "Score/round"], [[roundsPlayed, score, scorePerRound]])

          var hitsDataForUser = totalHitsStats[userId]
          var headshots = hitsDataForUser["headshots"]
          var bodyshots = hitsDataForUser["bodyshots"]
          var legshots = hitsDataForUser["legshots"]

          var totalHits = headshots+bodyshots+legshots
          var headshotPercent = cleanHSPercent(headshots/totalHits)+"%"
          var legshotPercent = cleanHSPercent(legshots/totalHits)+"%"
          var bodyshotPercent = cleanHSPercent(bodyshots/totalHits)+"%"

          var hitsTable = buildAsciiTable(null, ["Headshot %", "Bodyshot %", "Legshots %"], [[headshotPercent, bodyshotPercent, legshotPercent]])

          var plants = userObj["stats"]["plants"];
          var defuses = userObj["stats"]["defuses"]
          var firstBloods = userObj["stats"]["firstBloods"]
          var firstBloodRate = cleanHSPercent(firstBloods/roundsPlayed)+"%"
          var miscTable = buildAsciiTable(null, ["Plants", "Defuses", "First bloods", "First blood % (over all rounds)"], [[plants, defuses, firstBloods, firstBloodRate]])

          var totalGamesPlayed = userObj["stats"]["totalGamesPlayed"];

          msg.channel.send(disclaimer+"\nStats for **"+userFullName+"**\nPlay time: **"+totalPlaytimeHours+"** hours over "+totalGamesPlayed+" games\n"+kdaTable+"\n"+scoreTable+"\n"+miscTable+"\n"+hitsTable)
          // console.log("PRinting Stats for "+obj.gameName+"#"+obj.tagLine)
        }else{
          msg.channel.send("User not found.")
        }

      }
    }

    if(arg == "leaderboards"){
      var allLeaderboards = computeLeaderboards()
      // try{
      //   msg.channel.send("`"+allLeaderboards+"`")
      // }catch(err){
      //   // Break up the leaderboards
      //   msg.channel.send("This was kinda expected. @ me pls "+err)
      // }
      // Could be used in the future to break up leaderboards into multiple messages
      for(var i = 0; i < allLeaderboards.length; i += 2/*3*/){
        /*if(i + 2 < allLeaderboards.length){
          var leaderboard1 = allLeaderboards[i]
          var leaderboard2 = allLeaderboards[i+1]
          var leaderboard3 = allLeaderboards[i+2]
          var leaderboardPair = combineTwoAsciiTables(leaderboard1, leaderboard2)
          var leaderboardPairFinal = combineTwoAsciiTables(leaderboardPair, leaderboard3)
          msg.channel.send("`"+leaderboardPairFinal+"`")
        }else*/ if(i + 1 < allLeaderboards.length){
          var leaderboard1 = allLeaderboards[i]
          var leaderboard2 = allLeaderboards[i+1]
          var leaderboardPair = combineTwoAsciiTables(leaderboard1, leaderboard2)
          msg.channel.send("`"+leaderboardPair+"`")
        }else{
          msg.channel.send("`"+allLeaderboards[i].toString()+"`")
        }
      }
    }

    if(arg == "global"){
      let pageNumRaw = args[1] || 1
      let pageNum = parseInt(pageNumRaw)

      if(pageNum <= 0 || isNaN(pageNum)){
        pageNum = 1
      }

      let usernameRawArg = USERNAME_FOR_LEADERBOARD
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

            var globalLeaderboard = getGlobalLeaderboard(pageNum-1, accessToken, entitlementsToken, function(table){
              msg.channel.send(table)
            })
          })
        }
      }
    }

    if(arg == "damage" || arg == "score" || arg == "carry"){// || arg == "analyze"){
      if(!userCanUseBot){
        msg.channel.send("You are not allowed to use this bot. 😊")
        return;
      }
      let matchID = args[1]
      if(matchID != undefined){
        analyzeMatchRoundData(matchID, capitalize(arg))
      }else{
        msg.channel.send("Please provide a match ID");
      }
    }

    if(arg == "setcolor"){
      if(!userCanUseBot){
        msg.channel.send("You are not allowed to use this bot. 😊")
        return;
      }
      var colorInput = args[1]
      var isColor = /^#[0-9A-F]{6}$/i.test(colorInput)
      if(isColor){
        userColorsData[msg.member.id] = colorInput
        fs.writeFileSync('private/userColors.json', JSON.stringify(userColorsData, null, 2) , 'utf-8');
        msg.channel.send("Color set.")
      }else{
        msg.channel.send("Not a valid color")
      }
    }

    if(arg == "commands"){
      var helpString = "Elo Tracker Commands:\n"
      helpString += "**?elo** commands\n"
      helpString += "?elo <name> Get the latest Elo and rank of a user, along with their Elo history graph and the results of their 3 latest games\n"
      helpString += "?elo <name> <number of matches> Same as above, but choose how many maches to show\n"
      helpString += "?elo <name> <number of matches> d The d stands for 'debug', show the same info but show Match IDs\n"

      helpString += "\n"

      helpString += "?stats <name or InGameName#TagLine> Display the cummulative stats of a user. Including KDA, playtime, hit percentages, and score\n"

      helpString += "\n"

      helpString += "?headshots Show the headshot % leaderboard\n"
      helpString += "?scores Show the average score per round leaderboard\n"

      helpString += "\n"

      helpString += "?damage <Match ID> Display a damage chart per round for your team for a certain match\n"
      helpString += "?score <Match ID> Display a score chart per round of your teammates for a certain match\n"
      helpString += "?carry <Match ID> View who has the most score in a match in a chart\n"

      helpString += "\n"

      helpString += "?setcolor <Hex Color> Set the highlight color of the embed and the graph color when you ask for elo\n"

      msg.channel.send(helpString)
    }
});

bot.login(token);
