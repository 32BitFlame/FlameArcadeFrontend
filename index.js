console.log("text");
let game_template = "<div>{name}</div>"
let system_template = "<div></div>"
// NOTE: USE ROBOTJS FOR MOUSE CONTROL
function format_string(string, parameters) {
  var escape_start = 0
  var escaped = false
  var string_arr = string.split('')
  var escape_buffer = ""
  for(i = 0; i < string_arr.length; i++) {
    var char = string_arr[i]
    //console.log(`Char: ${i}; ${char}, escaped: ${escaped}`)
    if(!escaped) {
      if(char == "{") {
        //console.log(`Starting escape at ${i}`)
        escaped = true
        escape_start = i
      }
    } else {
      if(char == "}") {
        //console.log(string_arr.join(''))
        //console.log(`removing ${escape_buffer.split('').length}`)
        string_arr.splice(escape_start, escape_buffer.split('').length + 2, parameters[escape_buffer])
        return format_string(string_arr.join(''), parameters)
        escaped = false
        //console.log(string_arr.join(''))
      } else {
        escape_buffer += char
      }
    }
  }
  return string_arr.join('')
}
$(document).ready(function() {
  // Sends screen resolution to backend
  var screen_width = window.screen.width
  var screen_height = window.screen.height
  $.post('http://localhost:5665/set_screen_res',
    {
      screen_size: {
        width: screen_width,
        height: screen_height
      },
    }
  );
  let systems;
  // Gets and iterates through all game systems
  $.getJSON("http://localhost:5665/get_games", function( data ) {
    Object.keys(data).forEach(function(system_name, index) {
      var system = data[system_name]
      var system_container = $(format_string(system_template,{
        // TODO: Put system display configuration here
      }))
      system_container.addClass("system_container")
      system.games.forEach(function(game, index) {
        console.log(format_string(game_template, {
          // TODO: Put game configuration here
          "name":game.name
        }))

        var game_container = $(format_string(game_template, {
          // TODO: Put game configuration here
          "name":game.name
        }));
        game_container.addClass("game_container")
        system_container.append(game_container)
        $("#systems_container").append(system_container)
      })
    })
  });
  });

function input_loop() {
  var gamepads = navigator.getGamepads()
  console.log(gamepads)
}
input_loop()
