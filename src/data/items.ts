// Items the player can carry, by kebab-case id.

export interface ItemDef {
  id: string;
  name: string;
}

export const ITEMS: Readonly<Record<string, ItemDef>> = {
  arrow: { id: 'arrow', name: 'Arrow' },
};
