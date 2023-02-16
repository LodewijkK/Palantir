const serverSchema = require('../../models/serverSchema.js');
const userSchema = require('../../models/userSchema.js');

module.exports = async (interaction) => {
    await interaction.deferReply({ephemeral: true});
    if (!interaction.guild) return interaction.editReply("Can only run this in a server!");
    
    let removeOld = interaction.options.getBoolean('remove-old-role') ?? false;
    let enabled = interaction.options.getBoolean('enabled') ?? true;
    let role = interaction.options.getRole('role');
    let oldRole;

    let server = interaction.guild;
    if (role.comparePositionTo(interaction.guild.members.me.roles.highest) > 0) {
        return await interaction.editReply("I don't have permission to assign this role! Make sure the role is *below* my highest role.")
    }

    let serverData = await serverSchema.findOne({guildId: interaction.guild.id});
    if (!serverData && enabled) {
        serverData = await serverSchema.create({
            guildId: interaction.guild.id,
            redditRole: role.id,
        });
        console.log(`Created new server schema: ${interaction.guild.name} (${interaction.guild.id})`);
    }
    else {
        if (enabled) {
            oldRole = serverData.redditRole;
            serverData.redditRole = role.id;
        }
        else {
            if (serverData && serverData?.redditRole) serverData.redditRole = null;
        }
    }
    await serverData?.save();

    if (!enabled) return await interaction.editReply("*Removed Reddit role!*");

    let success = true;
    userSchema.find({}, (err, users) => {
        if (err) return console.log(err);

        users.forEach(async user => {
            let member = server.members.cache.get(user.userId);
            if (!member) return;
            
            try {
                if (oldRole && removeOld) await member.roles.remove(oldRole);
                await member.roles.add(role.id);
            }  
            catch (err) {
                success = false;
                await interaction.editReply({content: "An error was encountered in assigning the roles! Make sure to check my permissions."});
            }
        });
    });

    if (success) await interaction.editReply({content: `All set! Users who link their Reddit will now have the ${role} role`});
}