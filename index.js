let game_template = "<li data-gamelink=`{link}` data-system=`{system}`><a>{name}</a></li>"
let system_template = "<ul></ul>"

const configuration = require("./configuration.json")
const input_delay = configuration.input_delay

function sleep(t) {
  //Wait t milliseconds
  const date = Date.now();
  let current_date = null;
  do {
    current_date = Date.now();
  } while (current_date - date < t);
}

// Since dictionaries can have dot notation this is an enum essentially
const CURSORS = {
  "coin_circle":0,
  "none":1
}
let cursor = CURSORS.coin_circle;

let coin_animation_frame = 0;
const coin_animation_length = 22
function coin_cursor_animation() {
  if(cursor == CURSORS.coin_circle) {

    coin_animation_frame+=1
    if(coin_animation_frame > coin_animation_length-1) {
      coin_animation_frame = 0
    }
    var coin_image_url = `"./cursors/coin_circle_frames/coin_circle_${min_digit_count(2, coin_animation_frame)}.png"`
    console.log(coin_image_url)
    $("html").css("cursor", `url(${coin_image_url}), auto`)
  }
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

function min_digit_count(length, num) {
  // Coverts object to string if not already and forced it to have at least the
  //    minimum digit count
  var str = String(num);
  var str_length_diff = length - str.length
  var new_str = ""
  if(str_length_diff > 0) {
    for(var i = 0; i < str_length_diff; i++) {
      new_str += "0"
    }
  }
  new_str += str
  return new_str
}
var selected_game_div
let animations_enabled = configuration.animated_images

$(document).ready(function() {
  if(!animations_enabled) {
    $("html").css({
      "background-image": `url("./main_images/pixelstarbg-static.png")`,
      "cursor":"url(url(\"./cursors/coin_circle-static.png\"), auto)"
    });
  } else {
    setInterval(coin_cursor_animation, configuration.cursor_delay)
  }
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
        /*
        game_container.hover(function() {
            // Enter hover
            console.log("selecting game div")
            selected_game_div = $(this)
          }, function() {
              // Exit hover
              $(this).css("border-style", "solid")
              selected_game_div = null;
          });
        */
        game_container.bind('mouseenter', function() {
            // Enter hover
            console.log("selecting game div")
            selected_game_div = $(this)
            $(this).css({
              "background-color": "rgba(0, 102, 255, 1)"
            })
        });

        game_container.bind('mouseleave', function() {
          // Exit hover
          $(this).css({
            "background-color": "rgba(0, 102, 255, 0.5)",
            "border-style": "solid"
          })
          selected_game_div = null
        });
        console.log(game_container.is(".game_container"))
        system_container.append(game_container)
        });
        $("#systems_container").append(system_container)
      })
    })
    $(document).on('click', "#footer", function() {
      console.log("text")
    });
    setTimeout(input_loop, 10);
  });

function get_all_system_containers() {
  return $(".system_container")
}
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
  processed_horizontal = horizontal_input * mouse_spd
  var processed_vertical;
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

const clock_update_delay = configuration.clock_update_delay;
const seconds_enabled = configuration.clock.seconds_enabled;
const twenty_four_hour_time = configuration.clock.twenty_four_hour_time
const hours_zero_prefix = configuration.clock.hours_zero_prefix
function update_clock() {
  var current_date = new Date();
  var time = ""
  var hours = twenty_four_hour_time ? current_date.getHours(): current_date.getHours() % 12
  if(hours_zero_prefix) {
    hours = min_digit_count(2, hours)
  }
  var time = `${hours}:${min_digit_count(2,current_date.getMinutes())}`;
  if(seconds_enabled) {
    time += `:${min_digit_count(2, current_date.getSeconds())}`
  }
  $("#clock").text(time)
}
setInterval(update_clock, clock_update_delay)
