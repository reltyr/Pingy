import { Client, GatewayIntentBits, Collection, REST, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import 'dotenv/config';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
    ]
});

const MAX_PINGS = 100;
const CD_MS = 60000;

const cooldowns = new Collection();

const commands = [
    {
        name: 'ping',
        description: 'Ping a user multiple times!',
        options: [
            {
                name: 'user',
                description: 'The user to ping',
                type: 6,
                required: true
            },
            {
                name: 'amount',
                description: 'The amount of times to ping the user',
                type: 4,
                required: true,
                min_value: 1,
                max_value: MAX_PINGS
            },
            {
                name: 'method',
                description: 'Where to send the pings to the user from',
                type: 3,
                required: true,
                choices: [
                    {
                        name: 'Server',
                        value: 'this server'
                    },
                    {
                        name: 'Direct Message',
                        value: 'DMs'
                    }
                ]
            },
            {
                name: 'context',
                description: 'Additional message to send with the ping',
                type: 3,
                required: false
            }
        ]   
    }
];

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
    try {
        console.log('\nStarted refreshing application (/) commands.\n');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        console.log('Successfully reloaded application (/) commands.\n');
    } catch (err) {
        console.error('Error reloading application (/) commands:', err , '\n');
    }
})();

client.once('ready', () => {
    console.log(`Successfully logged in as { ${client.user.tag} } !\n\n`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ping') {

        const cooldown = cooldowns.get(interaction.user.id);

        if (cooldown) {
            const remaining = cooldown - Date.now();

            if (remaining > 0) {
                return interaction.reply({
                    content: `You're on cooldown. Please wait ${Math.ceil(remaining / 1000)} seconds before using this command again.`,
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        const target = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');
        const context = interaction.options.getString('context');
        const method = interaction.options.getString('method');

        if (target.id === client.user.id) {
            return interaction.reply({
                content: 'I cannot ping myself!',
                flags: MessageFlags.Ephemeral
            });
        }

        if (!target) {
            return interaction.reply({
                content: 'User not found',
                flags: MessageFlags.Ephemeral
            });
        }

        if (interaction.guild === null) {
            return interaction.reply({
                content: 'This command can only be used in a server.',
                flags: MessageFlags.Ephemeral
            });
        }

        const confirm = new ButtonBuilder()
            .setCustomId('confirm')
            .setLabel('Confirm')
            .setStyle(ButtonStyle.Success);
        
        const cancel = new ButtonBuilder()
            .setCustomId('cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger);
        
        const row = new ActionRowBuilder()
            .addComponents(confirm, cancel);
        
        const response = await interaction.reply({
            content: `Are you sure you want to ping ${target} ${amount} time(s) through ${method} ?`,
            components: [row],
            flags: MessageFlags.Ephemeral
        });

        try {
            const confirmation = await response.awaitMessageComponent({ time: 30000 });

            if (confirmation.customId === 'confirm') {
                cooldowns.set(interaction.user.id, Date.now() + CD_MS);

                await confirmation.update({
                    content: `Attempting to ping ${target} ${amount} time(s) through ${method} ...`,
                    components: [],
                    flags: MessageFlags.Ephemeral
                });

                let success = true;

                if (method === 'DMs') {
                    try {
                        for (let i = 0; i < amount; i++) {
                            await target.send(`${target}, you have been pinged by ${interaction.user} from ${interaction.guild.name} !\n${context ? ` {  ${context}  }` : ''}`);

                            await new Promise(resolve => setTimeout(resolve, 300));
                        }
                    } catch (err) {
                        await interaction.followUp({
                            content: `Failed to DM ${target}, they might have DMs disabled.`,
                            flags: MessageFlags.Ephemeral
                        });

                        console.error('Error sending DM:', err , '\n');
                        success = false;
                    }
                } else {
                    for (let i = 0; i < amount; i++) {
                        await interaction.channel.send(`${target}, You have been pinged!\n${context ? ` {  ${context}  } ` : ''}`);
                        
                        await new Promise(resolve => setTimeout(resolve, 300));
                    }
                }

                await interaction.followUp({
                    content: success
                        ? `Successfully pinged ${target} ${amount} time(s) through ${method}!`
                        : `Failed to ping ${target} ${amount} time(s) through ${method}!`,
                    flags: MessageFlags.Ephemeral
                });

            } else {
                await confirmation.update({
                    content: 'Command cancelled.',
                    withResponse: true,
                    components: [],
                    flags: MessageFlags.Ephemeral
                });
            }
        } catch (err) {
            await interaction.editReply({
                content: 'Command timed out.',
                components: [],
                flags: MessageFlags.Ephemeral
            });

            console.error('Error awaiting message component:', err , '\n'); //
        }
    }
});

client.login(process.env.BOT_TOKEN);
