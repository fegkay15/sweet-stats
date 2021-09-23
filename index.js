const config = require("./config.json");
const Discord = require("discord.js");
const Canvas = require('canvas');
const sqlite3 = require('sqlite3').verbose();
const originalFetch = require('node-fetch');
const schedule = require("node-schedule");
const fetch = require('fetch-retry')(originalFetch, {
    retries: 100000,
    retryDelay: 50
  });
const prefix = config.prefix;
const bungieKey = config.bungieKey;
const herokuKey = config.herokuKey;
const headers = {"X-API-Key": bungieKey};
const herokuHead = {"Accept":"application/vnd.heroku+json; version=3", "Authorization": "Bearer " + herokuKey, "Content-type": "application/json"};
const token = config.discordKey;
//const channelID;
const autoTime = process.env.autoTime;
const timezone = process.env.timeZone;
const httpOptions = { method: 'GET', headers: headers};
var instance = 0;
const bot = new Discord.Client({disableEveryone: true});

//Initialization of the bot
bot.on("ready", async () => {
  console.log(`Sweet Stats is online!`);
  bot.user.setActivity("Destiny 2");
//Creates an automatic schedule that will get new stats at designated time. This obviously runs at local system time, so if deployed to something like heroku, which is in GMT time zone, you'll need to set accordingly
  var reverse = -parseInt(timezone);
  var corectedTime = (parseInt(autoTime) + reverse);
  schedule.scheduleJob("0 " + corectedTime.toString() + " * * *", async () => {
    const channel = bot.channels.cache.get(channelID);
    channel.send("!stat");
  });
});
//When a message is detected, do this
bot.on('message', async message => {
  var startCount =  Date.now();
//Instance counter to prevent more than one instance of the leadeboards from happening as the code is a bodge and relies on everything happening in a specific order and have two run at the same time causes issues
  if(instance == 1){
    return;
  }else{
    instance = 1;
  }
//If the message doesn't start with the prefix and it's in the leaderboards channel and it's made by a user, reset the instance counter and delete their message as the channel should be blank

  let db = new sqlite3.Database('./sweetstats.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Connected to the sweetstats database.');
  });

  const channelID = await new Promise((resolve, reject) => {
    db.all(`SELECT channelID FROM guildPrefs WHERE guildID = ` + message.guild.id, [], (err, rows) => {
      if (err){
        reject(err);
      }
      console.log(rows);
      if(rows[0] == undefined){
        resolve(undefined);
      }else{
        resolve(rows[0].channelID);
      }
    })
  });
  
  if(channelID == undefined && (message.content.toLowerCase() == "!stat" ||)){

  }

  if (!message.content.startsWith(prefix) && message.channel.id == channelID && !message.author.bot){
    message.delete();
    instance = 0;
    return;
  }
//All else fails, if the message doesn't start with the prefix, just reset instance and return.
  if (!message.content.startsWith(prefix)){
    instance = 0;
    return;
  }
