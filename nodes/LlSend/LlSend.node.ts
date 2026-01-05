import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';

export class LlSend implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'LL Integrations',
    name: 'llSend',
    group: ['output'],
    version: 1,
    description: 'Send requests to LL API (SMS)',
    defaults: {
      name: 'LL Integrations',
    },
    icon: 'file:logo.svg',
    inputs: ['main'],
    outputs: ['main'],
    credentials: [{ name: 'llApi', required: true }],
    properties: [
      {
        displayName: 'Endpoint',
        name: 'endpoint',
        type: 'string',
        default: '/v1/sms',
        required: true,
      },
      {
        displayName: 'Send Input JSON as Body',
        name: 'sendInputJson',
        type: 'boolean',
        default: true,
        description: 'If enabled, sends the incoming item JSON as the request body.',
      },

      // (opcional) override manual caso queira
      {
        displayName: 'Body (Override)',
        name: 'bodyOverride',
        type: 'json',
        default: '',
        displayOptions: {
          show: {
            sendInputJson: [false],
          },
        },
        description:
          'If "Send Input JSON as Body" is disabled, this JSON will be used as request body.',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const creds = await this.getCredentials('llApi');
    const baseUrl = String(creds.baseUrl).replace(/\/$/, '');

    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      const endpoint = this.getNodeParameter('endpoint', i) as string;
      const sendInputJson = this.getNodeParameter('sendInputJson', i) as boolean;

      const url = `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

      const body = sendInputJson
        ? items[i].json // ✅ pega o JSON do Edit Fields
        : (this.getNodeParameter('bodyOverride', i) as object);

      // validação mínima pra evitar request vazio
      if (!body || (typeof body === 'object' && Object.keys(body as any).length === 0)) {
        throw new Error(
          'Request body is empty. Use "Edit Fields" to create the payload or provide a Body Override.'
        );
      }

      const response = await this.helpers.requestWithAuthentication.call(this, 'llApi', {
        method: 'POST',
        url,
        json: true,
        body,
      });

      returnData.push({
        json: {
          ok: true,
          request: { url, body },
          response,
        },
      });
    }

    return [returnData];
  }
}
