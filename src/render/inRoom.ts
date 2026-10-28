/** What stands in one room: a list's objects whose `roomId` is it (the draw's views see only the room shown). */
export const inRoom = <T extends { roomId: string }>(list: readonly T[], roomId: string): T[] => list.filter((o) => o.roomId === roomId);
