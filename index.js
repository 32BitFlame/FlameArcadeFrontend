console.log("text");
const input_delay = 400
let game_template = "<div data-gamelink=`{link}` data-system=`{system}`>{name}</div>"
let system_template = "<div></div>"

function sleep(t) {
  //Wait t milliseconds
  const date = Date.now();
  let current_date = null;
  do {
    current_date = Date.now();
  } while (current_date - date < t);
}

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

var selected_game_div
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
        console.log("Adding...")
        console.log(format_string(game_template, {
          // TODO: Put game configuration here
          "name":game.name,
          "link":game.path,
          "system":system.name
        }))
        var game_container = $(format_string(game_template, {
          // TODO: Put game configuration here
          "name":game.name,
          "link":game.path,
          "system":system.name
        }));
        game_container.addClass("game_container")
        game_container.hover(function() {
            // Enter hover
            console.log("selecting game div")
            selected_game_div = $(this)
          }, function() {
              // Exit hover
              $(this).css("border-style", "solid")
              selected_game_div = null;
          });
        system_container.append(game_container)
        });
        $("#systems_container").append(system_container)
      })
    })
    setTimeout(input_loop, 10);
  });

$(".game_container").click(function() {
  var gamepath = $(this).attr("data-path")
  var system = $(this).attr("data-system")
  console.log(`Loading ${gamepath} for system: ${system}`)
  $.post("http://localhost:5665/start_game", {
    "path":gamepath,
    "system":system
  })
});
const border_toggle_delay = 100;
function toggle_game_container_border() {
  if(selected_game_div != null) {
    if(selected_game_div.css("border-style") == "outset") {
      selected_game_div.css("border-style", "inset")
    } else {
      selected_game_div.css("border-style", "outset")
    }
  }

}
setInterval(toggle_game_container_border, border_toggle_delay)
function is_btn_pressed(btn) {
  return typeof(btn) == "object" ? btn.pressed : b == 1.0
}

let click_btn_index = 1;
let horizontal_axis = 0;
let vertical_axis = 1;
let gamepads_pressed_prev_frame = {};

let gamepad_states = {}
function get_active_gamepads() {
  var arr = []
  for(var gamepad_index in gamepad_states){
    if(gamepad_states[gamepad_index]) {
      arr.push(gamepad_index)
    }
  };
  return arr
}
window.addEventListener("gamepadconnected", function(e) {
  console.log(`gamepad ${e.gamepad.index} connected`);
  gamepad_states[e.gamepad.index] = true
});
window.addEventListener('gamepaddisconnected', function(e) {
    console.log(`gamepad ${e.gamepad.index} disconnected`);
    gamepad_states[e.gamepad.index] = false
});

let horizontal_threshold = 0;
let vertical_threshold = 0;
let mouse_spd = 10;
const {ipcRenderer} = require('electron')
function input_loop() {
  // TODO: Set up controller configuration
  var horizontal_input = 0;
  var vertical_input = 0;
  let click_btn_down = false;
  var active_pads = get_active_gamepads();
  for(i = 0; i < active_pads.length; i++) {
    var gamepad_index = active_pads[i]
    var gamepad = navigator.getGamepads()[i];
    horizontal_input += gamepad.axes[horizontal_axis];
    vertical_input += gamepad.axes[vertical_axis];
    var is_clicked = is_btn_pressed(gamepad.buttons[click_btn_index]);
    if(is_clicked && !gamepads_pressed_prev_frame[gamepad.index]) {
      // Checks if button is just pressed down by checking where it was last frame
      click_btn_down = true;
    }
    gamepads_pressed_prev_frame[gamepad.index] = is_clicked;
  };
  var processed_horizontal
  /*if(horizontal_input > horizontal_threshold) {
    processed_horizontal = horizontal_input * mouse_spd
  } else if (horizontal_input < -horizontal_threshold) {
    processed_horizontal = horizontal_input * mouse_spd
  } else {
    processed_horizontal = 0
  }
  */
  processed_horizontal = horizontal_input * mouse_spd
  var processed_vertical;
  /*if(vertical_input > vertical_threshold) {
    processed_vertical = vertical_input * mouse_spd
  } else if (vertical_input < -vertical_threshold) {
    processed_vertical = vertical_input * mouse_spd
  } else {
    processed_vertical = 0
  }
  */
  processed_vertical = vertical_input * mouse_spd
  var inputs = {
    "axes":{
      "horizontal":processed_horizontal,
      "vertical":processed_vertical
    },
    "click":click_btn_down
  }
  if(inputs['click']) {
    console.log(`raw_normal: ${horizontal_input}, processed_vertical: ${vertical_input}`)
    console.log(`processed_horizontal: ${processed_horizontal}, processed_vertical: ${processed_vertical}`)
    if(selected_game_div != null) {
      var gamepath = selected_game_div.attr("data-gamelink")
      var system = selected_game_div.attr("data-system")
      console.log(`starting ${gamepath} on system ${system} `)
      $.post("http://localhost:5665/start_game", {
        "path":gamepath,
        "system":system
      })
    }
  }
  ipcRenderer.send('send_input', JSON.stringify(inputs));
  //sleep(input_delay)
  //input_loop()
}
var cursor_offset = {
   left: 0,
   top: 0
}
$("html").on("mousemove", function (e) {
  $('#cursor').offset({
     left: (e.pageX - cursor_offset.left)
   , top : (e.pageY - cursor_offset.top)
  })

});

setInterval(input_loop, input_delay)

const clock_update_delay = 500;
const seconds_enabled = true;
const twenty_four_hour_time = false
function update_clock() {
  var current_date = new Date();
  var time = ""
  var time = `${twenty_four_hour_time ? current_date.getHours(): current_date.getHours() % 12}:${current_date.getMinutes()}`;
  if(seconds_enabled) {
    time += `:${current_date.getSeconds()}`
  }
  $("#clock").text(time)
}
setInterval(update_clock, clock_update_delay)
