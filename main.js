var express = require('express');
var httpServer = express();
var bodyParser = require('body-parser')
let systems = {}
const electron = require('electron');
const {app, BrowserWindow} = electron;
let Window;

var robot = require('robotjs');
var joypad = require('joypad.js')
joypad.on('connect', e => {
  const { id } = e.gamepad;
  console.log(`${id} connected`);
});
joypad.on('button_press', e => {
    const { buttonName } = e.detail;
    console.log(`${buttonName} was pressed!`);
});
const fs = require("fs")
function dumpJson(filePath) {
  console.log(`Loading ${filePath}`)
  var data = fs.readFileSync(filePath);
  return JSON.parse(String(data))
}

console.log(dumpJson("./gamelist-paths.json"))
function createWindow () {
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
  prc.on('close', function(code) {
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

httpServer.listen(5665);

app.whenReady().then(createWindow);


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
    res.end(JSON.stringify(processed_systems));
})
function get_image(path) {
  // Loads image and returns base64 string with data
  const base64 = fs.readFileSync(path).toString('base64');
  return base64
}

function closeApp() {
    httpServer.close()
    app.close()
}
