const config = require("./config.json");
const Discord = require("discord.js");
const Canvas = require('canvas');
const originalFetch = require('node-fetch');
const schedule = require("node-schedule");
const fetch = require('fetch-retry')(originalFetch, {
    retries: 10000,
    retryDelay: 100
  });
const prefix = config.prefix;
const headers = config.bungieKey;
const token = config.token;
const channelID = config.channelID;
const httpOptions = { method: 'GET', headers: headers};
var instance = 0;
const bot = new Discord.Client({disableEveryone: true});

//Initialization of the bot
bot.on("ready", async () => {
  console.log(`Sweet Stats is online!`)
  bot.user.setActivity("Destiny 2");
//Creates an automatic schedule that will get new stats at designated time. This obviously runs at local system time, so if deployed to something like heroku, which is in GMT time zone, you'll need to set accordingly
  var reverse = -parseInt(config.timezone);
  var corectedTime = (parseInt(config.autoTime) + reverse);
  schedule.scheduleJob("0 " + corectedTime.toString() + " * * *", async () => {
    const channel = bot.channels.cache.get(channelID);
    channel.send("!stat");
  });
});
//When a meesage is detected, do this
bot.on('message', async message => {
//Instance counter to prevent more than one instance of the leadeboards from happening as the code is a bodge and relies on everything happening in a specific order and have two run at the same time causes issues
  if(instance == 1){
    return;
  }else{
    instance = 1;
  }
//If the message doesn't start with the prefix and it's in the leaderboards channel and it's made by a user, reset the instance counter and delete their message as the channel should be blank
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
//check if the command is the chosen stat, which is either stat or stats
  if (command === 'stat' || command === 'stats') {
    var author = message.author.bot;
  //Clear out the entire channel chosen of all messages
    const leaderboardsChannel = message.guild.channels.resolve(channelID);
    leaderboardsChannel.bulkDelete(99);
    const channel = bot.channels.cache.get(channelID);
  //If the message was from a user, let them know it'll be a second
    if(!author){
      channel.send("Please wait while I process the stats!");
    }
  //A whole wack ton of declarations
    var reply;
    var twoHundred;
    var twoHundredTwo;
  //Names of each person meant to be displayed
    var names = new Array();
    for(i = 0; i < config.names.length; i++){
      names.push(config.names[i]);
    }
  //Each person's original platform number from Bungie (1=Xbox,2=PSN,3=PC. There may be others based on Stadia and Battle.net, but I'm not sure)
    var membershipType = config.membershipType;
  //Each persons's user number ID from Bungie
    var membershipID = config.membershipID;
    var userCharctersList;
  //Need to declare arrays with same value for each index with as many indexes as names.length
    var maxLight = new Array();
    var genderRaceClass = new Array();
    for(i = 0; i < names.length; i++){
        maxLight.push("0");
        genderRaceClass.push("");
    }
    var selectedCharacter;
    var replyStats;
    var secondsPlayed;
  //Blank arrays being created based on length of names array
    const maxUserCharacterID = new Array(names.length);
    var timePlayedHours = new Array(names.length);
    var timePlayedMinutes = new Array(names.length);
    var kdaPVP = new Array(names.length);
    var kdaPVE = new Array(names.length);
    var seasonRanks = new Array(names.length);
    var emblemPaths = new Array(names.length);;
    Canvas.registerFont('roboto.ttf', {family: 'Roboto'});
    Canvas.registerFont('roboto-bold.ttf', {family: 'RobotoBold'});
    const canvas = Canvas.createCanvas(300,60);
    const ctx = canvas.getContext('2d');
  //Main loop to get the necessary data for each player
    for(i = 0; i < names.length; i++){
    //HTTP GET Request to url to get necessary info needed for the stat images
      reply = await fetch("https://www.bungie.net/Platform/Destiny2/" + membershipType[i] + "/Profile/" + membershipID[i] + "/?components=200,202", httpOptions).then(response => response.json());
    //Declarations
      twoHundred = reply.Response.characters.data;
      twoHundredTwo = reply.Response.characterProgressions.data;
      userCharctersList = Object.keys(twoHundred);
    //Loop to look through each character a player has and find which one has the highest light and store that character's ID
      for(j = 0; j < userCharctersList.length; j++){
        var light = twoHundred[userCharctersList[j]].light;
        if(maxLight[i] < light){
          maxLight[i] = light;
          maxUserCharacterID[i] = userCharctersList[j];
        }
      }
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
    //HTTP GET Request to url to get necessary info needed for the stat images
      replyStats = await fetch("https://www.bungie.net/Platform/Destiny2/" + membershipType[i] + "/Account/" + membershipID[i] + "/Character/" + maxUserCharacterID[i] + "/Stats/", httpOptions).then(response => response.json());
      var pvpTime;
    //If else to catch issue where player has never played PvP and applies just a 0.00 KDA value (Yes, I actually had this issue)
      if(replyStats.Response.allPvP.allTime == undefined){
      //Stores 0 seconds for PvP in case it is undefined due to no pvp having been played
        pvpTime = 0;
      //Stores 0.00 for PvP KDA in case it is undefined due to no pvp having been played
        kdaPVP[i] = "0.00";
      }else{
      //Stores amount of seconds in PvP to use for sum of time played on character
        pvpTime = replyStats.Response.allPvP.allTime.secondsPlayed.basic.value;
      //Stores character's PvP KDA for use in attachment
        kdaPVP[i] = replyStats.Response.allPvP.allTime.killsDeathsAssists.basic.displayValue;
      }
    //Stores the PvE KDA of the character at the current index i
      kdaPVE[i] = replyStats.Response.allPvE.allTime.killsDeathsAssists.basic.displayValue;
    //Stores the total Seconds Played of the character at the current index i
      secondsPlayed = (pvpTime + (replyStats.Response.allPvE.allTime.secondsPlayed.basic.value));
    //Stores the calculated hours played of the character at the current index i
      timePlayedHours[i] = Math.floor((secondsPlayed / 60) / 60);
    //Stores the calculated leftover minutes played of the character at the current index i
      timePlayedMinutes[i] = Math.floor((secondsPlayed / 60) % 60);
    //Stores the current season rank of the character at the current index i
      if(twoHundredTwo == undefined){
        seasonRanks[i] = "N/A";
      }else{
        seasonRanks[i] = twoHundredTwo[maxUserCharacterID[i]].progressions[2926321498].level + twoHundredTwo[maxUserCharacterID[i]].progressions[1470619782].level;
      }
    //Stores the emblem url of the character at the current index i
      emblemPaths[i] = "https://bungie.net" + twoHundred[maxUserCharacterID[i]].emblemBackgroundPath;
    }
    var sortedByLight = [];
  //Condenses each stat array into a single object array in order to sort multiple arrays based on one, which is light level
    for(i = 0; i < maxLight.length; i++){
      sortedByLight.push({'maxLight': maxLight[i],'names': names[i],'genderRaceClass': genderRaceClass[i],'seasonRanks': seasonRanks[i],'timePlayedHours': timePlayedHours[i],'timePlayedMinutes': timePlayedMinutes[i],'kdaPVP': kdaPVP[i],'kdaPVE': kdaPVE[i],'emblemPaths': emblemPaths[i],})
    }
  //Sorts the Object array by highest light level first, then if two people have the same light level, it sorts based on season rank. If that fails, it just defaults to the order in which they are listed in tyhe declared array
    sortedByLight.sort(function(a, b) {
      return ( (a.maxLight > b.maxLight) ? -1 : ( (a.maxLight == b.maxLight) ? ( (a.seasonRanks > b.seasonRanks) ? -1 : 0) : 1) );
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
    }
  //Clearing chosen Leaderboards Channel of all messages to prep for new post
    leaderboardsChannel.bulkDelete(99);
  //Checking if the bot initiated the command (From 10am daily) or if a user initiated and giving the corresponsing header output
    if(author){
    //Sending automatic initiated message for 10am
      channel.send("Good morning fireteam! Here is your daily leaderboards, brought to you everyday at "+ config.autoTime + ((parseInt(config.autoTime) > 11)? "PM" : "AM") + ". To manually update, please use the command !stat:");
    }else{
    //Getting curent date and time to have for manual message
      var today = new Date();
      today.setHours(today.getHours() + parseInt(config.timezone));
      var hour = (today.getHours() > 12)? today.getHours() -12 : today.getHours();
      if(hour == 0){
        hour = 12;
      }
      var ampm = (today.getHours() > 11)? "PM" : "AM";
      var date = (today.getMonth()+1) + '/' + today.getDate() + '/' + today.getFullYear().toString().slice(-2) + " at " + hour + ':' + (today.getMinutes()<10?'0':'') + today.getMinutes() + ampm;
    //Sending manual initiated message
      channel.send("Last updated manually on: " + date + ". To manually update, please use the command !stat");
    }
  //Loop to create the character images for each player
    for(i = 0; i < names.length; i++){
    //Declarations
      const background = await Canvas.loadImage(emblemPaths[i]);
      const lightIcon = await Canvas.loadImage('light.png');
      ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    //Adding Username to canvas
      ctx.font = '14px RobotoBold';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = "left";
      ctx.fillText(names[i], 60, canvas.height * 0.3);
    //Adding GenderRaceClass to canvas
      ctx.font = '12px Roboto';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = "left";
      ctx.fillText(genderRaceClass[i], 60, canvas.height * 0.56);
    //Adding Time Played for character to canvas
      ctx.font = '16px Roboto';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = "left";
      ctx.fillText(timePlayedHours[i] + "h " + timePlayedMinutes[i] + "m", 60, canvas.height * 0.875);
    //Adding Destiny 2 Light Icon to canvas
      ctx.font = '20px RobotoBold';
      ctx.fillStyle = '#e2d259';
      ctx.textAlign = "right";
      ctx.fillText(maxLight[i], canvas.width - 5, (canvas.height / 2) * 0.7);
      ctx.drawImage(lightIcon, (canvas.width - 26) - (ctx.measureText(maxLight[i]).width),  (canvas.height * 0.06), 20, 20);
    //Adding Season Rank to canvas
      ctx.font = '12px Roboto';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = "right";
      ctx.fillText("Season Rank: " + seasonRanks[i], canvas.width - 5, canvas.height * 0.56);
    //Adding PvP value to canvas
      ctx.font = '12px Roboto';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = "right";
      ctx.fillText(kdaPVP[i], canvas.width - 5, canvas.height * 0.76);
    //Adding PvE value to canvas
      ctx.font = '12px Roboto';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = "right";
      ctx.fillText(kdaPVE[i], canvas.width - 5, canvas.height * 0.96);
    //Adding 'PvP KDA' to canvas
      ctx.font = '12px Roboto';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = "left";
      ctx.fillText("PvP KDA:", (canvas.width - 5) - (ctx.measureText(("Season Rank: " + seasonRanks[i])).width), canvas.height * 0.76);
    //Adding 'PvE KDA' to canvas
      ctx.font = '12px Roboto';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = "left";
      ctx.fillText("PvE KDA:", (canvas.width - 5) - (ctx.measureText(("Season Rank: " + seasonRanks[i])).width), canvas.height * 0.96);
    //Converting canvas to discord attachment
      const attachment = new Discord.MessageAttachment(canvas.toBuffer(), names[i] + ".jpg");
    //Send attachment to chosen channel
      await leaderboardsChannel.send(attachment);
    //Just waiting until message has properly posted to Discord
      while(((leaderboardsChannel.lastMessage.attachments).array()[0].name) != (names[i].split(' ').join('_').split('(').join('').split(')').join('') + ".jpg")) {

      }
    //Print to console the url of each person's full banner with stats
      console.log(((leaderboardsChannel.lastMessage.attachments).array()[0].url));
    }
    names = config.names;
  }else{
    //Deletes any message with a prefix that isn't one of the accepted
    message.delete();
    return;
  }
  //Resets instance
  instance = 0;
  return;
});

bot.login(token);
