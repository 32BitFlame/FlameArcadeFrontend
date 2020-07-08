var string = "This says {blank} and {idk}"
function format_string(string, parameters) {
  var escape_start = 0
  var escaped = false
  var string_arr = string.split('')
  var escape_buffer = ""
  for(i = 0; i < string_arr.length; i++) {
    var char = string_arr[i]
    console.log(`Char: ${i}; ${char}, escaped: ${escaped}`)
    if(!escaped) {
      if(char == "{") {
        console.log(`Starting escape at ${i}`)
        escaped = true
        escape_start = i
      }
    } else {
      if(char == "}") {
        console.log(string_arr.join(''))
        console.log(`removing ${escape_buffer.split('').length}`)
        string_arr.splice(escape_start, escape_buffer.split('').length + 2, parameters[escape_buffer])
        return format_string(string_arr.join(''), parameters)
        escaped = false
        console.log(string_arr.join(''))
      } else {
        escape_buffer += char
      }
    }
  }
  return string_arr.join('')
}
console.log(format_string(string, {"blank":"test", "idk":"test2"}))
