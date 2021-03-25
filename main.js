const discord = require('discord.js');
require('dotenv').config();
const bot = new discord.Client();

const fs = require('fs');
const path = require('path');
const { stringify } = require("javascript-stringify");

const request = require('request');
const querystring = require('querystring');
var dateFormat = require('dateformat');

var cron = require('node-cron');

var CONSTANTS = require('./constants');
var AUTH = require('./auth');
var MATCH_HANDLER = require('./matchHandler');
var MATCH_PROCESSING = require('./matchProcessing');
var MATCH_COMPUTATION = require('./matchComputation');
var DISCORD_HANDLER = require('./discordHandler');
var LOG = require('./logging');

let userColorsData = readJSONFile('private/userColors.json');

let subjectIdAliases = readJSONFile('private/static/userIDs.json');
let altData = readJSONFile('private/static/alts.json');

function readJSONFile(path){
  return JSON.parse(fs.readFileSync(path))
}

function userIdFromAlias(alias){
  if(alias != undefined){
    let userId = subjectIdAliases[alias]
    if(userId != undefined){
      return userId
    }
  }
  return null
}

bot.on('message', async function(msg) {
  let first = msg.content.substring(0,1)
  if(first == CONSTANTS.PREFIX){
    let argString = msg.content.substring(CONSTANTS.PREFIX.length)
    let args = argString.split(" "); //returns the text after the prefix smart move by me nc
    var arg = ((args[0].toString()).toLowerCase());
    LOG.log(4, "Got command: "+arg)
    if(arg == CONSTANTS.COMMANDS.ELO){
      var userId = userIdFromAlias(args[1].toLowerCase())
      if(userId != null){
        MATCH_HANDLER.matchHistory(userId, async function(history){
          var numToShow = 3;
          var debugMode = false
          var showAuth = false;
          if(args.length >= 3){
            let count = args[2];
            numToShow = parseInt(count);
          }
          if(args.length >= 4){
            if(args[3] == "d")
              debugMode = true;
            if(args[3] == "a" && CONSTANTS.DISCORD_ADMIN_USERS.includes(msg.member.id)){
              showAuth = true;
            }
          }

          var userData = MATCH_COMPUTATION.getStatsData()[userId]
          var fullName = null
          if(userData != null){
            fullName = userData["gameName"]+"#"+userData["tagLine"]
          }
          LOG.log(3, "Sending Embed for Elo History for "+fullName)
          DISCORD_HANDLER.sendEmbedForEloHistory(msg, history, args, fullName == null ? args[1] : fullName)
        })
      }else{
        LOG.log(0, "User was not found for "+arg+" command with alias: "+args[1]+". UserID: "+userId)
        msg.channel.send("User not found. Make sure alias is added.")
      }
    }
    if(arg == CONSTANTS.COMMANDS.STATS){
      var userId = userIdFromAlias(args[1].toLowerCase())
      if(userId != null){
        DISCORD_HANDLER.sendEmbedForPlayerStats(msg, userId)
      }
    }
    if(arg == CONSTANTS.COMMANDS.HISTORY){
      var userId = userIdFromAlias(args[1].toLowerCase())
      if(userId != null){
        var userData = MATCH_COMPUTATION.getStatsData()[userId]

        if(userData != null){
          var fullName = userData["gameName"]+"#"+userData["tagLine"]
          MATCH_HANDLER.matchHistory(userId, async function(history){
          }, async function(history){
            DISCORD_HANDLER.sendMessageForMatchHistory(msg, userId, history, args, fullName, msg.member.id)
          })
        }
      }
    }
    if(arg == CONSTANTS.COMMANDS.HISTORYIMAGE){
      if(CONSTANTS.DISCORD_ADMIN_USERS.includes(msg.member.id)){
        var userId = userIdFromAlias(args[1].toLowerCase())
        if(userId != null){
          var userData = MATCH_COMPUTATION.getStatsData()[userId]
          if(userData != null){
            var matchOffset = parseInt(args[2]) || 0
            DISCORD_HANDLER.sendImageForLatestCompetitiveMatch(msg, userId, msg.member.id, matchOffset)
          }
        }
      }
    }
    if(arg == CONSTANTS.COMMANDS.PARTY || arg == CONSTANTS.COMMANDS.PARTYRAWID){
      var userAliases = args[1].toLowerCase().split(",")
      var isStar = (args[2] || "") == "*"
      var members = []
      for(var i = 0; i < userAliases.length; i++){
        var userId = arg == CONSTANTS.COMMANDS.PARTYRAWID ? userAliases[i] : userIdFromAlias(userAliases[i])
        members.push(userId)
      }
      var partyData = MATCH_COMPUTATION.getPartyDataForParty(members, isStar)
      // console.log("DDD "+JSON.stringify(partyData)+"__"+JSON.stringify(members)+"_"+args[1]+"_"+args[2]+"_")
      if(partyData != undefined){
        DISCORD_HANDLER.sendEmbedForPartyStats(msg, partyData)
      }else{
        if(members.length == 1){
          msg.channel.send("User has never solo queued.")
        }else{
          msg.channel.send("This party combo has never played together.")
        }
      }
      // msg.channel.send(JSON.stringify(partyData))
    }
    if(arg == CONSTANTS.COMMANDS.PARTIES){
      var userId = userIdFromAlias(args[1].toLowerCase())
      if(userId != null){
        DISCORD_HANDLER.sendMessageForAllParties(msg, userId)
      }
    }
    if(arg == CONSTANTS.COMMANDS.AGENTWINLOSS || arg == CONSTANTS.COMMANDS.AWL){
      var userId = userIdFromAlias(args[1].toLowerCase())
      if(userId != null){
        var statsByAgent = MATCH_COMPUTATION.getStatsData()[userId]["stats"]["statsByAgent"]
        console.log("STA "+JSON.stringify(statsByAgent))
        DISCORD_HANDLER.sendMessageForAgentWinLoss(msg, userId, statsByAgent, msg.member.id)
      }

    }
    if(arg == CONSTANTS.COMMANDS.PROCESSALL){
      if(CONSTANTS.DISCORD_ADMIN_USERS.includes(msg.member.id)){
        MATCH_PROCESSING.processAllGames()
      }
    }
    if(arg == CONSTANTS.COMMANDS.COMPUTEALL){
      if(CONSTANTS.DISCORD_ADMIN_USERS.includes(msg.member.id)){
        MATCH_COMPUTATION.computeAggregate()
      }
    }
    if(arg == CONSTANTS.COMMANDS.SETCOLOR){
      var colorInput = args[1]
      var isColor = /^#[0-9A-F]{6}$/i.test(colorInput)
      if(isColor){
        DISCORD_HANDLER.setUserColor(msg.member.id, colorInput)
        msg.channel.send("Color set.")
      }else{
        msg.channel.send("Not a valid color")
      }
    }
  }
})

cron.schedule('24 * * * *', async () => {
  LOG.log(2, '[AUTO] Getting Elo History for all users');
  for (var alias in subjectIdAliases) {
    // check if the property/key is defined in the object itself, not in parent
    if (subjectIdAliases.hasOwnProperty(alias)) {
      var userId = subjectIdAliases[alias]
      MATCH_HANDLER.matchHistory(userId, async function(history){
        LOG.log(3, "[AUTO] Getting ELO for "+alias+" UID: "+userId)
        bot.channels.cache.get("798343660001165332").send("[AUTO] updated user elo for "+userId);
      });
      await sleep(500);
    }
  }
  MATCH_COMPUTATION.computeAggregate()
});

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

bot.login(process.env.DISCORD_KEY);
