import { Client, GatewayIntentBits, Collection, REST, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import 'dotenv/config';

// Initializes the Discord client with the necessary intents for guild and direct message interactions.
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
const activePingSessions = new Collection();
const activeUsers = new Collection();

// Defines the slash commands, its parameters, and validation rules such as minimum/maximum values.
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

// Configures the REST client for Discord's API using the bot's token from the .env file.
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
    if (interaction.isChatInputCommand() && interaction.commandName === 'ping') {
        if (activeUsers.has(interaction.user.id)) {
            return interaction.reply({
                embeds: [{
                    color: 0xFF0000,
                    title: 'Command in Progress',
                    description: '⚠️ You already have an active ping command running. Please wait for it to finish.',
                }],
                flags: MessageFlags.Ephemeral
            });
        }


        // Checks if the user is currently on cooldown and calculates the remaining time. Prevents command execution if active.
        const cooldown = cooldowns.get(interaction.user.id);

        if (cooldown) {
            const remaining = cooldown - Date.now();

            if (remaining > 0) {
                return interaction.reply({
                    embeds: [
                        {
                            color: 0xFF0000,
                            title: 'Cooldown Active',
                            description: `⏳ You're on cooldown. Please wait **${Math.ceil(remaining / 1000)} seconds** before using this command again.`,
                        }
                    ],
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
                embeds: [
                    {
                        color: 0xFF0000,
                        title: 'Invalid Target',
                        description: '❌ I cannot ping myself!'
                    }
                ],
                flags: MessageFlags.Ephemeral
            });
        }

        if (!target) {
            return interaction.reply({
                embeds: [
                    {
                        color: 0xFF0000,
                        title: 'Invalid Target',
                        description: '❌ Cannot find the specified user!'
                    }
                ],
                flags: MessageFlags.Ephemeral
            });
        }

        if (interaction.guild === null) {
            return interaction.reply({
                embeds: [
                    {
                        color: 0xFF0000,
                        title: 'Invalid Execution',
                        description: '❌ This command can only be called in a server.'
                    }
                ],
                flags: MessageFlags.Ephemeral
            });
        }

        const confirm = new ButtonBuilder()
            .setCustomId('confirm')
            .setLabel('✔ Confirm')
            .setStyle(ButtonStyle.Success);
        
        const cancel = new ButtonBuilder()
            .setCustomId('cancel')
            .setLabel('❌ Cancel')
            .setStyle(ButtonStyle.Danger);
        
        const row = new ActionRowBuilder()
            .addComponents(confirm, cancel);
        
        // Creates a confirmation embed to ensure the user acknowledges the action before proceeding with the pings.
        const embed = {
            color: 0x00FF00,
            title: 'Ping Confirmation',
            fields: [
                { name: 'Target', value: `**${target}**`, inline: false },
                { name: 'Amount', value: `**${amount}**`, inline: false },
                { name: 'Method', value: `**${method}**`, inline: false },
                { name: 'Context', value: context ? `\` ' ${context} ' \`` : '`None`', inline: false }
            ],
            footer: { text: 'Click Confirm to start or Cancel to abort.' },
        };

        const response = await interaction.reply({
            embeds: [embed],
            components: [row],
            flags: MessageFlags.Ephemeral
        });

        try {
            const confirmation = await response.awaitMessageComponent({ time: 30000 });

            if (confirmation.customId === 'confirm') {
                activeUsers.set(interaction.user.id, true);

                const stopButton = new ButtonBuilder()
                    .setCustomId(`stop_${interaction.user.id}`)
                    .setLabel('🛑 Stop Pinging')
                    .setStyle(ButtonStyle.Danger);

                const stopRow = new ActionRowBuilder()
                    .addComponents(stopButton);

                await confirmation.update({
                    embeds: [
                        {
                            color: 0x0000FF,
                            title: 'Pinging in Progress',
                            fields: [
                                { name: 'Target', value: `**${target}**`, inline: true },
                                { name: 'Method', value: `**${method}**`, inline: true },
                                { name: 'Pings', value: `**${amount}**`, inline: true }
                            ],
                            description: 'Click Stop below to interrupt.',
                            footer: { text: 'Sit tight while the magic happens!' },
                        }
                    ],
                    components: [stopRow],
                });


                // Generates a unique session ID to track the user's ping sequence and monitor for interruptions.
                const sessionId = `${interaction.user.id}_${Date.now()}`;
                activePingSessions.set(sessionId, false); // false means not stopped

                let success = true;
                let completedPings = 0;

                try {
                    if (method === 'DMs') {
                        try {
                            for (let i = 0; i < amount; i++) {
                                // Check if the session was stopped
                                if (activePingSessions.get(sessionId)) {
                                    break;
                                }
    
                                await target.send(`👤 **Pinged By:** ${interaction.user}\n\n🌐 **Server:** ${interaction.guild.name}\n${context ? `\n📜 **Context:** \` ${context} \`` : ''}`);
                                    
                                completedPings++;
                                await new Promise(resolve => setTimeout(resolve, 300));
                            }
                        } catch (err) {
                            await interaction.followUp({
                                embeds: [
                                    {
                                        color: 0xFF0000,
                                        title: 'Failed to Ping',
                                        description: `⚠ Could not DM ${target}. They might have DMs disabled.`
                                    }
                                ],
                                flags: MessageFlags.Ephemeral
                            });
    
                            console.error('Error sending DM:', err , '\n');
                            success = false;
                        }
                    } else {
                        for (let i = 0; i < amount; i++) {
                            // Check if the session was stopped
                            if (activePingSessions.get(sessionId)) {
                                break;
                            }
    
                            await interaction.channel.send(`👤 **Pinged:** ${target}\n${context ? `\n📜 **Context:** \` ${context} \`` : ''}`);
    
                            completedPings++;
                            await new Promise(resolve => setTimeout(resolve, 300));
                        }
                    }

                    if (success) {
                        cooldowns.set(interaction.user.id, Date.now() + CD_MS);
                    }
                } finally {
                    activeUsers.delete(interaction.user.id);
                    activePingSessions.delete(sessionId);
                }

                const finalMessage = success
                    ? (completedPings === amount 
                        ? `✅ Successfully completed all ${amount} pings to ${target} through ${method}!`
                        : `⏹ Stopped after sending ${completedPings} out of ${amount} pings to ${target} through ${method}.`)
                    : `❌ Failed to ping ${target} through ${method}!`;

                await interaction.editReply({
                    embeds: [
                        {
                            color: 0x00FF00,
                            title: 'Ping Complete',
                            description: finalMessage,
                        }
                    ],
                    components: []
                });

            } else {
                await confirmation.update({
                    embeds: [
                        {
                            color: 0xFFA500,
                            title: 'Command Cancelled',
                            description: '❌ You aborted the ping operation.'
                        }
                    ],
                    components: []
                });
            }
        } catch (err) {

            activeUsers.delete(interaction.user.id);

            await interaction.editReply({
                embeds: [
                    {
                        color: 0xFF4500,
                        title: 'Timeout',
                        description: '⏳ You didn’t respond in time.'
                    }
                ],
                components: []
            });

            console.error('Error awaiting message component:', err , '\n');
        }
    }
    
    // Listens for stop button interactions and verifies that only the initiating user can stop their ping sequence.
    if (interaction.isButton() && interaction.customId.startsWith('stop_')) {
        const userId = interaction.customId.split('_')[1];
        
        // Only allow the original user to stop their own ping session
        if (userId === interaction.user.id) {
            const sessionId = Array.from(activePingSessions.keys())
                .find(key => key.startsWith(userId));
            
            if (sessionId) {
                activePingSessions.set(sessionId, true); // Mark the session as stopped
                await interaction.reply({
                    embeds: [
                        {
                            color: 0xFFA500,
                            title: 'Stopping Pings',
                            description: '🛑 Stopping the ping sequence...'
                        }
                    ],
                    flags: MessageFlags.Ephemeral
                });
            } else {
                await interaction.reply({
                    embeds: [
                        {
                            color: 0xFF0000,
                            title: 'No Active Ping',
                            description: '❌ No active ping sequence found.'
                        }
                    ],
                    flags: MessageFlags.Ephemeral
                });
            }
        } else {
            await interaction.reply({
                embeds: [
                    {
                        color: 0xFF0000,
                        title: 'Permission Denied',
                        description: '❌ You can only stop your own ping sequences.'
                    }
                ],
                flags: MessageFlags.Ephemeral
            });
        }
    }
});

client.login(process.env.BOT_TOKEN);

