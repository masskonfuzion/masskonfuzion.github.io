function GameApplication(xSize=512, ySize=512) {
    //console.log("Made an application obj");
    this.xSize = xSize;
    this.ySize = ySize;

    this.canvas = null;
    this.context = null;
    this.imgMgr = null;

    this.timer = null;
    this.fixed_dt_s = 0.015;

    // A settings object that will be modified by, e.g., a settings menu/UI
    this.settings = {};
}

GameApplication.prototype.initialize = function() {
    // We initialize canvas and context here, becausee this initialize() function gets called once the program starts, and the page element named "canvas" is created
    this.canvas = document.getElementById("canvas");
    this.context = this.canvas.getContext("2d");
    this.imgMgr = new ImageManager();

    this.context.fillStyle = 'black';
    this.context.fillRect(0,0, this.canvas.width, this.canvas.height);

    this.context.font = '30px serif';
    this.context.fillStyle = 'white';
    this.context.fillText('If you see only this, something is probably wrong ;-)', this.canvas.width / 8, this.canvas.height / 8);

    this.timer = new Timer();

    this.loadSettings();
    this.initializeHighScores();
}


GameApplication.prototype.loadSettings = function() {
    // Try to get settings from localStorage
    // TODO maybe validate that the settings in localStorage conform to the structure expected by the game (e.g., say an update is pushed, which changes the structure of settings.. Auto-discover that, and handle it)
    var settingsObj = localStorage.getItem('settings');
    if (settingsObj) {
        // localStorage stores string key/value pairs
        this.settings = JSON.parse(settingsObj);
    }
    else
    {
        this.settings = { "hidden": {}, "visible": {} };    // hidden settings are, e.g. point values for accomplishing certain goals; visible settings are, e.g. game config options
        this.settings["visible"]["callSign"] = "PlayerDefault";
        this.settings["visible"]["gameMode"] = "Death Match";
        this.settings["visible"]["gameModeSettings"] = { "deathMatch": { "shipKills": 15,
                                                                         "gunsEnabled": "yes"
                                                                       },
                                                         "timeAttack": { "timeLimit": "2:00" }
                                                       }
    }
    // Save settings to localStorage. We have to JSON.stringify() the object, because localStorage wants key/value pairs of strings (even numbers get saved as strings)
    // TODO maybe make wrapper functions in the game/application object, for saving/loading localSettings
    localStorage.setItem('settings', JSON.stringify(this.settings));
};


// Initialize high scores is none are stored
// (Note: that's all we do; we don't actually load the scores if they exist. There's no need for that at this point)
GameApplication.prototype.initializeHighScores = function() {
    var highScoresFromLocalStorage = localStorage.getItem('highScores');

    var highScores = {};
    if (!highScoresFromLocalStorage) {
        // timeLimitPageLabels for this high scores obj is taken (hard-coded) from the settings menu. TODO maybe specify the time limits somewhere centralized/global
        var timeLimitPageLabels = [ "1:00", "2:00", "3:00", "5:00", "7:00", "10:00", "15:00", "20:00", "25:00", "30:00" ];
        // killCountPageLabels for this high scores obj is taken (hard-coded) from the settings menu. TODO maybe specify the kill count targets somewhere centralized/global
        var killCountPageLabels = [ "5", "10", "15", "20", "25", "50", "75", "100" ]
        highScores = { "timeAttack": {},
                       "deathMatch": {}
                     };
        for (var timeLimit of timeLimitPageLabels) {
            highScores["timeAttack"][timeLimit] = this.createNewEmptyTimeAttackHighScoreObj();
        }
        for (var killCount of killCountPageLabels) {
            highScores["deathMatch"][killCount] = this.createNewEmptyDeathMatchHighScoreObj();
        }

        localStorage.setItem('highScores', JSON.stringify(highScores));
    }
};

GameApplication.prototype.createNewEmptyTimeAttackHighScoreObj = function() {
    var retObj = [];

    // Initialize top 5 scores at each level
    for (var i = 0; i < 5; i++) {
        retObj.push( { "callSign": "Incognito", "kills": 0, "deaths": 0, "ast_s": 0, "ast_m": 0, "ast_l": 0, "score": 0 } );
    }

    return retObj;
};


GameApplication.prototype.createNewEmptyDeathMatchHighScoreObj = function() {
    var retObj = [];

    // Initialize top 5 scores at each level
    for (var i = 0; i < 5; i++) {
        retObj.push( { "callSign": "Incognito", "time": 9999 } );  // NOTE: time is stored in seconds, but we'll output times in MM:SS.s (let's try to do 10ths of seconds, to make the scores more interesting)
    }

    return retObj;
};
