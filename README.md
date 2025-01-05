# Pingy - Automatic Pinger for Discord

Pingy is a versatile discord bot made to annoy your friends and such by pinging them. Written in discord.js v14 with safeguards set in and whatnot.

---

## Features

- **Automated Pinging**: Specify a user, the number of times to ping them, and the method to use.
- **Flexible Arguments**: 
  - `user` (required): The user to ping.
  - `amount` (required): The number of pings to send.
  - `method` (required): The pinging method (e.g., direct mentions, replies, etc.).
  - `context?` (optional): Additional context or message to include with the pings.
- **Cooldown System**: Prevents spamming by enforcing a cooldown period for repeated commands.
- **Ping Session Tracking**: Keeps track of active pinging sessions to ensure users can easily stop them.
- **Developer-Friendly**: Built on **Discord.js v14**, leveraging its modern features for optimal performance.

---

## Installation

### Prerequisites

1. Node.js v16.9.0 or higher (Discord.js v14 requirement).
2. A Discord Bot Token.
3. A Discord Bot Client ID

You can get the token and client id from the [Discord Developer Portal](https://discord.com/developers/applications).

### Steps

1. Clone this repository:
   ```bash
   git clone https://github.com/your-username/pingy.git
   ```
2. Navigate to the bot directory:
   ```bash
   cd pingy
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Configure your bot token and client id in the `.env` file:
   ```env
   BOT_TOKEN=your-discord-bot-token
   CLIENT_ID=your-discord-bot-client-id
   ```
5. Start the bot:
   ```bash
   node index.js
   ```

---

## Usage

### Command Syntax

Use the following application command (/) syntax to interact with Pingy:

```
/ping <user> <amount> <method> [context?]
```

### Example Commands

1. Ping a user 5 times inside of a server:
    ```
    /ping <@user> <5> <Server>
    ```

2. Ping a user 3 times inside of a server with additional context:
    ```
    /ping <@user> <3> <Server> <'Hello!'>
    ```

3. Ping a user 10 times inside their DMs:
    ```
    /ping <@user> <10> <Direct Message>
    ```

---


## Development

Pingy is built on **discord.js v14**. If you wish to contribute or extend its features, you can start by reviewing the existing codebase.

### File Structure

```plaintext
pingy/
├── node_modules/
├── .env
├── .gitignore
├── index.js
├── package-lock.json
├── package.json
└── README.md
```

### Adding New Features

1. Fork the repository.
2. Create a new branch for your feature.
3. Make your changes and submit a pull request.

---

## License

This project is licensed under the [MIT LICENSE](LICENSE).

---

## Support

If you encounter any issues or have suggestions, please open an issue on the [GitHub Repository](https://github.com/reltyr/pingy/issues).

---

