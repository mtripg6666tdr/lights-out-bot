import * as discord from "oceanic.js";
import { Difficulty, LightsOutGame } from "./core";

type GameObject = {
  game: LightsOutGame,
  messageId: string,
};

export class LightsOutBot extends discord.Client {
  private cleanupFn: (() => void)[] = [];
  private games: Map<string, GameObject> = new Map();

  constructor(){
    super({
      auth: `Bot ${process.env.DISCORD_TOKEN}`,
      gateway: {
        intents: [
        ]
      }
    });

    this.once("ready", this.onceReady.bind(this));
    this.on("interactionCreate", this.onInteractionCreate.bind(this));
  }

  override disconnect(reconnect?: boolean | undefined): void {
    super.disconnect(reconnect);
    if(!reconnect){
      let cleanupFn: (() => void) | undefined | null = null;
      while(cleanupFn = this.cleanupFn.shift()){
        cleanupFn();
      }
    }
  }

  private async onceReady(){
    const commands = await this.application.getGlobalCommands();

    const commandOptions = [
      {
        name: "lights",
        description: "ライツアウトをやります。既にゲームがあれば破棄されます",
        options: [
          {
            type: discord.ApplicationCommandOptionTypes.STRING,
            name: "diff",
            description: "難易度",
            choices: [
              "EASY",
              "NORMAL",
              "HARD"
            ].map(d => ({ name: d, value: d })),
            required: true,
          }
        ]
      },
    ] satisfies discord.EditApplicationCommandOptions[];

    await Promise.all(
      commandOptions.map(async command => {
        const lightsCommand = commands.find(c => c.name === command.name);
        if(lightsCommand){
          await this.application.editGlobalCommand(lightsCommand.id, command);
        }else{
          this.application.createGlobalCommand({
            type: discord.ApplicationCommandTypes.CHAT_INPUT,
            ...command,
          });
        }
      })
    );

    console.log("Ready");
  }

  private async onInteractionCreate(interaction: discord.AnyInteractionGateway){
    switch(interaction.type){
      case discord.InteractionTypes.APPLICATION_COMMAND: {
        await this.handleCommandInteraction(interaction);
        break;
      }
      case discord.InteractionTypes.MESSAGE_COMPONENT: {
        await this.handleComponentInteraction(interaction);
        break;
      }
    }
  }

  private async handleCommandInteraction(interaction: discord.CommandInteraction){
    const game = new LightsOutGame().init(interaction.data.options.getString("diff")!.toLowerCase() as Difficulty);

    await interaction.createMessage(
      this.getMessageContent(interaction.user.globalName || interaction.user.username, game),
    );
    const message = await interaction.getOriginal();
    this.games.set(interaction.user.id, {
      messageId: message.id,
      game,
    });
  }

  private async handleComponentInteraction(interaction: discord.ComponentInteraction){
    const originalMessage = interaction.message;
    const gameData = this.games.get(interaction.user.id);
    if(!gameData || gameData.messageId !== originalMessage.id){
      await interaction.createMessage({
        content: "不正な操作です。他人のゲームに介入しようとしたかも？",
        flags: discord.MessageFlags.EPHEMERAL,
      });
      return;
    }

    if(interaction.data.componentType !== discord.ComponentTypes.BUTTON){
      return;
    }

    const { x, y } = interaction.data.customID.match(/^cell-(?<x>\d)-(?<y>\d)$/)?.groups || {};
    if(!x || !y){
      return;
    }

    const finish = gameData.game.click(Number(x), Number(y));
    const messageContent = this.getMessageContent(interaction.user.globalName || interaction.user.username, gameData.game);

    if(finish){
      messageContent.content += "\r\nゲーム終了！";
      messageContent.components.forEach(row => {
        row.components.forEach(component => {
          component.disabled = true;
        })
      })
      this.games.delete(interaction.user.id);
    }

    await interaction.editParent(messageContent);
  }

  private getMessageContent(username: string, game: LightsOutGame) {
    return {
      content: `${username}さんのゲーム\r\n${game.clickCount}回クリック済み`,
      components: game.exportComponents(),
    };
  }
}
