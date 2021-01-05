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
let discordTokenRaw = fs.readFileSync('secret.json');

let token = JSON.parse(discordTokenRaw)["key"];
let authData = JSON.parse(rawdata);
let authCacheData = JSON.parse(rawCacheData);

/*
fs.readFile(filePath, 'utf8', function(err, contents) {
    if(err){
        console.log('error!');
    }
    else{
        token = contents;
        console.log(contents);
    }
});
*/

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

bot.on('message', function(msg) {
    if(mems.length == 0){
      var GuildMembers = msg.guild.members.cache;
      //console.log(lengthy);
      // var mems = [];
      var nicks = GuildMembers.map(g => g.user.username)
      var lengthy = nicks.length;
      var i;
      for (i = 0; lengthy > i; i++) {
          if (typeof(nicks[i]) === "string") {
              //console.log("test");
              if (nicks[i] != "oRgAnIc BeAnA" && nicks[i] != "irrelevant") {
                  mems.push(nicks[i]);
              }
          }
      }
    }

    let args = msg.content.substring(PREFIX.length).split(" "); //returns the text after the prefix smart move by me nc
    //console.log(args);
    var arg = ((args[0].toString()).toLowerCase());
    //var arg = msg.split(' ')[0];
    //msg.channel.send(arg);
    if (arg =='destroy') {
        msg.channel.send("Bot Restarting...")
        bot.destroy();
        bot.login(token);
    }

    if (arg == 'test') {
        msg.channel.send("Nice bruh");
    }

    if (arg == 'help') {
        msg.channel.send("Availible commands are (?date, ?test, ?git) and some question based commands for fun!");
    }

    if (arg == 'git') {
        msg.channel.send("https://github.com/ha")
    }

    if (arg == "who" || arg == "whose" || arg == "which") {
      // //msg.channel.send("testing");
      // var GuildMembers = msg.guild.members.cache;
      // // console.log("MSDFSD");
      // console.log(GuildMembers);
      // //console.log(lengthy);
      // var mems = [];
      // var nicks = GuildMembers.map(g => g.nickname)
      // var lengthy = nicks.length;
      // var i;
      // for (i = 0; lengthy > i; i++) {
      //     if (typeof(nicks[i]) === "string") {
      //         //console.log("test");
      //         if (nicks[i] != "oRgAnIc BeAnA" && nicks[i] != "irrelevant") {
      //             mems.push(nicks[i]);
      //         }
      //     }
      // }
      // console.log(mems);
      var person = mems[Math.floor(Math.random() * mems.length)];
      msg.channel.send(person);
    }

    // TODO login caches
    if(arg == "elo"){
      let usernameRawArg = args[1]

      if(usernameRawArg != undefined){
        let usernameArg = usernameRawArg.toLowerCase()


        // msg.channel.send(username);
        let userData = authData["users"][usernameArg];
        // msg.channel.send(userData);
        console.log("USERDATA "+userData)
        if(userData != undefined){
          let username = userData["username"];
          let password = userData["password"];


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
            // console.log(JSON.stringify(body)+"XCSFS")
            request(initialAuthOpts, function(err1, res, body1) {
              // console.log("AUTHS "+JSON.stringify(body1)+"_"+err1)
              let returnData = body1["response"]["parameters"]["uri"]
              // console.log("RETURN DATA "+returnData)
              let rDS = returnData.split('#')[1];
              let params = querystring.parse(rDS)
              // console.log("PARAMS "+JSON.stringify(params))

              let accessToken = params["access_token"];
              let expireTime = params["expires_in"]; // TODO add to current time and store

              // console.log("ACCESS TOKEN:::::: "+accessToken)
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
                // console.log(JSON.stringify(body2)+"FDSF");
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
                  var userId = body3["sub"]


                  // displayUserElo(args, userId, accessToken, entitlementsToken, )
                  // console.log(userId);

                  const options = {
                      url: 'https://pd.na.a.pvp.net/mmr/v1/players/'+userId+"/competitiveupdates",
                      method: 'GET',
                      headers: {
                          "Content-Type": "application/json",
                          'Authorization': 'Bearer '+accessToken,
                          'X-Riot-Entitlements-JWT': entitlementsToken
                      },
                      jar: cookieJar
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
                      let latestMatchJson = json["Matches"][i]

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
                });
              });
            });
          });
        }else{
          msg.channel.send("Username not found")
        }
      }else{
        msg.channel.send("Please enter a username: ?elo <username>")

      }
    }

    if (arg == "is" || arg == "will" || arg == "did") {
        var answer;
        if (Math.floor(Math.random() * 10) >= 5) {
            answer = "yes";
        } else {
            answer = "no";
        }
        msg.channel.send(answer);
    }

    if(arg == "joinvc"){
      msg.channel.send(bot.user.id)
      if (msg.member.voice != undefined && msg.member.voice.channel) {
         msg.member.voice.channel.join().then(connection => {
          // Yay, it worked!
          console.log("Successfully connected.");
          play(connection, "https://www.youtube.com/watch?v=")
          // connection.disconnect();
        }).catch(e => {
          // Oh no, it errored! Let's log it to console :)
          console.error(e);
        });
    	}else{
        if(msg.member.voice == null){
          msg.channel.send("VC NULL for "+msg.member.voice.channel.name)
        }
        msg.channel.send("You are not in a vc (I will join the one you are in)");
      }
    }

    if(arg == "leavevc"){
      msg.channel.send("LEAVING")
      for(let c of bot.voice.connections){
        console.log(c);
        c[1].disconnect();
      }
    }

    if (arg == "muteall" || arg == "ma") {
        let channel = msg.member.voice.channel;
        msg.channel.send("MUTING", {"tts": true})

        for (let member of channel.members) {
          if(member[1].id != 756193373630758953){
            member[1].voice.setMute(true)
          }
        }
    }

    if (arg == "unmuteall" || arg == "uma") {
        let channel = msg.member.voice.channel;
        msg.channel.send("UNMUTING", {"tts": true})
        for (let member of channel.members) {

          if(member[1].id != 756193373630758953){
            member[1].voice.setMute(false)
          }
        }
    }

    if(arg == "banvc"){
      let username = args[1];

      var foo = new Date; // Generic JS date object
      var unixtime_ms = foo.getTime(); // Returns milliseconds since the epoch
      var future_unixtime_ms = unixtime_ms + 10 * 60 * 1000; // 60 seconds per minute, 1000 ms per second

      currentVoiceBans[username] = future_unixtime_ms;
      console.log("Added "+username);
      msg.channel.send("Banning "+username+" from all voice channels for 10 minutes");
    }

    // if (arg == "mute") {
    //     let channel = msg.member.voice.channel;
    //     msg.channel.send("UNMUTE")
    //     for (let member of channel.members) {
    //         member[1].voice.setMute(false)
    //     }
    // }
});

bot.on("voiceStateUpdate", (oldMember, newMember) => {
  // const newUserChannel = newMember.voice.channelID;
  // const oldUserChannel = oldMember.voice.channelID;

  var banObj = currentVoiceBans[newMember.member.user.username];
  // console.log("VCU "+newMember.member.user.username+" B:"+(banObj != null));
  // console.log(banObj)
  var foo = new Date; // Generic JS date object
  var unixtime_ms = foo.getTime(); // Returns milliseconds since the epoch
  if(banObj != null){
    if(unixtime_ms < banObj){
      // user not allowed to join vc
      newMember.setChannel(null);
    }
  }
  // if(newUserChannel === '712677767333937284') {
  //   textChannel.send(`${newMember.user.username} (${newMember.id}) has joined the channel`)
  // } else if (oldUserChannel === '712677767333937284' && newUserChannel !== '712677767333937284') {
  //   textChannel.send(`${newMember.user.username} (${newMember.id}) has left the channel`)
  // }
});

async function play(connection, url) {
  connection.play(await ytdl(url), { type: 'opus', volume: 0.01 });
}

bot.login(token);
