const discord = require('discord.js');
require('dotenv').config();
const bot = new discord.Client();

const fs = require('fs');
const path = require('path');
const { stringify } = require("javascript-stringify");
var AsciiTable = require('ascii-table')

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
          if(args.length >= 3){
            let count = args[2];
            numToShow = parseInt(count);
          }

          var debugMode = false
          var showAuth = false;
          if(args.length >= 4){
            if(args[3] == "d")
              debugMode = true;
            if(args[3] == "a" && msg.member.id == 295701594715062272){
              showAuth = true;
            }
          }

          var userData = MATCH_COMPUTATION.getStatsData()[userId]
          var fullName = userData["gameName"]+"#"+userData["tagLine"]

          var embed = DISCORD_HANDLER.getEmbedForEloHistory(history, numToShow, debugMode, fullName, async function(url){
            embed.setImage(url)
            statMsg.edit(embed) // TODO does this work? statMsg is defined after
          })

          var statMsg = await msg.channel.send({embed})
        })
      }else{
        msg.channel.send("User not found. Make sure alias is added.")
      }
    }

    if(arg == CONSTANTS.COMMANDS.PROCESSALL){
      MATCH_PROCESSING.processAllGames()
    }

    if(arg == CONSTANTS.COMMANDS.COMPUTEALL){
      MATCH_COMPUTATION.computeAggregate()
    }
  }
})
bot.login(process.env.DISCORD_KEY);
