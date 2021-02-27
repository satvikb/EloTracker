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

    if(arg == CONSTANTS.COMMANDS.ELO){
      var userId = userIdFromAlias(args[1])
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
          var fullName = userData["gameName"]+"#"+userData["tagLine"]

          var completion = function(){}
          var embed = DISCORD_HANDLER.getEmbedForEloHistory(history, args, fullName, msg.member.id, completion)

          var statMsg = await msg.channel.send({embed})

          completion = async function(url){
            embed.setImage(url)
            // statMsg.edit(embed) // TODO does this work? statMsg is defined after
          }
        })
      }else{
        msg.channel.send("User not found. Make sure alias is added.")
      }
    }
    if(arg == CONSTANTS.COMMANDS.HISTORY){
      var userId = userIdFromAlias(args[1])
      if(userId != null){
        MATCH_HANDLER.matchHistory(userId, async function(history){
          var userData = MATCH_COMPUTATION.getStatsData()[userId]
          var fullName = userData["gameName"]+"#"+userData["tagLine"]
          var table = DISCORD_HANDLER.getMessageForMatchHistory(userId, history, args, fullName, msg.member.id)
          msg.channel.send(table)
        })
      }
    }
    if(arg == CONSTANTS.COMMANDS.PROCESSALL){
      MATCH_PROCESSING.processAllGames()
    }
    if(arg == CONSTANTS.COMMANDS.COMPUTEALL){
      MATCH_COMPUTATION.computeAggregate()
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
bot.login(process.env.DISCORD_KEY);
