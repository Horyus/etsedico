export enum ActionType {
    Connect = 0
}

export const ignore = (type: ActionType, context: ActionType[]): boolean =>
    context.indexOf(type) === -1;
