# Sweet Stats
Discord Bot for a single server to display a dynamic leaderboard of each member

### How to use
Commands:  
!setup to setup bot  
!add to add players to leaderboard  
!remove to remove players from leaderboard
!stat or stats to update the leaderboard

### How to deploy to Heroku
1. Edit config.json to include the 3 different api keys you need to make this bot work.  
-For Discord, you start by going [here](https://discord.com/developers/applications) and creating a new application, give it a name, a profile picture, etc. Then go to the bot tab and copy the "token", that is your discordKey.  
-For Bungie, you start by going [here](https://www.bungie.net/en/Application) and create a new app. Give it a name, and choose not applicable for oauth client type. Leave everything else as is and then click create new app. The API Key is your bungieKey.  
-For Heroku you start by going [here](https://dashboard.heroku.com/account/applications) and click create authorization and give it whatever description you want, then click create. The autorization token is your herokuKey.
2. Now you need to go to [here](https://dashboard.heroku.com/new-app) and create a new app in heroku. and remember it's name. 
2. Install [Heroku CLI](https://devcenter.heroku.com/articles/heroku-command-line)
3. Install [Git](https://git-scm.com/downloads)
4. Open up a new command prompt window inside of the folder where you downloaded the files to.
5. Run 'heroku login' and let it open in a window to your browser to login into the command line interface.
6. Run 'git init'
7. Run 'heroku git:remote NameOfAppYouCreatedOnHeroku'
8. Run 'heroku buildpacks:add heroku/nodejs'
9. Run 'git add .'
10. Run 'git commit -am "Deploying to Heroku"'
11. Run 'git push heroku master'
12. Use this link to add your bot to your server:  
https://<!--This is a comment-->discord.com/api/oauth2/authorize?client_id=insertClientIdFromDiscordHere&permissions=257024&scope=bot

And there you go, it should be running. If it isn't, you may need to go into the resources tab of your app on Heroku and make sure that Worker is enabled and that no other Dynos are enabled. 

![Image of Leaderboard](https://i.imgur.com/L8cSBd6.png)
![Gif of Leaderboard](https://i.imgur.com/NHfutWH.gif)
