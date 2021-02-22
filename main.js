const discord = require('discord.js');
require('dotenv').config();
const bot = new discord.Client();
const fs = require('fs');
const path = require('path');
const { stringify } = require("javascript-stringify");
var AsciiTable = require('ascii-table')

const PREFIX = '?';
const request = require('request');
const requestPromise = require('request-promise');
const querystring = require('querystring');
var dateFormat = require('dateformat');

var cron = require('node-cron');

var CONSTANTS = require('constants');
var AUTH = require('auth');
var MATCH_HANDLER = require('matchHandler');

let userColorsData = readJSONFile('private/userColors.json');

let subjectIdAliases = readJSONFile('private/static/userIDs.json');
let altData = readJSONFile('private/static/alts.json');

let totalUserStats = readJSONFile('private/totalStats/users.json');
let totalHitsStats = readJSONFile('private/totalStats/hits.json');

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
  if(first == PREFIX){
    let argString = msg.content.substring(PREFIX.length)
    let args = argString.split(" "); //returns the text after the prefix smart move by me nc
    var arg = ((args[0].toString()).toLowerCase());

    if(arg == CONSTANTS.COMMANDS.ELO){
      var userId = userIdFromAlias(args[1])
      if(userId != null){

      }else{
        msg.channel.send("User not found. Make sure alias is added.")
      }
    }
  }
});
