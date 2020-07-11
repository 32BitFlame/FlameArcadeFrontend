var express = require('express');
var httpServer = express();
var bodyParser = require('body-parser')
let systems = {}
const electron = require('electron');
const {app, BrowserWindow, ipcMain} = electron;
let Window;

var robot = require('robotjs');
const fs = require("fs")
function dumpJson(filePath) {
  console.log(`Loading ${filePath}`)
  var data = fs.readFileSync(filePath);
  return JSON.parse(String(data))
}

console.log(dumpJson("./gamelist-paths.json"))
function createWindow () {
  console.log("creating window")
  Window = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    },
    show: false,
    frame: false
  })
  Window.loadFile('index.html');
}

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

var spawn = require('child_process').spawn
function create_subprocess(process) {
  // Break into command and arguments
  var split_process = process.split(" ")
  let cmd
  let args = []
  for(i = 0; i < split_process.length; i++) {
    if(i == 0) {
      cmd = split_process[i]
    } else {
      args.push(split_process[i])
    }
  }
  // Minimize when started
  Window.minimize()
  var process = spawn(cmd, args)
  process.on('close', function(code) {
    console.log(`Exit code: ${code}`)
    // Maximize when subprocess is completed
    Window.maximize()
  });
}
httpServer.use(bodyParser.json());
httpServer.use(bodyParser.urlencoded({ extended: true }));

// use: app.METHOD(PATH, HANDLER)
httpServer.post('/set_screen_res/', function(req, res) {
  console.log("setting screen res...");
  var _width = parseInt(req.body.screen_size.width, 10);
  var _height = parseInt(req.body.screen_size.height, 10);
  res.json({ ok: true });
  console.log(`Setting up with width: ${_width} and height: ${_height}`);
  Window.setBounds({
    x: 0,
    y: 0,
    width: _width,
    height: _height
  });
  Window.setFullScreen(true);
  Window.show()
})

function get_items() {

}
let system_run_cmds = {}
let gamelists = require("./gamelist-paths.json")
httpServer.get('/get_games/', function(req, res) {
    var processed_systems = {}
    gamelists.forEach(function(system, i){
      // TODO: Load special graphic and change between
      var new_sys = {}
      var systemname = system.shortname
      var gamelist = dumpJson(system["gamelistfile"])
      var games = []
      gamelist.forEach(function(game, i) {
        var processed_game = {}
        processed_game["image_b64"] = fs.readFileSync(game.image_path).toString('base64');
        processed_game["name"] = game.name
        processed_game["path"] = game.gamepath
        games.push(processed_game)
      })
      new_sys["games"] = games
      new_sys["name"] = systemname
      new_sys["special_graphic"] = null
      new_sys["game_image_aspect_ratio"] = system["image-aspect-ratio"]
      system_run_cmds[systemname] = system["runcmd"]
      processed_systems[systemname] = new_sys
    })
    res.setHeader('Content-Type', 'application/json');
    console.log(system_run_cmds)
    res.end(JSON.stringify(processed_systems));
})

httpServer.post('/start_game/', function(req, res) {
  var path = req.body.path
  var system = req.body.system
  console.log(`Loading ${path} with system ${system}`)
  var run_cmd = format_string(system_run_cmds[system], {
    "rom_path":path
  })
});

function min(num1, num2) {
  // Returns the  highest of the values passed
  if(num2 > num1) {
    return num2
  } else {
    return num1
  }
}
function max(num1, num2) {
  // Returns the  lowest of the values passed
  if(num2 < num1) {
    return num2
  } else {
    return num1
  }
}
const controller_config = dumpJson("./controllers.json")
const deadzone = controller_config.deadzone
const controller_to_mouse = controller_config.controller_to_mouse_enabled
ipcMain.on('send_input', function(e, arg) {
  if(controller_to_mouse) {
    process_input_mouse(arg)
  }
});
function process_input_mouse(arg) {
  // Send controller inputs to be processed here
  //console.log(`=======\n${arg}\n========`)
  var req = JSON.parse(arg)
  //console.log("processing input")
  var current_mouse_position = robot.getMousePos()
  var current_mouse_x = current_mouse_position.x
  var current_mouse_y = current_mouse_position.y
  var horizontal_movement = req.axes.horizontal
  if(horizontal_movement > 0) {
    if(horizontal_movement < deadzone) {
      horizontal_movement = 0
    }
  } else {
    if(horizontal_movement > -deadzone) {
      horizontal_movement = 0
    }
  }
  var vertical_movement = req.axes.vertical
  if(vertical_movement > 0) {
    if(vertical_movement < deadzone) {
      vertical_movement = 0
    }
  } else {
    if(vertical_movement > -deadzone) {
      vertical_movement = 0
    }
  }
  robot.moveMouse(current_mouse_x + horizontal_movement, current_mouse_y + vertical_movement)
  if(req.click) {
    //console.log("clicked")
    //console.log(req.axes)
  }
}

function get_image(path) {
  // Loads image and returns base64 string with data
  const base64 = fs.readFileSync(path).toString('base64');
  return base64
}

function closeApp() {
    httpServer.close()
    app.close()
}

httpServer.listen(5665);

app.whenReady().then(createWindow);
