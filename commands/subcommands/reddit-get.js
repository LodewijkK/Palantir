const { EmbedBuilder } = require('discord.js');
const request = require('request');
const userSchema = require('../../models/userSchema.js');
  
function formatTimeDifference(date1, date2) {
    let years = date2.getYear() - date1.getYear();
    let months = date2.getMonth() - date1.getMonth();
	let days = date2.getDate() - date1.getDate();
  
	if (days < 0) {
        days += 31;
  		months--;
    }

    if (months < 0) {
        months += 12;
        years--;
    }

    let result = [];
    if (years) result.push(`${years} year${(years > 1) ? 's' : ''}`);
    if (months) result.push(`${months} month${(months > 1) ? 's' : ''}`);
    if (days) result.push(`${days} day${(days > 1) ? 's' : ''}`);

    if (result.length == 3) return `${result[0]}, ${result[1]} and ${result[2]}`;
    if (result.length == 2) return `${result[0]} and ${result[1]}`;
    return result[0];
}

module.exports = async interaction => {
    let user = interaction.options.getUser('user');
    let userData = await userSchema.findOne({userId: user.id});
    
    if (!userData?.redditUsername) {
        await interaction.reply({content: `${user} has not linked their Reddit username!`, ephemeral: true})
        return;
    }

    const options = {
        url: `https://www.reddit.com/user/${userData.redditUsername}/about.json`,
        headers: {
            'User-Agent': 'PALANTIR-DISCORD-BOT'
        }
    };

    request(options, (error, response, body) => {
        let info = JSON.parse(body);
        if (info?.error == 404) {
            return interaction.reply({content: `*${user.tag}* has set their Reddit username as *${userData.redditUsername}*, but their Reddit profile could not be found.`, ephemeral: true});
        }
        let redditData = info.data;

        let dateCreated = new Date(redditData.created_utc * 1000);
        const months = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
        let formattedDate = `${months[dateCreated.getMonth()]} ${dateCreated.getDate()}, ${dateCreated.getFullYear()}`;

        interaction.reply({embeds: [
            new EmbedBuilder()
                .setAuthor({
                    name: `${user.tag}'s Reddit profile`, 
                    iconURL: user.displayAvatarURL()
                })
                .setTitle(redditData.subreddit.display_name_prefixed)
                .setURL(`https://reddit.com${redditData.subreddit.url}`)
                .addFields([
                    {
                        name: (redditData.subreddit.title.length) ? redditData.subreddit.title : redditData.name, 
                        value: `${(redditData.subreddit.public_description.length) ? `*"${redditData.subreddit.public_description}"*\n` : ''}
                            🌟 **${redditData.total_karma}** karma`, inline: true },
                ])
                .setThumbnail(redditData.subreddit.icon_img.split('?')[0])
                .setColor('#ff5700')
                .setFooter({text: `🍰 Account created ${formattedDate} \n${formatTimeDifference(dateCreated, new Date())} ago`})
        ]});
    });

}