import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	INodeProperties,
	INodePropertyOptions,
} from 'n8n-workflow';

import { getOperation, operationOptions, operationProperties } from './operations';

export class LigueLead implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LigueLead',
		name: 'LigueLead',
		group: ['output'],
		version: 3,
		description: 'Envio de SMS e Ligações via LigueLead API',
		defaults: { name: 'LigueLead' },
		icon: 'file:logo.svg',
		inputs: ['main'],
		outputs: ['main'],
		credentials: [{ name: 'llApi', required: true }],
		properties: [
			{
				displayName: 'Operação',
				name: 'operation',
				type: 'options',
				default: operationOptions?.[0]?.value ?? 'sendSms',
				options: operationOptions as unknown as INodePropertyOptions[],
			} as INodeProperties,

			...operationProperties,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const operationValue = this.getNodeParameter('operation', i) as string;
			const op = getOperation(operationValue);

			const json = await op.execute(this, i);

			returnData.push({
				json: {
					ok: true,
					operation: operationValue,
					...json,
				},
			});
		}

		return [returnData];
	}
}