//Get the command itself seperated from the prefix
	const args = message.content.slice(prefix.length).split(/ +/);
	const command = args.shift().toLowerCase();

  const queryResult = await new Promise((resolve, reject) => {
    db.all(`SELECT destinyPlayers.*, guildPlayers.displayName
            FROM guildPlayers
            INNER JOIN destinyPlayers ON guildPlayers.membershipID = destinyPlayers.membershipID
            WHERE guildPlayers.guildID = ` + message.guild.id, [], (err, rows) => {
      if (err){
        reject(err);
      }
      resolve(rows);
    })
  });

  var membershipID = new Array();
  var envLight = new Array();
  var envCharacter = new Array();
  var names = new Array();
  var membershipType = new Array();

  for(i = 0; i < queryResult.length; i++){
    membershipID.push(queryResult[i].membershipID);
    envLight.push(queryResult[i].light);
    envCharacter.push(queryResult[i].character);
    names.push(queryResult[i].displayName);
    membershipType.push(queryResult[i].membershipType);
  }

  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Closed the database connection.');
  });

  if(command === 'setup' && message.member.hasPermission("ADMINISTRATOR")){
    if(bungieKey == ""){
      message.reply("The Bungie Key is not set in the config.json file");
      instance = 0;
      return;
    }
    if(herokuKey == ""){
      message.reply("The Heroku Key is not set in the config.json file");
      instance = 0;
      return;
    }
    var channelReply = "";
    var appName = "";
    var timeReply = 0;
    var timezoneReply = 0;
    message.reply("What is the name of the app in heroku? (Get this right or the bot will not work.)");
    await message.channel.awaitMessages(m => m.author.id == message.author.id,{max: 1, time: 30000}).then(collected => {
      console.log(collected.first().content);
      appName = collected.first().content;
    }).catch(() => {
      message.reply('No answer after 30 seconds, operation canceled.');
      instance = 0;
    });
    if(instance == 0){
      return;
    }
    message.reply("Double checking to make sure the app name is correct. Does this link lead you to the app on Heroku? https://dashboard.heroku.com/apps/" + appName);
    await message.channel.awaitMessages(m => m.author.id == message.author.id,{max: 1, time: 60000}).then(collected => {
      console.log(collected.first().content);
      if(collected.first().content.toLowerCase() != 'yes'){
        message.reply("Please Restart Setup!");
        instance = 0;
      }
    }).catch(() => {
      message.reply('No answer after 60 seconds, operation canceled.');
      instance = 0;
    });
    if(instance == 0){
      return;
    }
    var testSend = await fetch("https://api.heroku.com/apps/" + appName + "/config-vars", { method: 'GET', headers: herokuHead}).then(response => response.json()).catch(error => console.log(error));
    //console.log(testSend);
    if(testSend.id == 'not_found' || testSend.id == 'forbidden'){
      message.reply("The app name submitted was not valid, or you do not have access to this app.");
      instance = 0;
      return;
    }
    message.reply("Which channel would you like to be the leaderboards channel? (Use # to tag the channel)");
    await message.channel.awaitMessages(m => m.author.id == message.author.id,{max: 1, time: 30000}).then(collected => {
      console.log(collected.first().content);
      if((collected.first().content.match(/<#/g) || []).length == 1){
        channelReply = collected.first().content;
      }else{
        message.reply("You either added more than one channel tag in your reply, or didn't provide one.");
        instance = 0;
      }
    }).catch(() => {
      message.reply('No answer after 30 seconds, operation canceled.');
      instance = 0;
    });
    if(instance == 0){
      return;
    }
    message.reply("What hour of the day (in 24 hour format) would you like the bot to automatically update the leaderboards?");
    await message.channel.awaitMessages(m => m.author.id == message.author.id,{max: 1, time: 30000}).then(collected => {
      console.log(collected.first().content);
      rep = collected.first().content;
      if(parseInt(rep) != NaN && parseInt(rep) >= 0 && parseInt(rep) <= 23){
        timeReply = parseInt(rep);
      }else{
        message.reply("You did not reply with a proper number between 0 and 23")
        instance = 0;
      }
    }).catch(() => {
      message.reply('No answer after 30 seconds, operation canceled.');
      instance = 0;
    });
    if(instance == 0){
      return;
    }
    message.reply("Is " + ((timeReply > 12)? timeReply -12 : ((timeReply == 0)? 12 : timeReply)) + ((timeReply > 12)? "pm" : "am") + " the chosen time?");
    await message.channel.awaitMessages(m => m.author.id == message.author.id,{max: 1, time: 30000}).then(collected => {
      console.log(collected.first().content);
      if(collected.first().content.toLowerCase() != 'yes'){
        message.reply("Please Restart Setup!");
        instance = 0;
      }
    }).catch(() => {
      message.reply('No answer after 30 seconds, operation canceled.');
      instance = 0;
    });
    if(instance == 0){
      return;
    }
    message.reply("What is your time difference from UTC/GMT? If you don't know what that means, or are not sure, go here: https://time.is/compare/UTC");
    await message.channel.awaitMessages(m => m.author.id == message.author.id,{max: 1, time: 60000}).then(collected => {
      console.log(collected.first().content);
      timezoneReply = collected.first().content;
      if(parseInt(timezoneReply) != NaN && parseInt(timezoneReply) >= -12 && parseInt(timezoneReply) <= 12){
        timezoneReply = parseInt(timezoneReply);
      }else{
        message.reply("You did not reply with a proper number between -12 and 12")
        instance = 0;
      }
    }).catch(() => {
      message.reply('No answer after 60 seconds, operation canceled.');
      instance = 0;
    });
    if(instance == 0){
      return;
    }
    //var finalSend = await fetch("https://api.heroku.com/apps/" + appName + "/config-vars", { method: 'PATCH', headers: herokuHead, body: JSON.stringify({"channelID": channelReply.substring(channelReply.indexOf('#') + 1,channelReply.indexOf('>')), "autoTime": timeReply, "appName": appName, "setupComplete": "true"})}).then(response => response.json()).catch(error => console.log(error));
    //console.log(finalSend);
    message.reply("Setup complete! Restarting bot.");
    instance = 0;
    return;
  }
  if (command === 'add' && message.member.hasPermission("ADMINISTRATOR")){
    if(process.env.setupComplete != "true"){
      message.reply("Bot has not been setup yet. Please have an admin setup up with !setup");
      instance = 0;
      return;
    }
    namesReply = process.env.names.split(",");
    idReply = process.env.membershipID.split(",");
    typeReply = process.env.membershipType.split(",");
    redo = true;
    while(redo == true){
      nameReply = "";
      membershipIDReply = "";
      membershipTypeReply = "";
      message.reply("What is name of the person you would like to add?");
      await message.channel.awaitMessages(m => m.author.id == message.author.id,{max: 1, time: 30000}).then(collected => {
        console.log(collected.first().content);
        nameReply = collected.first().content;
      }).catch(() => {
        message.reply('No answer after 30 seconds, operation canceled.');
        instance = 0;
      });
      if(instance == 0){
        return;
      }
      message.reply("Is " + nameReply + " the correct name you want?");
      await message.channel.awaitMessages(m => m.author.id == message.author.id,{max: 1, time: 30000}).then(collected => {
        console.log(collected.first().content);
        if(collected.first().content.toLowerCase() != 'yes'){
          message.reply("Please Restart Setup!");
          instance = 0;
        }
      }).catch(() => {
        message.reply('No answer after 30 seconds, operation canceled.');
        instance = 0;
      });
      if(instance == 0){
        return;
      }
      message.reply("Now you need to provide the membershipType and membershipID variables for this player. To do this, you will use https://wastedondestiny.com/ Find the player on there, click on view more, and then click on 'View Profile on Bungie.net' then copy and paste the url here as the reply.");
      await message.channel.awaitMessages(m => m.author.id == message.author.id,{max: 1, time: 120000}).then(collected => {
        console.log(collected.first().content);
        urlReply = collected.first().content.toLowerCase();
        //console.log(urlReply);
        if(urlReply.startsWith("https://www.bungie.net/en/profile/") || urlReply.startsWith("http://www.bungie.net/en/profile/")){
          membershipTypeReply = urlReply.substring(urlReply.indexOf("profile/") + 8,urlReply.indexOf("profile/") + 9);
          membershipIDReply = urlReply.substring(urlReply.lastIndexOf("/") + 1)
        }else{
          message.reply("Not a valid URL.");
          instance = 0;
        }
      }).catch(() => {
        message.reply('No answer after 2 minutes, operation canceled.');
        instance = 0;
      });
      if(instance == 0){
        return;
      }
      message.reply("Would you like to add another player?");
      await message.channel.awaitMessages(m => m.author.id == message.author.id,{max: 1, time: 30000}).then(collected => {
        console.log(collected.first().content);
        if(collected.first().content.toLowerCase() != 'yes'){
            redo = false;
        }
      }).catch(() => {
        message.reply('No answer after 30 seconds, operation canceled.');
        instance = 0;
      });
      if(instance == 0){
        return;
      }
      namesReply.push(nameReply);
      idReply.push(membershipIDReply);
      typeReply.push(membershipTypeReply);
    }
    var finalSend = await fetch("https://api.heroku.com/apps/" + process.env.appName + "/config-vars", { method: 'PATCH', headers: herokuHead, body: JSON.stringify({"names": namesReply.toString(), "membershipID": idReply.toString(), "membershipType": typeReply.toString()})}).then(response => response.json()).catch(error => console.log(error));
    //console.log(finalSend);
    message.reply("Addition complete! Restarting bot.");
    instance = 0;
    return;
  }
  if (command === 'remove' && message.member.hasPermission("ADMINISTRATOR")){
    if(process.env.setupComplete != "true"){
      message.reply("Bot has not been setup yet. Please have an admin setup up with !setup");
      instance = 0;
      return;
    }
    namesReply = process.env.names.split(",");
    idReply = process.env.membershipID.split(",");
    typeReply = process.env.membershipType.split(",");
    characterReply = process.env.character.split(",");
    lightReply = process.env.light.split(",");
    redo = true;
    while(redo == true){
      indexReply = -1;
      message.reply("What is name of the person you would like to remove?");
      await message.channel.awaitMessages(m => m.author.id == message.author.id,{max: 1, time: 30000}).then(collected => {
        console.log(collected.first().content);
        if(namesReply.indexOf(collected.first().content) >= 0){
          indexReply = namesReply.indexOf(collected.first().content);
        }else{
          message.reply("Couldn't find a player by that name.");
          instance = 0;
        }
      }).catch(() => {
        message.reply('No answer after 30 seconds, operation canceled.');
        instance = 0;
      });
      if(instance == 0){
        return;
      }
      message.reply("Confirm that you want to remove "+ namesReply[indexReply] + ". Yes or no?");
      await message.channel.awaitMessages(m => m.author.id == message.author.id,{max: 1, time: 30000}).then(collected => {
        console.log(collected.first().content);
        if(collected.first().content.toLowerCase() != 'yes'){
            instance = 0;
        }
      }).catch(() => {
        message.reply('No answer after 30 seconds, operation canceled.');
        instance = 0;
      });
      if(instance == 0){
        return;
      }
      namesReply.splice(indexReply,1);
      idReply.splice(indexReply,1);
      typeReply.splice(indexReply,1);
      characterReply.splice(indexReply,1);
      lightReply.splice(indexReply,1);
      message.reply("Would you like to remove another player?");
      await message.channel.awaitMessages(m => m.author.id == message.author.id,{max: 1, time: 30000}).then(collected => {
        console.log(collected.first().content);
        if(collected.first().content.toLowerCase() != 'yes'){
            redo = false
        }
      }).catch(() => {
        message.reply('No answer after 30 seconds, operation canceled.');
        instance = 0;
      });
      if(instance == 0){
        return;
      }
    }
    var finalSend = await fetch("https://api.heroku.com/apps/" + process.env.appName + "/config-vars", { method: 'PATCH', headers: herokuHead, body: JSON.stringify({"names": namesReply.toString(), "membershipID": idReply.toString(), "membershipType": typeReply.toString(), "character": characterReply.toString(), "light": lightReply.toString()})}).then(response => response.json()).catch(error => console.log(error));
    //console.log(finalSend);
    message.reply("Removal complete! Restarting bot.");
    instance = 0;
    return;
  }
//Manual command to make bot send !stat
  if (command === 'manual' && message.member.hasPermission("ADMINISTRATOR")){
    instance = 0;
    const channel = bot.channels.cache.get(channelID);
    channel.send("!stat");
    return;
  }
//check if the command is the chosen stat, which is either stat or stats
  if (command === 'stat' || command === 'stats') {
    /*if(process.env.setupComplete != "true"){
      message.reply("Bot has not been setup yet. Please have an admin setup up with !setup");
      instance = 0;
      return;
    }*/
    /*if(process.env.names == undefined || process.env.membershipID == undefined || process.env.membershipType == undefined){
      message.reply("No players have been added to leaderboards. Please have an admin add players with !add");
      instance = 0;
      return;
    }*/
    var author = message.author.bot;
    var user = message.author.id;
  //Clear out the entire channel chosen of all messages

    const leaderboardsChannel = message.guild.channels.resolve(channelID);
    leaderboardsChannel.bulkDelete(99);
    const channel = bot.channels.cache.get(channelID);
  //If the message was from a user, let them know it'll be a second
    if(!author){
      channel.send("<@" + user + ">, Please wait while I process the stats!");
    }
  //A whole wack ton of declarations
    var reply;
    var twoHundred;
    var twoHundredTwo;
  //Each person's original platform number from Bungie (1=Xbox,2=PSN,3=PC. There may be others based on Stadia and Battle.net, but I'm not sure)
    var userCharctersList;
  //Need to declare arrays with same value for each index with as many indexes as names.length
    var maxLight = new Array();
    var genderRaceClass = new Array();
    for(i = 0; i < names.length; i++){
        maxLight.push("0");
        genderRaceClass.push("");
    }
    var selectedCharacter;
    var secondsPlayed;
  //Blank arrays being created based on length of names array
    const maxUserCharacterID = new Array(names.length);
    var timePlayedHours = new Array(names.length);
    var timePlayedMinutes = new Array(names.length);
    var kdaPVP = new Array(names.length);
    var kdaPVE = new Array(names.length);
    var seasonRanks = new Array(names.length);
    var artifactPower = new Array(names.length);
    var emblemPaths = new Array(names.length);;
    Canvas.registerFont('roboto.ttf', {family: 'Roboto'});
    Canvas.registerFont('roboto-bold.ttf', {family: 'RobotoBold'});
    const canvas = Canvas.createCanvas(474,96);
    const ctx = canvas.getContext('2d');

    envLightLength = envLight.length;
    envCharacterLength = envCharacter.length;
    if(envLightLength.length < names.length){
      for(f = 0; f < (names.length - envLightLength); f++){
        envLight.push('0');
      }
    }
    if(envCharacterLength.length < names.length){
      for(f = 0; f < (names.length - envCharacterLength); f++){
        envCharacter.push('0');
      }
    }
  //Main loop to get the necessary data for each player

    async function getReply() {
      arrayPromiseReply =  new Array(names.length);
      for(i = 0; i < names.length; i++){
        arrayPromiseReply[i] = new Promise((resolve, reject) => {
          replyFetch = fetch("https://www.bungie.net/Platform/Destiny2/" + membershipType[i] + "/Profile/" + membershipID[i] + "/?components=104,200,202", httpOptions).then(response => response.json());
          resolve(replyFetch);
        });
      }
      var arrayReply = await Promise.all(arrayPromiseReply).catch(error => console.log(error));
      return arrayReply;
    }

    async function getReplyAccountStats() {
      arrayPromiseReplyAccountStats =  new Array(names.length);
      for(i = 0; i < names.length; i++){
        arrayPromiseReplyAccountStats[i] = new Promise((resolve, reject) => {
          replyAccountStatsFetch = fetch("https://www.bungie.net/Platform/Destiny2/" + membershipType[i] + "/Account/" + membershipID[i] + "/Stats/", httpOptions).then(response => response.json());
          resolve(replyAccountStatsFetch);
        });
      }
      var arrayReplyAccountStats = await Promise.all(arrayPromiseReplyAccountStats).catch(error => console.log(error));
      return arrayReplyAccountStats;
    }

    async function getSeasonPassDefinition() {
      promiseManifest = new Promise((resolve, reject) => {
          manifestFetch = fetch("https://www.bungie.net/Platform/Destiny2/Manifest/", httpOptions).then(response => response.json());
          resolve(manifestFetch);
        });
      var manifest = await Promise.resolve(promiseManifest).catch(error => console.log(error));
      promiseSeasonPassDefinition = new Promise((resolve, reject) => {
          seasonPassDefinitionFetch = fetch("https://www.bungie.net" + manifest.Response.jsonWorldComponentContentPaths.en.DestinySeasonPassDefinition, httpOptions).then(response => response.json());
          resolve(seasonPassDefinitionFetch);
        });
      var seasonPassDefinition = await Promise.resolve(promiseSeasonPassDefinition).catch(error => console.log(error));
      //seasonPassDefinition = Object.keys(seasonPassDefinition);
      return seasonPassDefinition;
    }

    let [arrayReply, arrayReplyAccountStats, seasonPassDefinition] = await Promise.all([getReply(), getReplyAccountStats(), getSeasonPassDefinition()]).catch(error => console.log(error));
    var currentSeasonIndex = 0;
    var rewardProgressionHash;
    var prestigeProgressionHash;
    for(k = 0; k < Object.keys(seasonPassDefinition).length; k++){
      if(seasonPassDefinition[Object.keys(seasonPassDefinition)[k]].index >= currentSeasonIndex){
        currentSeasonIndex = seasonPassDefinition[Object.keys(seasonPassDefinition)[k]].index;

        rewardProgressionHash = seasonPassDefinition[Object.keys(seasonPassDefinition)[k]].rewardProgressionHash;
        prestigeProgressionHash = seasonPassDefinition[Object.keys(seasonPassDefinition)[k]].prestigeProgressionHash;
      }
    }
    for(i = 0; i < names.length; i++){
    //HTTP GET Request to url to get necessary info needed for the stat images
      console.log(arrayReply[i]);
      reply = arrayReply[i];
      replyAccountStats = arrayReplyAccountStats[i];
    //Declarations
      twoHundred = reply.Response.characters.data;
      twoHundredTwo = reply.Response.characterProgressions.data;
      oneHundredFour = reply.Response.profileProgression.data;
      userCharctersList = Object.keys(twoHundred);
      maxLightCharacterList = replyAccountStats.Response.characters;
      var historicalMaxLight = 0;
      var historicalCharacter = "";

    //Stores the amount of light received from artifact
      if(oneHundredFour.seasonalArtifact.pointProgression.currentProgress == 0){
        artifactPower[i] = 0
      }else{

        artifactPower[i] = oneHundredFour.seasonalArtifact.powerBonus;
        //Used to disable artifact power above (requires reset of envLight in heroku)
        //artifactPower[i] = 0
      }
      envLight[i] = parseInt(envLight[i]) + parseInt(artifactPower[i]);
      if(historicalMaxLight < envLight[i]){
        historicalMaxLight = envLight[i];
        historicalCharacter = envCharacter[i];
      }
    //Loop to look through each character a player has and find which one has the highest light and store that character's ID
      for(j = 0; j < userCharctersList.length; j++){
        var light = twoHundred[userCharctersList[j]].light;
        if(maxLight[i] < light){
          maxLight[i] = light;
          maxUserCharacterID[i] = userCharctersList[j];
        }
      }
      if(twoHundred[historicalCharacter] != undefined){
        if(maxLight[i] < historicalMaxLight){
          maxLight[i] = historicalMaxLight;
          maxUserCharacterID[i] = historicalCharacter;
        }
      }
      envLight[i] = maxLight[i] - artifactPower[i];
      envCharacter[i] = maxUserCharacterID[i];

    //If Else tree to save string value of gender race and class based on 3 json values.
      selectedCharacter = twoHundred[maxUserCharacterID[i]];
      if(selectedCharacter.raceType == 0){
        genderRaceClass[i] = genderRaceClass[i] + "Human ";
      }else if(selectedCharacter.raceType == 1){
        genderRaceClass[i] = genderRaceClass[i] + "Awoken ";
      }else if(selectedCharacter.raceType == 2){
        genderRaceClass[i] = genderRaceClass[i] + "Exo ";
      }
      if(selectedCharacter.classType == 0){
        genderRaceClass[i] = genderRaceClass[i] + "Titan ";
      }else if(selectedCharacter.classType == 1){
        genderRaceClass[i] = genderRaceClass[i] + "Hunter ";
      }else if(selectedCharacter.classType == 2){
        genderRaceClass[i] = genderRaceClass[i] + "Warlock ";
      }
      if(selectedCharacter.genderType == 0){
        genderRaceClass[i] = genderRaceClass[i] + "Male";
      }else if(selectedCharacter.genderType == 1){
        genderRaceClass[i] = genderRaceClass[i] + "Female";
      }
    //If else to catch issue where player has never played PvP and applies just a 0.00 KDA value (Yes, I actually had this issue)
      if(replyAccountStats.Response.mergedAllCharacters.results.allPvP.allTime == undefined){
      //Stores 0.00 for PvP KDA in case it is undefined due to no pvp having been played
        kdaPVP[i] = "0.00";
      }else{
      //Stores character's PvP KDA for use in attachment
        kdaPVP[i] = replyAccountStats.Response.mergedAllCharacters.results.allPvP.allTime.killsDeathsAssists.basic.displayValue;
      }
    //Stores the PvE KDA of the character at the current index i
      kdaPVE[i] = replyAccountStats.Response.mergedAllCharacters.results.allPvE.allTime.killsDeathsAssists.basic.displayValue;
    //Stores the total Seconds Played of the character at the current index i
      secondsPlayed = replyAccountStats.Response.mergedAllCharacters.merged.allTime.secondsPlayed.basic.value;
    //Stores the calculated hours played of the character at the current index i
      timePlayedHours[i] = Math.floor((secondsPlayed / 60) / 60);
    //Stores the calculated leftover minutes played of the character at the current index i
      timePlayedMinutes[i] = Math.floor((secondsPlayed / 60) % 60);
    //Stores the current season rank of the character at the current index i
      if(twoHundredTwo == undefined){
        seasonRanks[i] = 0;
      }else{
        seasonRanks[i] = twoHundredTwo[maxUserCharacterID[i]].progressions[rewardProgressionHash].level + twoHundredTwo[maxUserCharacterID[i]].progressions[prestigeProgressionHash].level;
        //Used to disable season ranks
        //seasonRanks[i] = 0;
      }

    //Stores the emblem url of the character at the current index i
      emblemPaths[i] = "https://bungie.net" + twoHundred[maxUserCharacterID[i]].emblemBackgroundPath;
    }
    var sortedByLight = [];
  //Condenses each stat array into a single object array in order to sort multiple arrays based on one, which is light level
    for(i = 0; i < maxLight.length; i++){
      sortedByLight.push({'maxLight': maxLight[i],'names': names[i],'genderRaceClass': genderRaceClass[i],'seasonRanks': seasonRanks[i],'timePlayedHours': timePlayedHours[i],'timePlayedMinutes': timePlayedMinutes[i],'kdaPVP': kdaPVP[i],'kdaPVE': kdaPVE[i],'emblemPaths': emblemPaths[i],'artifactPower': artifactPower[i]})
    }
  //Sorts the Object array by highest light level first, then if two people have
  // the same light level, it sorts based on base level. If base level is the same,
  // it goes to season rank If that fails, it just defaults to the order in which
  // they are listed in the declared member list
    sortedByLight.sort(function(a, b) {
      if(a.maxLight > b.maxLight){
        return -1;
      }else{
        if(a.maxLight == b.maxLight){
          if((a.maxLight - a.artifactPower) > (b.maxLight - b.artifactPower)){
              return -1;
          }else{
            if((a.maxLight - a.artifactPower) == (b.maxLight - b.artifactPower)){
                if(a.seasonRanks > b.seasonRanks){
                  return -1;
                }else{
                  return 0;
                }
            }else{
              return 1;
            }
          }
        }else{
          return 1;
        }
      }
      //return ( (a.maxLight > b.maxLight) ? -1 : ( (a.maxLight == b.maxLight) ? ( (a.seasonRanks > b.seasonRanks) ? -1 : 0) : 1) );
    });
  //Loop to expand the sorted object array back to seperate arrays
    for (var i = 0; i < sortedByLight.length; i++) {
        maxLight[i] = sortedByLight[i].maxLight;
        names[i] = sortedByLight[i].names;
        genderRaceClass[i] = sortedByLight[i].genderRaceClass;
        seasonRanks[i] = sortedByLight[i].seasonRanks;
        timePlayedHours[i] = sortedByLight[i].timePlayedHours;
        timePlayedMinutes[i] = sortedByLight[i].timePlayedMinutes;
        kdaPVP[i] = sortedByLight[i].kdaPVP;
        kdaPVE[i] = sortedByLight[i].kdaPVE;
        emblemPaths[i] = sortedByLight[i].emblemPaths;
        artifactPower[i] = sortedByLight[i].artifactPower;
    }
  //Clearing chosen Leaderboards Channel of all messages to prep for new post
    leaderboardsChannel.bulkDelete(99);
  //Checking if the bot initiated the command (From 10am daily) or if a user initiated and giving the corresponsing header output
    if(author){
    //Sending automatic initiated message for 10am
      channel.send("Good morning fireteam! Here is your daily leaderboards, brought to you everyday at "+ autoTime + ((parseInt(autoTime) > 11)? "pm" : "am") + ". To manually update, please use the command !stat.");
    }else{
    //Getting curent date and time to have for manual message
      var today = new Date();
      today.setHours(today.getHours() + parseInt(timezone));
      var hour = (today.getHours() > 12)? today.getHours() -12 : today.getHours();
      if(hour == 0){
        hour = 12;
      }
      var ampm = (today.getHours() > 11)? "PM" : "AM";
      var date = (today.getMonth()+1) + '/' + today.getDate() + '/' + today.getFullYear().toString().slice(-2) + " at " + hour + ':' + (today.getMinutes()<10?'0':'') + today.getMinutes() + ampm;
    //Sending manual initiated message
      channel.send("Last updated manually by <@" + user + "> on: " + date + ". To manually update, please use the command !stat.");
    }
  //Loop to create the character images for each player
    for(i = 0; i < names.length; i++){
    //Declarations
      if(emblemPaths[i] == "https://bungie.netundefined"){
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }else{
        const background = await Canvas.loadImage(emblemPaths[i]).catch(error => console.log(error));
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
      }
      const lightIcon = await Canvas.loadImage('light.png').catch(error => console.log(error));;
    //Adding Username to canvas
      ctx.font = '25px RobotoBold';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = "left";
      ctx.fillText(names[i], 96, canvas.height * 0.3);
    //Adding Season Rank to canvas
      ctx.font = '19px Roboto';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = "left";
      ctx.fillText(genderRaceClass[i], 96, canvas.height * 0.56);
    //Adding Season Rank to canvas
      ctx.font = '19px Roboto';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = "left";
      ctx.fillText("Season Rank: " + seasonRanks[i], 96, canvas.height * 0.76);
    //Adding Time Played for character to canvas
      ctx.font = '19px Roboto';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = "left";
      ctx.fillText(timePlayedHours[i] + "h " + timePlayedMinutes[i] + "m", 96, canvas.height * 0.96);
    //Adding Destiny 2 Light Level to canvas
      ctx.font = '32px RobotoBold';
      ctx.fillStyle = '#e2d259';
      ctx.textAlign = "right";
      ctx.fillText(maxLight[i], canvas.width - 8, (canvas.height / 2) * 0.7);
      ctx.drawImage(lightIcon, (canvas.width - 32) - (ctx.measureText(maxLight[i]).width),  (canvas.height * 0.06), 32, 32);
    //Adding Destiny 2 Artifact Power to canvas
      ctx.font = '19px RobotoBold';
      ctx.fillStyle = '#09d7d0';
      ctx.textAlign = "right";
      ctx.fillText(" + " + artifactPower[i], canvas.width - 8, canvas.height * 0.56);
    //Adding Base to canvas
      var base = maxLight[i] - artifactPower[i];
      ctx.font = '19px RobotoBold';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = "right";
      ctx.fillText(base, (canvas.width - 8) - (ctx.measureText(" + " + artifactPower[i]).width), canvas.height * 0.56);
    //Adding PvP value to canvas
      ctx.font = '19px Roboto';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = "right";
      ctx.fillText(kdaPVP[i], canvas.width - 8, canvas.height * 0.76);
    //Adding PvE value to canvas
      ctx.font = '19px Roboto';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = "right";
      ctx.fillText(kdaPVE[i], canvas.width - 8, canvas.height * 0.96);
    //Adding 'PvP KDA' to canvas
      ctx.font = '19px Roboto';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = "left";
      ctx.fillText("PvP:", (canvas.width - 8) - (ctx.measureText(kdaPVE[i]).width) - (ctx.measureText("PvP: ").width), canvas.height * 0.76);
    //Adding 'PvE KDA' to canvas
      ctx.font = '19px Roboto';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = "left";
      ctx.fillText("PvE:", (canvas.width - 8) - (ctx.measureText(kdaPVE[i]).width) - (ctx.measureText("PvP: ").width), canvas.height * 0.96);
    //Converting canvas to discord attachment
      const attachment = new Discord.MessageAttachment(canvas.toBuffer(), names[i].replace(/[^\w.]/g,"_") + ".jpg");
    //Send attachment to chosen channel
      await leaderboardsChannel.send(attachment).catch(error => console.log(error));
    //Just waiting until message has properly posted to Discord
      while(((leaderboardsChannel.lastMessage.attachments).array()[0].name) != (names[i].replace(/[^\w.]/g,"_") + ".jpg")) {

      }
    //Print to console the url of each person's full banner with stats
      //console.log(((leaderboardsChannel.lastMessage.attachments).array()[0].url));
    }
    var endCount =  Date.now();
    console.log(`Completed in: ${(endCount - startCount)/1000} seconds`);

    //leaderboardsChannel.messages.fetch(firstMessage).then(message => message.edit(leaderboardsChannel.messages.fetch(firstMessage).content + ` Completed in: ${(endCount - startCount)/1000} seconds`)).catch(console.error);
    leaderboardsChannel.messages.cache.first().edit(leaderboardsChannel.messages.cache.first().content + ` Completed in: ${(endCount - startCount)/1000} seconds:`);
    var send = await fetch("https://api.heroku.com/apps/" + process.env.appName + "/config-vars", { method: 'PATCH', headers: herokuHead, body: JSON.stringify({"light": envLight.toString(), "character": envCharacter.toString()})}).then(response => response.json()).catch(error => console.log(error));
    //console.log(send);
  }else{
    //Deletes any message with a prefix that isn't one of the accepted
    message.delete();
    instance = 0;
    return;
  }
  //Resets instance
  instance = 0;
  return;
});

bot.login(token);
