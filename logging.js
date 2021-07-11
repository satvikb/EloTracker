/*
  0 - Maximum Error
  1 - Command Overview
  2 - More specific command
  3 - more specific
  4 - everything
*/
var currentLevel = 2;

function setLogLevel(level){
  currentLevel = level
}

function log(level,msg){
  if(level <= currentLevel){
    console.log(msg)
  }
}

module.exports = {
  setLogLevel:setLogLevel,
  log:log
}
