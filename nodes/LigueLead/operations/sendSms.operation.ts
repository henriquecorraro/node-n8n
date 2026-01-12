import type { OperationDef } from './types';

export const sendSmsOperation: OperationDef = {
	value: 'sendSms',
	name: 'Enviar SMS',
	description: 'Envia SMS via endpoint /v1/sms',
	properties: [
		{
			displayName: 'Send Input JSON as Body',
			name: 'sendInputJson',
			type: 'boolean',
			default: true,
			displayOptions: { show: { operation: ['sendSms'] } },
			description: 'Se habilitado, envia o JSON de entrada como body.',
		},
		{
			displayName: 'Body (Override)',
			name: 'bodyOverride',
			type: 'json',
			default: '',
			displayOptions: { show: { operation: ['sendSms'], sendInputJson: [false] } },
		},
	],

	async execute(ctx, itemIndex) {
		const items = ctx.getInputData();
		const creds = await ctx.getCredentials('llApi');

		const baseUrl = String((creds as any).baseUrl ?? 'https://api.liguelead.com.br/v1').replace(
			/\/$/,
			'',
		);
		const url = `${baseUrl}/sms`;

		const sendInputJson = ctx.getNodeParameter('sendInputJson', itemIndex) as boolean;
		const body = sendInputJson
			? items[itemIndex].json
			: (ctx.getNodeParameter('bodyOverride', itemIndex) as object);

		if (!body || (typeof body === 'object' && Object.keys(body as any).length === 0)) {
			throw new Error(
				'Body vazio. Use "Edit Fields" para criar o payload ou informe o Body Override.',
			);
		}

		const response = await ctx.helpers.requestWithAuthentication.call(ctx, 'llApi', {
			method: 'POST',
			url,
			json: true,
			body,
		});

		return { request: { url, body }, response };
	},
};
