const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const request = require('request-promise');
const serverSchema = require('../models/serverSchema.js');
const userSchema = require('../models/userSchema.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('modify')
		.setDescription("Change a user's Reddit username (admin only)")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option => option
            .setName('user')
            .setDescription('The Discord user')
            .setRequired(true)
        )
        .addStringOption(option => option
            .setName('username')
            .setDescription('The Reddit username')
            .setMinLength(3)
            .setMaxLength(22)
            .setRequired(true)
        ),

	async execute(interaction, client) {
        if (!interaction.guild) return interaction.reply("Can only run this in a server!");

        const user = interaction.options.getUser('user');
        const username = interaction.options.getString('username').toLowerCase().replace('u/','');
        let userData = await userSchema.findOne({userId: user.id});
        let serverData = await serverSchema.findOne({guildId: interaction.guild.id});
    
        if (username == userData?.redditUsername) {
            return interaction.reply({content: "This is already this user's Reddit username!", ephemeral: true});
        }

        let existingUser = await userSchema.findOne({ redditUsername: username });
        if (existingUser) {
            return interaction.reply({content: "Someone already has this username! Contact a mod if this is an issue.", ephemeral: true});
        }
        
        try {
            await request({
                url: `https://www.reddit.com/user/${username}.json`,
                headers: {
                    'User-Agent': 'PALANTIR-DISCORD-BOT'
                }
            });
        }
        catch(err) {
            return interaction.reply({content: "This Reddit profile doesn't exist!", ephemeral: true});
        }

        let logMessage;
        if (userData?.redditUsername) {
            interaction.reply({content: `Changed ${user}'s Reddit username from **u/${userData.redditUsername}** to **u/${username}**`, ephemeral: true});
            logMessage = `\`u/${userData.redditUsername}\` → \`u/${username}\``;
            userData.redditUsername = username;
        }
        else {
            interaction.reply({content: `Got it! ${user}'s Reddit username is **u/${username}**`, ephemeral: true});
            logMessage = `\`u/${username}\``;
                
            userData = await userSchema.create({
                userId: user.id,
                redditUsername: username
            });
            console.log(`Created new user schema: ${user.tag}`);
        
            let serverData = await serverSchema.findOne({guildId: interaction.guild.id});
            if (serverData?.redditRole) {
                let member = interaction.guild.members.cache.get(user.id);
                member?.roles.add(serverData.redditRole);
            }
        }

        userData.save();

        if (!serverData?.logChannelId) return;
        const guild = await client.guilds.cache.get(interaction.guild.id);
        const channel = await guild.channels.fetch(serverData.logChannelId);
        
        channel.send({
            embeds: [
                new EmbedBuilder()
                    .setAuthor({
                        name: `${user.tag}'s Reddit username was changed`, 
                        iconURL: user.displayAvatarURL()
                    })
                    .setTitle(logMessage)
                    .setColor('#ff5700')
                    .setFooter({
                        text: `Username changed by ${interaction.user.tag}`, 
                        iconURL: interaction.user.displayAvatarURL()
                    })
            ]
        });
    }
};
