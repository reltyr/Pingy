import { Client, GatewayIntentBits, Collection, REST, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import 'dotenv/config';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers
    ]
});

const MAX_PINGS = 100;
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
                        value: 'server'
                    },
                    {
                        name: 'DM',
                        value: 'dm'
                    }
                ]
            }
        ]
    }
];

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

try {
    console.log('Started refreshing application (/) commands.');
    await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
    );
} catch (error) {
    console.error(error);
}

client.once('ready', () => {
    console.log(`Successfully logged in as { ${client.user.tag} } !!!`);
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
        const method = interaction.options.getString('method');

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
            content: `Are you sure you want to ping ${target} ${amount} time(s) through ${method}?`,
            components: [row],
            flags: MessageFlags.Ephemeral
        });

        try {
            const confirmation = await response.awaitMessageComponent({ time: 30000 });

            if (confirmation.customId === 'confirm') {
                cooldowns.set(interaction.user.id, Date.now() + 60000);

                await confirmation.update({
                    content: `Pinging ${target} ${amount} time(s) through ${method}...`,
                    components: [],
                    flags: MessageFlags.Ephemeral
                });

                for (let i = 0; i < amount; i++) {
                    if (method === 'dm') {
                        try {
                            await target.send(`${target}, you have been pinged by ${interaction.user} from ${interaction.guild.name}!`);
                        } catch (error) {
                            await interaction.followUp({
                                content: `Failed to DM ${target}, They might have DMs disabled.`,
                                flags: MessageFlags.Ephemeral
                            });
                            break;
                        }
                    } else {
                        await interaction.channel.send(`${target}`);
                    }

                    await new Promise(resolve => setTimeout(resolve, 300));

                }

                await interaction.followUp({
                    content: `Successfully pinged ${target} ${amount} time(s) through ${method}!`,
                    flags: MessageFlags.Ephemeral
                });
            } else {

                await confirmation.update({
                    content: 'Command cancelled.',
                    components: [],
                    flags: MessageFlags.Ephemeral
                });

            }
        } catch (e) {

            await interaction.editReply({
                content: 'No response after 30 seconds, command cancelled...',
                components: [],
                flags: MessageFlags.Ephemeral
            });

        }
    }
});

client.login(process.env.BOT_TOKEN);
