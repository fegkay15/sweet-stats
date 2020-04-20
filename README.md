# Sweet Stats
Discord Bot for a single server to display a dynamic leaderboard of each member

### How to use
!stat or !stats in any channel to start the leaderboard process

### How to deploy to Heroku
1. Edit config.json file per instructions in file. You'll need a discord bot token, a bungie api key, and a list of people you want to have be a part of the leaderboard. You'll input their names, their membership type and their membership ID. You can find these by finding their bungie profile, and looking at the URL. A good way of finding this URL is by using [Wasted On Destiny](https://wastedondestiny.com/) and searching them up. You will have to click on view more and then click on "View Profile on Bungie.net". It will be in this format https://<i></i>www<i></i>.bungie.net/en/profile/MembershipType/MembershipID. You will also need the channel ID of the channel you made to be your leaderboards channel. This should be a new channel and not a previously used channel as this bot will clear the channel of all messages every time it is activated. You can get channel ID of a channel by turning on developer mode in settings and then right clicking achannel and clicking copy ID. 
3. Create Heroku account if you haven't already, and create a new app, name it whatever you want.
4. Install [Heroku CLI](https://devcenter.heroku.com/articles/heroku-command-line)
5. Install [Git](https://git-scm.com/downloads)
6. Open up a new command prompt window inside of the folder where you downloaded the files to.
7. Run 'heroku login' and let it open in a window to your browser to login into the command line interface.
8. Run 'git init'
9. Run 'heroku git:remote NameOfAppYouCreatedOnHeroku'
10. Run 'heroku buildpacks:add heroku/nodejs'
12. Run 'git add .'
13. Run 'git commit -am "Deploying to Heroku"'
14. Run 'git push heroku master'

And there you go, it should be running. If it isn't, you may need to go into the resources tab of your app on Heroku and make sure that Worker is enabled and that no other Dynos are enabled. 
