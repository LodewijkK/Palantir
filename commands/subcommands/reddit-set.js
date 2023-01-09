// TODO: 
// Add role to user
// Change username
// Let admin change username

const request = require('request');
const serverSchema = require('../../models/serverSchema.js');
const userSchema = require('../../models/userSchema.js');

module.exports = async interaction => {
    let username = interaction.options.getString('username').toLowerCase().replace('u/','');
    let userData = await userSchema.findOne({userId: interaction.user.id});

    if (username == userData?.redditUsername) {
        return interaction.reply({content: "You've already set your Reddit username!", ephemeral: true});
    }
    
    const options = {
        url: `https://www.reddit.com/user/${username}.json`,
        headers: {
            'User-Agent': 'PALANTIR-DISCORD-BOT'
        }
    };

    request(options, async (error, response, body) => {
        let info = JSON.parse(body);
        if (info?.error == 404) {
            return interaction.reply({content: "This Reddit profile doesn't exist!", ephemeral: true});
        }

        if (userData?.redditUsername) {
            interaction.reply({content: `Changed your Reddit username from **u/${userData.redditUsername}** to **u/${username}**`, ephemeral: true});
            userData.redditUsername = username;
        }
        else {
            interaction.reply({content: `Got it! Your Reddit username is **u/${username}**`, ephemeral: true});
            
            userData = await userSchema.create({
                userId: interaction.user.id,
                redditUsername: username
            });
            console.log(`Created new user schema: ${interaction.user.tag}`);
        
            let serverData = await serverSchema.findOne({guildId: interaction.guild.id});
            if (serverData?.redditRole) {
                interaction.member.roles.add(serverData.redditRole);
            }
        }

        userData.save();
    });
}