import * as Promise from 'bluebird';
import { IAddress, IIdentity, IMessage, Message, UniversalBot } from 'botbuilder';
import * as chai from 'chai';
import { IDialogTestStep } from './IDialogTestStep';
import { addressIsComposedOfOther, compareMessageWithExpectedMessages, convert2DStringArrayTo2DMessageArray,
    convertStringArrayTo2DMessageArray, convertStringArrayToMessageArray, convertStringToMessage, is2DArray} from './utils';
const expect = chai.expect;

export class SendMessageToBotDialogStep implements IDialogTestStep {
    private message: IMessage;
    private expectedResponses: IMessage[][];
    private sendMessageToBot: (message: IMessage | string, address?: IAddress) => any;
    private setBotToUserMessageChecker: (newMessageChecker: (msg: IMessage | IMessage[]) => any) => any;

    // for now, let the response only be in the form of a string. It can be abstracted later
    constructor(
        sendMessageToBot: (message: IMessage | string, address?: IAddress) => any,
        setBotToUserMessageChecker: (newMessageChecker: (msg: IMessage | IMessage[]) => any) => any,
        defaultAddress: IAddress,
        msg: IMessage | string,
        expectedResponses?: string | string[] | string[][] | IMessage | IMessage[] | IMessage[][],
        address?: IAddress
    ) {
        this.sendMessageToBot = sendMessageToBot;
        this.setBotToUserMessageChecker = setBotToUserMessageChecker;

        address = address || defaultAddress;

        this.message = typeof(msg) === 'string' ? convertStringToMessage(msg, address) : msg as IMessage;

        if (typeof(expectedResponses) === 'string') {
            expectedResponses = [[expectedResponses]];
        } else if (expectedResponses instanceof Array) {
            if (expectedResponses.length > 0 && typeof(expectedResponses) === 'string') {
                expectedResponses = [expectedResponses];
            }
        }

        // allow undef if it is not provided
        // expectedResponses && expectedResponses as string[][];
        this.expectedResponses = this.convertExpectedResponsesParameterTo2DIMessageArray(expectedResponses, address);
    }

    public execute(): Promise<any> {
        return new Promise((res: () => void, rej: (error: Error) => void) => {
            this.setBotToUserMessageChecker((messages: IMessage | IMessage[]) => {
                if (!this.expectedResponses || !this.expectedResponses.length) {
                    return res();
                }

                if (!(messages instanceof Array)) {
                    messages = [messages];
                }

                messages.forEach((msg: IMessage) => {
                    if (msg.type === 'save') {
                        return res();
                    }

                    const currentExpectedResponseCollection = this.expectedResponses.shift();

                    try {
                        compareMessageWithExpectedMessages(msg, currentExpectedResponseCollection);
                    } catch (e) {
                        return rej(e);
                    }

                });

                if (!this.expectedResponses.length) {
                    res();
                }
            });

            this.sendMessageToBot(this.message);
        });
    }

    private convertExpectedResponsesParameterTo2DIMessageArray(
        expectedResponses: string | string[] | string[][] | IMessage | IMessage[] | IMessage[][], address: IAddress) : IMessage[][] {

        expectedResponses = expectedResponses || [] as IMessage[][];

        if (is2DArray(expectedResponses)) {
            const responses = (expectedResponses as Array<Array<any>>);
            if (typeof(responses[0][0]) === 'string') {
                expectedResponses = convert2DStringArrayTo2DMessageArray(expectedResponses as string[][], address);
            }

        } else if (expectedResponses instanceof Array && expectedResponses.length && typeof(expectedResponses[0]) === 'string') {
            expectedResponses = convertStringArrayTo2DMessageArray(expectedResponses as string[], address);
        }

        return expectedResponses as IMessage[][];
    }
}

export function SendMessageToBotDialogStepClassCreator(
    sendMessageToBot: (message: IMessage | string, address?: IAddress) => any,
    setBotToUserMessageChecker: (newMessageChecker: (msg: IMessage | IMessage[]) => any) => any,
    defaultAddress: IAddress): SendMessageToBotDialogStep {
    return SendMessageToBotDialogStep.bind(null, sendMessageToBot, setBotToUserMessageChecker, defaultAddress);
}
