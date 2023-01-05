const request = require('request');
const userSchema = require('../../models/userSchema.js');

module.exports = async interaction => {
    let username = interaction.options.getString('username').toLowerCase().replace('u/','');
    let userData = await userSchema.findOne({userId: interaction.user.id});

    if (userData?.redditUsername) {
        return interaction.reply({content: "You already have a Reddit username set!", ephemeral: true});
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

        userData = await userSchema.create({
            userId: interaction.user.id,
            redditUsername: username
        });
        console.log(`Created new user schema: ${interaction.user.tag}`);
    
        interaction.reply({content: `Got it! Your Reddit username is **u/${username}**`, ephemeral: true});
    
        userData.save();
    });
}