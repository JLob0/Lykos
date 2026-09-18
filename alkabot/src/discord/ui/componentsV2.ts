import { ButtonStyle, ComponentType, MessageFlags, SeparatorSpacingSize } from "discord-api-types/v10";
import type {
  APIActionRowComponent,
  APIButtonComponentWithCustomId,
  APIComponentInContainer,
  APIComponentInMessageActionRow,
  APIContainerComponent,
  APIMessageTopLevelComponent,
  APISeparatorComponent,
  APITextDisplayComponent
} from "discord-api-types/v10";

export type ComponentsV2Message = {
  components: APIMessageTopLevelComponent[];
  flags: MessageFlags.IsComponentsV2;
  allowedMentions: {
    parse: [];
  };
};

export const ALKA_ACCENT_COLOR = 0x8b5cf6;

export function componentsV2Message(components: APIMessageTopLevelComponent[]): ComponentsV2Message {
  return {
    components,
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: {
      parse: []
    }
  };
}

export function alkaContainer(components: APIComponentInContainer[], accentColor = ALKA_ACCENT_COLOR): APIContainerComponent {
  return {
    type: ComponentType.Container,
    accent_color: accentColor,
    components
  };
}

export function textDisplay(content: string): APITextDisplayComponent {
  return {
    type: ComponentType.TextDisplay,
    content
  };
}

export function separator(spacing: SeparatorSpacingSize = SeparatorSpacingSize.Small): APISeparatorComponent {
  return {
    type: ComponentType.Separator,
    divider: true,
    spacing
  };
}

export function actionRow(components: APIComponentInMessageActionRow[]): APIActionRowComponent<APIComponentInMessageActionRow> {
  return {
    type: ComponentType.ActionRow,
    components
  };
}

export function primaryButton(customId: string, label: string): APIButtonComponentWithCustomId {
  return {
    type: ComponentType.Button,
    custom_id: customId,
    style: ButtonStyle.Primary,
    label
  };
}
