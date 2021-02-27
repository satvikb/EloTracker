var AsciiTable = require('ascii-table')

function buildAsciiTable(title, tableHeaders, data, returnObject, removeBorder){
  var table = new AsciiTable().fromJSON({
    title:title,
    heading: tableHeaders,
    rows: data
  })

  if(removeBorder == true){
    table.removeBorder()
  }
  return returnObject == true ? table : "`"+table.toString()+"`"
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

module.exports = {
  buildAsciiTable:buildAsciiTable,
  combineTwoAsciiTables:combineTwoAsciiTables
}
